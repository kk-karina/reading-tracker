import type { Book, Note, Session, Snapshot } from '../types'

export type NewBook = Pick<
  Book,
  'title' | 'author' | 'pages' | 'cover_url' | 'external_id' | 'genre' | 'language' | 'status' | 'sort'
>
export type NewSession = Pick<
  Session,
  'book_id' | 'date' | 'page_from' | 'page_to' | 'minutes' | 'rating'
>
export type NewNote = Pick<Note, 'book_id' | 'session_id' | 'page' | 'tag' | 'body'>

export interface DataStore {
  load(): Promise<Snapshot>

  addBook(item: NewBook): Promise<Book>
  updateBook(id: string, patch: Partial<Book>): Promise<void>
  deleteBook(id: string): Promise<void>
  /** One book in focus at a time; the previous one is cleared first. */
  setFocus(id: string | null): Promise<void>

  addSession(item: NewSession): Promise<Session>
  updateSession(id: string, patch: Partial<NewSession>): Promise<void>
  deleteSession(id: string): Promise<void>

  addNote(item: NewNote): Promise<Note>
  updateNote(id: string, patch: Partial<NewNote>): Promise<void>
  deleteNote(id: string): Promise<void>

  /** Local mode only: replace everything with an imported snapshot. */
  replaceAll?(snap: Snapshot): Promise<void>
}
