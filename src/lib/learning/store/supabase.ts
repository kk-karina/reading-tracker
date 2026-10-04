import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, retrying, throwIf } from '../../store/retry'
import type { Material, MaterialPart, Stream, StudyNote, StudySession } from '../types'
import { losesFocus, losesParts, nextSlug } from './rules'
import type {
  LearningStore,
  NewMaterial,
  NewMaterialPart,
  NewStream,
  NewStudyNote,
  NewStudySession,
} from './types'

const now = () => new Date().toISOString()

/**
 * Таблицы нет: Postgres (`42P01`) или кэш схемы PostgREST (`PGRST205`).
 *
 * Так выглядит база, на которой ещё не прогнали `007_study_sessions.sql`.
 * Занятия в ней читаются как «ещё не записывали», а не роняют весь раздел:
 * потоки, материалы и конспекты от миграции не зависят и должны открываться.
 */
const missingTable = (error: { code?: string } | null) =>
  error?.code === '42P01' || error?.code === 'PGRST205'

/** Postgres на нарушении уникальности. Здесь — занятый адрес потока. */
const DUPLICATE = '23505'
/**
 * Сколько адресов подряд пробовать. Это гонка двух устройств, а не цикл: если
 * три подряд заняты кем-то между чтением и вставкой, дело не в адресах.
 */
const SLUG_TRIES = 3

/**
 * Обучение в Supabase. Таблицы: streams, materials, material_parts,
 * study_sessions, study_notes — см. supabase/migrations/003_learning.sql и
 * 007_study_sessions.sql. `user_id`
 * проставляет умолчание колонки (`auth.uid()`), границы ставит RLS.
 *
 * Правила того, что означает мутация, живут в `rules.ts` и применяются здесь
 * иначе, чем в снимке: у сетевого стора снимка нет, и то, что по массиву
 * считается перебором, по строкам выражается условием запроса. Условие при
 * этом общее — `losesFocus`, `losesParts`, — чтобы два способа не разошлись в
 * третий ответ.
 */
export function createSupabaseLearningStore(sb: SupabaseClient): LearningStore {
  /**
   * Что зачистить после правки материала.
   *
   * Считается по строке, которую вернула база, а не по заплатке: «материал
   * уехал в другой поток» — это «фокус остался у потока, которому материал
   * больше не принадлежит», и выражается оно условием `focus_material_id = id
   * and streams.id <> его поток`. Прежнее значение для этого не нужно, а
   * значит, не нужен и лишний запрос за ним.
   */
  async function settle(after: Material, patch: Partial<Material>) {
    if (patch.stream_id) {
      await ok(() =>
        sb
          .from('streams')
          .update({ focus_material_id: null, updated_at: now() })
          .eq('focus_material_id', after.id)
          .neq('id', after.stream_id),
      )
    }
    if (patch.status && losesFocus(after)) {
      await ok(() =>
        sb
          .from('streams')
          .update({ focus_material_id: null, updated_at: now() })
          .eq('focus_material_id', after.id),
      )
    }
    if ((patch.kind !== undefined || patch.scale !== undefined) && losesParts(after)) {
      await ok(() => sb.from('material_parts').delete().eq('material_id', after.id))
    }
  }

  return {
    async load() {
      // Все пять ответов собираются прежде, чем какому-то позволено упасть:
      // ранний бросок оставляет соседние отказы без ожидающего, и браузер
      // считает их необработанными. Та же причина, что в читательском сторе.
      const [s, m, p, x, n] = await Promise.all([
        retrying(() => sb.from('streams').select('*').order('sort').order('created_at')),
        retrying(() => sb.from('materials').select('*').order('sort').order('created_at')),
        retrying(() => sb.from('material_parts').select('*').order('sort')),
        retrying(() =>
          sb
            .from('study_sessions')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
        ),
        retrying(() =>
          sb
            .from('study_notes')
            .select('*')
            .order('date', { ascending: false })
            .order('sort', { ascending: false }),
        ),
      ])
      throwIf(s.error)
      throwIf(m.error)
      throwIf(p.error)
      if (!missingTable(x.error)) throwIf(x.error)
      throwIf(n.error)
      return {
        streams: (s.data ?? []) as Stream[],
        // Связь с полкой — миграция 008. До неё колонок нет, и материал
        // читается несвязанным.
        materials: ((m.data ?? []) as Material[]).map((row) => ({ ...row, book_id: row.book_id ?? null })),
        // Начатые руками — миграция 009. До неё колонок нет, и начатого руками нет.
        parts: ((p.data ?? []) as MaterialPart[]).map((row) => ({ ...row, started: row.started ?? false })),
        sessions: ((x.error ? [] : (x.data ?? [])) as StudySession[]).map((row) => ({
          ...row,
          book_session_id: row.book_session_id ?? null,
          started_ids: row.started_ids ?? [],
        })),
        notes: ((n.data ?? []) as StudyNote[]).map((note) => ({
          ...note,
          session_id: note.session_id ?? null,
        })),
      }
    },

    async addStream(item: NewStream) {
      // Занятые адреса читаются целиком: их десятки, а не тысячи, и это
      // дешевле, чем вставлять наугад и разбирать отказ как норму.
      const taken = (await ok(() => sb.from('streams').select('slug'))) as { slug: string }[]
      const snap = { streams: taken as Stream[], materials: [], parts: [], sessions: [], notes: [] }

      const tried: string[] = []
      for (let attempt = 0; attempt < SLUG_TRIES; attempt++) {
        const slug = nextSlug(snap, item.name, tried)
        const { data, error } = await retrying(() =>
          sb.from('streams').insert({ ...item, slug }).select('*').single(),
        )
        if (!error) return data as Stream
        // Занят — значит, его забрали между чтением и вставкой: пробуем следующий.
        if (error.code !== DUPLICATE) throw new Error(error.message)
        tried.push(slug)
      }
      throw new Error(`Не удалось подобрать свободный адрес для потока «${item.name}»`)
    },
    async updateStream(id, patch) {
      // Адрес не меняется никогда, даже если его прислали: ссылка на поток
      // должна пережить переименование.
      const { slug: _keep, ...safe } = patch
      await ok(() =>
        sb
          .from('streams')
          .update({ ...safe, updated_at: now() })
          .eq('id', id),
      )
    },
    async deleteStream(id) {
      // Материалы, их части и конспекты уносит каскад, фокус на удалённом
      // материале снимает `on delete set null`. Отсюда — один запрос.
      await ok(() => sb.from('streams').delete().eq('id', id))
    },

    async addMaterial(item: NewMaterial) {
      // Несвязанный материал пишется без ключа: на базе до миграции 008
      // колонки нет, и пустое значение уронило бы запись целиком.
      const { book_id, ...rest } = item
      const made = (await ok(() =>
        sb.from('materials').insert(book_id ? item : rest).select('*').single(),
      )) as Material
      return { ...made, book_id: made.book_id ?? null }
    },
    async updateMaterial(id, patch) {
      const after = (await ok(() =>
        sb
          .from('materials')
          .update({ ...patch, updated_at: now() })
          .eq('id', id)
          .select('*')
          .single(),
      )) as Material
      // Сначала материал, потом зачистка. В обратном порядке отказ на правке
      // самого материала оставил бы фокус снятым у того, кто никуда не уезжал.
      await settle(after, patch)
    },
    async deleteMaterial(id) {
      await ok(() => sb.from('materials').delete().eq('id', id))
    },

    async addPart(item: NewMaterialPart) {
      // Неначатая часть пишется без ключа: на базе до миграции 009 колонки нет.
      const { started, ...rest } = item
      const made = (await ok(() =>
        sb.from('material_parts').insert(started ? item : rest).select('*').single(),
      )) as MaterialPart
      return { ...made, started: made.started ?? false }
    },
    async updatePart(id, patch) {
      await ok(() => sb.from('material_parts').update(patch).eq('id', id))
    },
    async deletePart(id) {
      // Конспект переживает главу: указатель обнуляет `on delete set null`.
      await ok(() => sb.from('material_parts').delete().eq('id', id))
    },

    async addSession(item: NewStudySession) {
      // Без пары и без начатых — без ключей: на базе до миграций 008 и 009
      // колонок нет, и пустое значение уронило бы запись целиком.
      const { book_session_id, started_ids, ...rest } = item
      const row = {
        ...rest,
        ...(book_session_id ? { book_session_id } : {}),
        ...(started_ids?.length ? { started_ids } : {}),
      }
      const made = (await ok(() =>
        sb.from('study_sessions').insert(row).select('*').single(),
      )) as StudySession
      return { ...made, book_session_id: made.book_session_id ?? null, started_ids: made.started_ids ?? [] }
    },
    async updateSession(id, patch) {
      await ok(() => sb.from('study_sessions').update(patch).eq('id', id))
    },
    async deleteSession(id) {
      // Конспекты занятия отвязывает `on delete set null`.
      await ok(() => sb.from('study_sessions').delete().eq('id', id))
    },

    async addNote(item: NewStudyNote) {
      // Конспект без занятия пишется без ключа: на базе до миграции 007
      // колонки нет, и пустое значение уронило бы запись целиком.
      const { session_id, ...rest } = item
      const row = session_id ? item : rest
      const made = (await ok(() =>
        sb.from('study_notes').insert(row).select('*').single(),
      )) as StudyNote
      return { ...made, session_id: made.session_id ?? null }
    },
    async updateNote(id, patch) {
      await ok(() =>
        sb
          .from('study_notes')
          .update({ ...patch, updated_at: now() })
          .eq('id', id),
      )
    },
    async deleteNote(id) {
      await ok(() => sb.from('study_notes').delete().eq('id', id))
    },
  }
}
