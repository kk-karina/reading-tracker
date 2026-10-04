import { describe, expect, it } from 'vitest'
import type { Material, Stream } from '../learning/types'
import type { Book } from '../types'
import { emptyDraft } from './draft'
import { classifyDuplicates, findDuplicates, normalizeTitle, normalizeUrl, type Duplicate } from './duplicates'

describe('normalizeUrl', () => {
  it('без схемы, www, якоря, меток и хвостового слэша', () => {
    expect(normalizeUrl('https://www.Example.com/a/b/?utm_source=x&id=2#top')).toBe('example.com/a/b?id=2')
  })
  it('ссылка без схемы равна ссылке со схемой', () => {
    expect(normalizeUrl('litres.ru/book/1/')).toBe(normalizeUrl('http://litres.ru/book/1'))
  })
  it('мусор — пустая строка', () => {
    expect(normalizeUrl('   ')).toBe('')
  })
})

describe('normalizeTitle', () => {
  it('регистр, ё, кавычки и пунктуация не различают', () => {
    expect(normalizeTitle('«Ёжик в тумане»!')).toBe(normalizeTitle('ежик  в тумане'))
  })
})

const book = (over: Partial<Book>): Book => ({
  id: 'b1',
  title: 'Мастер и Маргарита',
  author: 'Михаил Булгаков',
  pages: 480,
  cover_url: null,
  url: null,
  external_id: null,
  genre: null,
  language: null,
  status: 'want',
  is_focus: false,
  rating: null,
  review: null,
  started_at: null,
  finished_at: null,
  sort: 0,
  created_at: '',
  updated_at: '',
  ...over,
})

const material = (over: Partial<Material>): Material => ({
  id: 'm1',
  stream_id: 's1',
  title: 'Refactoring UI',
  kind: 'book',
  author: 'Adam Wathan',
  url: null,
  status: 'backlog',
  cover_url: null,
  scale: 'pages',
  pages_total: null,
  page_current: null,
  sort: 0,
  created_at: '',
  updated_at: '',
  ...over,
})

const stream = { id: 's1', slug: 'design', name: 'Дизайн' } as Stream

describe('findDuplicates', () => {
  const world = (books: Book[] = [], materials: Material[] = []) => ({ books, materials, streams: [stream] })

  it('книга на полке по названию и автору', () => {
    const d = { ...emptyDraft('book'), title: 'мастер и маргарита', author: 'Михаил Булгаков' }
    expect(findDuplicates(d, world([book({})]))).toMatchObject([
      { where: 'shelf', id: 'b1', title: 'Мастер и Маргарита', stream: null, href: '/reading/book/b1' },
    ])
  })

  it('разные авторы — не дубль', () => {
    const d = { ...emptyDraft('book'), title: 'Мастер и Маргарита', author: 'Кто-то другой' }
    expect(findDuplicates(d, world([book({})]))).toEqual([])
  })

  it('автора нет у одной стороны — хватает названия', () => {
    const d = { ...emptyDraft('book'), title: 'Мастер и Маргарита' }
    expect(findDuplicates(d, world([book({})]))).toHaveLength(1)
  })

  it('по external_id, даже если название другое', () => {
    const d = { ...emptyDraft('book'), title: 'The Master', externalId: '/works/1' }
    expect(findDuplicates(d, world([book({ external_id: '/works/1' })]))).toHaveLength(1)
  })

  it('по ссылке — у любого вида', () => {
    const d = { ...emptyDraft('article'), title: 'Другое', url: 'https://www.site.com/post/' }
    expect(findDuplicates(d, world([], [material({ kind: 'article', url: 'site.com/post', title: 'X' })]))).toMatchObject([
      { where: 'stream', id: 'm1', title: 'X', stream: 'Дизайн', href: '/learning/design/m/m1' },
    ])
  })

  it('статья с тем же названием, что и книга, — не дубль', () => {
    const d = { ...emptyDraft('article'), title: 'Мастер и Маргарита' }
    expect(findDuplicates(d, world([book({})]))).toEqual([])
  })

  it('вид не выбран руками — название сверяется и у «статьи»', () => {
    const d = { ...emptyDraft('article'), title: 'Мастер и Маргарита' }
    expect(findDuplicates(d, world([book({})]), {}, true)).toHaveLength(1)
  })

  it('материал-книга совпадает с книгой полки по названию — между разделами', () => {
    const d = { ...emptyDraft('book'), title: 'Refactoring UI', author: 'Adam Wathan' }
    expect(findDuplicates(d, world([], [material({})]))[0].where).toBe('stream')
  })

  it('себя не считает', () => {
    const d = { ...emptyDraft('book'), title: 'Мастер и Маргарита' }
    expect(findDuplicates(d, world([book({})]), { bookId: 'b1' })).toEqual([])
    const m = { ...emptyDraft('book'), title: 'Refactoring UI' }
    expect(findDuplicates(m, world([], [material({})]), { materialId: 'm1' })).toEqual([])
  })

  it('пустой черновик ни с чем не совпадает', () => {
    expect(findDuplicates(emptyDraft('book'), world([book({ title: '' })]))).toEqual([])
  })

  it('материал из несуществующего потока пропускается', () => {
    const d = { ...emptyDraft('book'), title: 'Refactoring UI' }
    expect(findDuplicates(d, world([], [material({ stream_id: 'gone' })]))).toEqual([])
  })
})

describe('classifyDuplicates', () => {
  const dup = (over: Partial<Duplicate>): Duplicate => ({
    where: 'shelf',
    id: 'x',
    title: 'X',
    stream: null,
    streamId: null,
    href: '',
    data: {},
    ...over,
  })

  it('книга уже на полке — на полку вторую не завести', () => {
    const d = dup({ where: 'shelf' })
    expect(classifyDuplicates([d], { section: 'shelf' })).toEqual({ blocking: d, source: null })
  })

  it('книга на полке, заводим в поток — это дублирование, а не запрет', () => {
    const d = dup({ where: 'shelf' })
    expect(classifyDuplicates([d], { section: 'stream', streamId: 's1' })).toEqual({ blocking: null, source: d })
  })

  it('в этом же потоке — запрет, в другом — дублирование', () => {
    const here = dup({ where: 'stream', streamId: 's1' })
    const there = dup({ where: 'stream', streamId: 's2' })
    expect(classifyDuplicates([there], { section: 'stream', streamId: 's1' }).source).toBe(there)
    expect(classifyDuplicates([there, here], { section: 'stream', streamId: 's1' }).blocking).toBe(here)
  })

  it('запрет сильнее дублирования', () => {
    const shelf = dup({ where: 'shelf' })
    const here = dup({ where: 'stream', streamId: 's1' })
    expect(classifyDuplicates([shelf, here], { section: 'stream', streamId: 's1' })).toEqual({ blocking: here, source: null })
  })

  it('ничего не нашлось — ничего не делаем', () => {
    expect(classifyDuplicates([], { section: 'shelf' })).toEqual({ blocking: null, source: null })
  })
})
