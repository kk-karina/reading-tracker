import { todayISO } from './format'
import type { NewBook, NewSession } from './store'
import type { Book, Session } from './types'

/**
 * A sample shelf, so an empty install has something to look at. Real books with
 * real covers and real page counts from Open Library — invented numbers would
 * end up in progress bars that mean nothing, and invented page counts would set
 * the thickness of every spine on the shelf wrong.
 *
 * There are enough of them to fill the shelf past the edge of the window, which
 * is the only way to see what it does when you push it along.
 */
interface SeedBook extends NewBook {
  /** Where this one is already up to, so a progress bar has something to show. */
  page_to?: number
}

const cover = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`

export const SEED_BOOKS: SeedBook[] = [
  {
    title: 'The Left Hand of Darkness',
    author: 'Ursula K. Le Guin',
    pages: 304,
    cover_url: cover(10618463),
    external_id: '/works/OL59800W',
    genre: 'Fiction',
    language: 'en',
    status: 'reading',
    started_at: null,
    finished_at: null,
    sort: 0,
    page_to: 96,
  },
  {
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    pages: 528,
    cover_url: cover(13290711),
    external_id: '/works/OL15992072W',
    genre: 'Non-fiction',
    language: 'en',
    status: 'want',
    started_at: null,
    finished_at: null,
    sort: 1,
  },
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    pages: 351,
    cover_url: cover(14348537),
    external_id: '/works/OL66554W',
    genre: 'Fiction',
    language: 'en',
    status: 'want',
    started_at: null,
    finished_at: null,
    sort: 2,
  },
  {
    title: 'Meditations',
    author: 'Marcus Aurelius',
    pages: 158,
    cover_url: cover(13202688),
    external_id: '/works/OL28521353W',
    genre: 'Philosophy',
    language: 'en',
    status: 'want',
    started_at: null,
    finished_at: null,
    sort: 3,
  },
  {
    title: 'Dune',
    author: 'Frank Herbert',
    pages: 607,
    cover_url: cover(11481354),
    external_id: '/works/OL893414W',
    genre: 'Fiction',
    language: 'en',
    status: 'reading',
    started_at: null,
    finished_at: null,
    sort: 4,
    page_to: 212,
  },
  {
    title: 'The Name of the Rose',
    author: 'Umberto Eco',
    pages: 518,
    cover_url: cover(15023290),
    external_id: '/works/OL37535473W',
    genre: 'Fiction',
    language: 'en',
    status: 'want',
    started_at: null,
    finished_at: null,
    sort: 5,
  },
  {
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    pages: 456,
    cover_url: cover(8634250),
    external_id: '/works/OL17075811W',
    genre: 'Non-fiction',
    language: 'en',
    status: 'finished',
    started_at: null,
    finished_at: null,
    sort: 6,
  },
  {
    title: 'Never Let Me Go',
    author: 'Kazuo Ishiguro',
    pages: 319,
    cover_url: cover(1047334),
    external_id: '/works/OL59038W',
    genre: 'Fiction',
    language: 'en',
    status: 'finished',
    started_at: null,
    finished_at: null,
    sort: 7,
  },
  {
    title: 'The Overstory',
    author: 'Richard Powers',
    pages: 531,
    cover_url: cover(8758252),
    external_id: '/works/OL19074847W',
    genre: 'Fiction',
    language: 'en',
    status: 'reading',
    started_at: null,
    finished_at: null,
    sort: 8,
    page_to: 88,
  },
  {
    title: 'One Hundred Years of Solitude',
    author: 'Gabriel Garcia Marquez',
    pages: 417,
    cover_url: cover(15185412),
    external_id: '/works/OL43108828W',
    genre: 'Fiction',
    language: 'en',
    status: 'finished',
    started_at: null,
    finished_at: null,
    sort: 9,
  },
  {
    title: 'Norwegian Wood',
    author: 'Haruki Murakami',
    pages: 389,
    cover_url: cover(2237620),
    external_id: '/works/OL2625457W',
    genre: 'Fiction',
    language: 'en',
    status: 'want',
    started_at: null,
    finished_at: null,
    sort: 10,
  },
  {
    title: 'Roadside Picnic',
    author: 'Arkady and Boris Strugatsky',
    pages: 170,
    cover_url: cover(6752719),
    external_id: '/works/OL7967812W',
    genre: 'Fiction',
    language: 'en',
    status: 'finished',
    started_at: null,
    finished_at: null,
    sort: 11,
  },
  {
    title: 'The Dispossessed',
    author: 'Ursula K. Le Guin',
    pages: 352,
    cover_url: cover(6979680),
    external_id: '/works/OL59863W',
    genre: 'Fiction',
    language: 'en',
    status: 'abandoned',
    started_at: null,
    finished_at: null,
    sort: 12,
  },
  {
    title: 'Piranesi',
    author: 'Susanna Clarke',
    pages: 272,
    cover_url: cover(10226290),
    external_id: '/works/OL20893680W',
    genre: 'Fiction',
    language: 'en',
    status: 'want',
    started_at: null,
    finished_at: null,
    sort: 13,
  },
]

export function seedSessionFor(bookId: string, page_to: number, date: string): NewSession {
  return { book_id: bookId, date, page_from: 0, page_to, minutes: null, rating: null }
}

/**
 * Put the sample shelf into a library that may already have books on it.
 *
 * Anything already there is skipped: every sample book carries its Open Library
 * work id, which is the same test the add form uses, so pressing this twice
 * does not leave two copies of Dune standing side by side. New books are sorted
 * after the ones already on the shelf rather than in among them.
 *
 * Returns how many were actually added, which is what the caller has to report:
 * "nothing happened" and "nothing needed to happen" look identical otherwise.
 */
export async function addSampleShelf(
  shelf: Book[],
  addBook: (item: NewBook) => Promise<Book | undefined>,
  addSession: (item: NewSession) => Promise<Session | undefined>,
): Promise<number> {
  const already = new Set(shelf.map((b) => b.external_id).filter(Boolean))
  const after = shelf.reduce((top, b) => Math.max(top, b.sort), -1) + 1
  let added = 0

  for (const { page_to, ...fields } of SEED_BOOKS) {
    if (fields.external_id && already.has(fields.external_id)) continue
    const created = await addBook({ ...fields, sort: after + fields.sort })
    if (!created) continue
    added++
    if (page_to) await addSession(seedSessionFor(created.id, page_to, todayISO()))
  }
  return added
}
