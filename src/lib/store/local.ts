import { emptySnapshot, type Book, type Note, type Session, type Snapshot } from '../types'
import type { DataStore, NewBook, NewNote, NewSession } from './types'

const KEY = 'readingtracker.v1'

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...emptySnapshot(), ...(JSON.parse(raw) as Partial<Snapshot>) }
  } catch {
    /* corrupted or blocked storage: start empty */
  }
  return emptySnapshot()
}

function write(snap: Snapshot) {
  localStorage.setItem(KEY, JSON.stringify(snap))
}

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

export const localStore: DataStore = {
  async load() {
    return read()
  },

  async addBook(item: NewBook) {
    const snap = read()
    const book: Book = {
      ...item,
      id: uid(),
      is_focus: false,
      rating: null,
      started_at: null,
      finished_at: null,
      created_at: now(),
      updated_at: now(),
    }
    snap.books.push(book)
    write(snap)
    return book
  },
  async updateBook(id, patch) {
    const snap = read()
    snap.books = snap.books.map((b) => (b.id === id ? { ...b, ...patch, updated_at: now() } : b))
    write(snap)
  },
  async deleteBook(id) {
    const snap = read()
    snap.books = snap.books.filter((b) => b.id !== id)
    snap.sessions = snap.sessions.filter((s) => s.book_id !== id)
    snap.notes = snap.notes.filter((n) => n.book_id !== id)
    write(snap)
  },
  async setFocus(id) {
    const snap = read()
    snap.books = snap.books.map((b) => ({ ...b, is_focus: b.id === id }))
    write(snap)
  },

  async addSession(item: NewSession) {
    const snap = read()
    const session: Session = { ...item, id: uid(), created_at: now() }
    snap.sessions.push(session)
    write(snap)
    return session
  },
  async updateSession(id, patch) {
    const snap = read()
    snap.sessions = snap.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s))
    write(snap)
  },
  async deleteSession(id) {
    const snap = read()
    snap.sessions = snap.sessions.filter((s) => s.id !== id)
    snap.notes = snap.notes.map((n) => (n.session_id === id ? { ...n, session_id: null } : n))
    write(snap)
  },

  async addNote(item: NewNote) {
    const snap = read()
    const note: Note = { ...item, id: uid(), created_at: now() }
    snap.notes.push(note)
    write(snap)
    return note
  },
  async updateNote(id, patch) {
    const snap = read()
    snap.notes = snap.notes.map((n) => (n.id === id ? { ...n, ...patch } : n))
    write(snap)
  },
  async deleteNote(id) {
    const snap = read()
    snap.notes = snap.notes.filter((n) => n.id !== id)
    write(snap)
  },

  async replaceAll(snap) {
    write({ ...emptySnapshot(), ...snap })
  },
}
