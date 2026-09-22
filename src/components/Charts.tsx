import { motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, fromISO, localeTag, toISO, todayISO } from '../lib/format'
import type { Session } from '../lib/types'
import { useLocale } from '../state/LocaleContext'

/*
 * Two charts, both fed by sessions and both measured in pages rather than
 * minutes: minutes are optional by design, so half the days would read as empty.
 *
 * The rhythm grid carries no entrance animation. A chart is structure, not
 * decoration — an empty grid still has to say "nothing here yet", and a mark
 * that starts at scale zero says nothing at all until an animation happens to
 * run. The weekly piles are the one exception and they earn it by being
 * literal: a pile there is a pile of books, and books land on a shelf. They
 * drop once, on the first scroll that brings them into view, and nothing moves
 * after.
 */

/**
 * The width the chart actually got, in CSS pixels.
 *
 * The pile needs it: a book is a book because it is much wider than it is
 * thick, and on a phone a column is a quarter of the width it has on a laptop.
 * Thickness is derived from the measurement, so the same pile reads as books at
 * either size instead of turning into a row of squares.
 */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width] as const
}

interface Tip {
  x: number // 0..100, % of the chart box
  y: number
  text: string
  sub?: string
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null
  return (
    <div className="chart-tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>
      <strong>{tip.text}</strong>
      {tip.sub && <span>{tip.sub}</span>}
    </div>
  )
}

/** Monday of the week containing `d`. */
function mondayOf(d: Date): Date {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}

export function pagesByDate(sessions: Session[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + (s.page_to - s.page_from))
  return m
}

/* ---------- Rhythm: one dot per day, last 26 weeks ---------- */

const WEEKS = 26
const CELL = 22
const PAD_L = 26
const PAD_T = 22

/**
 * Карта «число в день». Сам график ничего не знает ни про сессии, ни про
 * конспекты: чтение передаёт страницы, обучение — конспекты, а подпись и
 * единицу измерения даёт тот, кто вызывает, — переводы живут у него.
 */
export function Rhythm({
  byDate,
  label,
  unit,
  full,
}: {
  byDate: Map<string, number>
  label: string
  unit: (n: number) => string
  /**
   * Сколько за день — это «полный» кружок. Без него шкала берётся от максимума
   * в данных, и там, где за день бывает одна запись, эта одна запись рисуется
   * самой жирной точкой: страницы дают разброс, конспекты — нет.
   */
  full?: number
}) {
  const { t, locale } = useLocale()
  const [tip, setTip] = useState<Tip | null>(null)
  const today = todayISO()

  const start = addDays(mondayOf(fromISO(today)), -(WEEKS - 1) * 7)
  const max = full ?? Math.max(1, ...byDate.values())

  const W = PAD_L + WEEKS * CELL
  const H = PAD_T + 7 * CELL
  const tag = localeTag(locale)

  const cells: { iso: string; x: number; y: number; value: number; future: boolean }[] = []
  const months: { x: number; label: string }[] = []
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d)
      const iso = toISO(date)
      if (d === 0) {
        const prev = addDays(date, -7)
        if (w === 0 || prev.getMonth() !== date.getMonth()) {
          months.push({ x: PAD_L + w * CELL, label: date.toLocaleDateString(tag, { month: 'short' }) })
        }
      }
      cells.push({
        iso,
        x: PAD_L + w * CELL + CELL / 2,
        y: PAD_T + d * CELL + CELL / 2,
        value: byDate.get(iso) ?? 0,
        future: iso > today,
      })
    }
  }

  const dayLabel = (iso: string) =>
    fromISO(iso).toLocaleDateString(tag, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="chart" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={label}>
        {months.map((m) => (
          <text key={m.x} x={m.x} y={12} className="chart-axis" style={{ fontSize: 7 }}>
            {m.label}
          </text>
        ))}
        {[0, 2, 4].map((d, i) => (
          <text
            key={d}
            x={8}
            y={PAD_T + d * CELL + CELL / 2}
            className="chart-axis"
            dominantBaseline="middle"
            style={{ fontSize: 7 }}
          >
            {t('chart.weekdays').split(' ')[i]}
          </text>
        ))}
        {cells.map((c) => {
          /* The days of this week that have not happened yet are drawn too, a
             shade paler than a rest day: a column that stops mid-air reads as
             missing data, where a pale dot reads as a day still to come. They
             take no tooltip — there is nothing to say about them. */
          if (c.future) {
            return (
              <circle key={c.iso} data-day={c.iso} cx={c.x} cy={c.y} r={1.6} fill="var(--line)" />
            )
          }
          const share = Math.min(1, c.value / max)
          const r = c.value === 0 ? 1.6 : 3 + share * 5
          return (
            <g key={c.iso} data-day={c.iso}>
              <circle
                cx={c.x}
                cy={c.y}
                r={r}
                fill={c.value === 0 ? 'var(--line-2)' : 'var(--brand-strong)'}
                fillOpacity={c.value === 0 ? 1 : 0.35 + share * 0.65}
              />
              {/* Today is where the eye starts, so it is ringed whether it was
                  read on or not — and the ring keeps a floor, or a rest day
                  today would wear one two pixels wide. */}
              {c.iso === today && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={Math.max(r + 3, 5.5)}
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={1.4}
                />
              )}
              <rect
                x={c.x - CELL / 2}
                y={c.y - CELL / 2}
                width={CELL}
                height={CELL}
                fill="transparent"
                onMouseEnter={() =>
                  setTip({
                    x: (c.x / W) * 100,
                    y: ((c.y - CELL / 2) / H) * 100,
                    text: c.value ? unit(c.value) : t('chart.rest'),
                    sub: dayLabel(c.iso),
                  })
                }
                onMouseLeave={() => setTip(null)}
              />
            </g>
          )
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}

/* ---------- Weeks: pages per week, last 12, as a pile of books ---------- */

const NWEEKS = 12

/* The plot box in CSS pixels: headroom above the tallest week, the pile, then
   the date row. Percent heights keep it responsive without measuring. */
const PAD_TOP = 16
const LABELS_H = 24
/* Shorter on a phone: the pile there is built of thinner books, and eighteen of
   them stacked to the full height reads as stripes rather than as a stack. */
const PLOT_H = 180
const PLOT_H_SM = 140
const NARROW = 420

/* How thick a book is here. The pile is not a ledger — it does not claim one
   slab per title or one millimetre per page. It says "this much reading" the
   way a stack on a bedside table does, and a stack of books that size has about
   this many books in it. What is exact is the height: piles compare honestly.

   Thickness follows the column's width, because that ratio is the whole tell —
   a block as thick as it is wide is a brick, not a book. */
const COL_MAX_W = 46
const BOOK_RATIO = 0.46
const BOOK_MIN_H = 10
const BOOK_MAX_H = 22

const clamp = (lo: number, x: number, hi: number) => Math.min(hi, Math.max(lo, x))

/* Bright cloth, because a shelf is not a spreadsheet. Ordered so that stepping
   five along — which is what the pile does — never lands on a neighbour twice. */
const CLOTH = [
  '#e8543f', // vermilion
  '#f3a03c', // amber
  '#e3c02c', // ochre
  '#57b65a', // leaf
  '#2aa89f', // teal
  '#3d87d6', // blue
  '#8a63d2', // violet
  '#e4589a', // pink
]

/* The drop: one height, one spring, one stagger. The pile builds bottom up and
   oldest week first, so the eye is carried left to right and lands on "now". */
const DROP = 72
const COL_STAGGER = 0.022
const BOOK_STAGGER = 0.04

interface Slab {
  /** Shelf to the underside of the book, in pixels. */
  y: number
  h: number
  /** Width and left edge as fractions of the column, so no two books match. */
  w: number
  left: number
  color: string
}

/** Stable noise in 0..1: the same week piles up the same way on every device. */
function jitter(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return (h % 1000) / 1000
}

/**
 * A week's pages as a pile of books of roughly book thickness — no two quite
 * the same size, none quite squared up with the one below, which is what tells
 * a stack of books from a column of colour.
 */
function pileOf(barH: number, seed: number, bookH: number, gap: number): Slab[] {
  if (barH <= 0) return []
  const n = Math.max(1, Math.round(barH / bookH))
  const weights = Array.from({ length: n }, (_, k) => 0.8 + jitter(seed, k) * 0.4)
  const total = weights.reduce((a, x) => a + x, 0)

  let y = 0
  return weights.map((weight, k) => {
    const h = (weight / total) * barH
    const w = 0.76 + jitter(seed, k + 100) * 0.24
    const slack = 1 - w
    // Nudged off centre, then held inside the column: a leaning pile, not a
    // spilt one.
    const left = Math.min(slack, Math.max(0, slack / 2 + (jitter(seed, k + 200) - 0.5) * 0.22))
    const book = { y, h: Math.max(3, h - gap), w, left, color: CLOTH[(seed * 3 + k * 5) % CLOTH.length] }
    y += h
    return book
  })
}

export function WeeklyBars({ sessions }: { sessions: Session[] }) {
  const { t, locale } = useLocale()
  const [tip, setTip] = useState<Tip | null>(null)
  const [ref, box] = useWidth<HTMLDivElement>()
  const reduce = !!useReducedMotion()
  const inView = useInView(ref, { once: true, amount: 0.3 })
  // Server-rendered markup has no observer to fire, so it skips the drop and
  // renders the pile already standing; in the browser a timer stands it up
  // anyway if the observer somehow never reports. A chart is data before it is
  // an effect, and no effect is allowed to leave it invisible.
  const canPlay = typeof window !== 'undefined'
  const [lateShow, setLateShow] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setLateShow(true), 4000)
    return () => clearTimeout(id)
  }, [])
  const shown = inView || lateShow
  const tag = localeTag(locale)

  const thisMonday = useMemo(() => toISO(mondayOf(fromISO(todayISO()))), [])

  const weeks = useMemo(() => {
    const out: { start: Date; iso: string; pages: number }[] = []
    for (let i = NWEEKS - 1; i >= 0; i--) {
      const start = addDays(fromISO(thisMonday), -i * 7)
      out.push({ start, iso: toISO(start), pages: 0 })
    }
    for (const s of sessions) {
      const week = out.find((x) => x.iso === toISO(mondayOf(fromISO(s.date))))
      if (week) week.pages += s.page_to - s.page_from
    }
    return out
  }, [sessions, thisMonday])

  const max = Math.max(20, ...weeks.map((w) => w.pages))
  const active = weeks.filter((w) => w.pages > 0)
  const avg = active.length ? Math.round(active.reduce((a, w) => a + w.pages, 0) / active.length) : 0

  // Before the first measurement the chart is a full-width panel until told
  // otherwise, which is the common case and never the wrong shape by much.
  const width = box || 1000
  const narrow = width < NARROW
  const plotH = narrow ? PLOT_H_SM : PLOT_H
  const H = PAD_TOP + plotH + 1 + LABELS_H // the +1 is the shelf line
  const colW = clamp(10, (width / NWEEKS) * 0.88, COL_MAX_W)
  const bookH = clamp(BOOK_MIN_H, colW * BOOK_RATIO, BOOK_MAX_H)
  const gap = narrow ? 1 : 3

  const piles = useMemo(
    () => weeks.map((w, i) => pileOf((w.pages / max) * plotH, i + 1, bookH, gap)),
    [weeks, max, plotH, bookH, gap],
  )

  const dateOf = (start: Date) => start.toLocaleDateString(tag, { day: 'numeric', month: 'short' })
  /** Column centre and the height of a pile, both as a % of the chart box. */
  const colX = (i: number) => ((i + 0.5) / NWEEKS) * 100
  const topY = (px: number) => ((PAD_TOP + plotH - px) / H) * 100

  const weekTip = (i: number): Tip => ({
    x: colX(i),
    y: topY((weeks[i].pages / max) * plotH),
    text: weeks[i].pages ? t('count.pages', { n: weeks[i].pages }) : t('chart.nothing'),
    sub: dateOf(weeks[i].start),
  })

  const cols = { gridTemplateColumns: `repeat(${NWEEKS}, 1fr)` }

  return (
    <div className="chart wk" ref={ref} style={{ height: H }}>
      <div className="wk-plot" style={{ height: PAD_TOP + plotH + 1, ...cols }}>
        {avg > 0 && (
          <motion.div
            className="wk-avg"
            style={{ bottom: (avg / max) * plotH }}
            initial={canPlay ? { opacity: 0 } : false}
            animate={{ opacity: !canPlay || shown ? 1 : 0 }}
            /* Held back until the first books are down: a lone reference line
               over an empty shelf has nothing to be a reference to. */
            transition={{ duration: 0.2, delay: reduce ? 0 : 0.34 }}
          >
            <span className="wk-cap">{t('chart.avg', { n: avg })}</span>
          </motion.div>
        )}

        {weeks.map((w, i) => (
          <div
            key={w.iso}
            className="wk-col"
            onMouseEnter={() => setTip(weekTip(i))}
            onMouseLeave={() => setTip(null)}
          >
            {w.pages === 0 ? (
              <span className="wk-none" />
            ) : (
              <div className="wk-stack" style={{ width: colW }}>
                {piles[i].map((b, k) => {
                  const delay = i * COL_STAGGER + k * BOOK_STAGGER
                  // Deterministic, so the same chart falls the same way twice.
                  const tilt = (jitter(i, k + 300) - 0.5) * 11
                  const fallen = reduce
                    ? { opacity: 0 }
                    : { opacity: 0, transform: `translateY(${-(DROP + (k % 3) * 12)}px) rotate(${tilt}deg)` }
                  const rested = reduce
                    ? { opacity: 1 }
                    : { opacity: 1, transform: 'translateY(0px) rotate(0deg)' }
                  return (
                    <motion.span
                      key={k}
                      className="wk-book"
                      style={{
                        bottom: b.y,
                        height: b.h,
                        borderRadius: Math.min(3, b.h / 3),
                        left: `${b.left * 100}%`,
                        width: `${b.w * 100}%`,
                        backgroundColor: b.color,
                      }}
                      initial={canPlay && !shown ? fallen : false}
                      animate={canPlay && !shown ? fallen : rested}
                      transition={
                        reduce
                          ? { duration: 0.2, delay: i * 0.02 }
                          : {
                              transform: { type: 'spring', duration: 0.44, bounce: 0.3, delay },
                              opacity: { duration: 0.16, ease: [0.23, 1, 0.32, 1], delay },
                            }
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Twelve dates need room; on a narrow panel CSS thins them out. */}
      <div className="wk-labels" style={{ height: LABELS_H, ...cols }}>
        {weeks.map((w, i) => (
          <span key={w.iso} className={`wk-cap wk-label${i === NWEEKS - 1 ? ' is-now' : ''}`}>
            {i === NWEEKS - 1 ? t('chart.now') : dateOf(w.start)}
          </span>
        ))}
      </div>

      <Tooltip tip={tip} />
    </div>
  )
}
