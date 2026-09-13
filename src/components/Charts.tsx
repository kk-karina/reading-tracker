import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { CATEGORY_BY_ID } from '../lib/categories'
import { fmtMinutes, toISO, todayISO } from '../lib/format'
import type { LogEntry, Topic } from '../lib/types'

/* ---------- shared tooltip ---------- */

interface Tip {
  x: number // 0..100, % of the chart box
  y: number
  text: string
  sub?: string
}

function Tooltip({ tip }: { tip: Tip | null }) {
  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          className="chart-tip"
          style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
          initial={{ opacity: 0, y: 4, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 2, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        >
          <strong>{tip.text}</strong>
          {tip.sub && <span>{tip.sub}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const DAY = 86_400_000

/** Monday of the week containing `d`. */
function mondayOf(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function minutesByDate(log: LogEntry[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const l of log) m.set(l.date, (m.get(l.date) ?? 0) + l.minutes)
  return m
}

/* ---------- Rhythm: one dot per day, last N weeks ---------- */

const WEEKS = 26
const CELL = 22
const PAD_L = 26
const PAD_T = 22

export function Rhythm({ log }: { log: LogEntry[] }) {
  const [tip, setTip] = useState<Tip | null>(null)
  const today = todayISO()
  const byDate = useMemo(() => minutesByDate(log), [log])

  const start = mondayOf(new Date(parseISO(today).getTime() - (WEEKS - 1) * 7 * DAY))
  const max = Math.max(1, ...byDate.values())

  const W = PAD_L + WEEKS * CELL
  const H = PAD_T + 7 * CELL

  const cells: { iso: string; x: number; y: number; min: number; future: boolean }[] = []
  const months: { x: number; label: string }[] = []
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY)
      const iso = toISO(date)
      if (d === 0 || (w === 0 && d === 0)) {
        // month label at the first Monday that lands in a new month
        const prev = new Date(date.getTime() - 7 * DAY)
        if (w === 0 || prev.getMonth() !== date.getMonth()) {
          months.push({ x: PAD_L + w * CELL, label: date.toLocaleDateString('en-GB', { month: 'short' }) })
        }
      }
      cells.push({
        iso,
        x: PAD_L + w * CELL + CELL / 2,
        y: PAD_T + d * CELL + CELL / 2,
        min: byDate.get(iso) ?? 0,
        future: iso > today,
      })
    }
  }

  const label = (iso: string) =>
    parseISO(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="chart" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Minutes per day, last 26 weeks">
        {months.map((m) => (
          <text key={m.x} x={m.x} y={12} className="chart-axis" style={{ fontSize: 7 }}>
            {m.label}
          </text>
        ))}
        {['M', 'W', 'F'].map((l, i) => (
          <text key={l} x={8} y={PAD_T + i * 2 * CELL + CELL / 2} className="chart-axis" dominantBaseline="middle" style={{ fontSize: 7 }}>
            {l}
          </text>
        ))}
        {cells.map((c, i) => {
          if (c.future) return null
          const t = c.min / max
          const r = c.min === 0 ? 1.6 : 3 + t * 5
          const isToday = c.iso === today
          return (
            <g key={c.iso}>
              <motion.circle
                cx={c.x}
                cy={c.y}
                r={r}
                fill={c.min === 0 ? 'var(--line-2)' : 'var(--green)'}
                fillOpacity={c.min === 0 ? 1 : 0.35 + t * 0.65}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.15 + (i % 7) * 0.02 + Math.floor(i / 7) * 0.012 }}
                style={{ transformOrigin: `${c.x}px ${c.y}px` }}
              />
              {isToday && <circle cx={c.x} cy={c.y} r={r + 2.5} fill="none" stroke="var(--ink)" strokeWidth={1.2} />}
              <rect
                x={c.x - CELL / 2}
                y={c.y - CELL / 2}
                width={CELL}
                height={CELL}
                fill="transparent"
                onMouseEnter={() =>
                  setTip({ x: (c.x / W) * 100, y: ((c.y - CELL / 2) / H) * 100, text: c.min ? fmtMinutes(c.min) : 'rest', sub: label(c.iso) })
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

/* ---------- Weeks: total minutes per week, last N weeks ---------- */

const NWEEKS = 12

export function WeeklyBars({ log }: { log: LogEntry[] }) {
  const [tip, setTip] = useState<Tip | null>(null)
  const today = parseISO(todayISO())
  const thisMonday = mondayOf(today)

  const weeks = useMemo(() => {
    const out: { start: Date; iso: string; min: number; sessions: number }[] = []
    for (let i = NWEEKS - 1; i >= 0; i--) {
      const start = new Date(thisMonday.getTime() - i * 7 * DAY)
      out.push({ start, iso: toISO(start), min: 0, sessions: 0 })
    }
    const days = new Map<string, Set<string>>()
    for (const l of log) {
      const wk = toISO(mondayOf(parseISO(l.date)))
      const w = out.find((x) => x.iso === wk)
      if (!w) continue
      w.min += l.minutes
      const s = days.get(wk) ?? new Set<string>()
      s.add(l.date)
      days.set(wk, s)
    }
    for (const w of out) w.sessions = days.get(w.iso)?.size ?? 0
    return out
  }, [log, thisMonday])

  const max = Math.max(60, ...weeks.map((w) => w.min))
  const active = weeks.filter((w) => w.min > 0)
  const avg = active.length ? Math.round(active.reduce((a, w) => a + w.min, 0) / active.length) : 0

  const W = 480
  const H = 200
  const PAD_B = 22
  const PAD_TOP = 14
  const plotH = H - PAD_B - PAD_TOP
  const slot = W / NWEEKS
  const barW = Math.min(28, slot * 0.55)

  const y = (min: number) => PAD_TOP + plotH - (min / max) * plotH

  return (
    <div className="chart" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Minutes per week, last 12 weeks">
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--line-2)" />
        {avg > 0 && (
          <g>
            <line x1={0} x2={W} y1={y(avg)} y2={y(avg)} stroke="var(--ink-3)" strokeDasharray="3 4" />
            <text x={0} y={y(avg) - 5} className="chart-axis">
              avg {fmtMinutes(avg)}
            </text>
          </g>
        )}
        {weeks.map((w, i) => {
          const cx = slot * i + slot / 2
          const h = Math.max(0, y(0) - y(w.min))
          const current = i === NWEEKS - 1
          return (
            <g key={w.iso}>
              {w.min > 0 && (
                <motion.rect
                  x={cx - barW / 2}
                  width={barW}
                  y={y(0) - h}
                  height={h}
                  rx={4}
                  fill={current ? 'var(--green)' : 'var(--teal-d)'}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 + i * 0.05 }}
                  style={{ transformOrigin: `${cx}px ${y(0)}px` }}
                />
              )}
              {w.min === 0 && <circle cx={cx} cy={y(0)} r={2} fill="var(--line-2)" />}
              {(i % 2 === NWEEKS % 2 || current) && (
                <text x={cx} y={H - 6} textAnchor="middle" className="chart-axis">
                  {current ? 'now' : w.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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
                    y: ((y(w.min) - 6) / H) * 100,
                    text: w.min ? fmtMinutes(w.min) : 'nothing',
                    sub: `week of ${w.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}${w.sessions ? ` · ${w.sessions} ${w.sessions === 1 ? 'day' : 'days'}` : ''}`,
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

/* ---------- Top topics: horizontal bars ---------- */

export function TopTopics({ log, topics, limit = 6 }: { log: LogEntry[]; topics: Topic[]; limit?: number }) {
  const rows = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of log) if (l.topic_id) m.set(l.topic_id, (m.get(l.topic_id) ?? 0) + l.minutes)
    return [...m.entries()]
      .map(([id, min]) => ({ topic: topics.find((t) => t.id === id), min }))
      .filter((r): r is { topic: Topic; min: number } => !!r.topic)
      .sort((a, b) => b.min - a.min)
      .slice(0, limit)
  }, [log, topics, limit])

  if (rows.length === 0) return <div className="empty small">Log time against a topic and it shows up here.</div>

  const max = rows[0].min
  return (
    <div className="top-topics">
      {rows.map((r, i) => (
        <div key={r.topic.id} className="top-row">
          <div className="top-name">
            <span className="cat-dot" style={{ background: CATEGORY_BY_ID[r.topic.category].color }} />
            <span>{r.topic.title}</span>
            <span className="faint small"> · {CATEGORY_BY_ID[r.topic.category].short}</span>
          </div>
          <span className="mono small muted">{fmtMinutes(r.min)}</span>
          <div className="top-track">
            <motion.div
              className="top-bar"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.1 + i * 0.06 }}
              style={{ width: `${(r.min / max) * 100}%`, background: CATEGORY_BY_ID[r.topic.category].color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
