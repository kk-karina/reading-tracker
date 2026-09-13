import type { Note, Session } from './types'

/** What the timeline shows: everything, only sessions, or only thoughts. */
export type JournalFilter = 'all' | 'sessions' | 'notes'

export type JournalItem =
  | { kind: 'session'; id: string; at: string; session: Session }
  | { kind: 'note'; id: string; at: string; note: Note }

export interface JournalDay {
  date: string // YYYY-MM-DD
  items: JournalItem[]
  pages: number
  minutes: number
  notes: number
}

interface Options {
  filter?: JournalFilter
  bookId?: string | null
}

/**
 * Sessions and thoughts on one timeline, newest day first.
 *
 * A thought is filed under the day of the session it came from rather than the
 * day it was typed: a session logged at midnight for yesterday keeps its
 * thoughts next to it. Thoughts with no session fall back to when they appeared.
 */
export function buildJournal(
  sessions: Session[],
  notes: Note[],
  { filter = 'all', bookId = null }: Options = {},
): JournalDay[] {
  const mine = (id: string) => !bookId || id === bookId
  const sessionDate = new Map(sessions.map((s) => [s.id, s.date]))
  const days = new Map<string, JournalItem[]>()

  const push = (date: string, item: JournalItem) => {
    const list = days.get(date)
    if (list) list.push(item)
    else days.set(date, [item])
  }

  if (filter !== 'notes') {
    for (const s of sessions) {
      if (mine(s.book_id)) push(s.date, { kind: 'session', id: s.id, at: s.created_at, session: s })
    }
  }
  if (filter !== 'sessions') {
    for (const n of notes) {
      if (!mine(n.book_id)) continue
      const date = (n.session_id && sessionDate.get(n.session_id)) || n.created_at.slice(0, 10)
      push(date, { kind: 'note', id: n.id, at: n.created_at, note: n })
    }
  }

  return [...days.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)),
      pages: items.reduce(
        (sum, i) => (i.kind === 'session' ? sum + (i.session.page_to - i.session.page_from) : sum),
        0,
      ),
      minutes: items.reduce(
        (sum, i) => (i.kind === 'session' ? sum + (i.session.minutes ?? 0) : sum),
        0,
      ),
      notes: items.filter((i) => i.kind === 'note').length,
    }))
}
