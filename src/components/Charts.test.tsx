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

  /** The height of every bar drawn, oldest week first. */
  const bars = (html: string): number[] =>
    [...html.matchAll(/class="wk-bar" style="height:(\d+(?:\.\d+)?)px"/g)].map((m) => Number(m[1]))

  const week = (sessions: Session[]) => renderToStaticMarkup(<WeeklyBars sessions={sessions} />)

  test('a heavier week is a taller bar, in proportion', () => {
    const today = todayISO()
    // Both weeks in one chart, or each would be the tallest in its own and be
    // drawn full height.
    const [light, heavy] = bars(
      week([read(40, toISO(addDays(fromISO(today), -7))), read(160, today)]),
    )

    expect(heavy).toBeGreaterThan(light)
    expect(heavy / light).toBeCloseTo(4)
  })

  test('the bars render standing, with nothing left to animate in', () => {
    const html = week([read(60, todayISO())])

    // A chart is data before it is an effect: no mark may wait on a trigger.
    expect(bars(html)).toHaveLength(1)
    expect(html).not.toContain('opacity:0')
    expect(html).not.toContain('scale')
  })

  test('a week with nothing in it keeps its place in the row', () => {
    const html = week([read(30, todayISO())])

    // Eleven quiet weeks around one that was read: emptiness among data is a
    // reading too, so each keeps its column.
    expect([...html.matchAll(/class="wk-none"/g)]).toHaveLength(11)
  })

  test('twelve empty weeks are an empty state, not an empty shelf', () => {
    const html = week([])

    expect(bars(html)).toHaveLength(0)
    expect(html).not.toContain('wk-none')
    expect(html).toContain('empty-pic')
  })
})
