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
 */
export function Crumbs({ fallback }: { fallback: Crumb }) {
  const { state } = useLocation()
  const crumb = (state as { from?: Crumb } | null)?.from ?? fallback
  return (
    <nav className="crumbs">
      <Link to={crumb.to} className="crumb">
        ← {crumb.label}
      </Link>
    </nav>
  )
}
