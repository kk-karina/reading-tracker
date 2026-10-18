import { motion, useDragControls, type PanInfo } from 'motion/react'
import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'

/** Сколько листов пачки выглядывает с каждой стороны: дальше они неразличимы. */
const LEAVES = 3

/**
 * Конспекты материала — пачкой листов, а не листом со счётчиком.
 *
 * Сквозная листалка стояла над главами, и её «‹ 1/5 ›» читалось как
 * переключатель глав. Листать подряд все листы — жест про бумагу, а не про
 * оглавление, и он переехал на саму бумагу:
 *
 * - из-под листа выглядывают края соседних: слева — пролистанные, справа —
 *   оставшиеся. Где ты в пачке, видно без цифры;
 * - пальцем лист тянут в сторону, как страницу; отпущенный за порогом лист
 *   сменяется следующим и встаёт на место от пальца;
 * - мышью — щелчок по краю пачки: под курсором край выдвигается, обещая лист;
 * - с клавиатуры — стрелки ← →, пока не открыт другой лист и курсор не в поле;
 * - и листалкой «‹ 3/8 ›» в правом краю шапки листа — её ставит страница.
 *   Внизу листа она стояла раньше и ездила вместе с его длиной.
 *
 * Сам лист при смене не гаснет и не уезжает: содержимое подменяется в кадре.
 * О смене говорят края пачки, номер в шапке и заливка главы в оглавлении.
 */
export function NoteStack({
  at,
  count,
  onPrev,
  onNext,
  children,
}: {
  at: number
  count: number
  onPrev: () => void
  onNext: () => void
  children: ReactNode
}) {
  const { t } = useLocale()
  const drag = useDragControls()
  const before = Math.min(at, LEAVES)
  const after = Math.min(count - 1 - at, LEAVES)
  const prev = at > 0 ? onPrev : undefined
  const next = at < count - 1 ? onNext : undefined

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
      // Лист поверх экрана — своя история: стрелки там его, а не пачки под ним.
      if (document.querySelector('.sheet-scrim')) return
      const go = e.key === 'ArrowLeft' ? prev : e.key === 'ArrowRight' ? next : undefined
      if (!go) return
      e.preventDefault()
      go()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [prev, next])

  /* Порог — четверть ширины или резкий бросок: короткий быстрый смах тоже
     жест, а не промах. Скорость важнее расстояния, как у листа в книге. */
  const release = (_: PointerEvent, info: PanInfo) => {
    // Тянут только пальцем, а на телефоне лист — почти вся ширина окна.
    const far = Math.abs(info.offset.x) > window.innerWidth * 0.25
    const fast = Math.abs(info.velocity.x) > 500
    if (!far && !fast) return
    if (info.offset.x < 0) next?.()
    else prev?.()
  }

  const leaf = (side: 'prev' | 'next', i: number) => (
    <span
      key={`${side}${i}`}
      className={`stack-leaf ${side}`}
      style={{ '--i': i + 1 } as CSSProperties}
      aria-hidden
    />
  )

  return (
    <div className="note-stack">
      {Array.from({ length: before }, (_, i) => leaf('prev', i))}
      {Array.from({ length: after }, (_, i) => leaf('next', i))}

      <motion.div
        className="stack-top"
        drag="x"
        // Мышью лист не тянут: ею выделяют текст. Тянет только палец.
        dragListener={false}
        dragControls={drag}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        // У края пачки тянуть некуда — лист упирается, а не уезжает.
        dragElastic={{ left: next ? 0.4 : 0.06, right: prev ? 0.4 : 0.06 }}
        dragSnapToOrigin
        dragTransition={{ bounceStiffness: 520, bounceDamping: 38 }}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') drag.start(e)
        }}
        onDragEnd={release}
      >
        {children}
      </motion.div>

      {prev && (
        <button type="button" className="stack-edge prev" aria-label={t('note.prev')} onClick={prev}>
          <span className="stack-edge-ink">
            <Icon name="chevron-down" size={18} />
          </span>
        </button>
      )}
      {next && (
        <button type="button" className="stack-edge next" aria-label={t('note.next')} onClick={next}>
          <span className="stack-edge-ink">
            <Icon name="chevron-down" size={18} />
          </span>
        </button>
      )}
    </div>
  )
}
