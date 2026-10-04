import { motion } from 'motion/react'
import { NavLink } from 'react-router-dom'
import { inkSlide } from './ui'

export interface SubNavItem {
  to: string
  label: string
  /** Точное совпадение. Нужно корню раздела, иначе он активен на всех детях. */
  end?: boolean
}

/**
 * Вторая полоса: подразделы текущего раздела.
 *
 * Жест тот же, что у первой полосы, но тише — подчёркивание вместо пилюли.
 * Два одинаково громких ряда спорили бы за то, какой из них главный.
 *
 * `id` разводит `layoutId` чернил: иначе полоса чтения и полоса потока
 * анимировались бы как одна при переходе между разделами. `label` — отдельно,
 * потому что это имя для человека, и оно обязано быть переведённым.
 */
export function SubNav({ items, id, label }: { items: SubNavItem[]; id: string; label: string }) {
  return (
    <nav className="subnav" aria-label={label}>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end}>
          {({ isActive }) => (
            <span className="subnav-item">
              {isActive && (
                <motion.span
                  layoutId={`subnav-ink-${id}`}
                  className="subnav-ink"
                  transition={inkSlide}
                />
              )}
              <span className="subnav-label">{i.label}</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
