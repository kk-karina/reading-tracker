import { describe, expect, test } from 'vitest'
import { parseSearch } from './books'

// Shape trimmed from a real openlibrary.org/search.json response.
const response = {
  docs: [
    {
      key: '/works/OL16809461W',
      title: 'Pitch anything',
      author_name: ['Oren Klaff'],
      number_of_pages_median: 225,
      cover_i: 6501234,
      language: ['eng', 'spa'],
      first_publish_year: 2011,
    },
    {
      key: '/works/OL99W',
      title: 'Summary Oren Klaff’s Pitch Anything',
      author_name: ['Ant Hive Media'],
      cover_i: null,
      language: ['eng'],
    },
    { key: '/works/OL100W' }, // no title at all
  ],
}

describe('parseSearch', () => {
  test('maps a full result into a candidate', () => {
    const [first] = parseSearch(response)
    expect(first).toEqual({
      title: 'Pitch anything',
      author: 'Oren Klaff',
      pages: 225,
      // The large size: the medium one is soft at the size the book page shows it.
      cover_url: 'https://covers.openlibrary.org/b/id/6501234-L.jpg',
      external_id: '/works/OL16809461W',
      language: 'en',
      year: 2011,
    })
  })

  test('keeps a result that has no cover or page count', () => {
    const second = parseSearch(response)[1]
    expect(second.title).toBe('Summary Oren Klaff’s Pitch Anything')
    expect(second.cover_url).toBeNull()
    expect(second.pages).toBeNull()
  })

  test('drops entries with no title, which are useless to pick from', () => {
    expect(parseSearch(response)).toHaveLength(2)
  })

  test('joins several authors', () => {
    const [only] = parseSearch({
      docs: [{ key: '/works/OL1W', title: 'Crucial Conversations', author_name: ['Kerry Patterson', 'Joseph Grenny'] }],
    })
    expect(only.author).toBe('Kerry Patterson, Joseph Grenny')
  })

  test('returns nothing for an empty or malformed response', () => {
    expect(parseSearch({})).toEqual([])
    expect(parseSearch(null)).toEqual([])
    expect(parseSearch({ docs: 'nope' })).toEqual([])
  })
})
