import type { Material, Stream } from '../learning/types'
import type { Book } from '../types'
import { recordToDraft, type Draft } from './draft'
import { parseUrl } from './linkMeta'

/**
 * Есть ли это уже где-то.
 *
 * Проверяются оба раздела из любой формы: книга, которую изучаешь в потоке,
 * и книга на полке — пока что две разные записи, и узнать о второй стоит до
 * того, как она появится. Подсказка, а не запрет: одну книгу вполне можно
 * держать и там, и там.
 */
export interface Duplicate {
  where: 'shelf' | 'stream'
  id: string
  title: string
  /** Имя потока — для подписи «уже в потоке «Дизайн»». */
  stream: string | null
  streamId: string | null
  href: string
  /** Что из найденного можно подставить в карточку. */
  data: Partial<Draft>
}

/** Метки рекламы и шеринга не делают ссылку другой. */
const TRACKING = /^(utm_.*|ref|ref_|fbclid|gclid|yclid|si|feature)$/i

export function normalizeUrl(raw: string): string {
  const url = parseUrl(raw)
  if (!url) return ''
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const params = [...url.searchParams].filter(([k]) => !TRACKING.test(k))
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : ''
  const path = url.pathname.replace(/\/+$/, '')
  return `${host}${path}${query}`
}

export function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Если автор есть у обоих — он должен совпасть; если у кого-то нет — хватает названия. */
const authorsMatch = (a: string | null, b: string | null) =>
  !a?.trim() || !b?.trim() || normalizeTitle(a) === normalizeTitle(b)

export function findDuplicates(
  d: Draft,
  world: { books: Book[]; materials: Material[]; streams: Stream[] },
  self: { bookId?: string; materialId?: string } = {},
  /**
   * Вид ещё не выбран руками. Тогда «статья» в черновике — не выбор, а
   * значение по умолчанию, и совпадение названия со своей книгой — почти
   * наверняка та же книга, которую начали заводить вручную.
   */
  kindOpen = false,
): Duplicate[] {
  const url = d.url.trim() ? normalizeUrl(d.url) : ''
  const title = normalizeTitle(d.title)
  // Совпадение по названию имеет смысл только у книг: две статьи «Введение»
  // — это две разные статьи.
  const byTitle = (d.kind === 'book' || kindOpen) && title.length >= 2

  const sameTitle = (t: string, author: string | null) =>
    byTitle && normalizeTitle(t) === title && authorsMatch(d.author, author)
  const sameUrl = (u: string | null | undefined) => !!url && !!u && normalizeUrl(u) === url

  const found: Duplicate[] = []

  for (const b of world.books) {
    if (b.id === self.bookId) continue
    const hit =
      (!!d.externalId && b.external_id === d.externalId) || sameUrl(b.url) || sameTitle(b.title, b.author)
    if (hit)
      found.push({
        where: 'shelf',
        id: b.id,
        title: b.title,
        stream: null,
        streamId: null,
        href: `/reading/book/${b.id}`,
        data: recordToDraft({ book: b }),
      })
  }

  for (const m of world.materials) {
    if (m.id === self.materialId) continue
    const stream = world.streams.find((s) => s.id === m.stream_id)
    if (!stream) continue
    const hit = sameUrl(m.url) || (m.kind === 'book' && sameTitle(m.title, m.author))
    if (hit)
      found.push({
        where: 'stream',
        id: m.id,
        title: m.title,
        stream: stream.name,
        streamId: stream.id,
        href: `/learning/${stream.slug}/m/${m.id}`,
        data: recordToDraft({ material: m }),
      })
  }

  return found
}

/** Куда заводится запись: на полку или в конкретный поток. */
export type Home = { section: 'shelf' } | { section: 'stream'; streamId: string }

/**
 * Что делать с найденным.
 *
 * Совпадение там же, куда заводишь, — это вторая такая же запись, и её не
 * создают: сохранение закрыто, а подсказка ведёт к той, что уже есть.
 * Совпадение в другом месте — это та же книга, которую хотят держать и
 * там, и тут. Тогда сохранение не закрыто, а называется своим именем —
 * «продублировать» — и забирает из найденного всё, чего нет в карточке.
 */
export function classifyDuplicates(found: Duplicate[], home: Home): { blocking: Duplicate | null; source: Duplicate | null } {
  const same = (d: Duplicate) =>
    home.section === 'shelf' ? d.where === 'shelf' : d.where === 'stream' && d.streamId === home.streamId
  const blocking = found.find(same) ?? null
  return { blocking, source: blocking ? null : (found[0] ?? null) }
}
