import { beforeEach, describe, expect, test, vi } from 'vitest'
import { SEED_BOOKS, seedSessionFor } from '../seed'
import { localStore } from './local'

// Node has no localStorage; this is the whole of what the store uses.
class MemoryStorage {
  private data = new Map<string, string>()
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => void this.data.set(k, v)
  removeItem = (k: string) => void this.data.delete(k)
  clear = () => this.data.clear()
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage())
})

describe('loading the starter shelf', () => {
  test('adds every seed book and the session for the one already underway', async () => {
    for (const { page_to, ...fields } of SEED_BOOKS) {
      const created = await localStore.addBook(fields)
      if (page_to) await localStore.addSession(seedSessionFor(created.id, page_to, '2026-09-13'))
    }

    const snap = await localStore.load()
    // Tied to the shape of the sample, not to which books happen to be in it.
    expect(snap.books).toHaveLength(SEED_BOOKS.length)
    expect(snap.books.map((b) => b.title)).toEqual(SEED_BOOKS.map((b) => b.title))

    const started = SEED_BOOKS.filter((b) => b.page_to)
    expect(snap.sessions).toHaveLength(started.length)
    for (const seed of started) {
      const book = snap.books.find((b) => b.title === seed.title)
      const session = snap.sessions.find((s) => s.book_id === book?.id)
      expect(session?.page_to).toBe(seed.page_to)
    }
  })

  test('an empty shelf stays empty between loads', async () => {
    expect((await localStore.load()).books).toEqual([])
    await localStore.addBook(SEED_BOOKS[0])
    expect((await localStore.load()).books).toHaveLength(1)
  })
})

describe('focus', () => {
  test('moves the focus rather than adding a second one', async () => {
    const a = await localStore.addBook(SEED_BOOKS[0])
    const b = await localStore.addBook(SEED_BOOKS[1])

    await localStore.setFocus(a.id)
    expect((await localStore.load()).books.filter((x) => x.is_focus).map((x) => x.id)).toEqual([a.id])

    await localStore.setFocus(b.id)
    expect((await localStore.load()).books.filter((x) => x.is_focus).map((x) => x.id)).toEqual([b.id])

    await localStore.setFocus(null)
    expect((await localStore.load()).books.some((x) => x.is_focus)).toBe(false)
  })
})

describe('deleting a book', () => {
  test('takes its sessions and notes with it', async () => {
    const book = await localStore.addBook(SEED_BOOKS[0])
    const session = await localStore.addSession(seedSessionFor(book.id, 40, '2026-09-13'))
    await localStore.addNote({
      book_id: book.id,
      session_id: session.id,
      page: 12,
      tag: 'quote',
      body: 'a line worth keeping',
    })

    await localStore.deleteBook(book.id)
    const snap = await localStore.load()
    expect(snap).toEqual({ books: [], sessions: [], notes: [] })
  })
})
