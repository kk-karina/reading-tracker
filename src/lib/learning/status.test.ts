import { describe, expect, it } from 'vitest'
import { statusOf, withStatus } from './status'
import type { Material, MaterialPart, StudyNote } from './types'

const material = (over: Partial<Material> = {}): Material => ({
  id: 'm1',
  stream_id: 'c1',
  title: 'Материал',
  kind: 'course',
  author: null,
  url: null,
  status: 'backlog',
  cover_url: null,
  scale: null,
  pages_total: null,
  page_current: null,
  sort: 0,
  created_at: '',
  updated_at: '',
  ...over,
})

const part = (over: Partial<MaterialPart> = {}): MaterialPart => ({
  id: crypto.randomUUID(),
  material_id: 'm1',
  title: '',
  done: false,
  sort: 0,
  ...over,
})

const note = (over: Partial<StudyNote> = {}): StudyNote => ({
  id: crypto.randomUUID(),
  material_id: 'm1',
  session_id: null,
  part_id: null,
  part: null,
  title: null,
  body: '',
  tags: [],
  date: '2026-10-01',
  sort: 0,
  created_at: '',
  updated_at: '',
  ...over,
})

describe('statusOf: курс и книга по главам', () => {
  const course = material({ kind: 'course' })

  it('нетронутый курс ждёт в очереди', () => {
    expect(statusOf(course, [part(), part({ sort: 1 })], [])).toBe('backlog')
  })

  it('одна отмеченная лекция — уже работа', () => {
    expect(statusOf(course, [part({ done: true }), part({ sort: 1 })], [])).toBe('active')
  })

  it('конспект без отметок — тоже работа', () => {
    expect(statusOf(course, [part(), part({ sort: 1 })], [note()])).toBe('active')
  })

  it('все лекции отмечены — пройдено, без всякой отдельной отметки', () => {
    expect(statusOf(course, [part({ done: true }), part({ sort: 1, done: true })], [])).toBe('done')
  })

  // Пустой список частей — это «частей ещё не завели», а не «все пройдены».
  it('курс без частей не считается пройденным', () => {
    expect(statusOf(course, [], [])).toBe('backlog')
  })
})

describe('statusOf: книга по страницам', () => {
  const book = material({ kind: 'book', scale: 'pages', pages_total: 300 })

  it('нулевая страница — очередь', () => {
    expect(statusOf(book, [], [])).toBe('backlog')
  })

  it('страница посреди книги — работа', () => {
    expect(statusOf({ ...book, page_current: 120 }, [], [])).toBe('active')
  })

  it('последняя страница — пройдено', () => {
    expect(statusOf({ ...book, page_current: 300 }, [], [])).toBe('done')
  })

  // Число страниц неизвестно — закрыть книгу подсчётом нечем, и она остаётся
  // в работе, пока человек не поставит отметку сам.
  it('без числа страниц подсчёт книгу не закрывает', () => {
    const vague = material({ kind: 'book', scale: 'pages', page_current: 400 })
    expect(statusOf(vague, [], [])).toBe('active')
  })
})

describe('statusOf: статья и ролик', () => {
  const article = material({ kind: 'article' })

  it('без конспектов — очередь', () => {
    expect(statusOf(article, [], [])).toBe('backlog')
  })

  it('с конспектом — работа', () => {
    expect(statusOf(article, [], [note()])).toBe('active')
  })

  it('отметка закрывает то, что считать нечем', () => {
    expect(statusOf({ ...article, status: 'done' }, [], [])).toBe('done')
  })
})

describe('statusOf: отметка сильнее подсчёта', () => {
  it('отмеченный пройденным курс остаётся пройденным', () => {
    const marked = material({ kind: 'course', status: 'done' })
    expect(statusOf(marked, [part(), part({ sort: 1 })], [])).toBe('done')
  })

  // Старые снимки несут статус, выставленный руками. «В работе» подсчёт
  // пересчитывает, и это правильно: иначе возвращается то самое расхождение,
  // ради которого статус и перестали ставить руками.
  it('выставленная руками «работа» пересчитывается', () => {
    const stale = material({ kind: 'course', status: 'active' })
    expect(statusOf(stale, [part(), part({ sort: 1 })], [])).toBe('backlog')
  })
})

describe('withStatus', () => {
  it('считает чужие конспекты и части только своему материалу', () => {
    const mine = material({ id: 'm1', kind: 'article' })
    const other = material({ id: 'm2', kind: 'article' })
    const got = withStatus([mine, other], [], [note({ material_id: 'm1' })])
    expect(got.map((m) => m.status)).toEqual(['active', 'backlog'])
  })

  it('исходный материал не трогается', () => {
    const mine = material({ kind: 'article' })
    withStatus([mine], [], [note()])
    expect(mine.status).toBe('backlog')
  })
})
