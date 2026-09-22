import { describe, expect, test } from 'vitest'
import { SEED_BOOKS, addSampleShelf } from './seed'
import type { NewBook, NewSession } from './store'
import type { Book, Session } from './types'

const shelved = (over: Partial<Book>): Book => ({
  id: crypto.randomUUID(),
  title: 'Something',
  author: null,
  pages: null,
  cover_url: null,
  external_id: null,
  genre: null,
  language: null,
  status: 'want',
  is_focus: false,
  rating: null,
  review: null,
  started_at: null,
  finished_at: null,
  sort: 0,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
  ...over,
})

/** A store that just remembers what it was handed. */
function fakeStore() {
  const books: Book[] = []
  const sessions: Session[] = []
  return {
    books,
    sessions,
    addBook: async (item: NewBook) => {
      const book = shelved(item)
      books.push(book)
      return book
    },
    addSession: async (item: NewSession) => {
      const session: Session = { ...item, id: crypto.randomUUID(), created_at: '2026-09-01T10:00:00Z' }
      sessions.push(session)
      return session
    },
  }
}

describe('addSampleShelf', () => {
  test('fills an empty shelf with the whole sample', async () => {
    const store = fakeStore()
    const added = await addSampleShelf([], store.addBook, store.addSession)
    expect(added).toBe(SEED_BOOKS.length)
    expect(store.books).toHaveLength(SEED_BOOKS.length)
  })

  test('gives the books that are already part-read a session to show for it', async () => {
    const store = fakeStore()
    await addSampleShelf([], store.addBook, store.addSession)
    expect(store.sessions.length).toBe(SEED_BOOKS.filter((b) => b.page_to).length)
    expect(store.sessions.every((s) => s.page_to > 0)).toBe(true)
  })

  test('skips a book that is already on the shelf, so pressing twice is safe', async () => {
    const store = fakeStore()
    const mine = [shelved({ external_id: SEED_BOOKS[0].external_id })]
    const added = await addSampleShelf(mine, store.addBook, store.addSession)
    expect(added).toBe(SEED_BOOKS.length - 1)
    expect(store.books.some((b) => b.external_id === SEED_BOOKS[0].external_id)).toBe(false)
  })

  test('adds nothing at all the second time round', async () => {
    const store = fakeStore()
    await addSampleShelf([], store.addBook, store.addSession)
    const again = await addSampleShelf(store.books, store.addBook, store.addSession)
    expect(again).toBe(0)
  })

  test('sorts the new books after the ones already standing there', async () => {
    const store = fakeStore()
    const mine = [shelved({ sort: 7 }), shelved({ sort: 3 })]
    await addSampleShelf(mine, store.addBook, store.addSession)
    expect(Math.min(...store.books.map((b) => b.sort))).toBe(8)
  })
})
