import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * Галочка кнопки «Завершить».
 *
 * Та же галочка, что `check` в наборе значков, но своим `<svg>`: в момент
 * завершения она дорисовывается штрихом, слева направо, — так кнопка говорит
 * «закрыто» тем же жестом, каким закрывают пункт в тетради. Возврат в работу
 * не перерисовывает ничего: снять отметку — не событие, заливка просто
 * уходит.
 *
 * WAAPI, а не ключевые кадры в CSS: штрих запускается только на переходе в
 * «завершено», а не при каждом показе страницы, и второй клик посреди
 * штриха обрывает его, а не ставит в очередь.
 */
export function FinishMark({ on, size = 17 }: { on: boolean; size?: number }) {
  const path = useRef<SVGPathElement>(null)
  const was = useRef(on)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = path.current
    const turnedOn = on && !was.current
    was.current = on
    if (!el || !turnedOn || reduce) return
    const run = el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: 240,
      // `--ease-out` проекта: штрих срывается быстро и мягко садится в угол.
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      delay: 60,
      fill: 'backwards',
    })
    return () => run.cancel()
  }, [on, reduce])

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        ref={path}
        d="m6 12l4 4l8-8"
        pathLength={1}
        strokeDasharray={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
