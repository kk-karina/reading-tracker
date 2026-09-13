import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { BookForm } from '../components/BookForm'
import { Jelly, Segmented } from '../components/ui'
import { fmtDate } from '../lib/format'
import { lastSessionDate, pagesRead, progressOf } from '../lib/reading'
import type { BookStatus } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'

const STATUSES: BookStatus[] = ['want', 'reading', 'finished', 'abandoned']

export function Book() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t, locale } = useLocale()
  const { books, sessions, loading, updateBook, deleteBook, setFocus } = useData()
  const [editing, setEditing] = useState(false)

  if (loading) return null
  const book = books.find((b) => b.id === id)
  if (!book) return <div className="empty">{t('book.notFound')}</div>

  const { page, percent } = progressOf(book.id, sessions, book.pages)
  const read = pagesRead(book.id, sessions)
  const last = lastSessionDate(book.id, sessions)

  async function remove() {
    if (!book) return
    if (confirm(t('book.confirmDelete'))) {
      await deleteBook(book.id)
      nav('/shelf')
    }
  }

  return (
    <>
      <div className="book-head">
        {/* No entrance animation: whether the cover is visible must not depend on
            whether an animation started. The page already fades in as a whole. */}
        <div className="book-cover-tilt">
          <BookCover book={book} size="lg" />
        </div>

        <div className="book-info">
          <h1 className="display book-title">{book.title}</h1>
          {book.author && <p className="muted book-author">{book.author}</p>}

          <div className="book-numbers">
            <span className="mono">
              {book.pages
                ? t('book.pagesOf', { page, total: book.pages })
                : page > 0
                  ? t('count.pages', { n: page })
                  : t('book.notOpened')}
            </span>
            {!book.pages && <span className="small faint">{t('book.pagesUnknown')}</span>}
            {read > 0 && book.pages && <span className="small faint">· {percent}%</span>}
          </div>

          <div className="meter big" aria-hidden>
            <span style={{ width: `${percent ?? (page > 0 ? 8 : 0)}%` }} />
          </div>

          <p className="small muted book-last">
            {last ? t('book.lastRead', { date: fmtDate(last, locale) }) : t('book.notOpened')}
          </p>

          <div className="book-actions">
            <Segmented
              name={t('form.status')}
              value={book.status}
              options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
              onChange={(status) => updateBook(book.id, { status })}
            />
            <Jelly
              className={`btn ghost sm${book.is_focus ? ' on' : ''}`}
              onClick={() => setFocus(book.is_focus ? null : book.id)}
            >
              {book.is_focus ? t('book.isFocus') : t('book.makeFocus')}
            </Jelly>
            <button className="btn ghost sm" onClick={() => setEditing(true)}>
              {t('book.edit')}
            </button>
            <button className="btn ghost sm" onClick={remove}>
              {t('book.delete')}
            </button>
          </div>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 28 }}>
        <div className="label" style={{ marginBottom: 10 }}>
          {t('soon.title')}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {t('book.sessionsSoon')}
        </p>
      </section>

      {editing && <BookForm book={book} onClose={() => setEditing(false)} />}
    </>
  )
}
