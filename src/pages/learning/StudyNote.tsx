import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Crumbs } from '../../components/Crumbs'
import { NoteEditor } from '../../components/NoteEditor'
import { Jelly } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { renderMarkdown } from '../../lib/learning/markdown'
import type { NoteTag } from '../../lib/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

export function StudyNote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useLocale()
  const stream = useStream()
  const { notes, materials, loading, updateNote, deleteNote } = useLearning()

  const note = notes.find((n) => n.id === id)
  const material = materials.find((m) => m.id === note?.material_id && m.stream_id === stream.id)

  const [editing, setEditing] = useState(false)
  const [part, setPart] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<NoteTag[]>([])

  // Черновик заводится от записи, когда она приехала или сменилась. Метка
  // включает updated_at, иначе после сохранения поля остались бы со старым.
  const stamp = note ? `${note.id}:${note.updated_at}` : null
  useEffect(() => {
    if (!note) return
    setPart(note.part ?? '')
    setBody(note.body)
    setTags(note.tags)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp])

  if (loading) return null
  // Конспект чужого потока (или несуществующий) сюда не попадает: тот же
  // приём, что и у материала — принадлежность проверяется, а не только id.
  if (!note || !material) return <Navigate to={`/learning/${stream.slug}`} replace />

  const dirty = part !== (note.part ?? '') || body !== note.body || tags.join() !== note.tags.join()

  const save = async () => {
    await updateNote(note.id, { part: part.trim() || null, body, tags })
    setEditing(false)
  }

  const remove = async () => {
    if (!confirm(t('note.confirmDelete'))) return
    await deleteNote(note.id)
    navigate(`/learning/${stream.slug}/m/${material.id}`)
  }

  return (
    <>
      <Crumbs
        fallback={{
          to: `/learning/${stream.slug}/m/${material.id}`,
          label: material.title,
        }}
      />

      <article className="sheet-page" data-accent={stream.accent ?? undefined}>
        <div className="sheet-head-line">
          <span className="label">
            {stream.accent && <i className="sheet-dot" data-accent={stream.accent} />}
            {stream.name} · {fmtDate(note.date, locale)}
          </span>
          <div className="row-tight">
            {editing ? (
              <Jelly className="btn sm" onClick={() => void save()} disabled={!dirty}>
                {t('form.save')}
              </Jelly>
            ) : (
              <button className="link-btn" type="button" onClick={() => setEditing(true)}>
                {t('note.edit')}
              </button>
            )}
            <button className="link-btn danger" type="button" onClick={() => void remove()}>
              {t('note.delete')}
            </button>
          </div>
        </div>

        {editing ? (
          <input
            className="input sheet-part"
            value={part}
            placeholder={t('note.partPlaceholder')}
            onChange={(e) => setPart(e.target.value)}
          />
        ) : (
          (note.part ?? note.title) && <h1 className="sheet-title-big">{note.part ?? note.title}</h1>
        )}

        {!editing && note.tags.length > 0 && (
          <div className="chips sheet-tags">
            {note.tags.map((g) => (
              <span key={g} className="chip sm">
                {t(`tag.${g}`)}
              </span>
            ))}
          </div>
        )}

        <div className="sheet-rule" aria-hidden />

        {editing ? (
          <NoteEditor body={body} tags={tags} onBody={setBody} onTags={setTags} />
        ) : note.body.trim() ? (
          <div
            className="sheet-body"
            // Безопасно: renderMarkdown экранирует весь ввод до того, как
            // появится первый наш тег, и наружу идут только известные теги.
            dangerouslySetInnerHTML={{ __html: renderMarkdown(note.body) }}
          />
        ) : (
          <p className="muted">{t('note.empty')}</p>
        )}
      </article>
    </>
  )
}
