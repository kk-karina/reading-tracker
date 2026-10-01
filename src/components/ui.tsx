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
export function Burst({ id, color = 'var(--hot-blue)', n = 10 }: { id: number; color?: string; n?: number }) {
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

/**
 * Подсказка у значка.
 *
 * Значок без слова экономит полосу, но только до тех пор, пока слово можно
 * достать. Системная подсказка `title` его достаёт — через секунду с лишним,
 * шрифтом операционной системы и мимо всякой вёрстки; на странице, где ряд
 * действий специально сведён к трём кружкам, это и есть то место, где они
 * перестают объясняться.
 *
 * Обёрткой, а не псевдоэлементом на самой кнопке: кнопки здесь `Jelly`, они
 * кренятся под курсором, и подсказка кренилась бы вместе с ними. Обёртка
 * стоит на месте.
 *
 * Подпись диктору берётся не отсюда — её несёт `aria-label` самой кнопки.
 * Поэтому пузырь рисуется `content: attr(...)` и в дерево доступности не
 * попадает: иначе одно и то же слово читалось бы дважды.
 */
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="tip" data-tip={text}>
      {children}
    </span>
  )
}

export const listItem = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
  transition: { type: 'spring' as const, stiffness: 420, damping: 26 },
}

/**
 * Вертикальный стек полей формы.
 *
 * Раньше это был класс `.book-form`, который три формы из пяти ставили, а две
 * забыли — и поля в них стояли вплотную, потому что сам `.sheet` отступов
 * детям не задаёт. Компонент отнимает возможность забыть; заодно уходит имя
 * «book», неверное с тех пор, как в него завернули лист сессии.
 */
export function FormStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`form-stack${className ? ` ${className}` : ''}`}>{children}</div>
}

interface FieldProps {
  label: string
  /** Строка под полем: подсказка, единица, предупреждение. */
  hint?: ReactNode
  /** Группе переключателей подпись через `<label>` не годится — она метит одно поле. */
  group?: boolean
  children: ReactNode
  className?: string
}

/** Подпись, поле и подсказка — пара, которая иначе повторяется в каждой форме. */
export function Field({ label, hint, group, children, className }: FieldProps) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className={`field${className ? ` ${className}` : ''}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="small faint">{hint}</span>}
    </Tag>
  )
}

/**
 * Тег: вид материала, статус, счётчик.
 *
 * Компонент, а не класс, потому что классом его писали то на `<span>`, то на
 * `<button>`, а высоту `.chip` задавал, не задав `display` — и у инлайнового
 * `<span>` она молча ничего не значила. Отсюда и брался разнобой по высоте.
 */
export function Chip({
  children,
  sm,
  on,
  className,
}: {
  children: ReactNode
  sm?: boolean
  on?: boolean
  className?: string
}) {
  return (
    <span className={`chip${sm ? ' sm' : ''}${on ? ' on' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}

/** Тот же тег, но по нему нажимают. Отжим и наклон на hover живут только здесь. */
export function ChipButton({
  children,
  sm,
  on,
  className,
  ...rest
}: HTMLMotionProps<'button'> & { children: ReactNode; sm?: boolean; on?: boolean }) {
  return (
    <motion.button
      type="button"
      className={`chip${sm ? ' sm' : ''}${on ? ' on' : ''}${className ? ` ${className}` : ''}`}
      whileTap={{ scale: 0.92 }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
