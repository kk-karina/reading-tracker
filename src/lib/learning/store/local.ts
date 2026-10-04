import { streamSlug } from '../slug'
import {
  emptyLearning,
  KINDS,
  type LearningSnapshot,
  type Material,
  type MaterialKind,
  type MaterialPart,
  type MaterialStatus,
  type Stream,
  type StudyNote,
  type StudySession,
} from '../types'
import * as rules from './rules'
import type {
  LearningStore,
  NewMaterial,
  NewMaterialPart,
  NewStream,
  NewStudyNote,
  NewStudySession,
} from './types'

const KEY = 'readingtracker.learning.v3'
/** Снимок до того, как вид материала стал определять его поля. */
const KEY_V2 = 'readingtracker.learning.v2'
/** Снимок до переименования категории в поток. Читается один раз и остаётся на месте. */
const KEY_V1 = 'readingtracker.learning.v1'

type CategoryV1 = Omit<Stream, 'slug' | 'goal' | 'focus_material_id'>
interface MaterialV1 extends Omit<MaterialV2, 'stream_id'> {
  category_id: string
}
interface SnapshotV1 {
  categories: CategoryV1[]
  materials: MaterialV1[]
  notes: StudyNote[]
}

/** Материал v2: один набор полей на все виды, число частей вместо списка. */
interface MaterialV2 extends Omit<Material, 'scale' | 'pages_total' | 'page_current' | 'kind'> {
  kind: string
  parts_total: number | null
}
interface SnapshotV2 {
  streams: Stream[]
  materials: MaterialV2[]
  notes: StudyNote[]
}

/**
 * Адреса выдаются в порядке сортировки, поэтому переезд одного и того же
 * снимка всегда даёт одни и те же ссылки.
 */
function migrateV1(old: SnapshotV1): SnapshotV2 {
  // Снимок v1 приходит из JSON: доверять его форме нельзя — битые поля не
  // должны ронять переезд и превращать read-only сессию в пустую.
  const categories = Array.isArray(old.categories) ? old.categories : []
  const oldMaterials = Array.isArray(old.materials) ? old.materials : []
  const notes = Array.isArray(old.notes) ? old.notes : []
  const taken: string[] = []
  const streams = categories.map((c) => {
    // Категория без имени всё равно получает адрес: `stream-N` вместо падения на `.toLowerCase()`.
    const slug = streamSlug(String(c.name ?? ''), taken)
    taken.push(slug)
    return { ...c, slug, goal: null, focus_material_id: null }
  })
  const materials = oldMaterials.map(({ category_id, ...rest }) => ({
    ...rest,
    stream_id: category_id,
  }))
  return { streams, materials, notes }
}

/**
 * Куда деваются виды, которых больше нет.
 *
 * Подкаст уходит в видео: слушала или смотрела — тумблер один и тот же.
 * «Другое» уходит в статью: цельная вещь, которую прочла или не прочла, — это
 * самое безобидное, чем может оказаться материал без собственного поведения.
 */
function migrateKind(kind: string): MaterialKind {
  if (kind === 'podcast') return 'video'
  return (KINDS as readonly string[]).includes(kind) ? (kind as MaterialKind) : 'article'
}

/**
 * Переезд v2 → v3: вид начинает определять поля, число частей становится списком.
 *
 * Пройденными помечаются первые части по числу написанных конспектов. Это
 * перенос показания, а не утверждение о том, какие именно главы пройдены:
 * человек видел на экране «12 из 20» и после обновления должен увидеть то же
 * самое. Угадывать по тексту конспекта, какая это была глава, честнее не будет.
 */
function migrateV2(old: SnapshotV2): LearningSnapshot {
  const streams = Array.isArray(old.streams) ? old.streams : []
  const oldMaterials = Array.isArray(old.materials) ? old.materials : []
  const notes = Array.isArray(old.notes) ? old.notes : []

  const materials: Material[] = []
  const parts: MaterialPart[] = []

  for (const { parts_total, ...rest } of oldMaterials) {
    const kind = migrateKind(String(rest.kind ?? ''))
    const count = Number(parts_total) > 0 ? Math.floor(Number(parts_total)) : 0
    const scale: Material['scale'] = kind === 'book' ? (count > 0 ? 'parts' : 'pages') : null

    const material: Material = {
      ...rest,
      kind,
      scale,
      pages_total: null,
      page_current: null,
      cover_url: rest.cover_url ?? null,
    }
    materials.push(material)

    if (count > 0 && (kind === 'course' || scale === 'parts')) {
      const written = notes.filter((n) => n.material_id === material.id).length
      for (let i = 0; i < count; i++) {
        // Имени нет намеренно: безымянная часть зовётся своим номером по
        // порядку, и хранилищу не нужно знать язык, на котором это напишут.
        parts.push({ id: uid(), material_id: material.id, title: '', done: i < written, sort: i })
      }
    }
  }

  return { streams, materials, parts, sessions: [], notes }
}

/**
 * Бэклог был разделён на входящее, «когда-нибудь» и справку. Все трое значили
 * одно: материал заведён и ждёт. Старые снимки несут эти слова и читаются как
 * «в очереди» — различие ушло из интерфейса, а не из данных, и придумывать
 * ему замену при чтении нечем.
 *
 * Тем же путём сюда же складывается «брошено»: статуса такого больше нет, а
 * брошенное — это не пройденное, это переставшее двигаться, то есть очередь.
 * Терять на этом нечего: статус теперь всё равно считается из сделанного, и
 * материал с отмеченными главами тут же вернётся в работу.
 */
const KEPT_STATUSES = ['active', 'done'] as const
const backlogStatus = (status: string): MaterialStatus =>
  (KEPT_STATUSES as readonly string[]).includes(status) ? (status as MaterialStatus) : 'backlog'

/**
 * Поля, которых в снимке могло не быть, и значения, которых в нём больше нет.
 *
 * Не миграция и не новая версия ключа: `part_id` появился позже конспектов и
 * допускает пустоту, а три бывшие корзины бэклога складываются в одну без
 * потерь, так что старый снимок остаётся валидным. Поднимать из-за этого
 * версию значило бы переписывать всё хранилище ради одного `null` и одного
 * переименованного слова.
 */
const fill = (snap: LearningSnapshot): LearningSnapshot => ({
  ...snap,
  materials: snap.materials.map((m) => ({ ...m, status: backlogStatus(m.status) })),
  // Занятия появились позже всего остального: снимок без них — просто снимок,
  // в котором занятий ещё не записывали.
  sessions: Array.isArray(snap.sessions) ? snap.sessions : [],
  notes: snap.notes.map((n) => ({ ...n, part_id: n.part_id ?? null, session_id: n.session_id ?? null })),
})

function read(): LearningSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      return fill({ ...emptyLearning(), ...(JSON.parse(raw) as Partial<LearningSnapshot>) })
    }

    // Записи прежних версий не удаляются: пара килобайт против единственной
    // копии конспектов.
    const v2 = localStorage.getItem(KEY_V2)
    const v1 = v2 ? null : localStorage.getItem(KEY_V1)
    if (!v2 && !v1) return emptyLearning()

    const before: SnapshotV2 = v2
      ? { streams: [], materials: [], notes: [], ...(JSON.parse(v2) as Partial<SnapshotV2>) }
      : migrateV1({
          categories: [],
          materials: [],
          notes: [],
          ...(JSON.parse(v1 as string) as Partial<SnapshotV1>),
        })

    const moved = migrateV2(before)
    // Сохранить не получилось — не повод выбрасывать уже посчитанный снимок:
    // он годен для показа независимо от записи, а его потеря выглядит для
    // пользователя неотличимо от настоящей потери данных.
    try {
      write(moved)
    } catch {
      /* хранилище недоступно на запись: сеанс проживёт без сохранения */
    }
    return fill(moved)
  } catch {
    /* испорченное или закрытое хранилище: начинаем с пустого */
  }
  return emptyLearning()
}

function write(snap: LearningSnapshot) {
  localStorage.setItem(KEY, JSON.stringify(snap))
}

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

/**
 * Запись в localStorage поверх общих правил: прочитать снимок, применить
 * правило, записать результат. Что именно означает мутация, здесь больше не
 * решается — см. `rules.ts`.
 */
const change = (fn: (snap: LearningSnapshot) => LearningSnapshot) => {
  write(fn(read()))
}

export const localLearning: LearningStore = {
  async load() {
    return read()
  },

  async addStream(item: NewStream) {
    const snap = read()
    const made: Stream = {
      ...item,
      id: uid(),
      slug: rules.nextSlug(snap, item.name),
      goal: null,
      focus_material_id: null,
      archived: false,
      created_at: now(),
      updated_at: now(),
    }
    write(rules.insert(snap, 'streams', made))
    return made
  },
  async updateStream(id, patch) {
    change((snap) => rules.updateStream(snap, id, patch, now()))
  },
  async deleteStream(id) {
    change((snap) => rules.removeStream(snap, id))
  },

  async addMaterial(item: NewMaterial) {
    const made: Material = { ...item, id: uid(), created_at: now(), updated_at: now() }
    change((snap) => rules.insert(snap, 'materials', made))
    return made
  },
  async updateMaterial(id, patch) {
    change((snap) => rules.updateMaterial(snap, id, patch, now()))
  },
  async deleteMaterial(id) {
    change((snap) => rules.removeMaterial(snap, id))
  },

  async addPart(item: NewMaterialPart) {
    const made: MaterialPart = { ...item, id: uid() }
    change((snap) => rules.insert(snap, 'parts', made))
    return made
  },
  async updatePart(id, patch) {
    change((snap) => rules.updatePart(snap, id, patch))
  },
  async deletePart(id) {
    change((snap) => rules.removePart(snap, id))
  },

  async addSession(item: NewStudySession) {
    const made: StudySession = { ...item, id: uid(), created_at: now() }
    change((snap) => rules.insert(snap, 'sessions', made))
    return made
  },
  async updateSession(id, patch) {
    change((snap) => rules.updateSession(snap, id, patch))
  },
  async deleteSession(id) {
    change((snap) => rules.removeSession(snap, id))
  },

  async addNote(item: NewStudyNote) {
    const made: StudyNote = { ...item, id: uid(), created_at: now(), updated_at: now() }
    change((snap) => rules.insert(snap, 'notes', made))
    return made
  },
  async updateNote(id, patch) {
    change((snap) => rules.updateNote(snap, id, patch, now()))
  },
  async deleteNote(id) {
    change((snap) => rules.removeNote(snap, id))
  },
}
