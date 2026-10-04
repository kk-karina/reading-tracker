import { describe, expect, it } from 'vitest'
import type { Material } from '../learning/types'
import type { Book } from '../types'
import { bookToDraft, draftToBook, draftToMaterial, emptyDraft, materialToDraft, sameDraft } from './draft'

const book: Book = {
  id: 'b1',
  title: 'Мастер и Маргарита',
  author: 'Михаил Булгаков',
  pages: 480,
  cover_url: 'https://c/1.jpg',
  url: 'https://litres.ru/b/1',
  external_id: '/works/1',
  genre: 'Fiction',
  language: 'ru',
  status: 'finished',
  is_focus: false,
  rating: null,
  review: null,
  started_at: '2026-01-01',
  finished_at: '2026-02-01',
  sort: 0,
  created_at: '',
  updated_at: '',
}

describe('книга ⇄ черновик', () => {
  it('туда и обратно сохраняет поля формы', () => {
    const d = bookToDraft(book)
    expect(d).toMatchObject({ kind: 'book', scale: 'pages', pages: '480', done: true, externalId: '/works/1' })
    expect(draftToBook(d, book, '2026-10-03')).toEqual({
      title: 'Мастер и Маргарита',
      author: 'Михаил Булгаков',
      pages: 480,
      cover_url: 'https://c/1.jpg',
      url: 'https://litres.ru/b/1',
      external_id: '/works/1',
      status: 'finished',
      started_at: '2026-01-01',
      finished_at: '2026-02-01',
    })
  })

  it('жанр и язык не пишет: при правке их не затирает', () => {
    const patch = draftToBook(bookToDraft(book), book, '2026-10-03')
    expect(patch).not.toHaveProperty('genre')
    expect(patch).not.toHaveProperty('language')
  })

  it('пустая ссылка не попадает в запись вовсе: колонки может ещё не быть', () => {
    const patch = draftToBook({ ...emptyDraft('book'), title: 'X' }, undefined, '2026-10-03')
    expect(patch).not.toHaveProperty('url')
  })

  it('снятая отметка «прочитана» уносит дату', () => {
    const patch = draftToBook({ ...bookToDraft(book), done: false }, book, '2026-10-03')
    expect(patch).toMatchObject({ status: 'want', finished_at: null })
  })

  it('новая прочитанная получает сегодняшнюю дату', () => {
    const patch = draftToBook({ ...emptyDraft('book'), title: 'X', done: true }, undefined, '2026-10-03')
    expect(patch).toMatchObject({ status: 'finished', finished_at: '2026-10-03' })
  })

  it('пробелы и пустые строки становятся null', () => {
    const patch = draftToBook({ ...emptyDraft('book'), title: '  X  ', author: '  ', pages: '' }, undefined, 'd')
    expect(patch).toMatchObject({ title: 'X', author: null, pages: null, cover_url: null })
  })

  it('у старой книги без ссылки черновик со строкой, а не undefined', () => {
    const { url: _drop, ...old } = book
    expect(bookToDraft(old as Book).url).toBe('')
  })
})

const material: Material = {
  id: 'm1',
  book_id: null,
  stream_id: 's1',
  title: 'Refactoring UI',
  kind: 'book',
  author: 'Adam Wathan',
  url: 'https://refactoringui.com',
  status: 'active',
  cover_url: null,
  scale: 'pages',
  pages_total: 250,
  page_current: 40,
  sort: 3,
  created_at: '',
  updated_at: '',
}

describe('материал ⇄ черновик', () => {
  it('туда и обратно, текущая страница сохраняется', () => {
    const d = materialToDraft(material, 0)
    expect(d).toMatchObject({ kind: 'book', scale: 'pages', pages: '250', parts: '', done: false })
    expect(draftToMaterial(d, material)).toEqual({
      title: 'Refactoring UI',
      kind: 'book',
      author: 'Adam Wathan',
      url: 'https://refactoringui.com',
      cover_url: null,
      status: 'backlog',
      scale: 'pages',
      pages_total: 250,
      page_current: 40,
    })
  })

  it('число частей приходит из списка частей', () => {
    expect(materialToDraft({ ...material, scale: 'parts' }, 12).parts).toBe('12')
  })

  it('у статьи нет ни шкалы, ни страниц', () => {
    const d = { ...materialToDraft(material, 0), kind: 'article' as const }
    expect(draftToMaterial(d, material)).toMatchObject({ scale: null, pages_total: null, page_current: null })
  })

  it('книга по главам теряет страницы', () => {
    const d = { ...materialToDraft(material, 0), scale: 'parts' as const }
    expect(draftToMaterial(d, material)).toMatchObject({ scale: 'parts', pages_total: null, page_current: null })
  })

  it('пройденный — done', () => {
    expect(draftToMaterial({ ...materialToDraft(material, 0), done: true }, material).status).toBe('done')
  })
})

describe('sameDraft', () => {
  it('пробелы по краям изменением не считаются', () => {
    const d = emptyDraft('article')
    expect(sameDraft(d, { ...d, title: '  ' })).toBe(true)
    expect(sameDraft(d, { ...d, title: 'X' })).toBe(false)
  })
})
