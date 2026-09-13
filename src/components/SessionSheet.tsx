import { useState } from 'react'
import { todayISO } from '../lib/format'
import { FACES } from '../lib/rating'
import { progressOf } from '../lib/reading'
import type { Book, NoteTag, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useT } from '../state/LocaleContext'
import { Sheet } from './Sheet'
import { Jelly, Segmented } from './ui'

const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']

interface Draft {
  key: number
  tag: NoteTag
  body: string
}

/**
 * One session, and the thoughts that came with it.
 *
 * The page you started from is filled in from the furthest page reached, so the
 * only number normally typed is the one you read up to. Minutes stay optional —
 * asking for them every time is what makes people stop keeping a log — but the
 * form says what they buy, since nothing else can produce a pace.
 */
export function SessionSheet({
  book,
  sessions,
  onClose,
}: {
  book: Book
  sessions: Session[]
  onClose: () => void
}) {
  const t = useT()
  const { addSession, addNote, updateBook } = useData()
  const { page } = progressOf(book.id, sessions, book.pages)

  const [date, setDate] = useState(todayISO())
  const [from, setFrom] = useState(String(page))
  const [to, setTo] = useState('')
  const [minutes, setMinutes] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
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
    const session = await addSession({
      book_id: book.id,
      date,
      page_from: fromNum,
      page_to: toNum,
      minutes: minutes.trim() ? Number(minutes) : null,
      rating,
    })

    for (const d of drafts) {
      if (!d.body.trim()) continue
      await addNote({
        book_id: book.id,
        session_id: session?.id ?? null,
        page: toNum,
        tag: d.tag,
        body: d.body.trim(),
      })
    }

    // Logging against a book you meant to read means you have started it.
    if (book.status === 'want') {
      await updateBook(book.id, { status: 'reading', started_at: book.started_at ?? date })
    }
    if (book.pages && toNum >= book.pages && confirm(t('session.finishedAsk'))) {
      await updateBook(book.id, { status: 'finished', finished_at: date })
    }

    setBusy(false)
    onClose()
  }

  return (
    <Sheet title={t('session.title')} onClose={onClose}>
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
                className="input"
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
                onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
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
        <Jelly className="btn" onClick={save} disabled={busy} style={{ alignSelf: 'flex-start' }}>
          {t('form.save')}
        </Jelly>
      </div>
    </Sheet>
  )
}
