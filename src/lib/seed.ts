import type { NewBook, NewSession } from './store'

/**
 * The five books Karina named, as a one-click start. Page counts are filled in
 * only where a catalogue actually gave one — guessing them would put invented
 * numbers into real progress bars.
 */
interface SeedBook extends NewBook {
  /** Where she already is, for a book that is underway. */
  page_to?: number
}

export const SEED_BOOKS: SeedBook[] = [
  {
    title: 'Эстетический интеллект. Как его развивать и использовать в бизнесе и жизни',
    author: 'Полин Браун',
    pages: null,
    cover_url: null,
    external_id: null,
    genre: 'Бизнес',
    language: 'ru',
    status: 'want',
    sort: 0,
  },
  {
    title: 'Всегда желанные. Как сохранить страсть в длительных отношениях',
    author: 'Эстер Перель',
    pages: null,
    cover_url: null,
    external_id: null,
    genre: 'Психология',
    language: 'ru',
    status: 'reading',
    sort: 1,
    page_to: 136,
  },
  {
    title: 'Pitch Anything',
    author: 'Oren Klaff',
    pages: 225,
    cover_url: 'https://covers.openlibrary.org/b/id/7304551-L.jpg',
    external_id: '/works/OL15415557W',
    genre: 'Бизнес',
    language: 'en',
    status: 'want',
    sort: 2,
  },
  {
    title: 'Крыша. 20 лет со смерти СССР. Устная история рэкета',
    author: 'Евгений Вышенков',
    pages: null,
    cover_url: null,
    external_id: null,
    genre: 'Документальное',
    language: 'ru',
    status: 'want',
    sort: 3,
  },
  {
    title: 'Crucial Conversations',
    author: 'Kerry Patterson',
    pages: 272,
    cover_url: 'https://covers.openlibrary.org/b/id/1711809-L.jpg',
    external_id: '/works/OL282391W',
    genre: 'Психология',
    language: 'en',
    status: 'want',
    sort: 4,
  },
]

export function seedSessionFor(bookId: string, page_to: number, date: string): NewSession {
  return { book_id: bookId, date, page_from: 0, page_to, minutes: null, rating: null }
}
