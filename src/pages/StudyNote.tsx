import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { NoteEditor } from '../components/NoteEditor'
import { Jelly } from '../components/ui'
import { fmtDate } from '../lib/format'
import { renderMarkdown } from '../lib/learning/markdown'
import type { NoteTag } from '../lib/types'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'

export function StudyNote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useLocale()
  const { notes, materials, categories, loading, updateNote, deleteNote } = useLearning()

  const note = notes.find((n) => n.id === id)

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
  if (!note) return <Navigate to="/learning" replace />

  const material = materials.find((m) => m.id === note.material_id)
  const category = categories.find((c) => c.id === material?.category_id)
  const dirty = part !== (note.part ?? '') || body !== note.body || tags.join() !== note.tags.join()

  const save = async () => {
    await updateNote(note.id, { part: part.trim() || null, body, tags })
    setEditing(false)
  }

  const remove = async () => {
    if (!confirm(t('note.confirmDelete'))) return
    await deleteNote(note.id)
    navigate(material ? `/learning/m/${material.id}` : '/learning')
  }

  return (
    <>
      <div className="crumbs">
        {material && (
          <Link to={`/learning/m/${material.id}`} className="crumb">
            ← {material.title}
          </Link>
        )}
      </div>

      <article className="sheet-page" data-accent={category?.accent ?? undefined}>
        <div className="sheet-head-line">
          <span className="label">
            {category?.accent && <i className="sheet-dot" data-accent={category.accent} />}
            {category?.name} · {fmtDate(note.date, locale)}
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
