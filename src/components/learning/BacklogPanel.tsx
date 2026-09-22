import { Link } from 'react-router-dom'
import { backlog, backlogCounts } from '../../lib/learning/buckets'
import { sourceOf } from '../../lib/learning/cover'
import type { Material, Stream } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { MaterialCover } from './MaterialCover'

/** Сколько входящих показать именем, а не числом. */
const NAMED = 4

/**
 * Очередь решений, а не список дел.
 *
 * Разбирают всегда входящее, поэтому именами показано именно оно, а
 * «когда-нибудь» и «справка» остаются числами в одной строке сбоку.
 *
 * У строки теперь обложка и источник. Раньше это были четыре подчёркнутых
 * названия, по которым нельзя было сказать, что там лежит — доклад, статья
 * или четырёхсотстраничная книга, — а это ровно то решение, которое здесь
 * и принимают.
 */
export function BacklogPanel({ stream, materials }: { stream: Stream; materials: Material[] }) {
  const { t } = useLocale()
  const counts = backlogCounts(materials, stream.id)
  const inbox = backlog(materials, stream.id, 'inbox').slice(0, NAMED)
  const empty = counts.inbox + counts.someday + counts.reference === 0
  const from = { to: `/learning/${stream.slug}`, label: t('nav.dashboard') }

  if (empty) return <div className="queue-empty">{t('stream.resourcesNone')}</div>

  return (
    <div className="queue">
      {inbox.length > 0 && (
        <ul className="queue-list">
          {inbox.map((m) => {
            const host = m.url ? sourceOf(m.url) : null
            return (
              <li key={m.id}>
                <Link className="queue-row" to={`/learning/${stream.slug}/m/${m.id}`} state={{ from }}>
                  <MaterialCover material={m} size="sm" />
                  <span className="queue-text">
                    <span className="queue-title">{m.title}</span>
                    <span className="queue-sub">
                      {[t(`kind.${m.kind}`), m.author, host].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <p className="queue-counts">
        <span>
          <b>{counts.inbox}</b> {t('mstatus.inbox')}
        </span>
        <span>
          <b>{counts.someday}</b> {t('mstatus.someday')}
        </span>
        <span>
          <b>{counts.reference}</b> {t('mstatus.reference')}
        </span>
      </p>
    </div>
  )
}
