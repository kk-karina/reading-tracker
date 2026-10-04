import { bookToDraft, draftToBook } from '../lib/compose/draft'
import { todayISO } from '../lib/format'
import type { Book } from '../lib/types'
import { useData } from '../state/DataContext'
import { useT } from '../state/LocaleContext'
import { Composer, type ComposerVariant } from './compose/Composer'

/**
 * Книга на полке — материал вида «книга», у которого вид уже выбран.
 *
 * Шкала одна — страницы: полка считает прочитанное сессиями «со страницы по
 * страницу», и книга, которую мерят главами, в ней просто не сложится в
 * прогресс. Жанра и языка здесь нет: их не заполняли, а то, что не заполняют,
 * не должно стоять в форме вопросом.
 */
const SHELF: ComposerVariant = { kinds: ['book'], scales: ['pages'] }

export function BookForm({
  book,
  onClose,
  onDeleted,
}: {
  book?: Book
  onClose: () => void
  /** Куда уйти после удаления: страницы удалённой книги больше нет. */
  onDeleted?: () => void
}) {
  const t = useT()
  const { addBook, updateBook, deleteBook } = useData()

  return (
    <Composer
      title={book ? t('book.edit') : t('shelf.add')}
      initial={bookToDraft(book)}
      editing={!!book}
      variant={SHELF}
      home={{ section: 'shelf' }}
      self={{ bookId: book?.id }}
      onClose={onClose}
      onSave={async (draft) => {
        const fields = draftToBook(draft, book, todayISO())
        if (book) await updateBook(book.id, fields)
        else await addBook({ ...fields, genre: null, language: null, sort: 0 })
      }}
      onDelete={
        book &&
        (async () => {
          if (!confirm(t('book.confirmDelete'))) return
          await deleteBook(book.id)
          onClose()
          onDeleted?.()
        })
      }
    />
  )
}
