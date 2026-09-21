import { motion } from 'motion/react'
import { NavLink } from 'react-router-dom'

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
 * анимировались бы как одна при переходе между разделами.
 */
export function SubNav({ items, id }: { items: SubNavItem[]; id: string }) {
  return (
    <nav className="subnav" aria-label={id}>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end}>
          {({ isActive }) => (
            <span className="subnav-item">
              {isActive && (
                <motion.span
                  layoutId={`subnav-ink-${id}`}
                  className="subnav-ink"
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
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
