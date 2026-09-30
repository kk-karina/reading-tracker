import { Link } from 'react-router-dom'
import { materialsOf } from '../../lib/learning/buckets'
import type { Material, Stream } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { MaterialRow } from './MaterialRow'

/** Сколько ожидающих показать именем, а не числом. */
const NAMED = 4

/**
 * Очередь решений, а не список дел.
 *
 * Показана именами: у строки обложка и источник, и по ней видно, что там
 * лежит — доклад, статья или четырёхсотстраничная книга, — а это ровно то
 * решение, которое здесь и принимают.
 *
 * Хвост очереди уходит одной ссылкой «и ещё N», как соседние обложки у
 * фокуса: панель дашборда показывает начало списка, а весь список живёт
 * в «Материалах».
 *
 * Карточка здесь та же, что в списке материалов: материал должен выглядеть
 * собой, в каком бы разделе ни встретился.
 */
export function BacklogPanel({ stream, materials }: { stream: Stream; materials: Material[] }) {
  const { t } = useLocale()
  const queued = materialsOf(materials, stream.id, 'backlog')
  const shown = queued.slice(0, NAMED)
  const rest = queued.length - shown.length
  const from = { to: `/learning/${stream.slug}`, label: t('nav.dashboard') }

  if (queued.length === 0) return <div className="queue-empty">{t('stream.resourcesNone')}</div>

  return (
    <div className="queue">
      <ul className="mat-list">
        {shown.map((m) => (
          <MaterialRow key={m.id} material={m} slug={stream.slug} from={from} />
        ))}
      </ul>

      {rest > 0 && (
        <p className="queue-counts">
          <Link to={`/learning/${stream.slug}/materials?view=backlog`}>
            {t('stream.moreQueued', { n: rest })}
          </Link>
        </p>
      )}
    </div>
  )
}
