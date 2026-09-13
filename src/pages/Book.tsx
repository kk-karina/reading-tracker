import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { BookForm } from '../components/BookForm'
import { Review } from '../components/Review'
import { SessionSheet } from '../components/SessionSheet'
import { Jelly, Segmented } from '../components/ui'
import { fmtDate, fmtMinutes, todayISO } from '../lib/format'
import { face } from '../lib/rating'
import {
  lastSessionDate,
  paceMinutesPerPage,
  pagesRead,
  progressOf,
  remainingMinutes,
  spentOn,
  statusPatch,
} from '../lib/reading'
import type { BookStatus, NoteTag, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'

const STATUSES: BookStatus[] = ['want', 'reading', 'finished', 'abandoned']
const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']

/* Sessions and thoughts are one record kept from two sides, so they are two
   views of the same thing rather than two boxes side by side. Reflection leads:
   the pages are the means, what they left behind is the point. */
const TABS = ['reflection', 'sessions', 'review'] as const
type Tab = (typeof TABS)[number]
const TAB_KEY = {
  reflection: 'book.tabReflection',
  sessions: 'book.tabSessions',
  review: 'book.tabReview',
} as const

export function Book() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t, locale } = useLocale()
  const { books, sessions, notes, loading, updateBook, deleteBook, setFocus } = useData()
  const [editing, setEditing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [tagFilter, setTagFilter] = useState<NoteTag | 'all'>('all')
  const [tab, setTab] = useState<Tab>('reflection')

  if (loading) return null
  const book = books.find((b) => b.id === id)
  if (!book) return <div className="empty">{t('book.notFound')}</div>

  const { page, percent } = progressOf(book.id, sessions, book.pages)
  const read = pagesRead(book.id, sessions)
  // Pace is learned from every book, so a new book inherits what you already know.
  const pace = paceMinutesPerPage(sessions)
  const spent = spentOn(book.id, sessions, pace)
  const left = remainingMinutes(page, book.pages, pace)
  const last = lastSessionDate(book.id, sessions)

  const mySessions = sessions
    .filter((s) => s.book_id === book.id)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const bookNotes = notes.filter((n) => n.book_id === book.id)
  const myNotes = bookNotes.filter((n) => tagFilter === 'all' || n.tag === tagFilter)

  const finished = book.status === 'finished'
  // Taking a book off the finished shelf takes its review tab with it.
  const current: Tab = tab === 'review' && !finished ? 'reflection' : tab
  const counts: Record<Tab, number | null> = {
    reflection: bookNotes.length,
    sessions: mySessions.length,
    review: null,
  }

  async function remove() {
    if (!book) return
    if (confirm(t('book.confirmDelete'))) {
      await deleteBook(book.id)
      nav('/shelf')
    }
  }

  return (
    <>
      <nav className="crumbs">
        <Link to="/shelf" className="crumb">
          ← {t('book.back')}
        </Link>
      </nav>

      <div className="book-head">
        <div className="book-cover-tilt">
          <BookCover book={book} size="lg" />
        </div>

        <div className="book-info">
          <h1 className="display book-title">{book.title}</h1>
          {book.author && <p className="muted book-author">{book.author}</p>}

          <div className="meter big" aria-hidden>
            <span style={{ width: `${percent ?? (page > 0 ? 8 : 0)}%` }} />
          </div>

          {/* Always four cells, zeros included: an empty slot is information too. */}
          <dl className="facts">
            <div>
              <dt>{t('book.pages')}</dt>
              <dd className="mono">
                {book.pages ? t('book.pagesOf', { page, total: book.pages }) : page || 0}
                {percent !== null && <span className="faint"> · {percent}%</span>}
              </dd>
            </div>
            <div>
              <dt>{t('book.time')}</dt>
              <dd className="mono" title={spent.approx ? t('book.approx') : undefined}>
                {spent.minutes > 0 ? (
                  <>
                    {spent.approx && '≈ '}
                    {fmtMinutes(spent.minutes, locale)}
                  </>
                ) : (
                  <span className="faint">{t('book.noTime')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>{t('book.pace')}</dt>
              <dd className="mono">
                {pace !== null ? (
                  t('book.perPage', { n: Math.round(pace * 10) / 10 })
                ) : (
                  <span className="faint">{t('book.unknown')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>{t('book.left')}</dt>
              <dd className="mono">
                {left !== null ? (
                  `≈ ${fmtMinutes(left, locale)}`
                ) : (
                  <span className="faint">{t('book.unknown')}</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="small muted hint-line">
            {last ? t('book.lastRead', { date: fmtDate(last, locale) }) : t('book.notOpened')}
          </p>
          {pace === null && <p className="small faint hint-line">{t('book.noTimeHint')}</p>}

          <Jelly className="btn" onClick={() => setLogging(true)} style={{ marginTop: 22 }}>
            {t('session.log')}
          </Jelly>
        </div>
      </div>

      {/* Two separate rows: what the book *is*, then what you can *do* to it. */}
      <div className="control-rows">
        <div className="control-row">
          <span className="label">{t('book.statusLabel')}</span>
          <Segmented
            name={t('book.statusLabel')}
            value={book.status}
            options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            onChange={(status) => updateBook(book.id, statusPatch(book, status, todayISO()))}
          />
        </div>
        <div className="control-row">
          <span className="label">{t('book.actions')}</span>
          <div className="row-tight">
            <button
              className={`btn ghost sm${book.is_focus ? ' on' : ''}`}
              onClick={() => setFocus(book.is_focus ? null : book.id)}
            >
              {book.is_focus ? t('book.isFocus') : t('book.makeFocus')}
            </button>
            <button className="btn ghost sm" onClick={() => setEditing(true)}>
              {t('book.edit')}
            </button>
            <button className="btn ghost sm" onClick={remove}>
              {t('book.delete')}
            </button>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label={book.title}>
        {TABS.map((id) => {
          const locked = id === 'review' && !finished
          const on = current === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={locked}
              title={locked ? t('book.reviewLocked') : undefined}
              className={`tab${on ? ' on' : ''}`}
              onClick={() => setTab(id)}
            >
              {t(TAB_KEY[id])}
              {counts[id] !== null && counts[id] > 0 && (
                <span className="tab-n">{counts[id]}</span>
              )}
              {on && (
                <motion.span
                  layoutId="book-tab"
                  className="tab-line"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {current === 'reflection' && (
        <div className="tab-body">
          <div className="chips">
            {(['all', ...TAGS] as const).map((tag) => (
              <button
                key={tag}
                type="button"
                className={`chip${tagFilter === tag ? ' on' : ''}`}
                aria-pressed={tagFilter === tag}
                onClick={() => setTagFilter(tag)}
              >
                {tag === 'all' ? t('book.allTags') : t(`tag.${tag}`)}
              </button>
            ))}
          </div>
          {myNotes.length === 0 ? (
            <div className="empty small">
              {bookNotes.length === 0 ? t('book.reflectionEmpty') : t('journal.emptyHere')}
            </div>
          ) : (
            <div className="thought-cards">
              {myNotes.map((n) => (
                <article key={n.id} className="thought-card" data-tag={n.tag}>
                  <span className="label thought-tag">{t(`tag.${n.tag}`)}</span>
                  <p className="thought-body">{n.body}</p>
                  {n.page !== null && (
                    <span className="small faint mono thought-foot">
                      {t('session.noteOnPage', { n: n.page })}
                    </span>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {current === 'sessions' && (
        <div className="tab-body">
          {mySessions.length === 0 ? (
            <div className="empty small">{t('book.sessionsEmpty')}</div>
          ) : (
            <>
              <div className="recent">
                {mySessions.map((s) => (
                  <div key={s.id} className="recent-row with-acts">
                    <span className="t">{fmtDate(s.date, locale)}</span>
                    <span className="mono small">
                      {s.page_from}–{s.page_to}
                    </span>
                    <span className="mono small muted">
                      {face(s.rating) && <span className="face-sm">{face(s.rating)}</span>}
                      {s.minutes ? fmtMinutes(s.minutes, locale) : '·'}
                    </span>
                    <div className="acts">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setEditingSession(s)}
                      >
                        {t('book.edit')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {read > 0 && (
                <p className="small faint" style={{ margin: '14px 0 0' }}>
                  {t('count.pages', { n: read })}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {current === 'review' && (
        <div className="tab-body">
          <Review key={book.id} book={book} />
        </div>
      )}

      {editing && <BookForm book={book} onClose={() => setEditing(false)} />}
      {logging && <SessionSheet book={book} sessions={sessions} onClose={() => setLogging(false)} />}
      {editingSession && (
        <SessionSheet
          book={book}
          sessions={sessions}
          session={editingSession}
          onClose={() => setEditingSession(null)}
        />
      )}
    </>
  )
}
