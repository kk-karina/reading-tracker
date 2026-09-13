import type { NewBook, NewSession } from './store'

/**
 * A sample shelf, so an empty install has something to look at. Four real books
 * with real covers and real page counts from Open Library — invented numbers
 * would end up in progress bars that mean nothing.
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
]

export function seedSessionFor(bookId: string, page_to: number, date: string): NewSession {
  return { book_id: bookId, date, page_from: 0, page_to, minutes: null, rating: null }
}
