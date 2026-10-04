import { bookToDraft, draftToBook } from '../lib/compose/draft'
import { todayISO } from '../lib/format'
import { canLink } from '../lib/twin'
import type { Book } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLearning } from '../state/LearningContext'
import { useT } from '../state/LocaleContext'
import { useSessionWrites } from '../state/useSessionWrites'
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
  const { materials, streams } = useLearning()
  const writes = useSessionWrites()
  const twin = book ? writes.materialOf(book.id) : null
  const twinStream = twin && streams.find((s) => s.id === twin.stream_id)

  return (
    <Composer
      title={book ? t('book.edit') : t('shelf.add')}
      initial={bookToDraft(book)}
      editing={!!book}
      variant={SHELF}
      home={{ section: 'shelf' }}
      self={{ bookId: book?.id }}
      onClose={onClose}
      linked={
        twin &&
        twinStream && {
          title: t('compose.linkedStream', { stream: twinStream.name }),
          href: `/learning/${twinStream.slug}/m/${twin.id}`,
          onUnlink: () => {
            if (confirm(t('compose.confirmUnlink'))) void writes.unlink(twin)
          },
        }
      }
      onSave={async (draft, copyOf) => {
        const fields = draftToBook(draft, book, todayISO())
        if (book) {
          await updateBook(book.id, fields)
          await writes.afterBookEdit(book.id, fields.pages)
          return
        }
        const made = await addBook({ ...fields, genre: null, language: null, sort: 0 })
        // Копия материала по страницам — та же книга: связь ставится сразу,
        // и занятия материала приходят на полку сессиями. Число страниц —
        // то, что стоит в карточке.
        const source = copyOf?.where === 'stream' ? materials.find((m) => m.id === copyOf.id) : null
        if (made && source && canLink(source) && !source.book_id) await writes.link(source, made, made.pages)
      }}
      onDelete={
        book &&
        (async () => {
          if (!confirm(t('book.confirmDelete'))) return
          await writes.forgetBook(book.id)
          await deleteBook(book.id)
          onClose()
          onDeleted?.()
        })
      }
    />
  )
}
