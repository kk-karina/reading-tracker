import { useState } from 'react'
import { GroupSubject } from '../../components/GroupSubject'
import { MaterialCover } from '../../components/learning/MaterialCover'
import { StudyNoteCard } from '../../components/learning/StudyNoteCard'
import { StudySheet } from '../../components/learning/StudySheet'
import { useStudyLine } from '../../components/learning/studyStep'
import { LogRow } from '../../components/log/LogRow'
import { Empty, Jelly, Segmented } from '../../components/ui'
import { fmtDate, fmtMinutes } from '../../lib/format'
import { sourceOrder } from '../../lib/learning/buckets'
import { isBlankNote, notesOfStream } from '../../lib/learning/notes'
import type { StudySession } from '../../lib/learning/types'
import { groupItems, timeOf } from '../../lib/log'
import { Mood } from '../../components/Mood'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

type By = 'day' | 'material'

/**
 * Журнал занятий потока — та же страница, что журнал сессий в чтении
 * (`pages/Sessions.tsx`): строки на линейке, шаг крупно, материал маячком,
 * конспекты значком с числом и раскрываются по нажатию. Сами конспекты — в
 * соседней вкладке, как у материала.
 */
export function StudySessions() {
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials, parts, sessions, notes } = useLearning()
  const line = useStudyLine()
  const [by, setBy] = useState<By>('day')
  const [materialId, setMaterialId] = useState('')
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const [logging, setLogging] = useState(false)
  const [editing, setEditing] = useState<StudySession | null>(null)

  const options = sourceOrder(materials, stream.id, stream.focus_material_id)
  const picked = options.some((m) => m.id === materialId) ? materialId : ''
  const byId = new Map(materials.map((m) => [m.id, m]))
  const mine = notesOfStream(materials, sessions, stream.id)
  const shown = picked ? mine.filter((s) => s.material_id === picked) : mine
  const groups = groupItems(
    shown,
    (s) => (by === 'day' ? s.date : s.material_id),
    (s) => `${s.date}|${s.created_at}`,
  )

  // Пустой лист за занятием не считается написанным: значок с числом обещал
  // бы то, чего нет.
  const writtenOf = (id: string) =>
    notes
      .filter((n) => n.session_id === id && !isBlankNote(n.body, stream.outline))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const toggle = (id: string) =>
    setOpen((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const log = (className: string) => (
    <Jelly className={className} onClick={() => setLogging(true)}>
      {t('study.log')}
    </Jelly>
  )

  return (
    <>
      {mine.length > 0 && (
        <div className="filter-bar">
          <div className="row-tight">
            <Segmented
              name={t('nav.studySessions')}
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
          <div className="row-tight">{log('btn')}</div>
        </div>
      )}

      {mine.length === 0 ? (
        <Empty art="reading" hint={t('ssessions.emptyBody')} action={log('btn ghost sm')}>
          {t('ssessions.empty')}
        </Empty>
      ) : groups.length === 0 ? (
        <Empty size="sm">{t('journal.emptyHere')}</Empty>
      ) : (
        groups.map((g) => {
          const pages = g.items.reduce(
            (sum, s) =>
              s.page_from !== null && s.page_to !== null ? sum + Math.max(0, s.page_to - s.page_from) : sum,
            0,
          )
          const partsDone = g.items.reduce((sum, s) => sum + s.part_ids.length, 0)
          const minutes = g.items.reduce((sum, s) => sum + (s.minutes ?? 0), 0)
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
                <span className="mono small muted">
                  {[
                    pages > 0 && t('count.pages', { n: pages }),
                    partsDone > 0 && t('count.parts', { n: partsDone }),
                    minutes > 0 && fmtMinutes(minutes, locale),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>

              {g.items.map((s) => {
                const m = byId.get(s.material_id)
                const l = line(s, m, parts)
                const written = writtenOf(s.id)
                return (
                  <LogRow
                    key={s.id}
                    step={l.step}
                    unit={l.unit}
                    detail={l.detail}
                    subject={
                      by === 'day' && m
                        ? {
                            cover: <MaterialCover material={m} size="sm" />,
                            title: m.title,
                            to: `/learning/${stream.slug}/m/${m.id}`,
                          }
                        : undefined
                    }
                    meter={l.meter}
                    mood={s.rating && <Mood rating={s.rating} />}
                    when={[
                      by === 'material' && fmtDate(s.date, locale),
                      timeOf(s.date, s.created_at),
                      // Минуты уже стоят шагом, когда другого шага нет.
                      s.minutes && (l.unit ? fmtMinutes(s.minutes, locale) : null),
                    ]}
                    written={written.length}
                    open={open.has(s.id)}
                    onToggle={() => toggle(s.id)}
                    onEdit={() => setEditing(s)}
                  >
                    <div className="store-grid">
                      {written.map((n) => (
                        <StudyNoteCard
                          key={n.id}
                          note={n}
                          material={m}
                          parts={parts}
                          slug={stream.slug}
                          siblings={written.map((x) => x.id)}
                        />
                      ))}
                    </div>
                  </LogRow>
                )
              })}
            </section>
          )
        })
      )}

      {logging && (
        <StudySheet
          stream={stream}
          material={picked ? byId.get(picked) : null}
          onClose={() => setLogging(false)}
        />
      )}
      {editing && (
        <StudySheet
          stream={stream}
          material={byId.get(editing.material_id)}
          session={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
