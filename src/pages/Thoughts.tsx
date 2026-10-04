import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { GroupSubject } from '../components/GroupSubject'
import { BookCredit } from '../components/BookCredit'
import { SessionSheet } from '../components/SessionSheet'
import { ThoughtCard } from '../components/ThoughtCard'
import { ThoughtSheet } from '../components/ThoughtSheet'
import { Empty, Jelly, Segmented, listItem } from '../components/ui'
import { fmtDate } from '../lib/format'
import { groupItems, timeOf } from '../lib/log'
import type { Note, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'

type By = 'day' | 'book'

/**
 * Хранилище мыслей: всё, что осталось от чтения.
 *
 * Плиткой, каждая мысль — на своей бумаге: вещь, а не событие. Главное на
 * карточке — сама мысль; когда и о какой книге — подписью внизу, мелко.
 * Сессии живут в соседней вкладке, как у страницы книги.
 *
 * День мысли — день её сессии, если она есть: сессию за вчера записывают и
 * сегодня утром, и мысли из неё должны стоять во вчерашнем дне.
 */
export function Thoughts() {
  const { t, locale } = useLocale()
  const { books, sessions, notes, loading } = useData()
  const [by, setBy] = useState<By>('day')
  const [bookId, setBookId] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)

  const sessionOf = (n: Note) => sessions.find((s) => s.id === n.session_id) ?? null
  const dayOf = (n: Note) => sessionOf(n)?.date ?? n.created_at.slice(0, 10)

  const shown = bookId ? notes.filter((n) => n.book_id === bookId) : notes
  const groups = groupItems(
    shown,
    (n) => (by === 'day' ? dayOf(n) : n.book_id),
    (n) => `${dayOf(n)}|${n.created_at}`,
  )

  if (loading) return null

  const bookOf = (id: string) => books.find((b) => b.id === id)

  const add = (className: string) => (
    <Jelly className={className} onClick={() => setAdding(true)}>
      {t('thought.add')}
    </Jelly>
  )

  return (
    <>
      {notes.length > 0 && (
        <div className="filter-bar">
          <div className="row-tight">
            <Segmented
              name={t('nav.thoughts')}
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
          <div className="row-tight">{add('btn')}</div>
        </div>
      )}

      {notes.length === 0 ? (
        <Empty
          art="writing"
          hint={t('thoughts.emptyBody')}
          action={
            books.length > 0 ? (
              add('btn ghost sm')
            ) : (
              <Link to="/reading/shelf">
                <Jelly className="btn ghost sm">{t('progress.toShelf')}</Jelly>
              </Link>
            )
          }
        >
          {t('thoughts.empty')}
        </Empty>
      ) : groups.length === 0 ? (
        <Empty size="sm">{t('journal.emptyHere')}</Empty>
      ) : (
        groups.map((g) => {
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
                <span className="mono small muted">{t('count.notes', { n: g.items.length })}</span>
              </div>
              <div className="store-grid">
                <AnimatePresence initial={false}>
                  {g.items.map((n) => {
                    const b = bookOf(n.book_id)
                    return (
                      <motion.div key={n.id} layout="position" {...listItem}>
                        <ThoughtCard
                          note={n}
                          meta={[
                            by === 'book' && fmtDate(dayOf(n), locale),
                            timeOf(dayOf(n), n.created_at),
                          ]}
                          // Книга подписью — только когда мысли разных книг
                          // стоят рядом; в группе «по книгам» она уже в шапке.
                          credit={by === 'day' && b && <BookCredit book={b} />}
                          // Мысль сессии правится внутри сессии, где её
                          // контекст; мысль без сессии — своим листом.
                          onEdit={() => {
                            const host = sessionOf(n)
                            if (host) setEditingSession(host)
                            else setEditing(n)
                          }}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </section>
          )
        })
      )}

      {adding && (
        <ThoughtSheet book={bookId ? bookOf(bookId) : null} onClose={() => setAdding(false)} />
      )}
      {editing && <ThoughtSheet note={editing} onClose={() => setEditing(null)} />}
      {editingSession && (
        <SessionSheet
          book={bookOf(editingSession.book_id)}
          sessions={sessions}
          session={editingSession}
          onClose={() => setEditingSession(null)}
        />
      )}
    </>
  )
}
