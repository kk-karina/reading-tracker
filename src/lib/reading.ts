import type { Session } from './types'

/** Reading arithmetic. Nothing here is stored; it is all derived from the sessions. */

export interface Progress {
  /** The furthest page reached. */
  page: number
  /** Null while the book's page count is unknown — a share of nothing is not zero. */
  percent: number | null
}

const forBook = (bookId: string, sessions: Session[]) => sessions.filter((s) => s.book_id === bookId)

export function progressOf(bookId: string, sessions: Session[], pages: number | null): Progress {
  const mine = forBook(bookId, sessions)
  // The furthest page, not the latest session: going back to re-read a chapter
  // must not look like losing progress.
  const page = mine.reduce((max, s) => Math.max(max, s.page_to), 0)
  if (pages === null || pages <= 0) return { page, percent: null }
  return { page, percent: Math.min(100, Math.round((page / pages) * 100)) }
}

/** Total pages actually read, re-reading included. */
export function pagesRead(bookId: string, sessions: Session[]): number {
  return forBook(bookId, sessions).reduce((sum, s) => sum + (s.page_to - s.page_from), 0)
}

export function lastSessionDate(bookId: string, sessions: Session[]): string | null {
  const mine = forBook(bookId, sessions)
  if (mine.length === 0) return null
  return mine.reduce((latest, s) => (s.date > latest ? s.date : latest), mine[0].date)
}

/* ---------- habit ---------- */

const DAY = 86_400_000
const iso = (d: Date) => {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Consecutive days with at least one session, counting back from today.
 * A day not yet read does not break the streak — the evening is not over.
 */
export function streakDays(sessions: Session[], today: string): number {
  const days = new Set(sessions.map((s) => s.date))
  if (days.size === 0) return 0

  const cursor = parse(today)
  if (!days.has(today)) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(iso(cursor))) return 0
  }

  let streak = 0
  while (days.has(iso(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/* ---------- books ---------- */

import type { Book, BookStatus } from './types'

/** Books being read that have gone quiet: the honest, actionable panel. */
export function stuckBooks(
  books: Book[],
  sessions: Session[],
  today: string,
  days: number,
): Book[] {
  const cutoff = parse(today).getTime() - days * DAY
  return books.filter((b) => {
    if (b.status !== 'reading') return false
    const last = lastSessionDate(b.id, sessions)
    return last === null || parse(last).getTime() < cutoff
  })
}

/**
 * Books finished inside a year.
 *
 * A finished book with no date falls back to when it was last written. Marking a
 * book finished used to leave the date empty, and those books would otherwise
 * vanish from the year wall with no way to tell why. New writes always stamp the
 * date, so the fallback only ever covers the gap.
 */
export function finishedInYear(books: Book[], year: number): Book[] {
  const prefix = String(year)
  return books.filter((b) => {
    if (b.status !== 'finished') return false
    return (b.finished_at ?? b.updated_at).startsWith(prefix)
  })
}

/**
 * Status never travels alone: finishing a book dates it, starting one dates it,
 * and moving a book off the finished shelf takes its finish date with it.
 */
export function statusPatch(
  dates: Pick<Book, 'started_at' | 'finished_at'>,
  status: BookStatus,
  today: string,
): Pick<Book, 'status' | 'started_at' | 'finished_at'> {
  return {
    status,
    // Marking something finished says nothing about when it was begun.
    started_at: status === 'reading' ? (dates.started_at ?? today) : dates.started_at,
    finished_at: status === 'finished' ? (dates.finished_at ?? today) : null,
  }
}

export interface Share {
  /** null marks the folded tail — everything past the sixth group. */
  key: string | null
  count: number
}

const MAX_SHARES = 6

/**
 * Books grouped by one of their text fields, biggest first. Past six groups the
 * tail folds into one: more colour classes than that stop being tellable apart.
 */
export function sharesBy(books: Book[], field: 'genre' | 'language'): Share[] {
  const counts = new Map<string, number>()
  for (const b of books) {
    const value = b[field]?.trim()
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  const sorted = [...counts.entries()]
    .map(([key, count]) => ({ key, count }) as Share)
    .sort((a, b) => b.count - a.count)

  if (sorted.length <= MAX_SHARES) return sorted
  const kept = sorted.slice(0, MAX_SHARES - 1)
  const rest = sorted.slice(MAX_SHARES - 1).reduce((sum, s) => sum + s.count, 0)
  return [...kept, { key: null, count: rest }]
}

/* ---------- time ---------- */

/**
 * Minutes per page, learned from the sessions where minutes were filled in.
 * Null until there is at least one, which is why every number derived from it
 * is allowed to be unknown rather than guessed.
 */
export function paceMinutesPerPage(sessions: Session[]): number | null {
  let minutes = 0
  let pages = 0
  for (const s of sessions) {
    const read = s.page_to - s.page_from
    // A timed session that turned no pages says nothing about pace.
    if (s.minutes === null || read <= 0) continue
    minutes += s.minutes
    pages += read
  }
  return pages > 0 ? minutes / pages : null
}

export interface TimeSpent {
  minutes: number
  /** True when some of this was estimated rather than measured. */
  approx: boolean
}

/**
 * Time on a book: measured where minutes were entered, estimated from the pace
 * where they were not. Minutes are optional by design, so the total would be
 * silently wrong if the untimed sessions simply counted as zero.
 */
export function spentOn(bookId: string, sessions: Session[], pace: number | null): TimeSpent {
  let minutes = 0
  let approx = false
  for (const s of forBook(bookId, sessions)) {
    if (s.minutes !== null) {
      minutes += s.minutes
      continue
    }
    approx = true
    if (pace !== null) minutes += (s.page_to - s.page_from) * pace
  }
  return { minutes: Math.round(minutes), approx }
}

export function remainingMinutes(
  page: number,
  pages: number | null,
  pace: number | null,
): number | null {
  if (pages === null || pace === null) return null
  return Math.round(Math.max(0, pages - page) * pace)
}
