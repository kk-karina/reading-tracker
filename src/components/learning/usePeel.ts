import { useReducedMotion } from 'motion/react'
import { useCallback, useRef, type MouseEvent, type PointerEvent } from 'react'

/** Отгиб мерится внутренним диаметром — тем, что под вырубкой (5,5% с каждой стороны). */
const inner = (el: HTMLElement) => el.getBoundingClientRect().width * 0.89 + 1
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** Рубашка в покое: отогнута на столько, что под уголком видно почти полкартинки. */
const REST = 1.12
/** Дальше этой линии стикер дотягивается сам. */
const GIVE = 0.62

/**
 * Жест «отклеить» — один на два места: купон текущего шага в листе и
 * текущий стикер в таймлайне.
 *
 * Край идёт за указателем по диагонали вниз-влево: на сколько сдвинулась
 * разность x − y, на половину этого сдвигается линия сгиба — так уголок
 * остаётся под пальцем, где бы его ни схватили. `--k` пишется прямо в
 * элемент: край должен ехать за пальцем каждый кадр, а не после рендера.
 *
 * Решение медленное, ответ быстрый: отпустила, не дотянув, — стикер ложится
 * обратно за 220 мс; дотянула — дотягивается сам. Нажатие без движения — не
 * понятый жест: у каждого места свой ответ (`onTap`).
 */
export function usePeel({ onTap, onPeeled }: { onTap: () => void; onPeeled: () => void }) {
  const stk = useRef<HTMLSpanElement>(null)
  const start = useRef<{ sum: number; k0: number; moved: number } | null>(null)
  const busy = useRef(false)
  const reduce = useReducedMotion()

  const reset = (el: HTMLElement) => {
    el.style.removeProperty('--k')
    el.style.removeProperty('transition')
  }

  const peelOff = useCallback(async () => {
    const el = stk.current
    if (!el || busy.current) return
    busy.current = true
    if (!reduce) {
      el.style.transition = '--k 0.42s var(--ease-in-out)'
      el.style.setProperty('--k', '0px')
      await wait(420)
      const flap = el.querySelector<HTMLElement>('.stk-flapw')
      await flap?.animate(
        [
          { opacity: 1, translate: '0 0', rotate: '0deg' },
          { opacity: 0, translate: '-40px -40px', rotate: '-22deg' },
        ],
        { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
      ).finished
      await wait(140)
    }
    onPeeled()
    // Рубашку снимает рендер, переключив стикер в «открыт». Свой отгиб
    // стирается кадром позже: раньше рубашка мелькнула бы на месте.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        reset(el)
        el.querySelectorAll<HTMLElement>('.stk-flapw').forEach((f) => f.getAnimations().forEach((a) => a.cancel()))
        busy.current = false
      }),
    )
  }, [onPeeled, reduce])

  /** «Вот сюда»: уголок подскакивает и ложится обратно. */
  const nudge = useCallback(async () => {
    const el = stk.current
    if (!el || reduce || busy.current || start.current) return
    el.style.setProperty('--k', `${inner(el) * 0.82}px`)
    await wait(240)
    if (!start.current) el.style.removeProperty('--k')
  }, [reduce])

  const bind = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      const el = stk.current
      if (e.button !== 0 || !el || busy.current) return
      e.currentTarget.setPointerCapture(e.pointerId)
      el.style.transition = 'none'
      start.current = {
        sum: e.clientX - e.clientY,
        k0: parseFloat(getComputedStyle(el).getPropertyValue('--k')),
        moved: 0,
      }
      e.currentTarget.classList.add('dragging')
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const el = stk.current
      const s = start.current
      if (!el || !s) return
      const d = e.clientX - e.clientY - s.sum
      s.moved = Math.max(s.moved, Math.abs(d))
      const rest = inner(el) * REST
      let k = s.k0 + d / 2
      // Назад дальше покоя — с сопротивлением, а не стеной.
      if (k > rest) k = rest + (k - rest) * 0.25
      el.style.setProperty('--k', `${Math.max(0, k)}px`)
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const el = stk.current
      const s = start.current
      start.current = null
      e.currentTarget.classList.remove('dragging')
      if (!el || !s) return
      el.style.removeProperty('transition')
      const k = parseFloat(el.style.getPropertyValue('--k'))
      if (s.moved > 6 && k < inner(el) * GIVE) {
        void peelOff()
        return
      }
      el.style.removeProperty('--k')
      if (s.moved <= 6) onTap()
    },
    onPointerCancel(e: PointerEvent<HTMLElement>) {
      start.current = null
      e.currentTarget.classList.remove('dragging')
      if (stk.current) reset(stk.current)
    },
    // Enter и пробел на кнопке — клик без указателя: закрыть сразу.
    onClick(e: MouseEvent<HTMLElement>) {
      if (e.detail === 0) void peelOff()
    },
  }

  return { stk, bind, nudge, peelOff }
}
