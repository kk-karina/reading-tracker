import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

export interface Crumb {
  to: string
  label: string
}

/**
 * Крошка третьего уровня.
 *
 * Ведёт туда, откуда пришли, а не в одно фиксированное место: материал
 * открывают из «Изучаю», из Бэклога и с дашборда, и «назад» должно значить
 * назад. Источник кладётся в состояние перехода (`state={{ from }}`).
 *
 * Прямой заход по ссылке и перезагрузка состояния не имеют — тогда работает
 * `fallback`, и крошка ведёт на уровень выше по дереву.
 *
 * `actions` — то, что можно сделать с этой страницей целиком. Стоят здесь, а
 * не в строке названия: там их ширина складывалась с длиной заголовка, и у
 * длинного названия они переносились на вторую строку — между названием и
 * автором, где читаются как чужие. Крошка всегда одной высоты и всегда одна,
 * её правая половина пустует, и вопрос у этой строки тот же: где я и что
 * отсюда можно сделать.
 */
export function Crumbs({ fallback, actions }: { fallback: Crumb; actions?: ReactNode }) {
  const { state } = useLocation()
  const crumb = (state as { from?: Crumb } | null)?.from ?? fallback
  return (
    <div className="crumbs">
      <nav>
        <Link to={crumb.to} className="crumb">
          ← {crumb.label}
        </Link>
      </nav>
      {actions}
    </div>
  )
}
