import type { Material, Stream } from '../learning/types'
import type { Book } from '../types'
import { recordToDraft, type Draft } from './draft'
import { normalizeTitle } from './duplicates'

/**
 * Свои книги как источник для новой карточки.
 *
 * Книга, которая уже стоит на полке, при заведении в поток не должна
 * набираться заново: обложка, автор, страницы и ссылка у неё уже есть. Пока
 * полка и потоки хранят книги отдельно, «взять с полки» — это копия полей,
 * а не связь: прогресс у двух записей свой.
 */

/**
 * Только пустое — то же правило, что у ✦: набранное руками сильнее. Вид и
 * шкала не трогаются: это выбор, а не пустое поле.
 */
export function fillEmpty(d: Draft, data: Partial<Draft>): Partial<Draft> {
  const patch: Partial<Draft> = {}
  for (const k of ['title', 'author', 'cover', 'url', 'pages'] as const) {
    const v = data[k]
    if (v && !d[k].trim()) patch[k] = v
  }
  if (data.externalId && !d.externalId) patch.externalId = data.externalId
  return patch
}

export interface OwnHit {
  where: 'shelf' | 'stream'
  id: string
  title: string
  author: string | null
  cover: string | null
  stream: string | null
  data: Partial<Draft>
}

/**
 * Свои книги, у которых в названии или авторе есть набранное.
 *
 * Только книги: статья «Refactoring UI tips» — не та вещь, которую ищут,
 * набирая название книги. Поиск локальный и мгновенный, поэтому идёт прямо
 * по мере ввода — наружу при этом ничего не уходит.
 */
export function findOwn(
  query: string,
  world: { books: Book[]; materials: Material[]; streams: Stream[] },
  where: readonly ('shelf' | 'stream')[],
  limit = 4,
  /** Поток, куда заводим: его собственные книги — не источник, а дубль. */
  skipStream?: string,
): OwnHit[] {
  const q = normalizeTitle(query)
  if (q.length < 2) return []
  const has = (title: string, author: string | null) =>
    normalizeTitle(title).includes(q) || (!!author && normalizeTitle(author).includes(q))

  const hits: OwnHit[] = []
  if (where.includes('shelf'))
    for (const b of world.books)
      if (has(b.title, b.author))
        hits.push({
          where: 'shelf',
          id: b.id,
          title: b.title,
          author: b.author,
          cover: b.cover_url,
          stream: null,
          data: recordToDraft({ book: b }),
        })
  if (where.includes('stream'))
    for (const m of world.materials) {
      const stream = world.streams.find((s) => s.id === m.stream_id)
      if (m.kind === 'book' && stream && m.stream_id !== skipStream && has(m.title, m.author))
        hits.push({
          where: 'stream',
          id: m.id,
          title: m.title,
          author: m.author,
          cover: m.cover_url,
          stream: stream.name,
          data: recordToDraft({ material: m }),
        })
    }
  return hits.slice(0, limit)
}

/**
 * Черновик, каким он станет копией найденного: пустое берётся оттуда, а вид —
 * тоже оттуда, если его не выбирали руками.
 *
 * Карточка показывает именно это, а не голый черновик. Иначе ссылка на книгу с
 * полки, распознанная по незнакомому домену как статья, рисовала бы лежачую
 * «статью», а сохраняла книгу — то, что видишь, и то, что получишь, разошлись.
 */
export function withSource(
  d: Draft,
  data: Partial<Draft>,
  kindOpen: boolean,
  /**
   * Поля, которые заполнила догадка по ссылке и которые руками не трогали.
   * Своя запись знает о книге больше, чем разметка чужой страницы: «adamwathan»
   * из Open Graph уступает «Adam Wathan» с полки.
   */
  guessed: ReadonlySet<string> = new Set(),
): Draft {
  const over: Partial<Draft> = {}
  for (const k of ['title', 'author', 'cover', 'pages'] as const) {
    const v = data[k]
    if (v && guessed.has(k)) over[k] = v
  }
  return {
    ...d,
    ...fillEmpty(d, data),
    ...over,
    ...(kindOpen && data.kind ? { kind: data.kind, scale: data.scale ?? 'pages' } : {}),
  }
}
