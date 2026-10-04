import { useEffect, useEffectEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { NoteTag } from '../../lib/types'
import type { Stream, StudyNote } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { NoteEditor } from '../NoteEditor'
import { Sheet } from '../Sheet'
import { Jelly } from '../ui'
import type { NoteLinkState } from './noteLink'
import { NoteSheet } from './NoteSheet'
import { SheetFlip } from './SheetFlip'

/**
 * Конспект листом поверх экрана, а не отдельной страницей.
 *
 * Конспект открывают из хранилища, с дашборда, из раскрытого занятия —
 * прочитать и вернуться. Отдельная страница уводила с места: после «назад»
 * терялись группировка, фильтр и прокрутка, а сам переход гасил экран целиком.
 * Лист ложится поверх, под ним всё остаётся как было, и закрывается он туда
 * же — крестиком, Esc или кнопкой «назад» браузера.
 *
 * Адрес у конспекта прежний (`/learning/:slug/n/:id`): ссылки и закладки
 * работают. Открытый прямой ссылкой, лист ложится поверх «Конспектов» потока.
 *
 * Листают соседей той группы, из которой открыли, — дня или материала; без
 * неё — конспекты того же материала. Листание подменяет адрес, а не
 * добавляет: «назад» закрывает лист, а не перебирает прочитанные.
 */
export function NoteOverlay({ slug, id }: { slug: string; id: string }) {
  const { streams, notes, materials, loading } = useLearning()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as NoteLinkState | null) ?? {}

  const stream = streams.find((s) => s.slug === slug)
  const note = notes.find((n) => n.id === id)
  const material = materials.find((m) => m.id === note?.material_id && m.stream_id === stream?.id)

  const close = () => {
    if (state.background) navigate(-1)
    else navigate(`/learning/${slug}/notes`, { replace: true })
  }

  // Конспект удалили или ссылка чужая — листу нечего показывать, и закрыться
  // он должен сам, а не висеть пустой рамкой.
  const gone = !loading && (!stream || !note || !material)
  useEffect(() => {
    if (gone) navigate(stream ? `/learning/${slug}/notes` : '/learning', { replace: true })
  }, [gone, stream, slug, navigate])

  if (loading || !stream || !note || !material) return null

  const siblings =
    state.siblings && state.siblings.includes(note.id)
      ? state.siblings.filter((sid) => notes.some((n) => n.id === sid))
      : notes
          .filter((n) => n.material_id === material.id)
          .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
          .map((n) => n.id)
  const at = siblings.indexOf(note.id)
  const go = (sid: string | undefined) => {
    // Соседний лист открывается на чтение: «Править» относилось к этому.
    if (sid) navigate(`/learning/${slug}/n/${sid}`, { replace: true, state: { ...state, edit: false } })
  }

  return (
    // Ключ по конспекту: при листании правка и черновик не переезжают на
    // соседний лист.
    <NotePaper
      key={note.id}
      note={note}
      stream={stream}
      at={at}
      count={siblings.length}
      startEditing={!!state.edit}
      onPrev={() => go(siblings[at - 1])}
      onNext={() => go(siblings[at + 1])}
      onClose={close}
    />
  )
}

function NotePaper({
  note,
  stream,
  at,
  count,
  startEditing,
  onPrev,
  onNext,
  onClose,
}: {
  note: StudyNote
  stream: Stream
  at: number
  count: number
  startEditing: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const { updateNote, deleteNote } = useLearning()
  const [editing, setEditing] = useState(startEditing)
  const [part, setPart] = useState(note.part ?? '')
  const [body, setBody] = useState(note.body)
  const [tags, setTags] = useState<NoteTag[]>(note.tags)

  const dirty =
    editing && (part !== (note.part ?? '') || body !== note.body || tags.join() !== note.tags.join())

  const save = async () => {
    await updateNote(note.id, { part: part.trim() || null, body, tags })
    setEditing(false)
  }

  const remove = async () => {
    if (!confirm(t('note.confirmDelete'))) return
    await deleteNote(note.id)
    onClose()
  }

  // Стрелки листают, пока лист читают. Пока правят — нет: стрелка в поле
  // двигает курсор, а не уводит на соседний лист вместе с правкой.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (editing || e.metaKey || e.ctrlKey || e.altKey) return
    const typing = (e.target as HTMLElement | null)?.closest('input, textarea, [contenteditable]')
    if (typing) return
    if (e.key === 'ArrowLeft' && at > 0) onPrev()
    if (e.key === 'ArrowRight' && at < count - 1) onNext()
  })
  useEffect(() => {
    const listen = (e: KeyboardEvent) => onKey(e)
    document.addEventListener('keydown', listen)
    return () => document.removeEventListener('keydown', listen)
  }, [])

  const actions = (
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
  )

  return (
    <Sheet
      bare
      title={t('nav.notes')}
      onClose={onClose}
      dirty={dirty}
      onSubmit={editing ? () => void save() : undefined}
    >
      <NoteSheet
        note={note}
        stream={stream}
        lead={
          count > 1 && !editing ? (
            <SheetFlip at={at} count={count} onPrev={onPrev} onNext={onNext} />
          ) : undefined
        }
        actions={actions}
      >
        {/* Пока лист правят, под верхней строкой стоят поля — рамка та же. */}
        {editing ? (
          <>
            <input
              className="input sheet-part"
              value={part}
              placeholder={t('note.partPlaceholder')}
              onChange={(e) => setPart(e.target.value)}
            />
            <div className="sheet-rule" aria-hidden />
            <NoteEditor body={body} tags={tags} onBody={setBody} onTags={setTags} />
          </>
        ) : undefined}
      </NoteSheet>
    </Sheet>
  )
}
