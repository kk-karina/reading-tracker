import { useState } from 'react'
import { todayISO } from '../lib/format'
import { FACES } from '../lib/rating'
import { progressOf } from '../lib/reading'
import type { Book, Note, NoteTag, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useT } from '../state/LocaleContext'
import { Sheet } from './Sheet'
import { Jelly, Segmented } from './ui'

const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']

interface Draft {
  key: number
  /** Set on a thought that is already saved; absent on one being typed now. */
  id?: string
  tag: NoteTag
  body: string
}

const draftsFrom = (notes: Note[]): Draft[] =>
  notes.map((n, i) => ({ key: i, id: n.id, tag: n.tag, body: n.body }))

/**
 * One session, and the thoughts that came with it.
 *
 * The page you started from is filled in from the furthest page reached, so the
 * only number normally typed is the one you read up to. Minutes stay optional —
 * asking for them every time is what makes people stop keeping a log — but the
 * form says what they buy, since nothing else can produce a pace.
 *
 * With `session` given the same sheet edits that entry instead: nothing about a
 * log is worth keeping if a mistyped page has to stand forever.
 */
export function SessionSheet({
  book,
  sessions,
  session,
  onClose,
}: {
  book: Book
  sessions: Session[]
  session?: Session
  onClose: () => void
}) {
  const t = useT()
  const { notes, addSession, updateSession, deleteSession, addNote, updateNote, deleteNote, updateBook } =
    useData()
  const { page } = progressOf(book.id, sessions, book.pages)
  const mine = session ? notes.filter((n) => n.session_id === session.id) : []

  const [date, setDate] = useState(session?.date ?? todayISO())
  const [from, setFrom] = useState(String(session?.page_from ?? page))
  const [to, setTo] = useState(session ? String(session.page_to) : '')
  const [minutes, setMinutes] = useState(session?.minutes ? String(session.minutes) : '')
  const [rating, setRating] = useState<number | null>(session?.rating ?? null)
  const [drafts, setDrafts] = useState<Draft[]>(() => draftsFrom(mine))
  // Thoughts dropped from the list are deleted on save, not on the click, so
  // closing the sheet without saving leaves the entry exactly as it was.
  const [dropped, setDropped] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const fromNum = Number(from) || 0
  const toNum = to.trim() ? Number(to) : null
  const read = toNum === null ? null : toNum - fromNum

  async function save() {
    if (toNum === null || read === null || read < 0) {
      setError(t('session.toMustGrow'))
      return
    }
    setBusy(true)
    const fields = {
      book_id: book.id,
      date,
      page_from: fromNum,
      page_to: toNum,
      // Zero and below are "not recorded", not a reading time the database would take.
      minutes: Number(minutes) > 0 ? Number(minutes) : null,
      rating,
    }
    let sessionId = session?.id
    if (session) await updateSession(session.id, fields)
    else sessionId = (await addSession(fields))?.id

    for (const id of dropped) await deleteNote(id)
    for (const d of drafts) {
      const body = d.body.trim()
      if (d.id) {
        if (body) await updateNote(d.id, { tag: d.tag, body })
        else await deleteNote(d.id)
      } else if (body) {
        await addNote({
          book_id: book.id,
          session_id: sessionId ?? null,
          page: toNum,
          tag: d.tag,
          body,
        })
      }
    }

    // Logging against a book you meant to read means you have started it.
    if (book.status === 'want') {
      await updateBook(book.id, { status: 'reading', started_at: book.started_at ?? date })
    }
    if (book.pages && toNum >= book.pages && book.status !== 'finished' && confirm(t('session.finishedAsk'))) {
      await updateBook(book.id, { status: 'finished', finished_at: date })
    }

    setBusy(false)
    onClose()
  }

  async function remove() {
    if (!session || !confirm(t('session.confirmDelete'))) return
    setBusy(true)
    await deleteSession(session.id)
    onClose()
  }

  return (
    <Sheet title={t(session ? 'session.editTitle' : 'session.title')} onClose={onClose}>
      <div className="book-form">
        <div className="field-row">
          <label className="field">
            <span className="label">{t('session.date')}</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">{t('session.from')}</span>
            <input
              className="input"
              type="number"
              min="0"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">{t('session.to')}</span>
            <input
              className="input"
              type="number"
              min="0"
              value={to}
              autoFocus
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>

        {read !== null && read >= 0 && (
          <p className="small muted" style={{ margin: '-6px 0 0' }}>
            {t('session.pagesRead', { n: read })}
          </p>
        )}

        <label className="field">
          <span className="label">{t('session.minutes')}</span>
          <input
            className="input"
            type="number"
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <span className="small faint">{t('session.minutesHint')}</span>
        </label>

        <div className="field">
          <span className="label">{t('session.how')}</span>
          <div className="faces">
            {FACES.map((f, i) => (
              <button
                key={f}
                type="button"
                className={`face-btn${rating === i + 1 ? ' on' : ''}`}
                aria-label={t(`face.${(i + 1) as 1 | 2 | 3 | 4 | 5}`)}
                title={t(`face.${(i + 1) as 1 | 2 | 3 | 4 | 5}`)}
                onClick={() => setRating(rating === i + 1 ? null : i + 1)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">{t('book.notes')}</span>
          {drafts.map((d, i) => (
            <div key={d.key} className="note-draft">
              {/* The tag is chosen first, and it changes the prompt in the field. */}
              <Segmented
                name={`${t('book.notes')} ${i + 1}`}
                value={d.tag}
                options={TAGS.map((tag) => ({ value: tag, label: t(`tag.${tag}`) }))}
                onChange={(tag) =>
                  setDrafts((list) => list.map((x) => (x.key === d.key ? { ...x, tag } : x)))
                }
                className="sm"
              />
              <textarea
                className="textarea"
                rows={3}
                placeholder={t(`tagHint.${d.tag}`)}
                value={d.body}
                onChange={(e) =>
                  setDrafts((list) =>
                    list.map((x) => (x.key === d.key ? { ...x, body: e.target.value } : x)),
                  )
                }
              />
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  if (d.id) setDropped((list) => [...list, d.id as string])
                  setDrafts((list) => list.filter((x) => x.key !== d.key))
                }}
              >
                {t('session.removeNote')}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn ghost sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setDrafts((list) => [...list, { key: Date.now(), tag: 'idea', body: '' }])}
          >
            {t('session.addNote')}
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        <div className="row-tight" style={{ alignSelf: 'flex-start' }}>
          <Jelly className="btn" onClick={save} disabled={busy}>
            {t('form.save')}
          </Jelly>
          {session && (
            <button type="button" className="btn ghost" onClick={remove} disabled={busy}>
              {t('session.delete')}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
