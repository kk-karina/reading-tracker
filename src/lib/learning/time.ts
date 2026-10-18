import { addDays, fromISO, mondayOf, toISO, todayISO } from '../format'
import type { StudySession } from './types'

/**
 * Сколько времени ушло на учёбу и много ли это.
 *
 * «Много» здесь значит «больше, чем обычно у меня самой к этому же дню
 * недели». Сравнивать неполную неделю с целыми прошлыми нельзя: в понедельник
 * любая неделя проигрывает, и вердикт выходит одинаковым каждое начало недели.
 */

/** Сколько прошлых недель смотрим, когда ищем «обычно». Два месяца — привычка, а не случай. */
const WEEKS = 8

/**
 * Дата → минуты. Занятие без минут сюда не попадает: оно не ноль минут, а
 * неизвестно сколько, и в сумме ему делать нечего.
 */
export function minutesByDate(sessions: StudySession[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sessions) {
    if (!s.minutes) continue
    m.set(s.date, (m.get(s.date) ?? 0) + s.minutes)
  }
  return m
}

/** Сколько занятий в окне прошло без минут. Их показывают рядом с суммой, чтобы она не врала молча. */
export function untimed(sessions: StudySession[], from: string, to: string): number {
  return sessions.filter((s) => !s.minutes && s.date >= from && s.date <= to).length
}

function sum(byDate: Map<string, number>, from: Date, days: number): number {
  let total = 0
  for (let i = 0; i < days; i++) total += byDate.get(toISO(addDays(from, i))) ?? 0
  return total
}

/** С понедельника по сегодня включительно. */
export function weekSoFar(byDate: Map<string, number>, today: string = todayISO()): number {
  const d = fromISO(today)
  const monday = mondayOf(d)
  return sum(byDate, monday, daysBetween(monday, d) + 1)
}

/** Самая ранняя дата, когда время было записано. */
function firstTimed(byDate: Map<string, number>): string | null {
  let first: string | null = null
  for (const [iso, v] of byDate) if (v > 0 && (first === null || iso < first)) first = iso
  return first
}

/**
 * Медиана, а не среднее: одна неделя перед экзаменом задрала бы среднее так,
 * что следующие два месяца выглядели бы провалом. Меньше двух значений —
 * сравнивать не с чем.
 */
function median(xs: number[]): number | null {
  if (xs.length < 2) return null
  const v = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2)
}

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000)

/**
 * Сколько обычно набегает с понедельника по этот же день недели — медиана за
 * последние восемь недель.
 *
 * Недели до первого записанного времени не считаются вовсе — тогда приложением
 * ещё не пользовались, и те нули не отдых. Пустая неделя после него — честный
 * ноль.
 */
export function usualSoFar(
  byDate: Map<string, number>,
  today: string = todayISO(),
  weeks: number = WEEKS,
): number | null {
  const d = fromISO(today)
  const thisMonday = mondayOf(d)
  const span = daysBetween(thisMonday, d) + 1

  const first = firstTimed(byDate)
  if (first === null) return null
  const firstMonday = toISO(mondayOf(fromISO(first)))

  const past: number[] = []
  for (let k = 1; k <= weeks; k++) {
    const monday = addDays(thisMonday, -7 * k)
    if (toISO(monday) < firstMonday) break
    past.push(sum(byDate, monday, span))
  }
  return median(past)
}

/** Пять прошлых месяцев: вместе с текущим это и есть полгода на графике. */
const MONTHS = 5

/**
 * То же для месяца: сколько обычно набегает с первого числа по сегодняшнее.
 * Месяц, в котором сегодняшнего числа нет (31-е против сентября), берётся
 * целиком.
 */
export function usualMonthSoFar(
  byDate: Map<string, number>,
  today: string = todayISO(),
  months: number = MONTHS,
): number | null {
  const d = fromISO(today)
  const first = firstTimed(byDate)
  if (first === null) return null
  const firstMonth = first.slice(0, 7)

  const past: number[] = []
  for (let k = 1; k <= months; k++) {
    const start = new Date(d.getFullYear(), d.getMonth() - k, 1)
    if (toISO(start).slice(0, 7) < firstMonth) break
    const length = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    past.push(sum(byDate, start, Math.min(d.getDate(), length)))
  }
  return median(past)
}

export interface Pace {
  kind: 'ahead' | 'even' | 'behind'
  /** Насколько, в минутах, всегда положительное. */
  diff: number
}

/**
 * Вердикт. Разница в пределах десяти минут или десятой доли обычного — это
 * «как обычно»: пятнадцать минут сверху ничего не говорят ни о ком.
 */
export function paceOf(week: number, usual: number): Pace {
  const diff = week - usual
  const slack = Math.max(10, Math.round(usual * 0.1))
  if (Math.abs(diff) <= slack) return { kind: 'even', diff: Math.abs(diff) }
  return { kind: diff > 0 ? 'ahead' : 'behind', diff: Math.abs(diff) }
}

/* ---------- окна графика ---------- */

export type Span = 'weeks' | 'months'

/** Двенадцать недель — три месяца; шесть месяцев — полгода. */
const SIZE: Record<Span, number> = { weeks: 12, months: 6 }

/**
 * Что показывает график, когда его отлистали на `back` окон назад: окна
 * стоят встык, последнее заканчивается текущей неделей или месяцем.
 */
export function windowOf(span: Span, back: number, today: string = todayISO()): { from: string; to: string } {
  const d = fromISO(today)
  if (span === 'weeks') {
    const end = addDays(mondayOf(d), -7 * SIZE.weeks * back)
    return { from: toISO(addDays(end, -7 * (SIZE.weeks - 1))), to: toISO(addDays(end, 6)) }
  }
  const m = d.getMonth() - SIZE.months * back
  return {
    from: toISO(new Date(d.getFullYear(), m - SIZE.months + 1, 1)),
    to: toISO(new Date(d.getFullYear(), m + 1, 0)),
  }
}

/** Сколько окон назад ещё есть что смотреть: до того, в котором первое записанное время. */
export function windowsBack(span: Span, byDate: Map<string, number>, today: string = todayISO()): number {
  const first = firstTimed(byDate)
  if (first === null) return 0
  const a = fromISO(first)
  const b = fromISO(today)
  const periods =
    span === 'weeks'
      ? daysBetween(mondayOf(a), mondayOf(b)) / 7
      : b.getFullYear() * 12 + b.getMonth() - (a.getFullYear() * 12 + a.getMonth())
  return Math.max(0, Math.floor(periods / SIZE[span]))
}

/** Минуты внутри окна, края включительно. */
export function totalIn(byDate: Map<string, number>, from: string, to: string): number {
  let total = 0
  for (const [iso, v] of byDate) if (iso >= from && iso <= to) total += v
  return total
}
