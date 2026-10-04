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
  parts: Pick<MaterialPart, 'id' | 'done'>[]
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
  fx.parts = session.part_ids.map((id) => ({ id, done: true }))
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
  fx.parts = session.part_ids.map((id) => ({ id, done: false }))
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
