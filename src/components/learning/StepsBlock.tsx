import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { doneCount } from '../../lib/learning/steps'
import type { StreamStep } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { Sticker } from './Sticker'
import { usePeel } from './usePeel'

/**
 * Ячейка шага в таймлайне. Меньше — подпись в две строки уже не помещается.
 * На узком экране ячейка уже (см. `.tl-i` в learning.css): там путь всегда
 * листается пальцем, и показать больше шагов важнее длинной подписи.
 */
const slot = () => (window.matchMedia('(max-width: 900px)').matches ? 100 : 128)

/**
 * Шаги к цели — отдельным светлым блоком над подложкой потока.
 *
 * Отдельно, а не внутри подложки: подложка отвечает «за что садиться», и её
 * кнопка «Записать занятие» относится к фокусу, а не к шагу. Шаги — «ради
 * чего по дороге», и бумагой, а не графитом: главным предметом экрана
 * остаётся фокус.
 *
 * Слева — следующий шаг словами, справа — весь путь стикерами. Влезает —
 * путь растягивается на всю ширину; не влезает — прокручивается экранами и
 * открывается так, чтобы текущий стоял вторым слева: видно и последний
 * пройденный, и что впереди.
 *
 * `intro` растёт, когда закрылся праздник: следующий шаг входит в кадр —
 * заголовок проявляется из размытия, открытый стикер подпрыгивает, у нового
 * текущего один раз приподнимается уголок.
 */
export function StepsBlock({
  steps,
  intro,
  onOpen,
  onReplay,
  onComplete,
}: {
  /** Шаги потока по порядку (`stepsOf`). */
  steps: StreamStep[]
  intro: number
  onOpen: (edit?: boolean) => void
  onReplay: (step: StreamStep) => void
  onComplete: (step: StreamStep) => void
}) {
  const { t } = useLocale()
  const reduce = useReducedMotion()
  const view = useRef<HTMLDivElement>(null)
  const [paged, setPaged] = useState(false)
  const [edges, setEdges] = useState({ l: false, r: false })

  const done = doneCount(steps)
  const current = steps[done] ?? null
  const peel = usePeel({
    onTap: () => onOpen(),
    onPeeled: () => current && onComplete(current),
  })

  const measure = useCallback(() => {
    const v = view.current
    if (!v) return
    setPaged(steps.length * slot() > v.clientWidth + 1)
    setEdges({ l: v.scrollLeft > 2, r: v.scrollLeft + v.clientWidth < v.scrollWidth - 2 })
  }, [steps.length])

  // Путь открывается на текущем шаге. Мерить — до кадра, иначе первый кадр
  // показывает начало пути и тут же уезжает.
  useLayoutEffect(() => {
    const v = view.current
    if (!v) return
    v.scrollTo({ left: Math.max(0, (done - 1) * slot()), behavior: intro && !reduce ? 'smooth' : 'instant' })
    measure()
    // И ещё раз, когда путь перестал влезать: до этого прокрутки нет вовсе
    // (`overflow: visible`), и первая попытка уходит в пустоту.
  }, [done, intro, measure, reduce, paged])

  useEffect(() => {
    const v = view.current
    if (!v) return
    const ro = new ResizeObserver(measure)
    ro.observe(v)
    return () => ro.disconnect()
  }, [measure])

  useEffect(() => {
    if (!intro) return
    const at = setTimeout(() => void peel.nudge(), 420)
    return () => clearTimeout(at)
    // Только по новому вступлению: подсказка — раз на шаг, а не на рендер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro])

  const page = (dir: 1 | -1) => {
    const v = view.current
    if (!v) return
    const w = slot()
    const per = Math.max(1, Math.floor(v.clientWidth / w))
    v.scrollBy({ left: dir * Math.max(1, per - 1) * w, behavior: reduce ? 'instant' : 'smooth' })
  }

  if (steps.length === 0) {
    return (
      <section className="steps-block empty">
        <span className="sb-empty">{t('steps.emptyLine')}</span>
        <button type="button" className="link-btn draft-add" onClick={() => onOpen(true)}>
          <Icon name="plus" size={15} />
          {t('steps.emptyAdd')}
        </button>
      </section>
    )
  }

  const last = steps.length - 1

  return (
    <section className="steps-block" aria-label={t('steps.open')}>
      <button type="button" className="sb-main" onClick={() => onOpen()}>
        <span className="sb-kick">{current ? t('steps.kicker') : t('steps.allDone')}</span>
        <motion.span
          key={`${current?.id ?? 'all'}-${intro}`}
          className="sb-goal"
          initial={intro && !reduce ? { opacity: 0.35, filter: 'blur(4px)' } : false}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          {(current ?? steps[last]).title || t('steps.newStep')}
        </motion.span>
        <span className="sb-link">
          {t('steps.open')}
          <Icon name="chevron-down" size={14} className="icon sb-chev" />
        </span>
      </button>

      <div className={`tl-wrap${paged ? ' paged' : ''}`}>
        <button
          type="button"
          className="tl-arrow"
          aria-label={t('steps.prev')}
          disabled={!edges.l}
          onClick={() => page(-1)}
        >
          <Icon name="chevron-down" size={16} className="icon tl-chev prev" />
        </button>
        <div
          ref={view}
          className={`tl-view${edges.l ? ' more-l' : ''}${edges.r ? ' more-r' : ''}`}
          onScroll={measure}
        >
          <ol className="tl">
            {steps.map((s, i) => {
              const st = i < done ? 'done' : i === done ? 'next' : 'later'
              const final = i === last
              const label = s.title || t('steps.newStep')
              return (
                <li key={s.id} className="tl-i" data-st={st} data-walked={i > 0 && i <= done ? '' : undefined}>
                  {st === 'done' ? (
                    <button
                      type="button"
                      className="tl-btn"
                      aria-label={t('steps.prizeOf', { name: s.prize || label })}
                      title={s.prize || undefined}
                      onClick={() => onReplay(s)}
                    >
                      <Sticker
                        key={i === done - 1 ? intro : 0}
                        image={s.image}
                        size={68}
                        state="done"
                        final={final}
                        className={intro && i === done - 1 ? 'just' : undefined}
                      />
                    </button>
                  ) : st === 'next' ? (
                    <button
                      type="button"
                      className="tl-btn peel"
                      aria-label={t('steps.peelLabel', { name: label })}
                      title={t('steps.pullHint')}
                      {...peel.bind}
                    >
                      <Sticker ref={peel.stk} image={s.image} size={68} state="next" final={final} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tl-btn"
                      aria-label={t('steps.surprise', { name: label })}
                      onClick={() => onOpen()}
                    >
                      <Sticker image={s.image} size={68} state="later" final={final} />
                    </button>
                  )}
                  <span className="tl-l">{label}</span>
                </li>
              )
            })}
          </ol>
        </div>
        <button
          type="button"
          className="tl-arrow"
          aria-label={t('steps.next')}
          disabled={!edges.r}
          onClick={() => page(1)}
        >
          <Icon name="chevron-down" size={16} className="icon tl-chev next" />
        </button>
      </div>
    </section>
  )
}
