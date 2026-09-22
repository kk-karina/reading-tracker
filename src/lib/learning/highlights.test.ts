import { describe, expect, it } from 'vitest'
import { extractHighlights, thoughtOfWeek } from './highlights'
import type { StudyNote } from './types'

const note = (over: Partial<StudyNote> = {}): StudyNote => ({
  id: 'n1',
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

describe('extractHighlights', () => {
  it('возвращает пусто, когда выделений нет', () => {
    expect(extractHighlights([note({ body: 'обычный текст' })])).toEqual([])
  })

  it('достаёт выделение вместе со ссылкой на конспект и материал', () => {
    const got = extractHighlights([
      note({ id: 'n7', material_id: 'm3', body: 'до ==главная мысль== после' }),
    ])
    expect(got).toEqual([{ text: 'главная мысль', noteId: 'n7', materialId: 'm3' }])
  })

  it('достаёт несколько выделений из одного конспекта в порядке текста', () => {
    const got = extractHighlights([note({ body: '==первое== и ==второе==' })])
    expect(got.map((h) => h.text)).toEqual(['первое', 'второе'])
  })

  it('пропускает пустое выделение', () => {
    expect(extractHighlights([note({ body: 'а ==== б' })])).toEqual([])
  })

  it('обрезает пробелы по краям выделения', () => {
    expect(extractHighlights([note({ body: '==  с пробелами  ==' })])[0].text).toBe('с пробелами')
  })

  it('не переносит выделение через строку', () => {
    expect(extractHighlights([note({ body: '==начало\nконец==' })])).toEqual([])
  })
})

describe('thoughtOfWeek', () => {
  const list = extractHighlights([note({ body: '==раз== ==два== ==три==' })])

  it('возвращает null, когда выделять нечего', () => {
    expect(thoughtOfWeek([], '2026-09-21')).toBeNull()
  })

  it('не меняет выбор внутри одной недели', () => {
    const mon = thoughtOfWeek(list, '2026-09-21')
    const sun = thoughtOfWeek(list, '2026-09-27')
    expect(mon).toEqual(sun)
  })

  it('меняет выбор на следующей неделе', () => {
    const thisWeek = thoughtOfWeek(list, '2026-09-21')
    const nextWeek = thoughtOfWeek(list, '2026-09-28')
    expect(thisWeek).not.toEqual(nextWeek)
  })

  it('выбирает единственное выделение, сколько бы недель ни прошло', () => {
    const one = extractHighlights([note({ body: '==одно==' })])
    expect(thoughtOfWeek(one, '2026-09-21')).toEqual(one[0])
    expect(thoughtOfWeek(one, '2027-03-02')).toEqual(one[0])
  })
})
