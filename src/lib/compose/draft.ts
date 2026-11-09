import { statusPatch } from '../reading'
import type { BookScale, Material, MaterialKind, PracticeScale } from '../learning/types'
import type { Book } from '../types'

/**
 * Черновик композера — общий язык формы заведения.
 *
 * Форма знает только его и не знает, куда он уйдёт: книга на полке — это
 * материал вида «книга», который сохраняется в другую таблицу. Строки, а не
 * числа и null: это состояние полей ввода, и «пусто» в нём — пустая строка.
 */
export interface Draft {
  url: string
  title: string
  author: string
  cover: string
  kind: MaterialKind
  /** Только у книги. У остальных видов значение есть, но не используется. */
  scale: BookScale
  /** Страниц всего — при `scale === 'pages'`. */
  pages: string
  /** Глав или лекций — при частях. */
  parts: string
  /** Только у практики: минутами или разами. */
  practice: PracticeScale
  /** Цель практики как набрана: часы у минут, разы у раз. Пусто — без цели. */
  target: string
  /** «Уже прочитана / пройден»: единственный статус, который нельзя вывести. */
  done: boolean
  /** Издание Open Library, если книга выбрана из поиска. Только полка. */
  externalId: string | null
}

export const emptyDraft = (kind: MaterialKind): Draft => ({
  url: '',
  title: '',
  author: '',
  cover: '',
  kind,
  scale: 'pages',
  pages: '',
  parts: '',
  practice: 'minutes',
  target: '',
  done: false,
  externalId: null,
})

const text = (v: string) => v.trim() || null
const num = (v: string) => (v.trim() ? Number(v) : null)

/**
 * Цель практики из поля в единицы хранения: часы — в минуты, разы — как есть.
 * Часы принимают дробь через точку или запятую: «1,5» — полтора часа.
 */
export function targetOf(practice: PracticeScale, raw: string): number | null {
  const n = Number(raw.trim().replace(',', '.'))
  if (!raw.trim() || !Number.isFinite(n) || n <= 0) return null
  return practice === 'minutes' ? Math.round(n * 60) : Math.round(n)
}

/** Обратно — для правки: минуты в часы без хвоста нулей. */
export function targetText(practice: PracticeScale, target: number | null): string {
  if (!target) return ''
  return practice === 'minutes' ? String(Math.round((target / 60) * 100) / 100) : String(target)
}

/** Менялось ли что-то, что стоит спросить перед закрытием. */
export function sameDraft(a: Draft, b: Draft): boolean {
  return (Object.keys(a) as (keyof Draft)[]).every((k) => {
    const x = a[k]
    const y = b[k]
    return typeof x === 'string' && typeof y === 'string' ? x.trim() === y.trim() : x === y
  })
}

export function bookToDraft(book?: Book): Draft {
  if (!book) return emptyDraft('book')
  return {
    ...emptyDraft('book'),
    // `?? ''` не лишний: у книг из старых снимков поля `url` нет совсем.
    url: book.url ?? '',
    title: book.title,
    author: book.author ?? '',
    cover: book.cover_url ?? '',
    pages: book.pages ? String(book.pages) : '',
    done: book.status === 'finished',
    externalId: book.external_id,
  }
}

export type BookFields = Pick<
  Book,
  'title' | 'author' | 'pages' | 'cover_url' | 'external_id' | 'status' | 'started_at' | 'finished_at'
> &
  Partial<Pick<Book, 'url'>>

/**
 * Черновик → поля книги.
 *
 * Жанра и языка здесь нет: форма о них больше не спрашивает, а при правке
 * старой книги их значения не должны затереться пустотой. Пустая ссылка не
 * пишется вовсе — в базе, где ещё не прогнали миграцию с `url`, запись с этим
 * ключом упала бы целиком, а без него проходит как раньше.
 */
export function draftToBook(d: Draft, book: Book | undefined, today: string): BookFields {
  const url = text(d.url)
  return {
    title: d.title.trim(),
    author: text(d.author),
    pages: num(d.pages),
    cover_url: text(d.cover),
    ...(url || book?.url ? { url } : {}),
    external_id: d.externalId,
    // «Хочу» здесь — не утверждение, а отсутствие отметки: что это на самом
    // деле, решит подсчёт сессий.
    ...statusPatch(
      { started_at: book?.started_at ?? null, finished_at: book?.finished_at ?? null },
      d.done ? 'finished' : 'want',
      today,
    ),
  }
}

export function materialToDraft(material: Material | undefined, partsCount: number, kind: MaterialKind = 'article'): Draft {
  if (!material) return emptyDraft(kind)
  return {
    ...emptyDraft(material.kind),
    url: material.url ?? '',
    title: material.title,
    author: material.author ?? '',
    cover: material.cover_url ?? '',
    scale: material.scale === 'parts' ? 'parts' : 'pages',
    pages: material.pages_total ? String(material.pages_total) : '',
    parts: partsCount ? String(partsCount) : '',
    practice: material.scale === 'times' ? 'times' : 'minutes',
    target: targetText(material.scale === 'times' ? 'times' : 'minutes', material.target),
    done: material.status === 'done',
  }
}

export type MaterialFields = Pick<
  Material,
  'title' | 'kind' | 'author' | 'url' | 'cover_url' | 'status' | 'scale' | 'pages_total' | 'page_current' | 'target'
>

export function draftToMaterial(d: Draft, material?: Material): MaterialFields {
  const byPages = d.kind === 'book' && d.scale === 'pages'
  const practice = d.kind === 'practice'
  return {
    title: d.title.trim(),
    kind: d.kind,
    // У практики нет ни автора, ни ссылки: поля спрятаны, но в черновике
    // могли остаться от вида, с которого переключились.
    author: practice ? null : text(d.author),
    url: practice ? null : text(d.url),
    cover_url: text(d.cover),
    // Правка не трогает «в работе»: хранимый `active` — это «взяла явно», и
    // переименование материала не должно возвращать его в бэклог.
    status: d.done ? 'done' : material?.status === 'done' ? 'active' : (material?.status ?? 'backlog'),
    scale: d.kind === 'book' ? d.scale : practice ? d.practice : null,
    target: practice ? targetOf(d.practice, d.target) : null,
    pages_total: byPages ? num(d.pages) : null,
    // Текущая страница живёт на странице материала: она меняется каждый раз,
    // а всё здешнее — один раз.
    page_current: byPages ? (material?.page_current ?? null) : null,
  }
}

/**
 * Запись с полки или из потока → поля черновика. Так свою книгу берут как
 * источник для новой карточки, не набирая её заново.
 */
export function recordToDraft(rec: { book: Book } | { material: Material }): Partial<Draft> {
  const raw: Partial<Draft> =
    'book' in rec
      ? {
          title: rec.book.title,
          author: rec.book.author ?? '',
          cover: rec.book.cover_url ?? '',
          url: rec.book.url ?? '',
          pages: rec.book.pages ? String(rec.book.pages) : '',
          externalId: rec.book.external_id,
        }
      : {
          title: rec.material.title,
          author: rec.material.author ?? '',
          cover: rec.material.cover_url ?? '',
          url: rec.material.url ?? '',
          pages: rec.material.pages_total ? String(rec.material.pages_total) : '',
        }
  const kept = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== '' && v !== null))
  // Книга с полки меряется страницами, как там; материал — своим видом и шкалой.
  return 'book' in rec
    ? { ...kept, kind: 'book', scale: 'pages' }
    : {
        ...kept,
        kind: rec.material.kind,
        scale: rec.material.scale === 'parts' ? 'parts' : 'pages',
        ...(rec.material.kind === 'practice'
          ? {
              practice: rec.material.scale === 'times' ? 'times' : 'minutes',
              target: targetText(rec.material.scale === 'times' ? 'times' : 'minutes', rec.material.target),
            }
          : {}),
      }
}

