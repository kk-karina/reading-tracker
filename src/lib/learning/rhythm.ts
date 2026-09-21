import { fromISO, todayISO } from '../format'

const WEEKS = 8

/**
 * Сколько из последних восьми недель были живыми. Неделя живая, если в ней
 * есть хотя бы один конспект.
 *
 * Недели скользящие, от сегодня назад по семь дней, а не календарные: вопрос,
 * на который отвечает эта строка, — «я всё ещё этим занимаюсь?», и к
 * понедельникам он отношения не имеет.
 *
 * Окно считается разницей в днях, а не граничной датой: так модуль не зависит
 * от помощников, которых в `format` может не оказаться.
 *
 * Тепловой карты рядом пока нет: `Rhythm` в `Charts.tsx` считает страницы из
 * сессий, а сессий в обучении ещё не существует.
 */
export function activeWeeks(dates: string[], today: string = todayISO()): number {
  const now = fromISO(today).getTime()
  const weeks = new Set<number>()
  for (const d of dates) {
    const days = Math.round((now - fromISO(d).getTime()) / 86_400_000)
    // Отрицательное — дата из будущего; 56 и больше — дальше восьми недель.
    if (days < 0 || days >= WEEKS * 7) continue
    weeks.add(Math.floor(days / 7))
  }
  return weeks.size
}

/** Самая свежая дата или null. Сравниваются строки: ISO для этого и сделан. */
export function lastActivity(dates: string[]): string | null {
  let best: string | null = null
  for (const d of dates) if (best === null || d > best) best = d
  return best
}
