import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { SessionSheet } from '../components/SessionSheet'
import { Segmented, listItem } from '../components/ui'
import { fmtDate, fmtMinutes } from '../lib/format'
import { buildJournal, type JournalFilter } from '../lib/journal'
import { face } from '../lib/rating'
import type { Book, Note, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'

const FILTERS: JournalFilter[] = ['all', 'sessions', 'notes']

/**
 * Everything that happened, by day, newest first.
 *
 * The shelf says what you are reading and the book page says how one book is
 * going; this page is the only place that keeps the record itself — and the
 * only place an entry can be corrected long after it was written.
 */
export function Journal() {
  const { t, locale } = useLocale()
  const { books, sessions, notes, loading } = useData()
  const [filter, setFilter] = useState<JournalFilter>('all')
  const [bookId, setBookId] = useState('')
  const [editing, setEditing] = useState<Session | null>(null)

  const days = useMemo(
    () => buildJournal(sessions, notes, { filter, bookId: bookId || null }),
    [sessions, notes, filter, bookId],
  )

  if (loading) return null

  const bookOf = (id: string) => books.find((b) => b.id === id)
  const editingBook = editing ? bookOf(editing.book_id) : undefined
  // Thoughts are edited inside the session they came from, where their context is.
  const sessionOf = (n: Note) => sessions.find((s) => s.id === n.session_id) ?? null

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">{t('nav.journal')}</h1>
          <p className="muted">{t('journal.lead')}</p>
        </div>
      </div>

      {/* No captions: the control on the left says what is shown, the one on
          the right says whose. */}
      <div className="journal-filters">
        <Segmented
          name={t('journal.show')}
          value={filter}
          options={FILTERS.map((f) => ({ value: f, label: t(`journal.${f}`) }))}
          onChange={setFilter}
          className="sm"
        />
        {books.length > 1 && (
          <select
            className="select sm"
            value={bookId}
            aria-label={t('journal.book')}
            onChange={(e) => setBookId(e.target.value)}
          >
            <option value="">{t('journal.allBooks')}</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {days.length === 0 ? (
        <div className="empty">
          {sessions.length + notes.length === 0 ? t('journal.empty') : t('journal.emptyHere')}
        </div>
      ) : (
        days.map((d) => (
          <section key={d.date} className="day">
            <div className="day-head">
              <span className="h3">{fmtDate(d.date, locale)}</span>
              <span className="mono small muted">
                {d.pages > 0 && t('count.pages', { n: d.pages })}
                {d.minutes > 0 && ` · ${fmtMinutes(d.minutes, locale)}`}
                {d.notes > 0 && ` · ${t('count.notes', { n: d.notes })}`}
              </span>
            </div>
            <AnimatePresence initial={false}>
              {d.items.map((item) =>
                item.kind === 'session' ? (
                  <motion.div key={item.id} className="entry" layout="position" {...listItem}>
                    <span className="m">
                      +{item.session.page_to - item.session.page_from}
                      {face(item.session.rating) && (
                        <span className="face-sm">{face(item.session.rating)}</span>
                      )}
                    </span>
                    <Beside book={bookOf(item.session.book_id)} fallback={t('book.notFound')}>
                      <span className="topic-name">
                        {' · '}
                        <span className="mono">
                          {item.session.page_from}–{item.session.page_to}
                        </span>
                        {item.session.minutes && ` · ${fmtMinutes(item.session.minutes, locale)}`}
                      </span>
                    </Beside>
                    <div className="acts">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setEditing(item.session)}
                      >
                        {t('book.edit')}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key={item.id} className="entry" layout="position" {...listItem}>
                    <span className="m faint">
                      {item.note.page !== null ? t('session.noteOnPage', { n: item.note.page }) : '·'}
                    </span>
                    <Beside book={bookOf(item.note.book_id)} fallback={t('book.notFound')}>
                      <span className="topic-name"> · {t(`tag.${item.note.tag}`)}</span>
                      <div className="note">{item.note.body}</div>
                    </Beside>
                    <div className="acts">
                      {sessionOf(item.note) && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setEditing(sessionOf(item.note))}
                        >
                          {t('book.edit')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ),
              )}
            </AnimatePresence>
          </section>
        ))
      )}

      {editing && editingBook && (
        <SessionSheet
          book={editingBook}
          sessions={sessions}
          session={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

/**
 * An entry with its book standing next to it — the cloth colour is what makes a
 * line recognisable at a glance on a page where every row looks alike.
 * The thumbnail is hidden from the reading order: the title beside it is the
 * same link.
 */
function Beside({
  book,
  fallback,
  children,
}: {
  book: Book | undefined
  fallback: string
  children: ReactNode
}) {
  return (
    <div className="entry-main">
      {book && (
        <Link to={`/book/${book.id}`} aria-hidden tabIndex={-1}>
          <BookCover book={book} size="xs" />
        </Link>
      )}
      <div className="entry-text">
        {book ? (
          <Link className="cat" to={`/book/${book.id}`}>
            {book.title}
          </Link>
        ) : (
          <span className="cat faint">{fallback}</span>
        )}
        {children}
      </div>
    </div>
  )
}
