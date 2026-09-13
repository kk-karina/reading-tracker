import { useMemo, useState } from 'react'
import { fromISO, localeTag, toISO, todayISO } from '../lib/format'
import type { Session } from '../lib/types'
import { useLocale } from '../state/LocaleContext'

/*
 * Two charts, both fed by sessions and both measured in pages rather than
 * minutes: minutes are optional by design, so half the days would read as empty.
 *
 * The marks carry no entrance animation. A chart is structure, not decoration —
 * an empty grid still has to say "nothing here yet", and a mark that starts at
 * scale zero says nothing at all until an animation happens to run.
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

const DAY = 86_400_000

/** Monday of the week containing `d`. */
function mondayOf(d: Date): Date {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}

function pagesByDate(sessions: Session[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + (s.page_to - s.page_from))
  return m
}

/* ---------- Rhythm: one dot per day, last 26 weeks ---------- */

const WEEKS = 26
const CELL = 22
const PAD_L = 26
const PAD_T = 22

export function Rhythm({ sessions }: { sessions: Session[] }) {
  const { t, locale } = useLocale()
  const [tip, setTip] = useState<Tip | null>(null)
  const today = todayISO()
  const byDate = useMemo(() => pagesByDate(sessions), [sessions])

  const start = mondayOf(new Date(fromISO(today).getTime() - (WEEKS - 1) * 7 * DAY))
  const max = Math.max(1, ...byDate.values())

  const W = PAD_L + WEEKS * CELL
  const H = PAD_T + 7 * CELL
  const tag = localeTag(locale)

  const cells: { iso: string; x: number; y: number; pages: number; future: boolean }[] = []
  const months: { x: number; label: string }[] = []
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY)
      const iso = toISO(date)
      if (d === 0) {
        const prev = new Date(date.getTime() - 7 * DAY)
        if (w === 0 || prev.getMonth() !== date.getMonth()) {
          months.push({ x: PAD_L + w * CELL, label: date.toLocaleDateString(tag, { month: 'short' }) })
        }
      }
      cells.push({
        iso,
        x: PAD_L + w * CELL + CELL / 2,
        y: PAD_T + d * CELL + CELL / 2,
        pages: byDate.get(iso) ?? 0,
        future: iso > today,
      })
    }
  }

  const dayLabel = (iso: string) =>
    fromISO(iso).toLocaleDateString(tag, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="chart" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={t('chart.rhythm')}>
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
          if (c.future) return null
          const share = c.pages / max
          const r = c.pages === 0 ? 1.6 : 3 + share * 5
          return (
            <g key={c.iso}>
              <circle
                cx={c.x}
                cy={c.y}
                r={r}
                fill={c.pages === 0 ? 'var(--line-2)' : 'var(--green)'}
                fillOpacity={c.pages === 0 ? 1 : 0.35 + share * 0.65}
              />
              {c.iso === today && (
                <circle cx={c.x} cy={c.y} r={r + 2.5} fill="none" stroke="var(--ink)" strokeWidth={1.2} />
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
                    text: c.pages ? t('count.pages', { n: c.pages }) : t('chart.rest'),
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

/* ---------- Weeks: pages per week, last 12 ---------- */

const NWEEKS = 12

export function WeeklyBars({ sessions }: { sessions: Session[] }) {
  const { t, locale } = useLocale()
  const [tip, setTip] = useState<Tip | null>(null)
  const thisMonday = mondayOf(fromISO(todayISO()))
  const tag = localeTag(locale)

  const weeks = useMemo(() => {
    const out: { start: Date; iso: string; pages: number; days: Set<string> }[] = []
    for (let i = NWEEKS - 1; i >= 0; i--) {
      const start = new Date(thisMonday.getTime() - i * 7 * DAY)
      out.push({ start, iso: toISO(start), pages: 0, days: new Set() })
    }
    for (const s of sessions) {
      const week = out.find((x) => x.iso === toISO(mondayOf(fromISO(s.date))))
      if (!week) continue
      week.pages += s.page_to - s.page_from
      week.days.add(s.date)
    }
    return out
  }, [sessions, thisMonday])

  const max = Math.max(20, ...weeks.map((w) => w.pages))
  const active = weeks.filter((w) => w.pages > 0)
  const avg = active.length ? Math.round(active.reduce((a, w) => a + w.pages, 0) / active.length) : 0

  const W = 480
  const H = 200
  const PAD_B = 22
  const PAD_TOP = 14
  const plotH = H - PAD_B - PAD_TOP
  const slot = W / NWEEKS
  const barW = Math.min(28, slot * 0.55)
  const y = (pages: number) => PAD_TOP + plotH - (pages / max) * plotH

  return (
    <div className="chart" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={t('chart.weeks')}>
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--line-2)" />
        {avg > 0 && (
          <g>
            <line x1={0} x2={W} y1={y(avg)} y2={y(avg)} stroke="var(--ink-3)" />
            <text x={0} y={y(avg) - 5} className="chart-axis">
              {t('chart.avg', { n: avg })}
            </text>
          </g>
        )}
        {weeks.map((w, i) => {
          const cx = slot * i + slot / 2
          const h = Math.max(0, y(0) - y(w.pages))
          const current = i === NWEEKS - 1
          return (
            <g key={w.iso}>
              {w.pages > 0 ? (
                <rect
                  x={cx - barW / 2}
                  width={barW}
                  y={y(0) - h}
                  height={h}
                  rx={4}
                  fill={current ? 'var(--green)' : 'var(--teal-d)'}
                />
              ) : (
                <circle cx={cx} cy={y(0)} r={2} fill="var(--line-2)" />
              )}
              {(i % 2 === NWEEKS % 2 || current) && (
                <text x={cx} y={H - 6} textAnchor="middle" className="chart-axis">
                  {current ? t('chart.now') : w.start.toLocaleDateString(tag, { day: 'numeric', month: 'short' })}
                </text>
              )}
              <rect
                x={slot * i}
                y={0}
                width={slot}
                height={H - PAD_B}
                fill="transparent"
                onMouseEnter={() =>
                  setTip({
                    x: (cx / W) * 100,
                    y: ((y(w.pages) - 6) / H) * 100,
                    text: w.pages ? t('count.pages', { n: w.pages }) : t('chart.nothing'),
                    sub: w.start.toLocaleDateString(tag, { day: 'numeric', month: 'short' }),
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
