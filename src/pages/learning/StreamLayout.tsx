import { Link, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { SubNav } from '../../components/SubNav'
import type { Stream } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'

interface StreamCtx {
  stream: Stream
}

/** Поток резолвится один раз в оболочке; подстраницы просто берут его отсюда. */
export function useStream(): Stream {
  return useOutletContext<StreamCtx>().stream
}

/**
 * `bare` обслуживает третий и четвёртый уровни (материал, конспект): поток
 * им нужен, а крошка, переключатель и полоса подразделов — уже нет, у этих
 * страниц своя `Crumbs`.
 */
export function StreamLayout({ bare = false }: { bare?: boolean }) {
  const { slug } = useParams()
  const { t } = useLocale()
  const { streams, loading } = useLearning()

  if (loading) return null

  const stream = streams.find((s) => s.slug === slug)
  // Промахнуться можно только устаревшей ссылкой, и витрина отвечает на это
  // лучше, чем экран со словом «не найдено».
  if (!stream) return <Navigate to="/learning" replace />

  if (bare) return <Outlet context={{ stream } satisfies StreamCtx} />

  const others = streams.filter((s) => !s.archived && s.id !== stream.id)

  return (
    <>
      <nav className="crumbs">
        <Link to="/learning" className="crumb">
          ← {t('hub.title')}
        </Link>
      </nav>

      {/* Родной <details>: закрывается по Escape и работает с клавиатуры без кода. */}
      <details className="stream-pick">
        <summary>
          <h1 className="display">{stream.name}</h1>
          <Icon name="chevron-down" size={18} />
        </summary>
        <ul className="stream-pick-list">
          {others.map((s) => (
            <li key={s.id}>
              <Link to={`/learning/${s.slug}`} data-accent={s.accent ?? undefined}>
                <Icon name={s.icon} size={16} />
                {s.name}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/learning">{t('hub.allStreams')}</Link>
          </li>
        </ul>
      </details>

      <SubNav
        id="stream"
        label={stream.name}
        items={[
          { to: `/learning/${stream.slug}`, label: t('nav.dashboard'), end: true },
          { to: `/learning/${stream.slug}/active`, label: t('nav.studying') },
          { to: `/learning/${stream.slug}/backlog`, label: t('nav.backlog') },
          { to: `/learning/${stream.slug}/notes`, label: t('nav.notes') },
        ]}
      />

      <Outlet context={{ stream } satisfies StreamCtx} />
    </>
  )
}
