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

import { finishedInYear, streakDays, stuckBooks } from './reading'
import type { Book } from './types'

const b = (over: Partial<Book>): Book => ({
  id: crypto.randomUUID(),
  title: 'A book',
  author: null,
  pages: 300,
  cover_url: null,
  external_id: null,
  genre: null,
  language: null,
  status: 'reading',
  url: null,
  is_focus: false,
  rating: null,
  review: null,
  started_at: null,
  finished_at: null,
  sort: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
})

describe('streakDays', () => {
  test('counts consecutive days ending today', () => {
    const sessions = [s({ date: '2026-09-13' }), s({ date: '2026-09-12' }), s({ date: '2026-09-11' })]
    expect(streakDays(sessions, '2026-09-13')).toBe(3)
  })

  test('still counts when today has not been read yet but yesterday was', () => {
    const sessions = [s({ date: '2026-09-12' }), s({ date: '2026-09-11' })]
    expect(streakDays(sessions, '2026-09-13')).toBe(2)
  })

  test('is broken by a gap of two days', () => {
    const sessions = [s({ date: '2026-09-10' }), s({ date: '2026-09-09' })]
    expect(streakDays(sessions, '2026-09-13')).toBe(0)
  })

  test('counts a day once however many sessions it holds', () => {
    const sessions = [s({ date: '2026-09-13' }), s({ date: '2026-09-13' }), s({ date: '2026-09-12' })]
    expect(streakDays(sessions, '2026-09-13')).toBe(2)
  })

  test('is zero with no sessions at all', () => {
    expect(streakDays([], '2026-09-13')).toBe(0)
  })
})

describe('stuckBooks', () => {
  test('picks books being read whose last session is older than the cutoff', () => {
    const slow = b({ id: 'slow' })
    const fresh = b({ id: 'fresh' })
    const sessions = [
      s({ book_id: 'slow', date: '2026-08-01' }),
      s({ book_id: 'fresh', date: '2026-09-12' }),
    ]
    expect(stuckBooks([slow, fresh], sessions, '2026-09-13', 14).map((x) => x.id)).toEqual(['slow'])
  })

  test('counts a book marked as being read but never opened', () => {
    const never = b({ id: 'never' })
    expect(stuckBooks([never], [], '2026-09-13', 14).map((x) => x.id)).toEqual(['never'])
  })

  test('ignores books that are not being read', () => {
    const done = b({ id: 'done', status: 'finished' })
    const wanted = b({ id: 'wanted', status: 'want' })
    expect(stuckBooks([done, wanted], [], '2026-09-13', 14)).toEqual([])
  })
})

describe('finishedInYear', () => {
  test('counts a book finished inside the year and not one finished outside it', () => {
    const books = [
      b({ status: 'finished', finished_at: '2026-02-03' }),
      b({ status: 'finished', finished_at: '2025-12-30' }),
    ]
    expect(finishedInYear(books, 2026)).toHaveLength(1)
  })

  test('ignores a book that is not finished, whatever date it carries', () => {
    const books = [b({ status: 'reading', finished_at: '2026-05-05' })]
    expect(finishedInYear(books, 2026)).toEqual([])
  })
})

import { paceMinutesPerPage, remainingMinutes, spentOn } from './reading'

describe('paceMinutesPerPage', () => {
  test('is unknown until at least one session carries minutes', () => {
    expect(paceMinutesPerPage([s({ minutes: null })])).toBeNull()
    expect(paceMinutesPerPage([])).toBeNull()
  })

  test('divides minutes by pages across the timed sessions', () => {
    const sessions = [s({ page_from: 0, page_to: 50, minutes: 100 })]
    expect(paceMinutesPerPage(sessions)).toBe(2)
  })

  test('ignores sessions with no minutes rather than counting them as free', () => {
    const sessions = [
      s({ page_from: 0, page_to: 50, minutes: 100 }),
      s({ page_from: 50, page_to: 150, minutes: null }),
    ]
    expect(paceMinutesPerPage(sessions)).toBe(2)
  })

  test('ignores a timed session that turned no pages', () => {
    const sessions = [
      s({ page_from: 0, page_to: 50, minutes: 100 }),
      s({ page_from: 50, page_to: 50, minutes: 30 }),
    ]
    expect(paceMinutesPerPage(sessions)).toBe(2)
  })
})

describe('spentOn', () => {
  test('adds up the minutes actually recorded', () => {
    const sessions = [s({ minutes: 30 }), s({ minutes: 45 })]
    expect(spentOn('b1', sessions, 2)).toEqual({ minutes: 75, approx: false })
  })

  test('fills the gaps from the pace and says the number is approximate', () => {
    const sessions = [
      s({ page_from: 0, page_to: 20, minutes: 40 }),
      s({ page_from: 20, page_to: 30, minutes: null }),
    ]
    expect(spentOn('b1', sessions, 2)).toEqual({ minutes: 60, approx: true })
  })

  test('without a pace it reports only what is known, still flagged approximate', () => {
    const sessions = [s({ page_from: 0, page_to: 20, minutes: null })]
    expect(spentOn('b1', sessions, null)).toEqual({ minutes: 0, approx: true })
  })

  test('is zero and exact for a book never opened', () => {
    expect(spentOn('b1', [], 2)).toEqual({ minutes: 0, approx: false })
  })
})

describe('remainingMinutes', () => {
  test('is unknown without a pace or without a page count', () => {
    expect(remainingMinutes(136, 320, null)).toBeNull()
    expect(remainingMinutes(136, null, 2)).toBeNull()
  })

  test('estimates the pages left at the current pace', () => {
    expect(remainingMinutes(136, 320, 2)).toBe(368)
  })

  test('is zero once the last page is reached or passed', () => {
    expect(remainingMinutes(320, 320, 2)).toBe(0)
    expect(remainingMinutes(340, 320, 2)).toBe(0)
  })
})

import { statusPatch } from './reading'

describe('statusPatch', () => {
  const today = '2026-09-13'

  test('stamps the finish date when a book becomes finished', () => {
    const patch = statusPatch(b({ status: 'reading' }), 'finished', today)
    expect(patch).toMatchObject({ status: 'finished', finished_at: today })
  })

  test('keeps a finish date that is already there', () => {
    const patch = statusPatch(b({ status: 'finished', finished_at: '2026-03-01' }), 'finished', today)
    expect(patch.finished_at).toBe('2026-03-01')
  })

  test('clears the finish date when the book leaves the finished shelf', () => {
    const patch = statusPatch(b({ status: 'finished', finished_at: '2026-03-01' }), 'want', today)
    expect(patch.finished_at).toBeNull()
  })

  test('stamps the start date when a book starts being read', () => {
    expect(statusPatch(b({ status: 'want' }), 'reading', today).started_at).toBe(today)
  })

  test('does not move a start date that is already set', () => {
    const patch = statusPatch(b({ status: 'want', started_at: '2026-01-05' }), 'reading', today)
    expect(patch.started_at).toBe('2026-01-05')
  })

  test('leaves the start date alone when marking a book finished', () => {
    expect(statusPatch(b({ status: 'want' }), 'finished', today).started_at).toBeNull()
  })
})

describe('finishedInYear with an undated book', () => {
  test('falls back to when the book was last touched, so nothing is silently lost', () => {
    const undated = b({ status: 'finished', finished_at: null, updated_at: '2026-04-02T09:00:00Z' })
    expect(finishedInYear([undated], 2026)).toHaveLength(1)
  })

  test('does not drag an undated book into a year it has nothing to do with', () => {
    const undated = b({ status: 'finished', finished_at: null, updated_at: '2024-04-02T09:00:00Z' })
    expect(finishedInYear([undated], 2026)).toHaveLength(0)
  })
})

import { statusOf, withStatus } from './reading'

describe('statusOf: статус книги выводится из прочитанного', () => {
  test('книга без сессий ждёт на полке «хочу»', () => {
    expect(statusOf(b({ status: 'want' }), [])).toBe('want')
  })

  test('первая сессия делает книгу читаемой', () => {
    expect(statusOf(b({ id: 'b1', status: 'want' }), [s({ page_to: 20 })])).toBe('reading')
  })

  test('последняя страница закрывает книгу сама', () => {
    expect(statusOf(b({ id: 'b1', status: 'reading', pages: 300 }), [s({ page_to: 300 })])).toBe(
      'finished',
    )
  })

  // Отметка нужна там, где считать нечем: без числа страниц подсчёт книгу не
  // закроет никогда.
  test('без числа страниц подсчёт книгу не закрывает', () => {
    expect(statusOf(b({ id: 'b1', status: 'reading', pages: null }), [s({ page_to: 900 })])).toBe(
      'reading',
    )
  })

  test('отметка «прочитано» сильнее подсчёта', () => {
    expect(statusOf(b({ status: 'finished', pages: 300 }), [])).toBe('finished')
  })

  // Старые снимки несут «читаю», выставленное руками. Пересчёт возвращает
  // книгу на полку «хочу», если по ней так ничего и не записали.
  test('выставленное руками «читаю» пересчитывается', () => {
    expect(statusOf(b({ status: 'reading', started_at: null }), [])).toBe('want')
  })

  // Заброшенных больше нет: статус из данных не выводится, и старое значение
  // просто пересчитывается в то, чем книга на самом деле является.
  test('старое «заброшено» пересчитывается в «хочу»', () => {
    const old = { ...b({}), status: 'abandoned' as unknown as Book['status'] }
    expect(statusOf(old, [])).toBe('want')
  })

  test('withStatus считает каждой книге её собственные сессии', () => {
    const one = b({ id: 'b1', status: 'want', pages: 300 })
    const two = b({ id: 'b2', status: 'want', pages: 300 })
    const got = withStatus([one, two], [s({ book_id: 'b1', page_to: 300 })])
    expect(got.map((x) => x.status)).toEqual(['finished', 'want'])
    expect(one.status).toBe('want')
  })
})
