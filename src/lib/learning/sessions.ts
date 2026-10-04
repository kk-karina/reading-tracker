import type { PartState } from './parts'
import type { Material, MaterialPart, StudyNote, StudySession } from './types'

/**
 * Что занятие меняет в материале и его частях.
 *
 * Прогресс в обучении хранится на материале, а не считается из занятий, как
 * в чтении из сессий: страницу и главы правят и со страницы материала, и
 * старые конспекты были написаны задолго до того, как занятия появились.
 * Поэтому занятие пишет шаг, а не состояние, — и всё, что с ним делают
 * (завели, поправили, удалили), сводится к тому, какой шаг применить.
 *
 * Функции чистые и отвечают одним видом: заплатка материала и список частей с
 * их будущей отметкой. Лист применяет их как есть.
 */
export interface SessionEffects {
  material: Partial<Material>
  /** Отметка «пройдена» и «начата» — каждая только если занятие её меняет. */
  parts: (Pick<MaterialPart, 'id'> & Partial<Pick<MaterialPart, 'done' | 'started'>>)[]
}

const none = (): SessionEffects => ({ material: {}, parts: [] })

/**
 * Последнее ли занятие у своего материала.
 *
 * Только последнее двигает страницу: поправить число в занятии месячной
 * давности не значит откатить сегодняшнюю.
 */
export function isLatest(sessions: StudySession[], session: StudySession): boolean {
  const later = (a: StudySession, b: StudySession) =>
    a.date > b.date || (a.date === b.date && a.created_at > b.created_at)
  return !sessions.some(
    (s) => s.material_id === session.material_id && s.id !== session.id && later(s, session),
  )
}

/** Новое занятие. */
export function applySession(material: Material, session: StudySession): SessionEffects {
  const fx = none()
  if (session.page_to !== null && session.page_to !== material.page_current) {
    fx.material.page_current = session.page_to
  }
  if (session.completed && material.status !== 'done') fx.material.status = 'done'
  fx.parts = [
    ...session.part_ids.map((id) => ({ id, done: true })),
    ...session.started_ids.map((id) => ({ id, started: true })),
  ]
  return fx
}

/**
 * Правка занятия.
 *
 * «Прошла целиком» снимается в очередь, а не в работу: из чего статус выйдет
 * дальше, решает `statusOf` по написанному, и угадывать за него незачем.
 */
export function diffSession(
  material: Material,
  sessions: StudySession[],
  before: StudySession,
  after: StudySession,
): SessionEffects {
  const fx = none()

  if (
    after.page_to !== null &&
    after.page_to !== before.page_to &&
    isLatest(sessions, before) &&
    after.page_to !== material.page_current
  ) {
    fx.material.page_current = after.page_to
  }

  if (after.completed !== before.completed) fx.material.status = after.completed ? 'done' : 'backlog'

  const was = new Set(before.part_ids)
  const will = new Set(after.part_ids)
  for (const id of before.part_ids) if (!will.has(id)) fx.parts.push({ id, done: false })
  for (const id of after.part_ids) if (!was.has(id)) fx.parts.push({ id, done: true })

  const wasStarted = new Set(before.started_ids)
  const willStart = new Set(after.started_ids)
  for (const id of before.started_ids) if (!willStart.has(id)) fx.parts.push({ id, started: false })
  for (const id of after.started_ids) if (!wasStarted.has(id)) fx.parts.push({ id, started: true })

  return fx
}

/**
 * Удаление занятия откатывает его шаг — так же, как в чтении, где удалённая
 * сессия уносит с собой и прочитанные страницы.
 *
 * Страница возвращается туда, где занятие началось, и только если оно было
 * последним: удалить старое — не значит забыть, докуда дочитала потом.
 */
export function rollbackSession(
  material: Material,
  sessions: StudySession[],
  session: StudySession,
): SessionEffects {
  const fx = none()
  if (
    session.page_to !== null &&
    session.page_from !== null &&
    isLatest(sessions, session) &&
    material.page_current !== session.page_from
  ) {
    fx.material.page_current = session.page_from
  }
  if (session.completed) fx.material.status = 'backlog'
  fx.parts = [
    ...session.part_ids.map((id) => ({ id, done: false })),
    ...session.started_ids.map((id) => ({ id, started: false })),
  ]
  return fx
}

/**
 * Дни, в которые что-то было: занятие или конспект.
 *
 * На этом стоят ритм, стрик и «последний раз». Пока считались одни конспекты,
 * записанный без текста прогресс выглядел как пропущенный день.
 */
export function activityDates(
  sessions: Pick<StudySession, 'date'>[],
  notes: Pick<StudyNote, 'date'>[],
): string[] {
  return [...new Set([...sessions.map((s) => s.date), ...notes.map((n) => n.date)])]
}

/** Когда за материал садились в последний раз — занятием или конспектом. */
export function lastTouched(
  materialId: string,
  sessions: Pick<StudySession, 'material_id' | 'date'>[],
  notes: Pick<StudyNote, 'material_id' | 'date'>[],
): string | null {
  let last: string | null = null
  for (const row of [...sessions, ...notes]) {
    if (row.material_id === materialId && (last === null || row.date > last)) last = row.date
  }
  return last
}

/**
 * Что прямая правка прогресса делает с журналом.
 *
 * Прогресс правят и мимо листа занятия: точкой главы на странице материала. Пока такие правки меняли один материал, у них не
 * было даты: глава отмечена, а в ритме, стрике и вкладке «Занятия» — пусто,
 * и дашборд потока молчал о том, что за материал садились. Теперь прямая
 * правка — тоже занятие: сегодняшнее по этому материалу, а если его нет —
 * новое. У прогресса один источник времени. Страницу прямо на странице
 * материала больше не ставят — только листом занятия.
 */
export type SessionOp =
  | { kind: 'add'; session: Omit<StudySession, 'id' | 'created_at' | 'book_session_id'> }
  | { kind: 'update'; id: string; patch: Partial<StudySession> }
  | { kind: 'delete'; id: string }

const todayOf = (sessions: StudySession[], materialId: string, today: string) =>
  sessions.find((s) => s.material_id === materialId && s.date === today)

const blankSession = (materialId: string, today: string): Omit<StudySession, 'id' | 'created_at' | 'book_session_id'> => ({
  material_id: materialId,
  date: today,
  page_from: null,
  page_to: null,
  part_ids: [],
  started_ids: [],
  completed: false,
  minutes: null,
  rating: null,
})

/**
 * Занятие, от которого после правки ничего не осталось: ни шага, ни минут,
 * ни оценки, ни написанного. Такое удаляется, а не висит пустой строкой.
 */
function hollow(s: StudySession, notes: Pick<StudyNote, 'session_id'>[]): boolean {
  const moved =
    s.part_ids.length > 0 ||
    s.started_ids.length > 0 ||
    s.completed ||
    (s.page_to !== null && s.page_to !== s.page_from)
  return !moved && s.minutes === null && s.rating === null && !notes.some((n) => n.session_id === s.id)
}

/**
 * Точку главы перевели на странице материала в новое состояние — цикл
 * «пусто → начата → пройдена → пусто» (см. `nextPartState`).
 */
export function markPart(
  sessions: StudySession[],
  notes: Pick<StudyNote, 'session_id'>[],
  material: Material,
  partId: string,
  to: PartState,
  today: string,
): SessionOp | null {
  if (to !== 'fresh') {
    const same = todayOf(sessions, material.id, today)
    if (to === 'started') {
      if (!same) return { kind: 'add', session: { ...blankSession(material.id, today), started_ids: [partId] } }
      if (same.started_ids.includes(partId)) return null
      return { kind: 'update', id: same.id, patch: { started_ids: [...same.started_ids, partId] } }
    }
    if (!same) return { kind: 'add', session: { ...blankSession(material.id, today), part_ids: [partId] } }
    if (same.part_ids.includes(partId)) return null
    // Начала и закончила в один день — это одно «пройдена», а не две отметки.
    const patch: Partial<StudySession> = { part_ids: [...same.part_ids, partId] }
    if (same.started_ids.includes(partId)) patch.started_ids = same.started_ids.filter((id) => id !== partId)
    return { kind: 'update', id: same.id, patch }
  }

  // Снять — из того занятия, что её отметило, самого свежего из таких.
  // Часть, отмеченная до появления занятий, ни в одном не числится.
  const host = sessions
    .filter((s) => s.material_id === material.id && s.part_ids.includes(partId))
    .sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)))[0]
  if (!host) return null
  const left = { ...host, part_ids: host.part_ids.filter((id) => id !== partId) }
  if (hollow(left, notes)) return { kind: 'delete', id: host.id }
  return { kind: 'update', id: host.id, patch: { part_ids: left.part_ids } }
}
