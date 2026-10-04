import { Link } from 'react-router-dom'
import type { Book } from '../lib/types'
import { BookCover } from './BookCover'

/**
 * Книга подписью под мыслью: маленькая обложка, название, автор, под чертой.
 *
 * Одна запись на дашборд и вкладку «Мысли»: там, где мысли разных книг стоят
 * рядом, книгу узнают по обложке быстрее, чем по названию мелким текстом.
 */
export function BookCredit({ book }: { book: Book }) {
  return (
    <Link
      to={`/reading/book/${book.id}`}
      className="thought-book"
      title={book.author ? `${book.title} — ${book.author}` : book.title}
    >
      <BookCover book={book} size="xs" />
      <span className="thought-book-text">
        <span className="thought-book-title">{book.title}</span>
        {book.author && <span className="thought-book-author">{book.author}</span>}
      </span>
    </Link>
  )
}
