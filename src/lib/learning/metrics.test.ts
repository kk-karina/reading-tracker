import { describe, expect, it } from 'vitest'
import {
  barWidth,
  doneAfterPart,
  lastNoteDate,
  materialProgress,
  remainingOf,
  weekNotes,
} from './metrics'
import type { Material, MaterialPart, StudyNote } from './types'

/** Тот же порог, что в metrics: ниже него полоса читается как пустая. */
const MIN_BAR = 3

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
  part_id: null,
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

describe('doneAfterPart', () => {
  const p = (done: number, total: number | null) => ({
    done,
    total,
    percent: null,
    unit: 'part' as const,
  })

  it('отметить непройденную главу — станет на одну больше', () => {
    expect(doneAfterPart(p(3, 12), false, true)).toBe(4)
  })

  it('снять отметку с пройденной — станет на одну меньше', () => {
    expect(doneAfterPart(p(3, 12), true, false)).toBe(2)
  })

  it('галочку не трогали — число не меняется', () => {
    expect(doneAfterPart(p(3, 12), true, true)).toBe(3)
    expect(doneAfterPart(p(3, 12), false, false)).toBe(3)
  })

  it('ниже нуля не уходит', () => {
    expect(doneAfterPart(p(0, 12), true, false)).toBe(0)
  })

  it('выше общего числа не поднимается', () => {
    expect(doneAfterPart(p(12, 12), false, true)).toBe(12)
  })

  it('без общего числа растёт свободно', () => {
    expect(doneAfterPart(p(3, null), false, true)).toBe(4)
  })
})

describe('remainingOf', () => {
  const p = (done: number, total: number | null, unit: 'page' | 'part' | 'flag' = 'part') => ({
    done,
    total,
    percent: null,
    unit,
  })

  it('считает, сколько осталось до конца', () => {
    expect(remainingOf(p(4, 12))).toBe(8)
  })

  it('пройденное целиком не оставляет остатка', () => {
    expect(remainingOf(p(12, 12))).toBe(0)
  })

  it('мерить нечем — остатка нет', () => {
    expect(remainingOf(p(4, null))).toBe(null)
  })

  it('у статьи и видео остатка не бывает', () => {
    expect(remainingOf(p(0, 1, 'flag'))).toBe(null)
  })

  it('перелёт за конец не уходит в минус', () => {
    expect(remainingOf(p(14, 12))).toBe(0)
  })
})

describe('lastNoteDate', () => {
  it('без конспектов даты нет', () => {
    expect(lastNoteDate('m1', [])).toBe(null)
  })

  it('берёт самую позднюю дату', () => {
    const notes = [note({ date: '2026-09-14' }), note({ date: '2026-09-21' }), note({ date: '2026-09-18' })]
    expect(lastNoteDate('m1', notes)).toBe('2026-09-21')
  })

  it('чужие конспекты не в счёт', () => {
    const notes = [note({ date: '2026-09-14' }), note({ material_id: 'другой', date: '2026-09-30' })]
    expect(lastNoteDate('m1', notes)).toBe('2026-09-14')
  })
})

describe('barWidth', () => {
  it('мерить нечем — ширины нет', () => {
    expect(barWidth(null)).toBe(null)
  })

  it('едва начатое видно глазом, а не только числом', () => {
    expect(barWidth(2)).toBe(MIN_BAR)
    expect(barWidth(1)).toBe(MIN_BAR)
  })

  it('нетронутое остаётся пустым', () => {
    expect(barWidth(0)).toBe(0)
  })

  it('дальше порога ширина своя', () => {
    expect(barWidth(8)).toBe(8)
    expect(barWidth(100)).toBe(100)
  })
})
