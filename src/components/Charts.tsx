import { useMemo, useState } from 'react'
import { addDays, fromISO, localeTag, toISO, todayISO } from '../lib/format'
import type { Session } from '../lib/types'
import { useLocale } from '../state/LocaleContext'
import { Empty } from './ui'

/*
 * Two charts, both fed by sessions and both measured in pages rather than
 * minutes: minutes are optional by design, so half the days would read as empty.
 *
 * Neither chart carries an entrance animation. A chart is structure, not
 * decoration — an empty grid still has to say "nothing here yet", and a mark
 * that starts at scale zero says nothing at all until an animation happens to
 * run.
 */

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

/* ---------- Weeks: pages per week, last 12, as bars ---------- */

const NWEEKS = 12

/* The plot box in CSS pixels: headroom above the tallest week, the bars, then
   the date row. Percent widths keep it responsive without measuring. */
const PAD_TOP = 16
const LABELS_H = 24
const PLOT_H = 180

export function WeeklyBars({ sessions }: { sessions: Session[] }) {
  const { t, locale } = useLocale()
  const [tip, setTip] = useState<Tip | null>(null)
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

  const H = PAD_TOP + PLOT_H + 1 + LABELS_H // the +1 is the baseline
  const barH = (pages: number) => (pages / max) * PLOT_H

  const dateOf = (start: Date) => start.toLocaleDateString(tag, { day: 'numeric', month: 'short' })
  /** Column centre and the top of a bar, both as a % of the chart box. */
  const colX = (i: number) => ((i + 0.5) / NWEEKS) * 100
  const topY = (px: number) => ((PAD_TOP + PLOT_H - px) / H) * 100

  const weekTip = (i: number): Tip => ({
    x: colX(i),
    y: topY(barH(weeks[i].pages)),
    text: weeks[i].pages ? t('count.pages', { n: weeks[i].pages }) : t('chart.nothing'),
    sub: dateOf(weeks[i].start),
  })

  const cols = { gridTemplateColumns: `repeat(${NWEEKS}, 1fr)` }

  // Двенадцать пустых колонок — не график, а линейка без делений: читать на
  // ней нечего, а полка из подписей дат выглядит так, будто данные не
  // догрузились. Пустая неделя среди полных остаётся колонкой с «Ничего» в
  // подсказке — там пустота и есть показание.
  if (active.length === 0) return <Empty art="waiting">{t('chart.weeksEmpty')}</Empty>

  return (
    <div className="chart wk" style={{ height: H }}>
      <div className="wk-plot" style={{ height: PAD_TOP + PLOT_H + 1, ...cols }}>
        {avg > 0 && (
          <div className="wk-avg" style={{ bottom: barH(avg) }}>
            <span className="wk-cap">{t('chart.avg', { n: avg })}</span>
          </div>
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
              <span className="wk-bar" style={{ height: barH(w.pages) }} />
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
