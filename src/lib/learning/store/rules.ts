/**
 * Что означает мутация обучения — отдельно от того, где она записывается.
 *
 * Эти правила нужны троим сразу: локальному хранилищу, сетевому стору и
 * экрану, который показывает результат, не дожидаясь ответа сервера. Пока они
 * жили внутри `local.ts`, второму и третьему взять их было негде, а написать
 * заново значило завести три расходящиеся копии одного правила.
 *
 * Функции чистые: снимок не мутируется, время и адрес приходят аргументом.
 * Иначе «фокус слетает при смене статуса» проверялось бы через localStorage,
 * то есть не проверялось бы вовсе.
 */

import { hasParts } from '../parts'
import { streamSlug } from '../slug'
import type {
  LearningSnapshot,
  Material,
  MaterialPart,
  Stream,
  StudyNote,
  StudySession,
} from '../types'

/** Коллекции снимка, в которые можно положить созданную строку. */
export interface Rows {
  streams: Stream
  materials: Material
  parts: MaterialPart
  sessions: StudySession
  notes: StudyNote
}

/** Кладёт строку, которую уже создало хранилище, в снимок. */
export function insert<K extends keyof Rows>(
  snap: LearningSnapshot,
  collection: K,
  row: Rows[K],
): LearningSnapshot {
  return { ...snap, [collection]: [...snap[collection], row] } as LearningSnapshot
}

/**
 * Адрес для нового потока.
 *
 * `extra` — адреса, занятые помимо снимка: сетевой стор пробует следующий
 * после того, как база отвергла дубликат, и снимок про этот отказ не знает.
 */
export function nextSlug(
  snap: LearningSnapshot,
  name: string,
  extra: readonly string[] = [],
): string {
  return streamSlug(name, [...snap.streams.map((s) => s.slug), ...extra])
}

export function updateStream(
  snap: LearningSnapshot,
  id: string,
  patch: Partial<Stream>,
  now: string,
): LearningSnapshot {
  // Адрес не меняется никогда, даже если его прислали: ссылка на поток должна
  // пережить переименование.
  const { slug: _keep, ...safe } = patch
  return {
    ...snap,
    streams: snap.streams.map((s) => (s.id === id ? { ...s, ...safe, updated_at: now } : s)),
  }
}

export function removeStream(snap: LearningSnapshot, id: string): LearningSnapshot {
  const gone = new Set(snap.materials.filter((m) => m.stream_id === id).map((m) => m.id))
  return {
    streams: snap.streams
      .filter((s) => s.id !== id)
      // Указатель на удалённый материал не переживает чистку, чей бы поток его
      // ни держал: фокус чужого потока на этом материале так же мёртв.
      .map((s) =>
        s.focus_material_id && gone.has(s.focus_material_id)
          ? { ...s, focus_material_id: null }
          : s,
      ),
    materials: snap.materials.filter((m) => m.stream_id !== id),
    parts: snap.parts.filter((p) => !gone.has(p.material_id)),
    sessions: snap.sessions.filter((x) => !gone.has(x.material_id)),
    notes: snap.notes.filter((n) => !gone.has(n.material_id)),
  }
}

/**
 * Что меняется кроме самого материала.
 *
 * Снимку этого знания мало — ему нужен результат, — а сетевому стору мало
 * результата: ему нужно знать, какие строки тронуть. Развилка одна, поэтому и
 * считается она один раз, здесь.
 */
export interface MaterialEffects {
  /** Потоки, у которых слетает фокус. */
  unfocus: string[]
  /** Части, уходящие вместе со сменой вида или шкалы. */
  dropParts: string[]
}

/**
 * Два условия, по которым правка материала задевает соседей.
 *
 * Названы отдельно, потому что применяются двумя способами: по снимку в
 * памяти — здесь, и запросом по строкам — в сетевом сторе, которому снимка
 * взять негде. Способа два неизбежно, условие должно остаться одно.
 */
export const losesFocus = (after: Pick<Material, 'status'>) => after.status !== 'active'
export const losesParts = (after: Pick<Material, 'kind' | 'scale'>) => !hasParts(after)

export function materialEffects(
  snap: LearningSnapshot,
  id: string,
  patch: Partial<Material>,
): MaterialEffects {
  const before = snap.materials.find((m) => m.id === id)
  if (!before) return { unfocus: [], dropParts: [] }
  const after = { ...before, ...patch }

  const unfocus = new Set<string>()
  // Материал, уехавший в другой поток, не может оставаться фокусом прежнего.
  if (patch.stream_id && patch.stream_id !== before.stream_id) {
    for (const s of snap.streams) {
      if (s.id === before.stream_id && s.focus_material_id === id) unfocus.add(s.id)
    }
  }
  // Фокус — это «за что сесть». Материал, ушедший из работы, перестаёт им быть,
  // иначе дашборд продолжает звать к тому, что уже отложено или пройдено.
  if (patch.status && losesFocus(after)) {
    for (const s of snap.streams) {
      if (s.focus_material_id === id) unfocus.add(s.id)
    }
  }

  // Вид или шкала, при которых частей не бывает, уносят и сами части. Иначе
  // они остаются невидимым грузом и возвращаются на экран, стоит переключить
  // вид обратно, — с отметками, которых человек уже не помнит.
  //
  // Считается только когда правка этих полей и касается: уборка чужих частей
  // при переименовании — работа, за которой никто не просил, и в сетевом
  // сторе она стоила бы лишнего запроса на каждую правку.
  const touchesShape = patch.kind !== undefined || patch.scale !== undefined
  const dropParts =
    touchesShape && losesParts(after)
      ? snap.parts.filter((p) => p.material_id === id).map((p) => p.id)
      : []

  return { unfocus: [...unfocus], dropParts }
}

export function updateMaterial(
  snap: LearningSnapshot,
  id: string,
  patch: Partial<Material>,
  now: string,
): LearningSnapshot {
  const { unfocus, dropParts } = materialEffects(snap, id, patch)
  const lost = new Set(unfocus)
  const cut = new Set(dropParts)

  return {
    streams: snap.streams.map((s) =>
      lost.has(s.id) ? { ...s, focus_material_id: null, updated_at: now } : s,
    ),
    materials: snap.materials.map((m) => (m.id === id ? { ...m, ...patch, updated_at: now } : m)),
    parts: snap.parts.filter((p) => !cut.has(p.id)),
    // Ушедшая часть уходит и из занятий, которые её отметили: иначе откат
    // занятия пытался бы снять отметку с того, чего нет.
    sessions: cut.size
      ? snap.sessions.map((x) => ({
          ...x,
          part_ids: x.part_ids.filter((p) => !cut.has(p)),
          started_ids: x.started_ids.filter((p) => !cut.has(p)),
        }))
      : snap.sessions,
    notes: snap.notes,
  }
}

export function removeMaterial(snap: LearningSnapshot, id: string): LearningSnapshot {
  return {
    streams: snap.streams.map((s) =>
      s.focus_material_id === id ? { ...s, focus_material_id: null } : s,
    ),
    materials: snap.materials.filter((m) => m.id !== id),
    parts: snap.parts.filter((p) => p.material_id !== id),
    sessions: snap.sessions.filter((x) => x.material_id !== id),
    notes: snap.notes.filter((n) => n.material_id !== id),
  }
}

export function updatePart(
  snap: LearningSnapshot,
  id: string,
  patch: Partial<MaterialPart>,
): LearningSnapshot {
  return { ...snap, parts: snap.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
}

/**
 * Удалённая часть не уносит конспекты за собой: написанное о главе переживает
 * саму главу. Указатель обнуляется — ровно то же делает `on delete set null`
 * в базе, и оба должны говорить одно.
 */
export function removePart(snap: LearningSnapshot, id: string): LearningSnapshot {
  return {
    ...snap,
    parts: snap.parts.filter((p) => p.id !== id),
    sessions: snap.sessions.map((x) =>
      x.part_ids.includes(id) || x.started_ids.includes(id)
        ? {
            ...x,
            part_ids: x.part_ids.filter((p) => p !== id),
            started_ids: x.started_ids.filter((p) => p !== id),
          }
        : x,
    ),
    notes: snap.notes.map((n) => (n.part_id === id ? { ...n, part_id: null } : n)),
  }
}

export function updateSession(
  snap: LearningSnapshot,
  id: string,
  patch: Partial<StudySession>,
): LearningSnapshot {
  return {
    ...snap,
    sessions: snap.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  }
}

/**
 * Удалённое занятие не уносит своих конспектов: написанное за ним остаётся
 * написанным, просто уже ни к какому заходу не привязано. То же делает
 * `on delete set null` в базе и `deleteSession` в чтении.
 */
export function removeSession(snap: LearningSnapshot, id: string): LearningSnapshot {
  return {
    ...snap,
    sessions: snap.sessions.filter((x) => x.id !== id),
    notes: snap.notes.map((n) => (n.session_id === id ? { ...n, session_id: null } : n)),
  }
}

export function updateNote(
  snap: LearningSnapshot,
  id: string,
  patch: Partial<StudyNote>,
  now: string,
): LearningSnapshot {
  return {
    ...snap,
    notes: snap.notes.map((n) => (n.id === id ? { ...n, ...patch, updated_at: now } : n)),
  }
}

export function removeNote(snap: LearningSnapshot, id: string): LearningSnapshot {
  return { ...snap, notes: snap.notes.filter((n) => n.id !== id) }
}
