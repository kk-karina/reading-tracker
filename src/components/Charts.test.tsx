import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { addDays, fromISO, toISO, todayISO } from '../lib/format'
import type { Session } from '../lib/types'

vi.mock('../state/LocaleContext', () => ({
  useLocale: () => ({ locale: 'ru', setLocale: () => {}, t: (key: string) => key }),
}))

const { pagesByDate, Rhythm, WeeklyBars } = await import('./Charts')

const session = (date: string, pages: number): Session => ({
  id: date,
  book_id: 'b1',
  date,
  page_from: 0,
  page_to: pages,
  minutes: null,
  rating: null,
  created_at: `${date}T09:00:00.000Z`,
})

/** Every day the grid drew, as an ISO date, in the order the cells came out. */
const drawnDays = (svg: string): string[] =>
  [...svg.matchAll(/data-day="([^"]+)"/g)].map((m) => m[1])

/** The dots for days that have not happened yet, told apart by their colour. */
const paleDots = (svg: string): number => [...svg.matchAll(/fill="var\(--line\)"/g)].length

describe('Rhythm', () => {
  beforeAll(() => {
    // Berlin keeps summer time, so half a year back from September crosses the
    // spring change and half a year back from November crosses both.
    vi.stubEnv('TZ', 'Europe/Berlin')
    vi.useFakeTimers()
  })
  afterEach(() => vi.setSystemTime(vi.getRealSystemTime()))
  afterAll(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  /** Noon on `today`, built after the zone is stubbed so the day is the stated one. */
  const at = (today: string) => {
    const d = fromISO(today)
    d.setHours(12)
    return d
  }

  test.each([
    ['2026-09-14', 'a Monday, which opens the last column'],
    ['2026-09-13', 'a Sunday, which closes it'],
    ['2026-11-05', 'a day whose half-year reaches back past the autumn change'],
  ])('draws the whole week around %s — %s', (today) => {
    vi.setSystemTime(at(today))
    const svg = renderToStaticMarkup(
      <Rhythm byDate={pagesByDate([session(today, 42)])} label="rhythm" unit={(n) => `${n}`} />,
    )
    const days = drawnDays(svg)

    expect(days).toContain(today) // the current week is on the chart at all
    expect(days).toContain(toISO(addDays(at(today), -7 * 25))) // half a year is still covered
    expect(new Set(days).size).toBe(days.length) // no day drawn twice

    // The grid ends on the Sunday of this week, and every day after today in
    // it is one of the pale dots.
    const sunday = toISO(addDays(at(today), 6 - ((at(today).getDay() + 6) % 7)))
    expect(days.at(-1)).toBe(sunday)
    expect(paleDots(svg)).toBe(days.filter((d) => d > today).length)
  })

  test('rings today even when nothing was read', () => {
    vi.setSystemTime(at('2026-09-14'))
    const svg = renderToStaticMarkup(
      <Rhythm byDate={pagesByDate([])} label="rhythm" unit={(n) => `${n}`} />,
    )
    const rings = [...svg.matchAll(/stroke="var\(--ink\)"/g)]
    expect(rings).toHaveLength(1)
  })
})

describe('WeeklyBars', () => {
  const NWEEKS = 12

  const read = (pages: number, date: string): Session => ({
    id: `${date}-${pages}`,
    book_id: 'b1',
    date,
    page_from: 0,
    page_to: pages,
    minutes: null,
    rating: null,
    created_at: '',
  })

  /** The books of the one week that has any, bottom of the pile first. */
  const pile = (html: string): { bottom: number; height: number; color: string }[] =>
    [
      ...html.matchAll(
        /class="wk-book" style="bottom:(\d+(?:\.\d+)?)(?:px)?;height:(\d+(?:\.\d+)?)px;[^"]*background-color:([^;"]+)/g,
      ),
    ].map((m) => ({ bottom: Number(m[1]), height: Number(m[2]), color: m[3] }))

  const week = (sessions: Session[]) => renderToStaticMarkup(<WeeklyBars sessions={sessions} />)

  test('a week piles up into books, each resting on the one below', () => {
    const books = pile(week([read(120, todayISO())]))

    expect(books.length).toBeGreaterThan(2) // a pile, not one tall slab
    expect(books[0].bottom).toBe(0) // it starts on the shelf, not in the air
    for (const [i, b] of books.entries()) {
      if (i === 0) continue
      const below = books[i - 1]
      expect(b.bottom).toBeGreaterThanOrEqual(below.bottom + below.height) // no overlap
      expect(b.bottom - (below.bottom + below.height)).toBeLessThan(4) // and no float
    }
  })

  test('no two books in a pile are the same size or colour as the last', () => {
    const books = pile(week([read(150, todayISO())]))

    expect(new Set(books.map((b) => b.height)).size).toBeGreaterThan(1)
    for (const [i, b] of books.entries()) {
      if (i > 0) expect(b.color).not.toBe(books[i - 1].color)
    }
  })

  test('a heavier week is a taller pile of more books', () => {
    const today = todayISO()
    // Both weeks in one chart, or each would be the tallest in its own and be
    // drawn full height.
    const cols = week([read(30, toISO(addDays(fromISO(today), -7))), read(170, today)])
      .split('class="wk-col"')
      .slice(1)
      .map(pile)
    const [light, heavy] = [cols[NWEEKS - 2], cols[NWEEKS - 1]]

    const top = (p: typeof light) => p.at(-1)!.bottom + p.at(-1)!.height
    expect(heavy.length).toBeGreaterThan(light.length)
    expect(top(heavy)).toBeGreaterThan(top(light))
  })

  test('with no observer to fire, the pile renders standing', () => {
    const html = week([read(60, todayISO())])

    // Server markup has nothing to trigger the drop, so nothing may be left
    // hidden above the shelf: a chart that never animates still has to read.
    expect(html).toContain('opacity:1')
    expect(html).not.toContain('opacity:0')
    expect(html).not.toContain('translateY(-')
  })

  test('a week with nothing in it keeps its place in the row', () => {
    const html = week([])

    expect(pile(html)).toHaveLength(0)
    expect([...html.matchAll(/class="wk-none"/g)]).toHaveLength(12)
  })
})
