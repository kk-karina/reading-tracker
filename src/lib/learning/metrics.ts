import { fromISO, todayISO } from '../format'
import { hasParts, partsOf } from './parts'
import type { Material, MaterialPart, StudyNote } from './types'

/** Чем меряется прогресс — от этого зависит подпись под полосой. */
export type ProgressUnit = 'page' | 'part' | 'flag'

export interface MaterialProgress {
  done: number
  total: number | null
  percent: number | null
  unit: ProgressUnit
}

/**
 * Сколько пройдено — по правилу того вида, к которому материал относится.
 *
 * Раньше правило было одно на всех: пройдено то, по чему написан конспект.
 * Оно стояло на верной мысли, что потребление и обучение это не одно и то же,
 * но следствием было то, что цельную статью нельзя закрыть вообще — глав у неё
 * нет, а значит нет и способа отметить её прочитанной. Теперь отметка явная, а
 * «сколько написано» живёт отдельной величиной и отдельной строкой на экране.
 *
 * `total === null` значит «мерить нечем»: страниц не знаем, частей ещё нет.
 * Тогда и полосы не рисуют — врать шириной хуже, чем не показывать.
 */
export function materialProgress(material: Material, parts: MaterialPart[]): MaterialProgress {
  if (material.kind === 'article' || material.kind === 'video') {
    const done = material.status === 'done' ? 1 : 0
    return { done, total: 1, percent: done * 100, unit: 'flag' }
  }

  if (hasParts(material)) {
    const mine = partsOf(parts, material.id)
    const done = mine.filter((p) => p.done).length
    const total = mine.length > 0 ? mine.length : null
    return { done, total, percent: ratio(done, total), unit: 'part' }
  }

  // Книга по страницам. Ноль страниц всего — это «не знаю», а не «книга пуста».
  const total = material.pages_total && material.pages_total > 0 ? material.pages_total : null
  const done = Math.max(0, Math.min(material.page_current ?? 0, total ?? Number.MAX_SAFE_INTEGER))
  return { done, total, percent: ratio(done, total), unit: 'page' }
}

/**
 * Сколько станет пройдено, если сохранить занятие с такой галочкой.
 *
 * Считается до записи, а не после: «станет 4 из 12» должно стоять перед
 * глазами в момент решения. Раньше лист показывал просто `done + 1` — число,
 * которое ни с чем не сверялось и потому оказывалось неверным всякий раз,
 * когда глава уже была отмечена или галочку снимали.
 *
 * `was` — как глава отмечена сейчас, `will` — как будет.
 */
export function doneAfterPart(p: MaterialProgress, was: boolean, will: boolean): number {
  const next = p.done + (will ? 1 : 0) - (was ? 1 : 0)
  return Math.max(0, p.total === null ? next : Math.min(next, p.total))
}

/**
 * Насколько узкой полоса перестаёт быть полосой.
 *
 * Три процента — не про точность, а про то, что ниже этого хайрлайн в три
 * пикселя читается как пустой трек. «1 из 41» — это два процента: число под
 * полосой говорит, что работа начата, а сама полоса в это же время говорит,
 * что не начата, и глаз верит полосе.
 */
const MIN_BAR = 3

/**
 * Какой ширины рисовать заливку — в процентах, как её отдаёт `percent`.
 *
 * Отдельной функцией, потому что мест с полосой три — герой потока, карточка
 * материала в списке и страница материала, — а поправка на глаз жила ровно в
 * одном из них. Ноль остаётся нулём: у нетронутого пустая полоса и есть
 * правда.
 */
export function barWidth(percent: number | null): number | null {
  if (percent === null) return null
  return percent === 0 ? 0 : Math.max(percent, MIN_BAR)
}

const ratio = (done: number, total: number | null): number | null =>
  total === null || total <= 0 ? null : Math.max(0, Math.min(100, Math.round((done / total) * 100)))

/**
 * Сколько осталось до конца — в тех же единицах, что и прогресс.
 *
 * Величина производная, но своя строка на странице материала: «4 из 12»
 * отвечает, сколько сделано, и заставляет вычитать в уме, чтобы понять,
 * сколько ещё сидеть. У чтения на это отведена отдельная ячейка, и здесь тоже.
 *
 * `null` там же, где нет и полосы: мерить нечем, или меряется отметкой —
 * у статьи «осталось 1» не значит ничего.
 */
export function remainingOf(p: MaterialProgress): number | null {
  if (p.unit === 'flag' || p.total === null) return null
  return Math.max(0, p.total - p.done)
}

/** Когда по материалу писали в последний раз. Пустое значит «ещё не открывали». */
export function lastNoteDate(materialId: string, notes: StudyNote[]): string | null {
  let last: string | null = null
  for (const n of notes) {
    if (n.material_id !== materialId) continue
    if (last === null || n.date > last) last = n.date
  }
  return last
}

export interface WeekNotes {
  count: number
  /** В скольких разных днях недели что-то написано. Ритм важнее объёма. */
  days: number
}

/** Последние семь дней, считая сегодняшний. Окно скользящее, а не календарное. */
export function weekNotes(notes: StudyNote[], today: string = todayISO()): WeekNotes {
  const now = fromISO(today).getTime()
  const days = new Set<string>()
  let count = 0
  for (const n of notes) {
    const back = Math.round((now - fromISO(n.date).getTime()) / 86_400_000)
    if (back < 0 || back > 6) continue
    count++
    days.add(n.date)
  }
  return { count, days: days.size }
}
