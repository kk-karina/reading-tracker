import { describe, expect, it } from 'vitest'
import type { Material, Stream } from '../learning/types'
import type { Book } from '../types'
import { emptyDraft, recordToDraft } from './draft'
import { fillEmpty, findOwn, withSource } from './own'

const book = (over: Partial<Book> = {}): Book => ({
  id: 'b1',
  title: 'Refactoring UI',
  author: 'Adam Wathan',
  pages: 218,
  cover_url: 'https://c/1.jpg',
  url: 'https://refactoringui.com',
  external_id: '/works/1',
  genre: null,
  language: null,
  status: 'reading',
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

const material = (over: Partial<Material> = {}): Material => ({
  id: 'm1',
  stream_id: 's1',
  title: 'Дизайн привычных вещей',
  kind: 'book',
  author: 'Дон Норман',
  url: null,
  status: 'backlog',
  cover_url: null,
  scale: 'pages',
  pages_total: 384,
  page_current: null,
  sort: 0,
  created_at: '',
  updated_at: '',
  ...over,
})

const stream = { id: 's1', slug: 'design', name: 'Дизайн' } as Stream
const world = { books: [book()], materials: [material(), material({ id: 'm2', kind: 'article', title: 'Refactoring UI tips' })], streams: [stream] }

describe('recordToDraft', () => {
  it('книга полки → поля черновика книги', () => {
    expect(recordToDraft({ book: book() })).toEqual({
      title: 'Refactoring UI',
      author: 'Adam Wathan',
      cover: 'https://c/1.jpg',
      url: 'https://refactoringui.com',
      pages: '218',
      externalId: '/works/1',
      kind: 'book',
      scale: 'pages',
    })
  })
  it('материал-книга → поля без пустот', () => {
    expect(recordToDraft({ material: material() })).toEqual({
      title: 'Дизайн привычных вещей',
      author: 'Дон Норман',
      pages: '384',
      kind: 'book',
      scale: 'pages',
    })
  })
})

describe('findOwn', () => {
  it('ищет по части названия, без регистра и ё', () => {
    const hits = findOwn('рефакторинг', world, ['shelf', 'stream'])
    expect(hits).toEqual([])
    expect(findOwn('refactoring', world, ['shelf', 'stream']).map((h) => h.id)).toEqual(['b1'])
  })
  it('в потоке берёт только книги: статья с тем же словом не предлагается', () => {
    expect(findOwn('привычных', world, ['stream'])).toMatchObject([
      { where: 'stream', id: 'm1', stream: 'Дизайн' },
    ])
  })
  it('смотрит только в названные разделы', () => {
    expect(findOwn('refactoring', world, ['stream'])).toEqual([])
  })
  it('книги того же потока не предлагаются: это не источник, а дубль', () => {
    expect(findOwn('привычных', world, ['stream'], 4, 's1')).toEqual([])
  })
  it('короче двух букв не ищет', () => {
    expect(findOwn('r', world, ['shelf'])).toEqual([])
  })
  it('по автору тоже находит', () => {
    expect(findOwn('норман', world, ['stream']).map((h) => h.id)).toEqual(['m1'])
  })
})

describe('fillEmpty', () => {
  it('берёт только то, что в черновике пусто', () => {
    const d = { ...emptyDraft('book'), title: 'Своё', pages: '' }
    expect(fillEmpty(d, { title: 'Чужое', author: 'Автор', pages: '100' })).toEqual({ author: 'Автор', pages: '100' })
  })
  it('нечего взять — пустой патч', () => {
    const d = { ...emptyDraft('book'), title: 'X', author: 'Y' }
    expect(fillEmpty(d, { title: 'Z', author: 'W' })).toEqual({})
  })
  it('вид и шкалу не меняет', () => {
    expect(fillEmpty(emptyDraft('article'), { kind: 'book', scale: 'parts' })).toEqual({})
  })
})

describe('withSource', () => {
  const shelfBook = { title: 'Refactoring UI', author: 'Adam Wathan', cover: 'https://c/1.jpg', pages: '218', kind: 'book' as const, scale: 'pages' as const }

  it('вид не выбран руками — «статья» по домену становится книгой', () => {
    const d = { ...emptyDraft('article'), title: 'Refactoring UI', url: 'https://x.com/b' }
    expect(withSource(d, shelfBook, true)).toMatchObject({ kind: 'book', scale: 'pages', cover: 'https://c/1.jpg', pages: '218', url: 'https://x.com/b' })
  })

  it('вид выбран руками — остаётся', () => {
    const d = { ...emptyDraft('course'), title: 'Refactoring UI' }
    expect(withSource(d, shelfBook, false).kind).toBe('course')
  })

  it('догадка по ссылке уступает своей записи', () => {
    const d = { ...emptyDraft('article'), title: 'Refactoring UI', author: 'adamwathan', cover: 'https://og/1.png' }
    expect(withSource(d, shelfBook, true, new Set(['author', 'cover']))).toMatchObject({
      author: 'Adam Wathan',
      cover: 'https://c/1.jpg',
    })
  })

  it('своё не перетирается', () => {
    const d = { ...emptyDraft('book'), title: 'Refactoring UI', author: 'Своё' }
    expect(withSource(d, shelfBook, true).author).toBe('Своё')
  })
})
