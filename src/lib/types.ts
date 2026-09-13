export type BookStatus = 'want' | 'reading' | 'finished' | 'abandoned'

/** What a thought was: the tag is picked first and shapes the prompt in the field. */
export type NoteTag = 'quote' | 'idea' | 'question' | 'disagree' | 'feeling'

export interface Book {
  id: string
  title: string
  author: string | null
  pages: number | null
  cover_url: string | null
  external_id: string | null // Google Books volume id, so the same book is not added twice
  genre: string | null
  language: string | null
  status: BookStatus
  is_focus: boolean
  rating: number | null // 1–5, set when the book is finished
  review: string | null // written after the last page, not during
  started_at: string | null // YYYY-MM-DD
  finished_at: string | null
  sort: number
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  book_id: string
  date: string // YYYY-MM-DD
  /** Filled in from the previous session; stored so re-reads and returns keep honest deltas. */
  page_from: number
  page_to: number
  minutes: number | null // optional on purpose: typing it every time is what kills the habit
  rating: number | null // 1–5, how the session felt
  created_at: string
}

export interface Note {
  id: string
  book_id: string
  session_id: string | null // null when the thought arrived away from a session
  page: number | null
  tag: NoteTag
  body: string
  created_at: string
}

export interface Snapshot {
  books: Book[]
  sessions: Session[]
  notes: Note[]
}

/** A factory, not a constant: a shared instance would have its arrays mutated in place. */
export const emptySnapshot = (): Snapshot => ({ books: [], sessions: [], notes: [] })
