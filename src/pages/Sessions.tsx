import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { GroupSubject } from '../components/GroupSubject'
import { LogRow } from '../components/log/LogRow'
import { PagesStrip } from '../components/log/ProgressStrip'
import { SessionSheet } from '../components/SessionSheet'
import { ThoughtCard } from '../components/ThoughtCard'
import { Empty, Jelly, Segmented } from '../components/ui'
import { fmtDate, fmtMinutes } from '../lib/format'
import { groupItems, timeOf } from '../lib/log'
import { Mood } from '../components/Mood'
import type { Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'

type By = 'day' | 'book'

/**
 * Журнал сессий: как шло чтение.
 *
 * Строками, без подложки, — событие на линейке. Главное в строке — сколько
 * прочитано; книга стоит маячком, а мысли — значком с числом и раскрываются
 * по нажатию. Сами мысли живут в своей вкладке, как у страницы книги:
 * вперемешку с сессиями они превращали журнал в ленту, где обложки и записки
 * спорили с прогрессом за взгляд.
 *
 * Группировка по дням или по книгам — тем же вторым переключателем, что
 * подсрез на Полке.
 */
export function Sessions() {
  const { t, locale } = useLocale()
  const { books, sessions, notes, loading } = useData()
  const [by, setBy] = useState<By>('day')
  const [bookId, setBookId] = useState('')
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const [logging, setLogging] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)

  const shown = bookId ? sessions.filter((s) => s.book_id === bookId) : sessions
  const groups = groupItems(
    shown,
    (s) => (by === 'day' ? s.date : s.book_id),
    (s) => `${s.date}|${s.created_at}`,
  )

  if (loading) return null

  const bookOf = (id: string) => books.find((b) => b.id === id)
  const thoughtsOf = (id: string) =>
    notes
      .filter((n) => n.session_id === id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const toggle = (id: string) =>
    setOpen((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const log = (className: string) => (
    <Jelly className={className} onClick={() => setLogging(true)}>
      {t('session.log')}
    </Jelly>
  )

  return (
    <>
      {sessions.length > 0 && (
        <div className="filter-bar">
          <div className="row-tight">
            <Segmented
              name={t('nav.sessions')}
              value={by}
              options={[
                { value: 'day' as By, label: t('group.byDay') },
                { value: 'book' as By, label: t('group.byBook') },
              ]}
              onChange={setBy}
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
          <div className="row-tight">{log('btn')}</div>
        </div>
      )}

      {sessions.length === 0 ? (
        books.length > 0 ? (
          <Empty art="reading" hint={t('sessions.emptyBody')} action={log('btn ghost sm')}>
            {t('sessions.empty')}
          </Empty>
        ) : (
          <Empty
            art="reading"
            hint={t('sessions.emptyBody')}
            action={
              <Link to="/reading/shelf">
                <Jelly className="btn ghost sm">{t('progress.toShelf')}</Jelly>
              </Link>
            }
          >
            {t('sessions.empty')}
          </Empty>
        )
      ) : groups.length === 0 ? (
        <Empty size="sm">{t('journal.emptyHere')}</Empty>
      ) : (
        groups.map((g) => {
          const pages = g.items.reduce((sum, s) => sum + (s.page_to - s.page_from), 0)
          const minutes = g.items.reduce((sum, s) => sum + (s.minutes ?? 0), 0)
          const book = by === 'book' ? bookOf(g.key) : undefined
          return (
            <section key={g.key} className="day">
              <div className="day-head">
                {by === 'day' ? (
                  <span className="h3">{fmtDate(g.key, locale)}</span>
                ) : (
                  <GroupSubject
                    cover={book && <BookCover book={book} size="xs" />}
                    title={book?.title ?? t('book.notFound')}
                    author={book?.author}
                    to={book ? `/reading/book/${book.id}` : undefined}
                  />
                )}
                <span className="mono small muted">
                  {[t('count.pages', { n: pages }), minutes > 0 && fmtMinutes(minutes, locale)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>

              {g.items.map((s) => {
                const b = bookOf(s.book_id)
                const thoughts = thoughtsOf(s.id)
                const time = timeOf(s.date, s.created_at)
                return (
                  <LogRow
                    key={s.id}
                    step={`+${s.page_to - s.page_from}`}
                    unit={t('unit.pages')}
                    detail={
                      <span className="mono">
                        {s.page_from} → {s.page_to}
                      </span>
                    }
                    subject={
                      by === 'day' && b
                        ? {
                            cover: <BookCover book={b} size="xs" />,
                            title: b.title,
                            to: `/reading/book/${b.id}`,
                          }
                        : undefined
                    }
                    meter={
                      b?.pages ? (
                        <PagesStrip from={s.page_from} to={s.page_to} total={b.pages} />
                      ) : undefined
                    }
                    mood={s.rating && <Mood rating={s.rating} />}
                    when={[
                      by === 'book' && fmtDate(s.date, locale),
                      time,
                      s.minutes && fmtMinutes(s.minutes, locale),
                    ]}
                    written={thoughts.length}
                    open={open.has(s.id)}
                    onToggle={() => toggle(s.id)}
                    onEdit={() => setEditing(s)}
                  >
                    <div className="store-grid">
                      {thoughts.map((n) => (
                        <ThoughtCard key={n.id} note={n} flat />
                      ))}
                    </div>
                  </LogRow>
                )
              })}
            </section>
          )
        })
      )}

      {logging && (
        <SessionSheet
          book={bookId ? bookOf(bookId) : null}
          sessions={sessions}
          onClose={() => setLogging(false)}
        />
      )}
      {editing && (
        <SessionSheet
          book={bookOf(editing.book_id)}
          sessions={sessions}
          session={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
