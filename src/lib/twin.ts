import type { Material, StudySession } from './learning/types'
import type { Session } from './types'

/**
 * Одна книга в двух местах: на полке и в потоке.
 *
 * Это две записи, а не одна сущность: у книги фокус на всё приложение, отзыв
 * и оценка, у материала — поток, вид и свой фокус в потоке, и слить их значило
 * бы переписать оба раздела ради одной функции. Вместо этого записи связаны
 * (`material.book_id`), а каждое занятие со страницами держит пару — сессию
 * книги (`study_session.book_session_id`). Вся арифметика обоих разделов
 * остаётся как есть; здесь только то, что переносится с одной стороны на
 * другую.
 *
 * Функции чистые: что записать, решается здесь, записывает
 * `useSessionWrites`.
 */

/**
 * Связать можно только книгу по страницам. Чтение меряет страницами всё —
 * темп, процент, «застряли», — и шагу по главам на полке лечь некуда.
 */
export const canLink = (m: Pick<Material, 'kind' | 'scale'>) => m.kind === 'book' && m.scale === 'pages'

/** То, что у сессии и занятия общее и что переносится на пару. */
export interface Step {
  date: string
  page_from: number
  page_to: number
  minutes: number | null
  rating: number | null
}

type StudyFields = Pick<StudySession, 'date' | 'page_from' | 'page_to' | 'minutes' | 'rating'>
type ReadingFields = Pick<Session, 'date' | 'page_from' | 'page_to' | 'minutes' | 'rating'>

/**
 * Шаг занятия. Без страницы «до» его нет: занятие, где записали только
 * минуты, остаётся на своей стороне — сессии чтения без страниц не бывает.
 */
export function studyStep(s: StudyFields): Step | null {
  if (s.page_to === null) return null
  return {
    date: s.date,
    page_from: s.page_from ?? s.page_to,
    page_to: s.page_to,
    minutes: s.minutes,
    rating: s.rating,
  }
}

export function readingStep(s: ReadingFields): Step {
  return { date: s.date, page_from: s.page_from, page_to: s.page_to, minutes: s.minutes, rating: s.rating }
}

const sameStep = (a: Step, b: Step) =>
  a.date === b.date &&
  a.page_from === b.page_from &&
  a.page_to === b.page_to &&
  a.minutes === b.minutes &&
  a.rating === b.rating

export type MirrorOp =
  | { kind: 'add'; step: Step }
  | { kind: 'update'; id: string; step: Step }
  | { kind: 'delete'; id: string }
  | null

/**
 * Что сделать с парой после записи на своей стороне.
 *
 * Одна функция на завели, поправили и удалили: удаление — это шаг, которого
 * больше нет, а правка, после которой страниц не осталось, — то же самое.
 */
export function mirrorOp(step: Step | null, twin: { id: string; step: Step | null } | null): MirrorOp {
  if (!step) return twin ? { kind: 'delete', id: twin.id } : null
  if (!twin) return { kind: 'add', step }
  if (twin.step && sameStep(step, twin.step)) return null
  return { kind: 'update', id: twin.id, step }
}

type Extra = Partial<Pick<Step, 'minutes' | 'rating'>>

export interface HistoryPlan {
  /** Одна и та же сессия, записанная дважды, и чего недостаёт каждой стороне. */
  pairs: { studyId: string; sessionId: string; study: Extra; session: Extra }[]
  /** Занятия, которых нет на полке. */
  toReading: { studyId: string; step: Step }[]
  /** Сессии, которых нет в потоке. */
  toStudy: { sessionId: string; step: Step }[]
  /** Докуда дошли с любой из сторон. */
  page: number | null
}

/** Чего недостаёт одной стороне из того, что есть у другой. Своё не трогается. */
function missing(own: Extra, other: Extra): Extra {
  const out: Extra = {}
  if (own.minutes === null && other.minutes !== null) out.minutes = other.minutes
  if (own.rating === null && other.rating !== null) out.rating = other.rating
  return out
}

/**
 * Сведение истории при связывании.
 *
 * Старые копии жили врозь, и одно и то же чтение часто записано в обоих
 * местах. Сессия того же дня с той же страницей «до» — это оно: такие
 * спариваются, а не копируются, иначе дашборд чтения насчитал бы вдвое.
 * Остальное со страницами копируется на другую сторону.
 */
export function mergeHistory(reading: Session[], study: StudySession[]): HistoryPlan {
  const plan: HistoryPlan = { pairs: [], toReading: [], toStudy: [], page: null }
  const reach = (page: number) => {
    plan.page = plan.page === null ? page : Math.max(plan.page, page)
  }

  const known = new Set(reading.map((r) => r.id))
  const taken = new Set<string>()
  for (const s of study) {
    if (s.book_session_id && known.has(s.book_session_id)) taken.add(s.book_session_id)
  }

  for (const s of study) {
    const step = studyStep(s)
    if (!step) continue
    reach(step.page_to)
    if (s.book_session_id && known.has(s.book_session_id)) continue

    const same = reading.find((r) => !taken.has(r.id) && r.date === step.date && r.page_to === step.page_to)
    if (same) {
      taken.add(same.id)
      plan.pairs.push({
        studyId: s.id,
        sessionId: same.id,
        study: missing(s, same),
        session: missing(same, s),
      })
    } else {
      plan.toReading.push({ studyId: s.id, step })
    }
  }

  for (const r of reading) {
    reach(r.page_to)
    if (!taken.has(r.id)) plan.toStudy.push({ sessionId: r.id, step: readingStep(r) })
  }

  return plan
}
