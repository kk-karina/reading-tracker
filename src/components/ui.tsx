import { animate, motion, useMotionValue, useTransform, type HTMLMotionProps } from 'motion/react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

/** Number that counts up to its value on mount and on change, with a little bounce on change. */
export function Counter({ value, format }: { value: number; format?: (n: number) => string }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => (format ? format(Math.round(v)) : String(Math.round(v))))
  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
    return () => ctrl.stop()
  }, [value, mv])
  return (
    <motion.span
      key={value}
      style={{ display: 'inline-block' }}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.12, 1] }}
      transition={{ duration: 0.5, times: [0, 0.3, 1], ease: 'easeOut' }}
    >
      {text}
    </motion.span>
  )
}

interface SegProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  name: string
  className?: string
  color?: string
}

/** Segmented control with a sliding, slightly bouncy ink. */
export function Segmented<T extends string>({ value, options, onChange, name, className, color }: SegProps<T>) {
  return (
    <div
      className={`seg${className ? ` ${className}` : ''}`}
      role="radiogroup"
      aria-label={name}
      style={color ? ({ '--seg-c': color } as CSSProperties) : undefined}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <motion.button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={on ? 'on' : ''}
            onClick={() => onChange(o.value)}
            whileTap={{ scale: 0.92 }}
          >
            {on && (
              <motion.span
                layoutId={`seg-${name}`}
                className="seg-ink"
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              />
            )}
            {o.label}
          </motion.button>
        )
      })}
    </div>
  )
}

/** Button with a jelly press. Pass className as usual (btn, ghost, sm…). */
export function Jelly({ children, ...rest }: HTMLMotionProps<'button'> & { children: ReactNode }) {
  return (
    <motion.button
      whileHover={{ y: -2, rotate: -1.5 }}
      whileTap={{ scale: 0.92, rotate: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

/** A short burst of dots flying out of a point. Re-render with a new `id` to fire again. */
export function Burst({ id, color = 'var(--hot-lime)', n = 10 }: { id: number; color?: string; n?: number }) {
  const [live, setLive] = useState<number | null>(null)
  useEffect(() => {
    if (!id) return
    setLive(id)
    const t = setTimeout(() => setLive(null), 900)
    return () => clearTimeout(t)
  }, [id])
  if (!live) return null
  return (
    <span className="burst" aria-hidden>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + (live % 7) * 0.3
        const d = 38 + ((i * 37 + live) % 26)
        return (
          <motion.i
            key={`${live}-${i}`}
            style={{ background: i % 3 === 0 ? 'var(--hot)' : i % 3 === 1 ? 'var(--hot-cyan)' : color }}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, scale: [0.4, 1.1, 0], opacity: [1, 1, 0] }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          />
        )
      })}
    </span>
  )
}

export const listItem = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
  transition: { type: 'spring' as const, stiffness: 420, damping: 26 },
}
