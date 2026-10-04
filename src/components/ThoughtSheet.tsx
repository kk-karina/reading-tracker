import { useState } from 'react'
import type { Book, Note } from '../lib/types'
import { useData } from '../state/DataContext'
import { useT } from '../state/LocaleContext'
import { DraftStack } from './log/DraftStack'
import { SubjectPick } from './log/SubjectPick'
import { bookCover, pickOrder } from './log/subjects'
import { thoughtBlank, thoughtDraft, thoughtDrafts, type ThoughtDraft } from './log/drafts'
import { ThoughtFields } from './log/ThoughtFields'
import { Sheet } from './Sheet'
import { FormStack, Jelly } from './ui'

/**
 * Мысль о книге — без сессии.
 *
 * Вторая дверь, и про другое: мысль приходит и вдали от чтения — в дороге, в
 * разговоре, через неделю после главы. Спрашивать для неё страницы «от» и «до»
 * значило бы требовать сессию, которой не было. Поэтому лист без шага по
 * страницам: книга, одна карточка с курсором в тексте, и «+ мысль», если их
 * несколько. Страница на карточке необязательна.
 *
 * С `note` — правка одной мысли без сессии. Раньше её нельзя было поправить
 * нигде: правка жила только внутри сессии, а у такой мысли сессии нет.
 */
export function ThoughtSheet({
  book,
  note,
  onClose,
}: {
  book?: Book | null
  note?: Note
  onClose: () => void
}) {
  const t = useT()
  const { books, addNote, updateNote, deleteNote } = useData()
  const options = book || note ? [] : pickOrder(books)
  const [pickedId, setPickedId] = useState(() => book?.id ?? note?.book_id ?? options[0]?.id ?? '')
  const subject = book ?? books.find((b) => b.id === pickedId) ?? null

  const [drafts, setDrafts] = useState<ThoughtDraft[]>(() =>
    note ? thoughtDrafts([note]) : [thoughtDraft('')],
  )
  const [busy, setBusy] = useState(false)
  const [start] = useState(() => JSON.stringify(drafts))

  const title = t(note ? 'thought.editTitle' : 'thought.add')

  if (!subject) {
    return (
      <Sheet title={title} onClose={onClose}>
        <p className="small faint">{t('thought.noBooks')}</p>
      </Sheet>
    )
  }

  const live = drafts.filter((d) => !d.removed && !thoughtBlank(d))
  const dirty = JSON.stringify(drafts) !== start
  const ready = note ? dirty : live.length > 0

  const save = async () => {
    if (!ready || busy) return
    setBusy(true)
    for (const d of drafts) {
      const body = d.body.trim()
      const page = d.page ? Number(d.page) : null
      if (d.id) {
        if (d.removed || !body) await deleteNote(d.id)
        else await updateNote(d.id, { tag: d.tag, body, page })
      } else if (!d.removed && body) {
        await addNote({ book_id: subject.id, session_id: null, page, tag: d.tag, body })
      }
    }
    setBusy(false)
    onClose()
  }

  const remove = async () => {
    if (!note || !confirm(t('thought.confirmDelete'))) return
    setBusy(true)
    await deleteNote(note.id)
    onClose()
  }

  const head = (
    <SubjectPick
      value={subject}
      options={options}
      onPick={setPickedId}
      cover={bookCover}
      title={(b) => b.title}
      author={(b) => b.author}
      label={t('session.book')}
    />
  )

  return (
    <Sheet title={title} head={head} onClose={onClose} dirty={dirty} onSubmit={() => void save()}>
      <FormStack>
        <DraftStack
          drafts={drafts}
          onDrafts={setDrafts}
          make={() => thoughtDraft('')}
          tagOf={(d) => d.tag}
          isBlank={thoughtBlank}
          addLabel={note ? undefined : t('draft.addThought')}
          // Первая карточка открыта с курсором: лист затем и открыли.
          render={(d, patch, fresh) => (
            <ThoughtFields
              draft={d}
              patch={patch}
              fresh={fresh || (!note && d === drafts[0])}
              index={drafts.indexOf(d)}
            />
          )}
        />

        <div className="sheet-foot">
          {note && (
            <button type="button" className="link-btn danger" onClick={remove} disabled={busy}>
              {t('thought.delete')}
            </button>
          )}
          <Jelly className="btn" onClick={() => void save()} disabled={!ready || busy}>
            {t('form.save')}
          </Jelly>
        </div>
      </FormStack>
    </Sheet>
  )
}
