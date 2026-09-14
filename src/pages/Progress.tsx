import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { Rhythm, WeeklyBars } from '../components/Charts'
import { Counter, Jelly } from '../components/ui'
import { daysAgoISO, fmtDate, todayISO } from '../lib/format'
import { finishedInYear, lastSessionDate, progressOf, streakDays, stuckBooks } from '../lib/reading'
import type { Book, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'

const STUCK_AFTER_DAYS = 14

export function Progress() {
  const { t, locale } = useLocale()
  const { books, sessions, notes, loading, setFocus } = useData()

  if (loading) return null

  const today = todayISO()
  const reading = books.filter((b) => b.status === 'reading')
  const focus = books.find((b) => b.is_focus) ?? null
  const others = reading.filter((b) => b.id !== focus?.id)

  const since = daysAgoISO(6)
  const week = sessions.filter((s) => s.date >= since)
  const weekPages = week.reduce((sum, s) => sum + (s.page_to - s.page_from), 0)
  const weekDays = new Set(week.map((s) => s.date)).size
  const streak = streakDays(sessions, today)
  const finished = finishedInYear(books, Number(today.slice(0, 4)))
  const stuck = stuckBooks(books, sessions, today, STUCK_AFTER_DAYS)
  // Three fills one row of cards on a wide screen; the rest lives in the journal.
  const recentNotes = notes.slice(0, 3)

  return (
    <>
      <section className="hero">
        {focus ? (
          <FocusBook book={focus} sessions={sessions} others={others} onPick={setFocus} />
        ) : reading.length > 0 ? (
          <div className="hero-empty">
            <p className="muted">{t('progress.pickFocus')}</p>
          </div>
        ) : (
          <div className="hero-empty">
            <p className="muted">{t('progress.noBooks')}</p>
            <Link to="/shelf">
              <Jelly className="btn">{t('progress.toShelf')}</Jelly>
            </Link>
          </div>
        )}

      </section>

      <div className="stat-row">
        <div className="stat">
          <div className="label">{t('progress.week')}</div>
          <div className="num">
            <Counter value={weekPages} />
            <span className="suffix">{t('count.days', { n: weekDays })}</span>
          </div>
        </div>
        <div className="stat">
          <div className="label">{t('progress.streak')}</div>
          <div className="num">
            <Counter value={streak} />
            <span className="suffix">{t('progress.dayUnit', { n: streak })}</span>
          </div>
        </div>
        <div className="stat">
          <div className="label">{t('progress.finishedYear')}</div>
          <div className="num">
            <Counter value={finished.length} />
            <span className="suffix">{t('progress.ofTotal', { n: books.length })}</span>
          </div>
        </div>
      </div>

      <div className="dash-stack">
        {/* The log first: what you did, then how it adds up, then what it left you. */}
        <section className="panel">
          <div className="panel-head">
            <div className="label">{t('chart.rhythm')}</div>
            <span className="small faint">{t('progress.rhythmHint')}</span>
          </div>
          <Rhythm sessions={sessions} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="label">{t('chart.weeks')}</div>
            <span className="small faint">{t('progress.weeksHint')}</span>
          </div>
          <WeeklyBars sessions={sessions} />
        </section>

        {/* Thoughts are not a chart and not a list in a box: each one is a card,
            and a row of cards settles to one height on its own. */}
        <section>
          <div className="panel-head">
            <div className="label">{t('progress.recentNotes')}</div>
            <Link to="/journal" className="link-btn">
              {t('progress.toJournal')}
            </Link>
          </div>
          {recentNotes.length === 0 ? (
            <div className="empty small">{t('progress.notesEmpty')}</div>
          ) : (
            <div className="thought-cards">
              {recentNotes.map((n) => {
                const b = books.find((x) => x.id === n.book_id)
                return (
                  <article key={n.id} className="thought-card" data-tag={n.tag}>
                    <span className="label thought-tag">{t(`tag.${n.tag}`)}</span>
                    <p className="thought-body">{n.body}</p>
                    {b && (
                      <Link to={`/book/${b.id}`} className="thought-book" title={b.title}>
                        <BookCover book={b} size="xs" />
                        <span className="muted">{b.title}</span>
                      </Link>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="label">{t('progress.stuck')}</div>
            <span className="small faint">{t('progress.stuckHint')}</span>
          </div>
          {stuck.length === 0 ? (
            <div className="empty small">{t('progress.stuckEmpty')}</div>
          ) : (
            <div className="stuck-row">
              {stuck.map((b) => {
                const last = lastSessionDate(b.id, sessions)
                return (
                  <Link key={b.id} to={`/book/${b.id}`} className="stuck-book">
                    <BookCover book={b} size="sm" />
                    <span className="small muted">
                      {last ? t('book.lastRead', { date: fmtDate(last, locale) }) : t('book.notOpened')}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Last, and across the full width: the shelf of what is already done. */}
        <section className="panel">
          <div className="panel-head">
            <div className="label">{t('progress.yearInBooks')}</div>
            <span className="small faint mono">{today.slice(0, 4)}</span>
          </div>
          {finished.length === 0 ? (
            <div className="empty small">{t('progress.yearEmpty')}</div>
          ) : (
            <div className="year-grid">
              {finished.map((b) => (
                <Link key={b.id} to={`/book/${b.id}`}>
                  <BookCover book={b} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

    </>
  )
}

function FocusBook({
  book,
  sessions,
  others,
  onPick,
}: {
  book: Book
  sessions: Session[]
  others: Book[]
  onPick: (id: string) => void
}) {
  const { t } = useLocale()
  const { page, percent } = progressOf(book.id, sessions, book.pages)

  return (
    <div className="focus">
      <Link to={`/book/${book.id}`} className="focus-cover">
        <BookCover book={book} size="lg" />
      </Link>
      <div className="focus-info">
        <div className="label">{t('book.isFocus')}</div>
        <h1 className="display focus-title">{book.title}</h1>
        {book.author && <p className="muted" style={{ margin: '8px 0 0' }}>{book.author}</p>}

        <div className="book-numbers">
          <span className="mono">
            {book.pages
              ? t('book.pagesOf', { page, total: book.pages })
              : page > 0
                ? t('count.pages', { n: page })
                : t('book.notOpened')}
          </span>
          {percent !== null && <span className="small faint">· {percent}%</span>}
        </div>
        <motion.div className="meter big" aria-hidden>
          <span style={{ width: `${percent ?? (page > 0 ? 8 : 0)}%` }} />
        </motion.div>

        {others.length > 0 && (
          <div className="hero-others">
            <div className="label" style={{ marginBottom: 12 }}>
              {t('progress.alsoReading')}
            </div>
            {/* The cover opens the book, the way a cover does everywhere else on
                the shelf. Moving the focus is a deliberate button under it —
                the same one the book page carries — because it used to happen
                on a single stray click and there is no undo for it. */}
            <div className="spines">
              {others.map((b) => (
                <div key={b.id} className="spine">
                  <Link to={`/book/${b.id}`} className="spine-cover" title={b.title}>
                    <BookCover book={b} size="sm" />
                  </Link>
                  <button type="button" className="btn ghost sm" onClick={() => onPick(b.id)}>
                    {t('book.makeFocus')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
