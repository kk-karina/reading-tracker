import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { GroupSubject } from '../../components/GroupSubject'
import { MaterialCover } from '../../components/learning/MaterialCover'
import { NoteAddSheet } from '../../components/learning/NoteAddSheet'
import { StudyNoteCard } from '../../components/learning/StudyNoteCard'
import { Empty, Jelly, Segmented, listItem } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { sourceOrder } from '../../lib/learning/buckets'
import { isBlankNote, notesOfStream } from '../../lib/learning/notes'
import { groupItems, timeOf } from '../../lib/log'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

type By = 'day' | 'material'

/**
 * Хранилище конспектов потока — та же страница, что мысли в чтении
 * (`pages/Thoughts.tsx`): плиткой, каждый конспект на своём листе, главное —
 * написанное, когда и о каком материале — подписью внизу.
 *
 * Пустые листы сюда не попадают: «Лист пока пустой» среди написанного
 * читался как поломка. Сами они остаются у материала, где их можно дописать
 * или удалить.
 */
export function Notes() {
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials, parts, notes } = useLearning()
  const [by, setBy] = useState<By>('day')
  const [materialId, setMaterialId] = useState('')
  const [adding, setAdding] = useState(false)

  const options = sourceOrder(materials, stream.id, stream.focus_material_id)
  const picked = options.some((m) => m.id === materialId) ? materialId : ''
  const byId = new Map(materials.map((m) => [m.id, m]))
  const mine = notesOfStream(materials, notes, stream.id).filter(
    (n) => !isBlankNote(n.body, stream.outline),
  )
  const shown = picked ? mine.filter((n) => n.material_id === picked) : mine
  const groups = groupItems(
    shown,
    (n) => (by === 'day' ? n.date : n.material_id),
    (n) => `${n.date}|${n.created_at}`,
  )

  const add = (className: string) => (
    <Jelly className={className} onClick={() => setAdding(true)}>
      {t('note.add')}
    </Jelly>
  )

  return (
    <>
      {mine.length > 0 && (
        <div className="filter-bar">
          <div className="row-tight">
            <Segmented
              name={t('nav.notes')}
              value={by}
              options={[
                { value: 'day' as By, label: t('group.byDay') },
                { value: 'material' as By, label: t('group.byMaterial') },
              ]}
              onChange={setBy}
              className="sm"
            />
            {options.length > 1 && (
              <select
                className="select sm"
                value={picked}
                aria-label={t('sjournal.material')}
                onChange={(e) => setMaterialId(e.target.value)}
              >
                <option value="">{t('sjournal.allMaterials')}</option>
                {options.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="row-tight">{add('btn')}</div>
        </div>
      )}

      {mine.length === 0 ? (
        <Empty art="writing" hint={t('notes.emptyBody')} action={add('btn ghost sm')}>
          {t('notes.empty')}
        </Empty>
      ) : groups.length === 0 ? (
        <Empty size="sm">{t('journal.emptyHere')}</Empty>
      ) : (
        groups.map((g) => {
          const material = by === 'material' ? byId.get(g.key) : undefined
          return (
            <section key={g.key} className="day">
              <div className="day-head">
                {by === 'day' ? (
                  <span className="h3">{fmtDate(g.key, locale)}</span>
                ) : (
                  <GroupSubject
                    cover={material && <MaterialCover material={material} size="sm" />}
                    title={material?.title ?? t('material.notFound')}
                    author={material?.author}
                    to={material ? `/learning/${stream.slug}/m/${material.id}` : undefined}
                  />
                )}
                <span className="mono small muted">{t('note.count', { n: g.items.length })}</span>
              </div>
              <div className="store-grid">
                <AnimatePresence initial={false}>
                  {g.items.map((n) => {
                    const m = byId.get(n.material_id)
                    return (
                      <motion.div key={n.id} layout="position" {...listItem}>
                        <StudyNoteCard
                          note={n}
                          material={m}
                          parts={parts}
                          slug={stream.slug}
                          siblings={g.items.map((x) => x.id)}
                          meta={[
                            by === 'material' && fmtDate(n.date, locale),
                            timeOf(n.date, n.created_at),
                          ]}
                          // Материал подписью — как на дашборде; в группе «по
                          // материалам» он уже в шапке.
                          credit={by === 'day'}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </section>
          )
        })
      )}

      {adding && (
        <NoteAddSheet
          stream={stream}
          material={picked ? byId.get(picked) : null}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  )
}
