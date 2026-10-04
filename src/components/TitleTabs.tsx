import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { inkSlide } from './ui'

/** `Link` под управлением `motion`: нужен ради `layout` в полосе. */
const MotionLink = motion.create(Link)

export interface TitleTab {
  to: string
  label: string
  /** Точное совпадение. Нужно корню раздела, иначе он активен на всех детях. */
  end?: boolean
  /** То, что стоит перед именем, — у потока это его точка. */
  lead?: ReactNode
  /** Пункт в ряду, но не рабочий: архивный поток. */
  dim?: boolean
}

/**
 * Полоса, где активный таб и есть заголовок страницы. Отдельного `h1` над
 * содержимым нет: он сказал бы то же, что уже сказала полоса.
 *
 * Активный крупнее соседей ровно настолько, чтобы читаться заголовком, —
 * остальные остаются мелкими дверями рядом. `children` — служебные пункты
 * ряда (архив, «плюс»), они тише самих табов.
 */
export function TitleTabs({
  items,
  label,
  children,
}: {
  items: TitleTab[]
  label: string
  children?: ReactNode
}) {
  const { pathname } = useLocation()
  return (
    <nav className="title-tabs" aria-label={label}>
      {items.map((i) => {
        const on = matchPath({ path: i.to, end: i.end ?? false }, pathname) !== null
        return (
          /* `layout="position"` — едут только места, не размеры: кегль
             меняется разом и текст остаётся резким, а соседи, которых
             выросшее имя сдвигает вправо, доезжают туда переходом, а не
             прыжком. Тянуть сам кегль нельзя — это пересчёт раскладки
             каждый кадр, с него и начиналась вязкость. */
          <MotionLink
            layout="position"
            transition={inkSlide}
            key={i.to}
            to={i.to}
            className="title-tab"
            // Размер живёт на самой ссылке, а не на вложенном заголовке:
            // узел таба переживает переключение, и менять приходится один
            // класс, а не состав разметки.
            data-on={on || undefined}
            data-dim={i.dim || undefined}
            aria-current={on ? 'page' : undefined}
          >
            {i.lead}
            {on ? <h1 className="title-tab-name">{i.label}</h1> : i.label}
          </MotionLink>
        )
      })}
      {children}
    </nav>
  )
}
