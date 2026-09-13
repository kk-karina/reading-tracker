import { describe, expect, test } from 'vitest'
import { lastSessionDate, pagesRead, progressOf } from './reading'
import type { Session } from './types'

const s = (over: Partial<Session>): Session => ({
  id: crypto.randomUUID(),
  book_id: 'b1',
  date: '2026-09-01',
  page_from: 0,
  page_to: 10,
  minutes: null,
  rating: null,
  created_at: '2026-09-01T10:00:00Z',
  ...over,
})

describe('progressOf', () => {
  test('is zero when the book has no sessions', () => {
    expect(progressOf('b1', [], 300)).toEqual({ page: 0, percent: 0 })
  })

  test('takes the furthest page reached, not the latest session', () => {
    const sessions = [
      s({ page_from: 0, page_to: 136, date: '2026-09-01' }),
      s({ page_from: 40, page_to: 60, date: '2026-09-05' }), // went back to re-read
    ]
    expect(progressOf('b1', sessions, 300).page).toBe(136)
  })

  test('ignores sessions belonging to other books', () => {
    const sessions = [s({ page_to: 136 }), s({ book_id: 'b2', page_to: 999 })]
    expect(progressOf('b1', sessions, 300).page).toBe(136)
  })

  test('leaves the percentage unknown when the page count is not filled in', () => {
    expect(progressOf('b1', [s({ page_to: 136 })], null).percent).toBeNull()
  })

  test('never reports more than a hundred percent', () => {
    expect(progressOf('b1', [s({ page_to: 320 })], 300).percent).toBe(100)
  })

  test('rounds the percentage', () => {
    expect(progressOf('b1', [s({ page_from: 0, page_to: 136 })], 300).percent).toBe(45)
  })
})

describe('pagesRead', () => {
  test('sums the deltas, so re-reading counts as reading', () => {
    const sessions = [s({ page_from: 0, page_to: 136 }), s({ page_from: 40, page_to: 60 })]
    expect(pagesRead('b1', sessions)).toBe(156)
  })

  test('is zero for a book never opened', () => {
    expect(pagesRead('b1', [])).toBe(0)
  })
})

describe('lastSessionDate', () => {
  test('returns the most recent date regardless of input order', () => {
    const sessions = [s({ date: '2026-09-01' }), s({ date: '2026-09-09' }), s({ date: '2026-09-05' })]
    expect(lastSessionDate('b1', sessions)).toBe('2026-09-09')
  })

  test('is null when the book has never been read', () => {
    expect(lastSessionDate('b1', [])).toBeNull()
  })
})
