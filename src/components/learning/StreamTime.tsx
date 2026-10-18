import { useMemo, useState } from 'react'
import { MonthlyBars, WeeklyBars, WeekRace } from '../Charts'
import {
  addDays,
  fmtMinutes,
  fromISO,
  isoWeek,
  localeTag,
  minutesParts,
  mondayOf,
  monthYear,
  toISO,
  todayISO,
} from '../../lib/format'
import {
  minutesByDate,
  paceOf,
  totalIn,
  untimed,
  usualMonthSoFar,
  usualSoFar,
  weekSoFar,
  windowOf,
  windowsBack,
  type Span,
} from '../../lib/learning/time'
import type { StudySession } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { Counter, Segmented } from '../ui'
import { SheetFlip } from './SheetFlip'

type View = 'months' | 'weeks' | 'race'
const VIEWS: View[] = ['months', 'weeks', 'race']
const KEY = 'learning.timeView'

/** Разрез — удобство одного зрителя, а не данные: пропал из хранилища — откроется первый. */
function savedView(): View {
  try {
    const v = localStorage.getItem(KEY)
    if (VIEWS.includes(v as View)) return v as View
  } catch {
    // приватное окно или запрет хранилища — просто без памяти
  }
  return 'months'
}

/**
 * Сколько времени ушло на поток за эту неделю и много ли это.
 *
 * Сверху всегда одно и то же — сумма недели и вердикт, — а под ними три
 * горизонта одного вопроса: полгода по месяцам, три месяца по неделям и
 * гонка с прошлой неделей (обгоняю ли прямо сейчас). Разрез меняет только график; число и вердикт стоят на месте,
 * и графики одной высоты, так что переключение ничего вокруг не сдвигает.
 *
 * Время — по потоку, не по всему обучению, как страйк: страйк про «садилась
 * ли вообще», а время — про то, сколько ушло именно сюда.
 */
export function StreamTime({ sessions }: { sessions: StudySession[] }) {
  const { t, locale } = useLocale()
  const [view, setView] = useState<View>(savedView)
  // Сколько окон назад отлистали. Не запоминается: открывая дашборд, смотрят
  // на сейчас, а в прошлое заходят на минуту.
  const [back, setBack] = useState(0)
  const byDate = useMemo(() => minutesByDate(sessions), [sessions])

  const pick = (v: View) => {
    setView(v)
    setBack(0)
    try {
      localStorage.setItem(KEY, v)
    } catch {
      // см. savedView
    }
  }

  const today = todayISO()
  const week = weekSoFar(byDate, today)
  const usual = usualSoFar(byDate, today)
  const usualMonth = usualMonthSoFar(byDate, today)
  const pace = usual === null ? null : paceOf(week, usual)
  const missing = untimed(sessions, toISO(mondayOf(fromISO(today))), today)
  const fmt = (n: number) => fmtMinutes(n, locale)
  const day = t('time.days').split(' ')[(fromISO(today).getDay() + 6) % 7]

  const label = t('time.label')
  // Итог прошлой недели — в подписи: вердикт сравнивает с обычной неделей, а
  // серая линия — прошлая, и без числа «впереди» над линией выше читается
  // как ошибка.
  const lastWeek = weekSoFar(byDate, toISO(addDays(mondayOf(fromISO(today)), -1)))
  const legend =
    view === 'months'
      ? usualMonth !== null
        ? t('time.tickMonth')
        : null
      : view === 'weeks'
        ? usual !== null
          ? t('time.tick')
          : null
        : t('time.ghost', { v: fmt(lastWeek) })

  // Листалка — у месяцев и недель, гонка всегда про эту неделю. Окно назад
  // показывает прошлое как есть: без черты «обычно к этому дню» — она про
  // неделю, которая ещё идёт, — и без вердикта, который наверху всегда про
  // сейчас.
  const span: Span | null = view === 'race' ? null : view
  const maxBack = span ? windowsBack(span, byDate, today) : 0
  const at = Math.min(back, maxBack)
  const win = span ? windowOf(span, at, today) : null
  const now = at === 0
  const tag = localeTag(locale)
  const range = win && span ? windowLabel(span, win.from, win.to, tag, (n) => t('chart.week', { n })) : null

  // Сумма за то, что на графике, стоит всегда: строка под графиком не
  // пустует, и «полгода — 31 час» само по себе показание.
  // Пока времени нет совсем, панель та же самая — ноль, пустые оси с
  // подписями, — а посреди пустого поля значок и строка: что сделать, чтобы
  // она ожила. Строка под графиком на это время молчит: дважды одно и то же.
  const blank = byDate.size === 0
  const foot = blank
    ? []
    : [
        win ? t('time.total', { v: fmt(totalIn(byDate, win.from, win.to)) }) : null,
        now ? legend : null,
        now && missing > 0 ? t('time.untimed', { n: missing }) : null,
      ].filter(Boolean)

  return (
    <section className="panel rhythm-panel time-panel">
      <div className="time-head">
        <div className="reading">
          <div className="reading-num">
            {/* Минуты после часов — двумя цифрами, как в fmtMinutes: «3 ч 05». */}
            {minutesParts(week, locale).map((p, i) => (
              <span key={p.unit} className="reading-part">
                <Counter value={p.n} format={i > 0 ? (n) => String(n).padStart(2, '0') : undefined} />
                <span className="reading-suffix">{p.unit}</span>
              </span>
            ))}
            {/* «На этой неделе» — в строке числа, а не этажом под ним: шапка
                в два этажа вровень с соседними показаниями ритма, и под ней
                не остаётся лишнего воздуха. */}
            <span className="reading-suffix reading-tail">{t('time.thisWeek')}</span>
          </div>
          {/* Вердикт — словами и с причиной рядом: «впереди на 1 ч» без «обычно
              к концу среды 1 ч 50» не говорит, с чем сравнили. Обгон отмечен
              маркером, тем же, что в конспектах; отставание — без цвета:
              неделя ещё не кончилась. */}
          <p className="pace">
            {pace && usual !== null ? (
              <>
                <b>
                  {pace.kind === 'ahead' ? (
                    <mark>{t('time.ahead', { v: fmt(pace.diff) })}</mark>
                  ) : pace.kind === 'behind' ? (
                    t('time.behind', { v: fmt(pace.diff) })
                  ) : (
                    t('time.even')
                  )}
                </b>
                <span className="pace-why"> · {t('time.usualBy', { day, v: fmt(usual) })}</span>
              </>
            ) : (
              <span className="pace-why">{t('time.fresh')}</span>
            )}
          </p>
        </div>
        <Segmented
          className="sm"
          name="time-view"
          value={view}
          onChange={pick}
          options={VIEWS.map((v) => ({ value: v, label: t(`time.${v}`) }))}
        />
      </div>

      <div className="rhythm-plot">
        <div className="time-chart">
          {view === 'months' && (
            <MonthlyBars
              byDate={byDate}
              unit={fmt}
              avgFmt={fmt}
              end={win?.to}
              mark={
                now && usualMonth !== null
                  ? { value: usualMonth, label: t('time.tickTipMonth', { v: fmt(usualMonth) }) }
                  : undefined
              }
            />
          )}
          {view === 'weeks' && (
            <WeeklyBars
              byDate={byDate}
              unit={fmt}
              avgFmt={fmt}
              end={win?.to}
              mark={
                now && usual !== null ? { value: usual, label: t('time.tickTip', { v: fmt(usual) }) } : undefined
              }
            />
          )}
          {view === 'race' && <WeekRace byDate={byDate} unit={fmt} label={label} />}
          {/* Над пустым полем, не вместо графика: оси с подписями показывают,
              что здесь будет. Значок, а не рисунок: рисунок пака в половине
              панели перекрикивал и ноль, и сам вопрос. */}
          {blank && (
            <div className="time-blank">
              <span className="time-blank-ico">
                <Icon name="timer" size={20} />
              </span>
              <p>{t('time.empty')}</p>
            </div>
          )}
        </div>
        <div className="time-foot">
          {span && maxBack > 0 && (
            <SheetFlip
              at={maxBack - at}
              count={maxBack + 1}
              onPrev={() => setBack(at + 1)}
              onNext={() => setBack(at - 1)}
              label={range}
              prevLabel={t('time.earlier')}
              nextLabel={t('time.later')}
            />
          )}
          {/* Строка стоит и пустой: иначе разрез без подписи на неё короче, и
              на переключении всё ниже подпрыгивает. */}
          <p className="rhythm-cap">{foot.length > 0 ? foot.join(' · ') : '\u00a0'}</p>
        </div>
      </div>
    </section>
  )
}

/** Год недели по ISO — год её четверга: 29 декабря бывает первой неделей следующего. */
const weekYear = (iso: string) => addDays(mondayOf(fromISO(iso)), 3).getFullYear()

/**
 * Подпись окна в листалке: «май – окт. 2026», «W31–W42 · 2026». Год пишется
 * один раз, если окно в нём умещается, и у обоих краёв, если переходит через
 * Новый год.
 */
function windowLabel(span: Span, from: string, to: string, tag: string, week: (n: number) => string): string {
  const w = (iso: string) => week(isoWeek(fromISO(iso)))
  if (span === 'weeks') {
    const [a, b] = [weekYear(from), weekYear(to)]
    return a === b ? `${w(from)}–${w(to)} · ${b}` : `${w(from)} ${a} – ${w(to)} ${b}`
  }
  const [a, b] = [fromISO(from), fromISO(to)]
  if (a.getFullYear() === b.getFullYear()) {
    const month = a.toLocaleDateString(tag, { month: 'short' })
    return `${month} – ${monthYear(b, tag, 'numeric')}`
  }
  return `${monthYear(a, tag, 'numeric')} – ${monthYear(b, tag, 'numeric')}`
}
