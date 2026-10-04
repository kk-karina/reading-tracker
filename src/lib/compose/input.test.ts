import { describe, expect, it } from 'vitest'
import { looksLikeUrl } from './input'

describe('looksLikeUrl', () => {
  it.each([
    'https://www.litres.ru/book/mihail-bulgakov/master-i-margarita-128458/',
    'http://example.com',
    'youtu.be/dQw4w9WgXcQ',
    'litres.ru/book/123',
    'www.goodreads.com',
    '  medium.com/@a/post  ',
  ])('ссылка: %s', (s) => expect(looksLikeUrl(s)).toBe(true))

  it.each([
    'Мастер и Маргарита',
    'Clean Code',
    'Ф. М. Достоевский',
    'Ф.М.Достоевский',
    'Atomic',
    '',
    '   ',
    'v1.2',
  ])('не ссылка: «%s»', (s) => expect(looksLikeUrl(s)).toBe(false))
})
