import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addDays, fromISO, isoWeek, localeTag, mondayOf, monthParts, toISO, todayISO } from '../lib/format'
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

export function pagesByDate(sessions: Session[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + (s.page_to - s.page_from))
  return m
}

/* ---------- Rhythm: one dot per day, last 16 weeks ---------- */

/* Four months, not half a year: on both dashboards the rhythm sits in half
   the width, next to the chart that explains it, and sixteen weeks is what
   fits there as dots rather than dust. */
const WEEKS = 16
/** Кегль подписей осей в настоящих пикселях — тот же, что у `.wk-cap`. */
const AXIS_PX = 10
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
  weeks = WEEKS,
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
  /** Сколько недель назад. По умолчанию — сколько влезает в половину ширины. */
  weeks?: number
}) {
  const { t, locale } = useLocale()
  const [tip, setTip] = useState<Tip | null>(null)
  const today = todayISO()

  const start = addDays(mondayOf(fromISO(today)), -(weeks - 1) * 7)
  const max = full ?? Math.max(1, ...byDate.values())

  const W = PAD_L + weeks * CELL
  const H = PAD_T + 7 * CELL

  /* SVG тянется по ширине панели, а с ним и его подписи: на всю страницу они
     выходили крупнее заголовков, в половине — нечитаемо мелкими. Подпись оси
     везде 10 пикселей, как даты под столбиками, поэтому её кегль в единицах
     SVG пересчитывается от настоящей ширины. До замера — прежние 7. */
  const box = useRef<HTMLDivElement>(null)
  const [axis, setAxis] = useState(7)
  useLayoutEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const fit = () => {
      const scale = el.clientWidth / W
      if (scale > 0) setAxis(AXIS_PX / scale)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [W])
  const tag = localeTag(locale)

  const cells: { iso: string; x: number; y: number; value: number; future: boolean }[] = []
  const months: { x: number; label: string }[] = []
  for (let w = 0; w < weeks; w++) {
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

  // Первая колонка подписывается всегда, и если следующий месяц начинается
  // через неделю, два имени налезают друг на друга. Тогда первое уступает:
  // какой это месяц, и так видно по соседу.
  if (months.length > 1 && months[1].x - months[0].x < 3 * CELL) months.shift()

  const dayLabel = (iso: string) =>
    fromISO(iso).toLocaleDateString(tag, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div ref={box} className="chart" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={label}>
        {months.map((m) => (
          <text key={m.x} x={m.x} y={12} className="chart-axis" style={{ fontSize: axis }}>
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
            style={{ fontSize: axis }}
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
          // Самая полная точка оставляет до соседей зазор в треть клетки:
          // сливаясь, точки перестают быть днями и становятся пятном.
          const r = c.value === 0 ? 1.6 : 2.5 + share * 4.5
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

/* ---------- Bars: one box shared by every bar chart below ---------- */

/* The plot box in CSS pixels: headroom above the tallest mark, the plot, then
   the date row. Percent widths keep it responsive without measuring. Every
   chart below is exactly this tall, so a panel that switches between them
   moves nothing around it. */
const PAD_TOP = 16
const LABELS_H = 24
const PLOT_H = 180
const PLOT_BOX = PAD_TOP + PLOT_H + 1 // the +1 is the baseline
const BOX_H = PLOT_BOX + LABELS_H

/** Below this the scale stops shrinking: one quiet week must not fill the chart. */
const FLOOR = 20

const barH = (v: number, max: number) => (v / max) * PLOT_H
/** Column centre and the top of a mark, both as a % of the chart box. */
const colX = (i: number, n: number) => ((i + 0.5) / n) * 100
const topY = (px: number) => ((PAD_TOP + PLOT_H - px) / BOX_H) * 100

/* ---------- Periods: one bar per week or per month ---------- */

interface Period {
  key: string
  /** Под столбиком — коротко; в подсказке — полностью. */
  label: ReactNode
  full: string
  value: number
}

interface BarsProps {
  unit: (n: number) => string
  /**
   * Строка с рисунком на месте ряда пустых столбиков. Без неё пустой ряд
   * рисуется как есть — оси, подписи, точки на нуле: так, когда рядом
   * сказано, как его наполнить.
   */
  empty?: string
  /** Как писать среднее на линии: страницы голым числом, время — часами. */
  avgFmt?: (n: number) => string
  /**
   * Черта поперёк последнего столбика — например, сколько обычно набегает к
   * сегодняшнему дню. Неделя и месяц ещё идут, и их столбик честно сравнивать
   * только с таким же отрезком, а не с целыми периодами слева.
   */
  mark?: { value: number; label: string }
  /**
   * Любой день последнего периода на графике. По умолчанию сегодня; раньше —
   * график отлистали в прошлое, и последний столбик уже не «сейчас».
   */
  end?: string
}

/**
 * Ряд столбиков, последний — текущий период. Чем мерить и как резать время,
 * решает обёртка: чтение даёт страницы по неделям, обучение — минуты по
 * неделям и по месяцам.
 */
function Bars({
  periods,
  live,
  unit,
  empty,
  avgFmt = String,
  mark,
}: Omit<BarsProps, 'end'> & { periods: Period[]; live: boolean }) {
  const { t } = useLocale()
  const [tip, setTip] = useState<Tip | null>(null)
  const n = periods.length

  const max = Math.max(FLOOR, mark?.value ?? 0, ...periods.map((p) => p.value))
  const active = periods.filter((p) => p.value > 0)
  const avg = active.length ? Math.round(active.reduce((a, p) => a + p.value, 0) / active.length) : 0
  const now = n - 1

  const barTip = (i: number): Tip => ({
    x: colX(i, n),
    y: topY(barH(Math.max(periods[i].value, i === now ? (mark?.value ?? 0) : 0), max)),
    text: periods[i].value ? unit(periods[i].value) : t('chart.nothing'),
    sub: i === now && mark ? `${periods[i].full} · ${mark.label}` : periods[i].full,
  })

  const cols = { gridTemplateColumns: `repeat(${n}, 1fr)` }

  // Ряд пустых колонок — не график, а линейка без делений: читать на ней
  // нечего, а полка из подписей дат выглядит так, будто данные не
  // догрузились. Пустой период среди полных остаётся колонкой с «Ничего» в
  // подсказке — там пустота и есть показание.
  if (active.length === 0 && empty) return <Empty art="waiting">{empty}</Empty>

  return (
    <div className="chart wk" style={{ height: BOX_H }}>
      <div className="wk-plot" style={{ height: PLOT_BOX, ...cols }}>
        {/* С чертой среднее не рисуется: два уровня рядом спорят, а честный
            из них — черта, отрезок к отрезку. */}
        {avg > 0 && !mark && (
          <div className="wk-avg" style={{ bottom: barH(avg, max) }}>
            <span className="wk-cap">{t('chart.avg', { n: avgFmt(avg) })}</span>
          </div>
        )}

        {periods.map((p, i) => (
          <div
            key={p.key}
            className="wk-col"
            onMouseEnter={() => setTip(barTip(i))}
            onMouseLeave={() => setTip(null)}
          >
            {p.value === 0 ? (
              <span className="wk-none" />
            ) : (
              <span className="wk-bar" style={{ height: barH(p.value, max) }} />
            )}
            {i === now && mark && <span className="wk-mark" style={{ bottom: barH(mark.value, max) }} />}
          </div>
        ))}
      </div>

      {/* Подписи короткие — номер недели, имя месяца, — и влезают все, даже в
          половину панели на телефоне: ряд не прореживается, и каждый столбик
          назван. */}
      <div className="wk-labels" style={{ height: LABELS_H, ...cols }}>
        {periods.map((p, i) => (
          <span key={p.key} className={`wk-cap wk-label${live && i === now ? ' is-now' : ''}`}>
            {p.label}
          </span>
        ))}
      </div>

      <Tooltip tip={tip} />
    </div>
  )
}

const NWEEKS = 12

/**
 * Двенадцать недель, последняя — эта.
 *
 * Под столбиком — номер недели, «W42», а не дата понедельника: двенадцать
 * дат в узкой панели не влезали, и подписанным оставался каждый второй
 * столбик — понять, какой из них какая неделя, было нельзя. Даты — в подсказке.
 */
export function WeeklyBars({ byDate, end, ...rest }: BarsProps & { byDate: Map<string, number> }) {
  const { t, locale } = useLocale()
  const tag = localeTag(locale)
  const today = todayISO()
  const thisMonday = toISO(mondayOf(fromISO(end ?? today)))
  const live = thisMonday === toISO(mondayOf(fromISO(today)))

  const periods = useMemo(() => {
    const range = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' })
    const out: Period[] = []
    for (let i = NWEEKS - 1; i >= 0; i--) {
      const start = addDays(fromISO(thisMonday), -i * 7)
      const week = t('chart.week', { n: isoWeek(start) })
      out.push({
        key: toISO(start),
        label: week,
        full: `${week} · ${range.formatRange(start, addDays(start, 6))}`,
        value: 0,
      })
    }
    for (const [date, v] of byDate) {
      const week = out.find((x) => x.key === toISO(mondayOf(fromISO(date))))
      if (week) week.value += v
    }
    return out
  }, [byDate, thisMonday, tag, t])

  return <Bars periods={periods} live={live} {...rest} />
}

const NMONTHS = 6

/** Полгода по месяцам, последний — этот. */
export function MonthlyBars({ byDate, end, ...rest }: BarsProps & { byDate: Map<string, number> }) {
  const { locale } = useLocale()
  const tag = localeTag(locale)
  const today = todayISO()
  const last = (end ?? today).slice(0, 7)
  const live = last === today.slice(0, 7)

  const periods = useMemo(() => {
    const d = fromISO(`${last}-01`)
    const out: Period[] = []
    for (let i = NMONTHS - 1; i >= 0; i--) {
      const start = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const p = monthParts(start, tag)
      // Узко год остаётся только у первого месяца и у января — там, где он
      // меняется; так подписывают календари. См. `.wk-year` в CSS.
      const keep = i === NMONTHS - 1 || start.getMonth() === 0
      out.push({
        key: toISO(start).slice(0, 7),
        label: (
          <>
            {p.month}
            <span className={`wk-year${keep ? ' keep' : ''}`}> {p.year}</span>
          </>
        ),
        full: start.toLocaleDateString(tag, { month: 'long', year: 'numeric' }),
        value: 0,
      })
    }
    for (const [date, v] of byDate) {
      const month = out.find((x) => x.key === date.slice(0, 7))
      if (month) month.value += v
    }
    return out
  }, [byDate, last, tag])

  return <Bars periods={periods} live={live} {...rest} />
}

/* ---------- This week against the last ---------- */

interface Day {
  iso: string
  /** Тот же день неделей раньше. */
  ago: number
  value: number
  future: boolean
}

/** Семь дней этой недели, у каждого — тот же день прошлой. */
function useWeekDays(byDate: Map<string, number>) {
  const { locale } = useLocale()
  const today = todayISO()
  const days = useMemo(() => {
    const monday = mondayOf(fromISO(today))
    const out: Day[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i)
      const iso = toISO(d)
      out.push({
        iso,
        ago: byDate.get(toISO(addDays(d, -7))) ?? 0,
        value: byDate.get(iso) ?? 0,
        future: iso > today,
      })
    }
    return out
  }, [byDate, today])
  const tag = localeTag(locale)
  const dayName = (iso: string) => fromISO(iso).toLocaleDateString(tag, { weekday: 'short' })
  const dayFull = (iso: string) =>
    fromISO(iso).toLocaleDateString(tag, { weekday: 'short', day: 'numeric', month: 'short' })
  return { days, today, dayName, dayFull }
}

const DAY_COLS = { gridTemplateColumns: 'repeat(7, 1fr)' }

function DayLabels({ days, today, name }: { days: Day[]; today: string; name: (iso: string) => string }) {
  return (
    <div className="wk-labels" style={{ height: LABELS_H, ...DAY_COLS }}>
      {days.map((d) => (
        <span key={d.iso} className={`wk-cap wk-label${d.iso === today ? ' is-now' : ''}`}>
          {name(d.iso)}
        </span>
      ))}
    </div>
  )
}

/**
 * Гонка: сколько набежало с понедельника, эта неделя против прошлой.
 *
 * Прошлая неделя нарисована целиком — это призрак, которого догоняют, и
 * видно, сколько он успел дальше. Эта обрывается сегодня точкой, а от точки к
 * призраку идёт пунктир: длина пунктира и есть ответ.
 *
 * Линии живут в SVG, растянутом по ширине панели, поэтому толщина у них
 * `non-scaling-stroke`, а точка — не кружок SVG (он бы сплющился), а элемент
 * поверх.
 */
export function WeekRace({ byDate, unit, label }: { byDate: Map<string, number>; unit: (n: number) => string; label: string }) {
  const { t } = useLocale()
  const [tip, setTip] = useState<Tip | null>(null)
  const { days, today, dayName, dayFull } = useWeekDays(byDate)

  const ago: number[] = []
  const now: number[] = []
  days.forEach((d, i) => {
    ago.push((ago[i - 1] ?? 0) + d.ago)
    if (!d.future) now.push((now[i - 1] ?? 0) + d.value)
  })
  const ti = now.length - 1
  const max = Math.max(FLOOR, ago[6], now[ti])

  const W = 700
  const x = (i: number) => (i + 0.5) * (W / 7)
  const y = (v: number) => PAD_TOP + PLOT_H - barH(v, max)
  const line = (vals: number[]) => [`0,${y(0)}`, ...vals.map((v, i) => `${x(i)},${y(v)}`)].join(' ')

  const dayTip = (i: number): Tip => {
    const was = t('chart.weekAgo', { v: unit(ago[i]) })
    const future = i > ti
    return {
      x: colX(i, 7),
      y: topY(barH(Math.max(ago[i], future ? 0 : now[i]), max)),
      text: future ? was : unit(now[i]),
      sub: future ? dayFull(days[i].iso) : `${dayFull(days[i].iso)} · ${was}`,
    }
  }

  return (
    <div className="chart wk" style={{ height: BOX_H }} role="img" aria-label={label}>
      <div className="wk-plot" style={{ height: PLOT_BOX, ...DAY_COLS }}>
        <svg
          className="race-svg"
          viewBox={`0 0 ${W} ${PAD_TOP + PLOT_H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <polyline points={line(ago)} className="race-ago" vectorEffect="non-scaling-stroke" />
          {now[ti] !== ago[ti] && (
            <line
              x1={x(ti)}
              x2={x(ti)}
              y1={y(now[ti])}
              y2={y(ago[ti])}
              className="race-gap"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <polyline points={line(now)} className="race-now" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="race-dot" style={{ left: `${colX(ti, 7)}%`, bottom: barH(now[ti], max) }} />

        {days.map((d, i) => (
          <div
            key={d.iso}
            className="wk-col"
            onMouseEnter={() => setTip(dayTip(i))}
            onMouseLeave={() => setTip(null)}
          />
        ))}
      </div>
      <DayLabels days={days} today={today} name={dayName} />
      <Tooltip tip={tip} />
    </div>
  )
}
