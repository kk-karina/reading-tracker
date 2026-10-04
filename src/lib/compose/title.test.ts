import { describe, expect, it } from 'vitest'
import { cleanTitle } from './title'

describe('cleanTitle', () => {
  it('ЛитРес: «Название, Автор – скачать…» → название и автор', () => {
    expect(
      cleanTitle(
        'Мастер и Маргарита, Михаил Булгаков – скачать книгу fb2, epub, pdf на ЛитРес',
        'litres.ru',
      ),
    ).toEqual({ title: 'Мастер и Маргарита', author: 'Михаил Булгаков' })
  })

  it('ЛитРес: «Название — Автор | читать онлайн на Литрес»', () => {
    expect(
      cleanTitle('Мастер и Маргарита — Михаил Булгаков | читать онлайн на Литрес', 'litres.ru'),
    ).toEqual({ title: 'Мастер и Маргарита', author: 'Михаил Булгаков' })
  })

  it('«Читать онлайн «Название», Автор» — кавычки и глагол уходят', () => {
    expect(cleanTitle('Читать онлайн «Мастер и Маргарита», Михаил Булгаков – ЛитРес', 'litres.ru')).toEqual({
      title: 'Мастер и Маргарита',
      author: 'Михаил Булгаков',
    })
  })

  it('Goodreads: «Title by Author | Goodreads»', () => {
    expect(cleanTitle('The Pragmatic Programmer by Andrew Hunt | Goodreads', 'goodreads.com')).toEqual({
      title: 'The Pragmatic Programmer',
      author: 'Andrew Hunt',
    })
  })

  it('Amazon: двоеточия, ISBN и витрина уходят', () => {
    expect(
      cleanTitle(
        'Refactoring UI: The Book: Adam Wathan: 9780000000000: Amazon.com: Books',
        'amazon.com',
      ),
    ).toEqual({ title: 'Refactoring UI: The Book', author: 'Adam Wathan' })
  })

  it('Amazon с витриной в начале', () => {
    expect(cleanTitle('Amazon.com: Atomic Habits: James Clear: Books', 'amazon.com')).toEqual({
      title: 'Atomic Habits',
      author: 'James Clear',
    })
  })

  it('хвост магазина срезается и на незнакомом сайте, автор не выдумывается', () => {
    expect(cleanTitle('Дизайн привычных вещей | купить книгу в интернет-магазине', 'example.ru')).toEqual({
      title: 'Дизайн привычных вещей',
      author: null,
    })
  })

  it('обычный заголовок статьи с тире не трогается', () => {
    expect(cleanTitle('Design systems — a practical guide', 'medium.com')).toEqual({
      title: 'Design systems — a practical guide',
      author: null,
    })
  })

  it('незнакомое у книжного магазина тоже не режется по запятой без имени', () => {
    expect(cleanTitle('Война и мир, том 1', 'litres.ru')).toEqual({
      title: 'Война и мир, том 1',
      author: null,
    })
  })

  it('пробелы по краям уходят', () => {
    expect(cleanTitle('  Заголовок  ', null)).toEqual({ title: 'Заголовок', author: null })
  })
})
