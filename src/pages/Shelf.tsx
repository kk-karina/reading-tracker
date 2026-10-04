import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { BookForm } from '../components/BookForm'
import { CoverReel } from '../components/CoverReel'
import { Empty, Jelly, Segmented } from '../components/ui'
import { progressOf } from '../lib/reading'
import { addSampleShelf } from '../lib/seed'
import type { Book, BookStatus, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useT } from '../state/LocaleContext'

// Reading first: the shelf should answer "where am I now" before anything else.
const ORDER: BookStatus[] = ['reading', 'want', 'finished']

/**
 * Two ways to stand in front of the same shelf. The grid is the working view —
 * books sorted into what you are doing with them, progress where you can scan
 * it. The reel is the shelf itself: one folded ribbon you walk along, pulling
 * out whatever catches the eye. The choice is remembered, since it is a mood
 * rather than a setting.
 */
type View = 'grid' | 'reel'
const VIEW_KEY = 'shelf-view'

/** Which shelf you are standing in front of. Not remembered: it is a question
 *  asked of the page now, not a way of keeping it. */
type StatusFilter = BookStatus | 'all'

function rememberedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'reel' ? 'reel' : 'grid'
  } catch {
    return 'grid'
  }
}

export function Shelf() {
  const t = useT()
  const { books, sessions, loading, addBook, addSession } = useData()
  const [adding, setAdding] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [view, setView] = useState<View>(rememberedView)
  const [status, setStatus] = useState<StatusFilter>('all')

  function chooseView(next: View) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Private browsing: the view still changes, it just will not be here next time.
    }
  }

  async function loadSeed() {
    setSeeding(true)
    await addSampleShelf(books, addBook, addSession)
    setSeeding(false)
  }

  if (loading) return null

  // Only shelves that hold something are offered, so the filter can never empty
  // the page — and a status that empties while you are on it falls back to all.
  const present = ORDER.filter((s) => books.some((b) => b.status === s))
  const active: StatusFilter = status !== 'all' && present.includes(status) ? status : 'all'
  const shown = active === 'all' ? present : [active]

  return (
    <>
      {/* The page bar: what you are looking at on the left, what you can do
          about it on the right. Пустой полке полосы не достаётся: срезать
          нечего, а «Добавить книгу» переехало в пустоту — см. `Empty`. */}
      {books.length > 0 && (
        <div className="filter-bar">
          <div className="row-tight">
            <Segmented
              name={t('shelf.view')}
              value={view}
              options={[
                { value: 'grid', label: t('shelf.viewGrid') },
                { value: 'reel', label: t('shelf.viewReel') },
              ]}
              onChange={chooseView}
              className="sm"
            />
            {present.length > 1 && (
              <Segmented
                name={t('shelf.status')}
                value={active}
                options={[
                  { value: 'all' as StatusFilter, label: t('shelf.allStatuses') },
                  ...present.map((s) => ({ value: s as StatusFilter, label: t(`status.${s}`) })),
                ]}
                onChange={setStatus}
                className="sm"
              />
            )}
          </div>
          <div className="row-tight">
            <Jelly className="btn" onClick={() => setAdding(true)}>
              {t('shelf.add')}
            </Jelly>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        /* Пример полки стоит рядом с «Добавить» вторым, приглушённым: это
           способ посмотреть, как всё работает, не заводя своего, — но
           основной жест здесь всё-таки первый. */
        <Empty
          art="reading"
          hint={t('shelf.emptyBody')}
          action={
            <>
              <Jelly className="btn ghost sm" onClick={() => setAdding(true)}>
                {t('shelf.add')}
              </Jelly>
              <Jelly className="btn ghost sm" onClick={loadSeed} disabled={seeding}>
                {t('shelf.loadSample')}
              </Jelly>
            </>
          }
        >
          {t('shelf.empty')}
        </Empty>
      ) : view === 'reel' ? (
        <CoverReel
          books={shown.flatMap((s) => books.filter((b) => b.status === s))}
          sessions={sessions}
        />
      ) : (
        shown.map((s) => {
          const shelf = books.filter((b) => b.status === s)
          return (
            <section key={s} className="shelf">
              <div className="label shelf-label">
                {t(`status.${s}`)} <span className="faint">{shelf.length}</span>
              </div>
              <div className="shelf-row">
                {shelf.map((b, i) => (
                  <ShelfBook key={b.id} book={b} sessions={sessions} index={i} />
                ))}
              </div>
            </section>
          )
        })
      )}

      {adding && <BookForm onClose={() => setAdding(false)} />}
    </>
  )
}

function ShelfBook({ book, sessions, index }: { book: Book; sessions: Session[]; index: number }) {
  const { page, percent } = progressOf(book.id, sessions, book.pages)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * index, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/reading/book/${book.id}`} className="shelf-book">
        <motion.div whileHover={{ y: -6, rotate: -1.5 }} whileTap={{ scale: 0.97 }}>
          <BookCover book={book} />
        </motion.div>
        <div className="shelf-meta">
          <span className="shelf-title">{book.title}</span>
          {book.author && <span className="small muted">{book.author}</span>}
          {book.status === 'reading' && (
            <div className="meter" aria-hidden>
              <span style={{ width: `${percent ?? (page > 0 ? 8 : 0)}%` }} />
            </div>
          )}
        </div>
        {book.is_focus && <span className="focus-dot" aria-hidden />}
      </Link>
    </motion.div>
  )
}
