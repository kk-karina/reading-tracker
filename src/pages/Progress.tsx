import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { BookCredit } from '../components/BookCredit'
import { BookForm } from '../components/BookForm'
import { pagesByDate, Rhythm, WeeklyBars } from '../components/Charts'
import { Icon } from '../components/Icon'
import { SessionSheet } from '../components/SessionSheet'
import { ThoughtCard } from '../components/ThoughtCard'
import { ThoughtSheet } from '../components/ThoughtSheet'
import { Counter, Empty, Jelly, Tip } from '../components/ui'
import { Zone } from '../components/Zone'
import { daysAgoISO, fmtDate, todayISO } from '../lib/format'
import { finishedInYear, lastSessionDate, progressOf, streakDays, stuckBooks } from '../lib/reading'
import type { Book, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'

const STUCK_AFTER_DAYS = 14

/**
 * Дашборд чтения — по тем же правилам, что дашборд потока в обучении.
 *
 * Наверху то, за что сесть, с плюсом у полосы прогресса. Ниже — показания и
 * графики в панелях: у графика своя рамка, это его плоскость. Списки — мысли,
 * застрявшие, год — стоят зонами, без подложки: имя над линией, под ним
 * содержимое, а пустота, если она есть, — прямо на странице. Раньше мысли
 * стояли голыми, а застрявшие и год — в панелях, и одна и та же пустота
 * выглядела то карточкой, то строкой.
 *
 * Плюс есть у тех зон, в которые можно дописать. Застрявшие и год — выводы из
 * прочитанного, а не то, что заводят руками, поэтому у них плюса нет.
 */
export function Progress() {
  const { t, locale } = useLocale()
  const { books, sessions, notes, loading } = useData()
  const [adding, setAdding] = useState(false)
  /** Книга, по которой пишут сессию. `null` — лист спросит её сам. */
  const [logging, setLogging] = useState<Book | null | false>(false)
  const [thinking, setThinking] = useState(false)

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
          <FocusBook
            book={focus}
            sessions={sessions}
            others={others}
            onLog={() => setLogging(focus)}
          />
        ) : reading.length > 0 ? (
          /* Книги есть, главная не выбрана — это развилка, а не пустота. */
          <Empty
            art="signpost"
            hint={t('progress.pickFocusBody')}
            action={
              <Link to="/reading/shelf">
                <Jelly className="btn ghost sm">{t('progress.toShelf')}</Jelly>
              </Link>
            }
          >
            {t('progress.pickFocus')}
          </Empty>
        ) : (
          /* Книги заводятся прямо отсюда, как первый материал на дашборде
             потока: уходить на полку ради одной кнопки незачем. */
          <Empty
            art="reading"
            hint={t('progress.noBooksBody')}
            action={
              <Jelly className="btn ghost sm" onClick={() => setAdding(true)}>
                {t('shelf.add')}
              </Jelly>
            }
          >
            {t('progress.noBooks')}
          </Empty>
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

      {/* Графики — одной зоной без шапки: каждая панель называет себя сама. */}
      <Zone>
        <div className="dash-stack">
          <section className="panel">
            <div className="panel-head">
              <div className="label">{t('chart.rhythm')}</div>
              <span className="small faint">{t('progress.rhythmHint')}</span>
            </div>
            <Rhythm
              byDate={pagesByDate(sessions)}
              label={t('chart.rhythm')}
              unit={(n) => t('count.pages', { n })}
            />
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="label">{t('chart.weeks')}</div>
              <span className="small faint">{t('progress.weeksHint')}</span>
            </div>
            <WeeklyBars sessions={sessions} />
          </section>
        </div>
      </Zone>

      {/* Плюс зоны мыслей добавляет мысль, а не сессию: та же дверь, что во
          вкладке «Мысли». Каждая мысль — карточка, и ряд карточек сам
          выравнивается по высоте; книга — подписью внизу, мелко. */}
      <Zone
        title={t('progress.recentNotes')}
        link={{ to: '/reading/thoughts', label: t('progress.toJournal') }}
        add={{ label: t('thought.add'), onClick: () => setThinking(true) }}
      >
        {recentNotes.length === 0 ? (
          <Empty size="sm" art="writing">
            {t('progress.notesEmpty')}
          </Empty>
        ) : (
          <div className="thought-cards">
            {recentNotes.map((n) => {
              const b = books.find((x) => x.id === n.book_id)
              return (
                <ThoughtCard
                  key={n.id}
                  note={n}
                  credit={b && <BookCredit book={b} />}
                />
              )
            })}
          </div>
        )}
      </Zone>

      <Zone title={t('progress.stuck')} hint={t('progress.stuckHint')}>
        {stuck.length === 0 ? (
          /* Хорошая пустота: здесь ничего не надо делать, поэтому и кнопки
             нет, а герой на рисунке спокойно читает. */
          <Empty size="sm" art="reading">
            {t('progress.stuckEmpty')}
          </Empty>
        ) : (
          <div className="stuck-row">
            {stuck.map((b) => {
              const last = lastSessionDate(b.id, sessions)
              return (
                <Link key={b.id} to={`/reading/book/${b.id}`} className="stuck-book">
                  <BookCover book={b} size="sm" />
                  <span className="small muted">
                    {last ? t('book.lastRead', { date: fmtDate(last, locale) }) : t('book.notOpened')}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </Zone>

      {/* Последней — полка того, что уже дочитано. */}
      <Zone title={t('progress.yearInBooks')} hint={today.slice(0, 4)}>
        {finished.length === 0 ? (
          <Empty size="sm" art="pile">
            {t('progress.yearEmpty')}
          </Empty>
        ) : (
          <div className="year-grid">
            {finished.map((b) => (
              <Link key={b.id} to={`/reading/book/${b.id}`}>
                <BookCover book={b} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </Zone>

      {adding && <BookForm onClose={() => setAdding(false)} />}
      {thinking && <ThoughtSheet onClose={() => setThinking(false)} />}
      {logging !== false && (
        <SessionSheet book={logging} sessions={sessions} onClose={() => setLogging(false)} />
      )}
    </>
  )
}

function FocusBook({
  book,
  sessions,
  others,
  onLog,
}: {
  book: Book
  sessions: Session[]
  others: Book[]
  onLog: () => void
}) {
  const { t } = useLocale()
  const { page, percent } = progressOf(book.id, sessions, book.pages)

  return (
    <div className="focus">
      <Link to={`/reading/book/${book.id}`} className="focus-cover">
        <BookCover book={book} size="lg" />
      </Link>
      <div className="focus-info">
        <div className="label">{t('book.isFocus')}</div>
        <h2 className="display focus-title">{book.title}</h2>
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
        {/* Плюс вплотную к полосе — тот же ряд, что на странице книги и у
            фокуса потока: записать сессию значит сдвинуть именно эту полосу. */}
        <div className="prog-row">
          <motion.div className="meter big" aria-hidden>
            <span style={{ width: `${percent ?? (page > 0 ? 8 : 0)}%` }} />
          </motion.div>
          <Tip text={t('session.log')}>
            <Jelly className="log-dot" onClick={onLog} aria-label={t('session.log')}>
              <Icon name="plus" size={15} />
            </Jelly>
          </Tip>
        </div>

        {others.length > 0 && (
          <div className="hero-others">
            <div className="label" style={{ marginBottom: 12 }}>
              {t('progress.alsoReading')}
            </div>
            {/* A cover opens the book and does nothing else. Moving the focus
                lives on the book page alone: from here it used to happen on one
                stray click, silently, with nothing to undo it. */}
            <div className="spines">
              {others.map((b) => (
                <Link key={b.id} to={`/reading/book/${b.id}`} className="spine" title={b.title}>
                  <BookCover book={b} size="sm" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
