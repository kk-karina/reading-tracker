import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Crumbs } from '../../components/Crumbs'
import { MaterialForm } from '../../components/MaterialForm'
import { Jelly } from '../../components/ui'
import { fmtDate, todayISO } from '../../lib/format'
import { materialProgress } from '../../lib/learning/metrics'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

export function Material() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials, notes, loading, addNote, updateStream } = useLearning()
  const [editing, setEditing] = useState(false)

  if (loading) return null

  // Материал ищется внутри своего потока: id из чужого потока не должен
  // открываться под этим адресом.
  const material = materials.find((m) => m.id === id && m.stream_id === stream.id)
  if (!material) return <Navigate to={`/learning/${stream.slug}`} replace />

  const mine = notes
    .filter((n) => n.material_id === material.id)
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
  const p = materialProgress(material, notes)

  /** Форма перед листом была бы лишним шагом: конспект заводится сразу
      с контуром потока и открывается.

      Стрелочная, а не объявление: объявление поднимается, и сужение типа
      `material` от проверки выше на него не распространяется. */
  const create = async () => {
    const made = await addNote({
      material_id: material.id,
      part: null,
      title: null,
      body: stream.outline ?? '',
      tags: [],
      date: todayISO(),
      sort: mine.length,
    })
    if (made) navigate(`/learning/${stream.slug}/n/${made.id}`)
  }

  return (
    <>
      <Crumbs fallback={{ to: `/learning/${stream.slug}`, label: stream.name }} />

      <div className="page-head">
        <h1 className="display">{material.title}</h1>
      </div>

      <div className="mat-facts">
        <span className="chip">{t(`kind.${material.kind}`)}</span>
        <span className="chip">{t(`mstatus.${material.status}`)}</span>
        {material.author && <span className="small muted">{material.author}</span>}
        <span className="small faint mono">
          {p.total
            ? t('material.progress', { done: p.done, total: p.total })
            : t('note.count', { n: p.done })}
        </span>
        {material.url && (
          <a className="link-btn" href={material.url} target="_blank" rel="noopener noreferrer">
            {t('material.url')}
          </a>
        )}
        <button className="link-btn" type="button" onClick={() => setEditing(true)}>
          {t('material.edit')}
        </button>
        {material.id === stream.focus_material_id ? (
          <span className="chip">{t('material.isFocus')}</span>
        ) : (
          <button
            className="link-btn"
            type="button"
            onClick={() => void updateStream(stream.id, { focus_material_id: material.id })}
          >
            {t('material.makeFocus')}
          </button>
        )}
      </div>

      {p.percent !== null && (
        <div className="meter" aria-hidden>
          <span style={{ width: `${p.percent}%` }} />
        </div>
      )}

      <div className="panel-head" style={{ marginTop: 28 }}>
        <span className="label">{t('note.count', { n: mine.length })}</span>
        <Jelly className="btn sm" onClick={() => void create()}>
          {t('note.new')}
        </Jelly>
      </div>

      {mine.length === 0 ? (
        <div className="empty small">{t('material.notesEmpty')}</div>
      ) : (
        <ul className="note-stack">
          {mine.map((n) => (
            <li key={n.id}>
              <Link
                to={`/learning/${stream.slug}/n/${n.id}`}
                className="note-row"
                state={{ from: { to: `/learning/${stream.slug}/m/${material.id}`, label: material.title } }}
              >
                <span className="note-row-main">
                  <span className="note-row-title">{n.part ?? n.title ?? t('note.new')}</span>
                  <span className="small faint">
                    {fmtDate(n.date, locale)}
                    {n.tags.length > 0 && ` · ${n.tags.map((g) => t(`tag.${g}`)).join(', ')}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <MaterialForm
          streamId={material.stream_id}
          material={material}
          onClose={() => {
            setEditing(false)
            // Форма умеет удалять материал: если его больше нет, страница пуста.
            if (!materials.some((m) => m.id === material.id)) navigate(`/learning/${stream.slug}/backlog`)
          }}
        />
      )}
    </>
  )
}
