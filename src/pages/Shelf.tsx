import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { BookForm } from '../components/BookForm'
import { Jelly } from '../components/ui'
import { todayISO } from '../lib/format'
import { progressOf } from '../lib/reading'
import { SEED_BOOKS, seedSessionFor } from '../lib/seed'
import type { Book, BookStatus, Session } from '../lib/types'
import { useData } from '../state/DataContext'
import { useT } from '../state/LocaleContext'

// Reading first: the shelf should answer "where am I now" before anything else.
const ORDER: BookStatus[] = ['reading', 'want', 'finished', 'abandoned']

export function Shelf() {
  const t = useT()
  const { books, sessions, loading, addBook, addSession } = useData()
  const [adding, setAdding] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function loadSeed() {
    setSeeding(true)
    for (const { page_to, ...fields } of SEED_BOOKS) {
      const created = await addBook(fields)
      if (created && page_to) await addSession(seedSessionFor(created.id, page_to, todayISO()))
    }
    setSeeding(false)
  }

  if (loading) return null

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('nav.shelf')}</h1>
        <Jelly className="btn" onClick={() => setAdding(true)}>
          {t('shelf.add')}
        </Jelly>
      </div>

      {books.length === 0 ? (
        <div className="panel">
          <p className="muted" style={{ marginTop: 0 }}>
            {t('shelf.empty')}
          </p>
          <div className="row-tight">
            <Jelly className="btn ghost sm" onClick={loadSeed} disabled={seeding}>
              {t('shelf.loadMine')}
            </Jelly>
            <span className="small faint">{t('shelf.loadMineHint')}</span>
          </div>
        </div>
      ) : (
        ORDER.map((status) => {
          const shelf = books.filter((b) => b.status === status)
          if (shelf.length === 0) return null
          return (
            <section key={status} className="shelf">
              <div className="label shelf-label">
                {t(`status.${status}`)} <span className="faint">{shelf.length}</span>
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
      <Link to={`/book/${book.id}`} className="shelf-book">
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
