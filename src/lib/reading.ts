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

import type { Book } from './types'

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

export function finishedInYear(books: Book[], year: number): Book[] {
  const prefix = String(year)
  return books.filter((b) => b.status === 'finished' && b.finished_at?.startsWith(prefix))
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
