import { describe, expect, it } from 'vitest'
import { materialProgress, noteCount, weekNotes } from './metrics'
import type { Material, MaterialPart, StudyNote } from './types'

const material = (over: Partial<Material> = {}): Material => ({
  id: 'm1',
  stream_id: 'c1',
  title: 'Книга',
  kind: 'book',
  author: null,
  url: null,
  status: 'active',
  cover_url: null,
  scale: 'pages',
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
  title: 'Глава',
  done: false,
  sort: 0,
  ...over,
})

const note = (over: Partial<StudyNote> = {}): StudyNote => ({
  id: crypto.randomUUID(),
  material_id: 'm1',
  part: null,
  title: null,
  body: '',
  tags: [],
  date: '2026-09-21',
  sort: 0,
  created_at: '',
  updated_at: '',
  ...over,
})

describe('materialProgress: статья и видео', () => {
  it('непрочитанная статья — ноль из одного', () => {
    expect(materialProgress(material({ kind: 'article', scale: null }), [])).toEqual({
      done: 0,
      total: 1,
      percent: 0,
      unit: 'flag',
    })
  })

  it('прочитанная статья — сто процентов', () => {
    const m = material({ kind: 'article', scale: null, status: 'done' })
    expect(materialProgress(m, [])).toEqual({ done: 1, total: 1, percent: 100, unit: 'flag' })
  })

  it('видео меряется тем же тумблером', () => {
    const m = material({ kind: 'video', scale: null, status: 'done' })
    expect(materialProgress(m, []).percent).toBe(100)
  })

  it('брошенная статья прочитанной не считается', () => {
    const m = material({ kind: 'article', scale: null, status: 'dropped' })
    expect(materialProgress(m, []).done).toBe(0)
  })
})

describe('materialProgress: книга по главам и курс', () => {
  const byParts = material({ kind: 'book', scale: 'parts' })

  it('без единой части мерить нечем', () => {
    expect(materialProgress(byParts, [])).toEqual({
      done: 0,
      total: null,
      percent: null,
      unit: 'part',
    })
  })

  it('считает отмеченные из всех', () => {
    const parts = [part({ done: true }), part({ done: true }), part(), part()]
    expect(materialProgress(byParts, parts)).toEqual({
      done: 2,
      total: 4,
      percent: 50,
      unit: 'part',
    })
  })

  it('берёт только части своего материала', () => {
    const parts = [part({ done: true }), part({ material_id: 'чужой', done: true })]
    expect(materialProgress(byParts, parts)).toEqual({
      done: 1,
      total: 1,
      percent: 100,
      unit: 'part',
    })
  })

  it('у курса то же правило', () => {
    const course = material({ kind: 'course', scale: null })
    expect(materialProgress(course, [part({ done: true }), part()]).percent).toBe(50)
  })

  it('конспект больше не значит «пройдено»', () => {
    const parts = [part(), part()]
    expect(materialProgress(byParts, parts).done).toBe(0)
  })
})

describe('materialProgress: книга по страницам', () => {
  it('без числа страниц мерить нечем', () => {
    expect(materialProgress(material({ page_current: 40 }), [])).toEqual({
      done: 40,
      total: null,
      percent: null,
      unit: 'page',
    })
  })

  it('считает проценты по текущей странице', () => {
    const m = material({ pages_total: 320, page_current: 160 })
    expect(materialProgress(m, [])).toEqual({ done: 160, total: 320, percent: 50, unit: 'page' })
  })

  it('не начатая книга — ноль, а не пусто', () => {
    const m = material({ pages_total: 320 })
    expect(materialProgress(m, [])).toEqual({ done: 0, total: 320, percent: 0, unit: 'page' })
  })

  it('страница за пределами книги не даёт больше ста процентов', () => {
    const m = material({ pages_total: 300, page_current: 400 })
    expect(materialProgress(m, [])).toEqual({ done: 300, total: 300, percent: 100, unit: 'page' })
  })

  it('ноль страниц всего не делит на ноль', () => {
    expect(materialProgress(material({ pages_total: 0, page_current: 5 }), []).percent).toBe(null)
  })
})

describe('noteCount', () => {
  it('считает конспекты только своего материала', () => {
    expect(noteCount('m1', [note(), note(), note({ material_id: 'другой' })])).toBe(2)
  })
})

describe('weekNotes', () => {
  const TODAY = '2026-09-21'

  it('считает ноль на пустом списке', () => {
    expect(weekNotes([], TODAY)).toEqual({ count: 0, days: 0 })
  })

  it('считает конспекты и отдельно дни, в которые они написаны', () => {
    const got = weekNotes(
      [note({ date: '2026-09-21' }), note({ date: '2026-09-21' }), note({ date: '2026-09-18' })],
      TODAY,
    )
    expect(got).toEqual({ count: 3, days: 2 })
  })

  it('берёт ровно семь дней, считая сегодняшний', () => {
    expect(weekNotes([note({ date: '2026-09-15' })], TODAY)).toEqual({ count: 1, days: 1 })
  })

  it('не берёт восьмой день назад', () => {
    expect(weekNotes([note({ date: '2026-09-14' })], TODAY)).toEqual({ count: 0, days: 0 })
  })

  it('не берёт даты из будущего', () => {
    expect(weekNotes([note({ date: '2026-09-22' })], TODAY)).toEqual({ count: 0, days: 0 })
  })
})
