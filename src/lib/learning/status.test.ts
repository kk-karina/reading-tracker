import { describe, expect, it } from 'vitest'
import { finishedByCount, settleStatuses, statusOf, withStatus } from './status'
import type { Material, MaterialPart, StudyNote } from './types'

const material = (over: Partial<Material> = {}): Material => ({
  book_id: null,
  target: null,
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
  started: false,
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

  // Закрывает кнопка, а не подсчёт: иначе закрытое подсчётом нельзя было бы
  // вернуть в работу.
  it('все лекции отмечены — всё ещё в работе, пока не завершили', () => {
    expect(statusOf(course, [part({ done: true }), part({ sort: 1, done: true })], [])).toBe('active')
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

  it('последняя страница — в работе, пока не завершили', () => {
    expect(statusOf({ ...book, page_current: 300 }, [], [])).toBe('active')
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

  // «Взять в работу» и выбор фокусом пишут `active` — это решение, и подсчёт
  // его не отменяет.
  it('взятое в работу явно остаётся в работе и без сделанного', () => {
    const taken = material({ kind: 'course', status: 'active' })
    expect(statusOf(taken, [part(), part({ sort: 1 })], [])).toBe('active')
  })

  it('возвращённое в работу не закрывается подсчётом обратно', () => {
    const reopened = material({ kind: 'course', status: 'active' })
    expect(statusOf(reopened, [part({ done: true })], [])).toBe('active')
  })
})

describe('statusOf: практика', () => {
  const practice = material({ kind: 'practice', scale: 'minutes', target: 600 })

  it('без занятий — очередь', () => {
    expect(statusOf(practice, [], [])).toBe('backlog')
  })

  it('с занятием — работа', () => {
    expect(statusOf(practice, [], [{ material_id: 'm1' }])).toBe('active')
  })
})

describe('finishedByCount', () => {
  it('курс со всеми отмеченными лекциями', () => {
    const course = material({ kind: 'course' })
    expect(finishedByCount(course, [part({ done: true })], 0)).toBe(true)
    expect(finishedByCount(course, [part({ done: true }), part({ sort: 1 })], 0)).toBe(false)
    expect(finishedByCount(course, [], 0)).toBe(false)
  })

  it('книга на последней странице', () => {
    const book = material({ kind: 'book', scale: 'pages', pages_total: 300, page_current: 300 })
    expect(finishedByCount(book, [], 0)).toBe(true)
    expect(finishedByCount({ ...book, pages_total: null }, [], 0)).toBe(false)
  })

  it('практика с набранной целью; без цели не заканчивается никогда', () => {
    const practice = material({ kind: 'practice', scale: 'times', target: 10 })
    expect(finishedByCount(practice, [], 10)).toBe(true)
    expect(finishedByCount(practice, [], 9)).toBe(false)
    expect(finishedByCount({ ...practice, target: null }, [], 999)).toBe(false)
  })

  it('статью подсчётом не закрыть', () => {
    expect(finishedByCount(material({ kind: 'article' }), [], 0)).toBe(false)
  })
})

describe('settleStatuses', () => {
  it('пройденное подсчётом закрывается', () => {
    const course = material({ kind: 'course', status: 'backlog' })
    const [got] = settleStatuses([course], [part({ done: true })], [])
    expect(got.status).toBe('done')
  })

  // Хранимый `active` из времён ручного статуса прежнее правило не замечало,
  // и на экране такой материал стоял в бэклоге. Там он и остаётся.
  it('давний «в работе» без следов возвращается в бэклог', () => {
    const stale = material({ kind: 'article', status: 'active' })
    expect(settleStatuses([stale], [], [])[0].status).toBe('backlog')
  })

  it('«в работе» со следами остаётся', () => {
    const live = material({ kind: 'article', status: 'active' })
    expect(settleStatuses([live], [], [note()])[0].status).toBe('active')
  })

  it('завершённое не трогается', () => {
    const done = material({ kind: 'course', status: 'done' })
    expect(settleStatuses([done], [part()], [])[0].status).toBe('done')
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
