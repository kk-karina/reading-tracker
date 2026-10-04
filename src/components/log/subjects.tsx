import type { Material } from '../../lib/learning/types'
import type { Book } from '../../lib/types'
import { BookCover } from '../BookCover'
import { MaterialCover } from '../learning/MaterialCover'

/** Порядок выбора книги: та, что в фокусе, потом читаемые, потом остальные. */
const PICK_ORDER: Book['status'][] = ['reading', 'want', 'finished']
export function pickOrder(books: Book[]): Book[] {
  return [...books].sort(
    (a, b) =>
      Number(b.is_focus) - Number(a.is_focus) ||
      PICK_ORDER.indexOf(a.status) - PICK_ORDER.indexOf(b.status),
  )
}

/** Обложка книги в шапке листа и в списке выбора — на ступень мельче материала:
    у книги обложка вытянутая, и та же ступень вышла бы выше строки. */
export const bookCover = (b: Book, size: 'sm' | 'md') => (
  <BookCover book={b} size={size === 'md' ? 'sm' : 'xs'} />
)

export const materialCover = (m: Material, size: 'sm' | 'md') => (
  <MaterialCover material={m} size={size} />
)
