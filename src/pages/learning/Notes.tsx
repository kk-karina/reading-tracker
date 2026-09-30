import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StudySheet } from '../../components/learning/StudySheet'
import { Jelly, Segmented } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { notesOfStream } from '../../lib/learning/notes'
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
  const [adding, setAdding] = useState(false)

  const mine = materials.filter((m) => m.stream_id === stream.id)
  const byId = new Map(mine.map((m) => [m.id, m]))
  const all = notesOfStream(materials, notes, stream.id).sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
  )

  // Предлагаются только теги, которые в потоке действительно встречаются:
  // фильтр не должен уметь опустошить экран.
  const present = TAGS.filter((g) => all.some((n) => n.tags.includes(g)))
  const active: Filter = filter !== 'all' && present.includes(filter) ? filter : 'all'
  const shown = active === 'all' ? all : all.filter((n) => n.tags.includes(active))
  const from = { to: `/learning/${stream.slug}/notes`, label: t('nav.notes') }

  return (
    <>
      {/* Та же полоса, что на Полке и в Дневнике: срез слева, действие справа.
          Конспект заводят и отсюда — раздел, который показывает написанное,
          обязан уметь и дописать; к чему относится запись, спрашивает лист. */}
      <div className="filter-bar">
        <div className="row-tight">
          {present.length > 1 && (
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
          )}
        </div>
        <div className="row-tight">
          <Jelly className="btn" onClick={() => setAdding(true)}>
            {t('note.add')}
          </Jelly>
        </div>
      </div>

      {all.length === 0 && <div className="empty small">{t('notes.empty')}</div>}

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
                  <span className="note-row-title">
                    {n.part ?? n.title ?? t('note.untitled')}
                  </span>
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

      {adding && <StudySheet stream={stream} notes={notes} onClose={() => setAdding(false)} />}
    </>
  )
}
