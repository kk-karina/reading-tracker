import { describe, expect, test } from 'vitest'
import { translate } from './translate'

const dict = {
  'nav.shelf': { ru: 'Полка', en: 'Shelf' },
  'book.pages': {
    ru: { one: '{n} страница', few: '{n} страницы', many: '{n} страниц' },
    en: { one: '{n} page', other: '{n} pages' },
  },
  'book.of': { ru: '{read} из {total}', en: '{read} of {total}' },
}

describe('translate', () => {
  test('returns the string for the requested locale', () => {
    expect(translate(dict, 'ru', 'nav.shelf')).toBe('Полка')
    expect(translate(dict, 'en', 'nav.shelf')).toBe('Shelf')
  })

  test('interpolates named params', () => {
    expect(translate(dict, 'ru', 'book.of', { read: 56, total: 234 })).toBe('56 из 234')
  })

  test('picks the Russian plural form for one, few and many', () => {
    expect(translate(dict, 'ru', 'book.pages', { n: 1 })).toBe('1 страница')
    expect(translate(dict, 'ru', 'book.pages', { n: 3 })).toBe('3 страницы')
    expect(translate(dict, 'ru', 'book.pages', { n: 7 })).toBe('7 страниц')
  })

  test('picks the Russian plural form for the teens and the twenty-ones', () => {
    expect(translate(dict, 'ru', 'book.pages', { n: 11 })).toBe('11 страниц')
    expect(translate(dict, 'ru', 'book.pages', { n: 21 })).toBe('21 страница')
    expect(translate(dict, 'ru', 'book.pages', { n: 234 })).toBe('234 страницы')
  })

  test('picks the English plural form', () => {
    expect(translate(dict, 'en', 'book.pages', { n: 1 })).toBe('1 page')
    expect(translate(dict, 'en', 'book.pages', { n: 21 })).toBe('21 pages')
  })

  test('returns the key itself when it is missing, instead of throwing', () => {
    expect(translate(dict, 'ru', 'nope.missing' as never)).toBe('nope.missing')
  })
})
