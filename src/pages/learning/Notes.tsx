import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Segmented } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import type { NoteTag } from '../../lib/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']
type Filter = NoteTag | 'all'

/** Лента конспектов потока. Форма Дневника, применённая к обучению. */
export function Notes() {
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials, notes } = useLearning()
  const [filter, setFilter] = useState<Filter>('all')

  const mine = materials.filter((m) => m.stream_id === stream.id)
  const byId = new Map(mine.map((m) => [m.id, m]))
  const all = notes
    .filter((n) => byId.has(n.material_id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

  // Предлагаются только теги, которые в потоке действительно встречаются:
  // фильтр не должен уметь опустошить экран.
  const present = TAGS.filter((g) => all.some((n) => n.tags.includes(g)))
  const active: Filter = filter !== 'all' && present.includes(filter) ? filter : 'all'
  const shown = active === 'all' ? all : all.filter((n) => n.tags.includes(active))
  const from = { to: `/learning/${stream.slug}/notes`, label: t('nav.notes') }

  if (all.length === 0) return <div className="empty small">{t('notes.empty')}</div>

  return (
    <>
      {present.length > 1 && (
        <div className="hub-bar">
          <Segmented
            name={t('nav.notes')}
            value={active}
            options={[
              { value: 'all' as Filter, label: t('notes.allTags') },
              ...present.map((g) => ({ value: g as Filter, label: t(`tag.${g}`) })),
            ]}
            onChange={setFilter}
            className="sm"
          />
        </div>
      )}

      <ul className="note-stack">
        {shown.map((n) => {
          const material = byId.get(n.material_id)
          return (
            <li key={n.id}>
              <Link
                to={`/learning/${stream.slug}/n/${n.id}`}
                className="note-row"
                state={{ from }}
              >
                <span className="note-row-main">
                  <span className="note-row-title">{n.part ?? n.title ?? t('note.new')}</span>
                  <span className="small faint">
                    {fmtDate(n.date, locale)}
                    {material ? ` · ${material.title}` : ''}
                    {n.tags.length > 0 && ` · ${n.tags.map((g) => t(`tag.${g}`)).join(', ')}`}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
