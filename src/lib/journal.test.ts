import { describe, expect, test } from 'vitest'
import { buildJournal } from './journal'
import type { Note, Session } from './types'

const s = (over: Partial<Session>): Session => ({
  id: 's1',
  book_id: 'b1',
  date: '2026-09-01',
  page_from: 0,
  page_to: 10,
  minutes: null,
  rating: null,
  created_at: '2026-09-01T10:00:00Z',
  ...over,
})

const n = (over: Partial<Note>): Note => ({
  id: 'n1',
  book_id: 'b1',
  session_id: null,
  page: null,
  tag: 'idea',
  body: 'a thought',
  created_at: '2026-09-01T10:00:00Z',
  ...over,
})

describe('buildJournal', () => {
  test('groups by day, newest day first', () => {
    const days = buildJournal(
      [s({ id: 'a', date: '2026-09-01' }), s({ id: 'b', date: '2026-09-03' })],
      [],
    )
    expect(days.map((d) => d.date)).toEqual(['2026-09-03', '2026-09-01'])
  })

  test('files a thought under the day of its session, not the day it was typed', () => {
    const session = s({ id: 'a', date: '2026-09-01', created_at: '2026-09-02T00:30:00Z' })
    const note = n({ session_id: 'a', created_at: '2026-09-02T00:31:00Z' })
    expect(buildJournal([session], [note]).map((d) => d.date)).toEqual(['2026-09-01'])
  })

  test('falls back to when a loose thought appeared', () => {
    const days = buildJournal([], [n({ created_at: '2026-09-05T08:00:00Z' })])
    expect(days.map((d) => d.date)).toEqual(['2026-09-05'])
  })

  test('sums pages and minutes read that day', () => {
    const days = buildJournal(
      [
        s({ id: 'a', page_from: 0, page_to: 20, minutes: 30 }),
        s({ id: 'b', page_from: 20, page_to: 35, minutes: null }),
      ],
      [n({ session_id: 'a' })],
    )
    expect(days[0]).toMatchObject({ pages: 35, minutes: 30, notes: 1 })
  })

  test('keeps only what the filter asks for', () => {
    const sessions = [s({ id: 'a' })]
    const notes = [n({ session_id: 'a' })]
    expect(buildJournal(sessions, notes, { filter: 'sessions' })[0].items).toHaveLength(1)
    expect(buildJournal(sessions, notes, { filter: 'sessions' })[0].items[0].kind).toBe('session')
    expect(buildJournal(sessions, notes, { filter: 'notes' })[0].items[0].kind).toBe('note')
  })

  test('narrows to one book, thoughts included', () => {
    const days = buildJournal(
      [s({ id: 'a' }), s({ id: 'b', book_id: 'b2' })],
      [n({ id: 'x', session_id: 'a' }), n({ id: 'y', book_id: 'b2', session_id: 'b' })],
      { bookId: 'b2' },
    )
    expect(days[0].items.map((i) => i.id)).toEqual(['b', 'y'])
  })

  test('is empty when there is nothing to show', () => {
    expect(buildJournal([], [])).toEqual([])
  })
})
