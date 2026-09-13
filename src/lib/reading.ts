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
