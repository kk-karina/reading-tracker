import { describe, expect, it } from 'vitest'
import { hasParts, partLabel, partWord, partsOf, pickDefaultPart, planParts } from './parts'
import type { MaterialPart, StudyNote } from './types'

const part = (over: Partial<MaterialPart> = {}): MaterialPart => ({
  id: crypto.randomUUID(),
  material_id: 'm1',
  title: 'Глава',
  done: false,
  sort: 0,
  ...over,
})

describe('hasParts', () => {
  it('у курса части есть всегда', () => {
    expect(hasParts({ kind: 'course', scale: null })).toBe(true)
  })

  it('у книги — только когда считаем по главам', () => {
    expect(hasParts({ kind: 'book', scale: 'parts' })).toBe(true)
    expect(hasParts({ kind: 'book', scale: 'pages' })).toBe(false)
  })

  it('у статьи и видео частей нет', () => {
    expect(hasParts({ kind: 'article', scale: null })).toBe(false)
    expect(hasParts({ kind: 'video', scale: null })).toBe(false)
  })
})

describe('partWord', () => {
  it('у курса лекции, у книги главы', () => {
    expect(partWord('course')).toBe('lecture')
    expect(partWord('book')).toBe('chapter')
  })
})

describe('partsOf', () => {
  it('берёт только свои и ставит по порядку', () => {
    const list = [
      part({ id: 'b', sort: 1 }),
      part({ id: 'x', material_id: 'другой', sort: 0 }),
      part({ id: 'a', sort: 0 }),
    ]
    expect(partsOf(list, 'm1').map((p) => p.id)).toEqual(['a', 'b'])
  })
})

describe('planParts', () => {
  it('на пустом списке заводит нужное число мест', () => {
    expect(planParts([], 3)).toEqual({
      add: [{ sort: 0 }, { sort: 1 }, { sort: 2 }],
      remove: [],
      losesDone: false,
    })
  })

  it('дописывает в конец и не трогает существующие', () => {
    const have = [part({ id: 'a', sort: 0 }), part({ id: 'b', sort: 1 })]
    expect(planParts(have, 4)).toEqual({
      add: [{ sort: 2 }, { sort: 3 }],
      remove: [],
      losesDone: false,
    })
  })

  it('на том же числе не делает ничего', () => {
    const have = [part({ id: 'a', sort: 0 }), part({ id: 'b', sort: 1 })]
    expect(planParts(have, 2)).toEqual({ add: [], remove: [], losesDone: false })
  })

  it('снимает лишние с конца, а не с начала', () => {
    const have = [part({ id: 'a', sort: 0 }), part({ id: 'b', sort: 1 }), part({ id: 'c', sort: 2 })]
    expect(planParts(have, 1).remove).toEqual(['b', 'c'])
  })

  it('снимает с конца по порядку sort, а не по порядку в массиве', () => {
    const have = [part({ id: 'c', sort: 2 }), part({ id: 'a', sort: 0 }), part({ id: 'b', sort: 1 })]
    expect(planParts(have, 1).remove).toEqual(['b', 'c'])
  })

  it('предупреждает, когда среди уходящих есть отмеченные', () => {
    const have = [part({ id: 'a', sort: 0 }), part({ id: 'b', sort: 1, done: true })]
    expect(planParts(have, 1).losesDone).toBe(true)
  })

  it('молчит, когда уходящие пусты', () => {
    const have = [part({ id: 'a', sort: 0, done: true }), part({ id: 'b', sort: 1 })]
    expect(planParts(have, 1).losesDone).toBe(false)
  })

  it('ноль убирает всё', () => {
    const have = [part({ id: 'a', sort: 0 })]
    expect(planParts(have, 0).remove).toEqual(['a'])
  })

  it('мусор вместо числа не роняет и читается как ноль', () => {
    const have = [part({ id: 'a', sort: 0 })]
    expect(planParts(have, Number.NaN).remove).toEqual(['a'])
    expect(planParts(have, -5).remove).toEqual(['a'])
  })

  it('дробное число не создаёт дробных частей', () => {
    expect(planParts([], 2.7).add).toHaveLength(2)
  })
})

describe('partLabel', () => {
  const fallback = (n: number) => `Глава ${n}`

  it('безымянная часть зовётся своим номером по порядку', () => {
    expect(partLabel(part({ title: '' }), 0, fallback)).toBe('Глава 1')
    expect(partLabel(part({ title: '' }), 4, fallback)).toBe('Глава 5')
  })

  it('переименованная сохраняет имя', () => {
    expect(partLabel(part({ title: 'Привычки' }), 4, fallback)).toBe('Привычки')
  })

  it('имя из одних пробелов считается пустым', () => {
    expect(partLabel(part({ title: '   ' }), 1, fallback)).toBe('Глава 2')
  })

  it('номер идёт от места в списке, а не от поля sort', () => {
    expect(partLabel(part({ title: '', sort: 99 }), 1, fallback)).toBe('Глава 2')
  })
})

const note = (over: Partial<StudyNote> = {}): StudyNote => ({
  id: crypto.randomUUID(),
  material_id: 'm1',
  part: null,
  part_id: null,
  title: null,
  body: '',
  tags: [],
  date: '2026-09-23',
  sort: 0,
  created_at: '',
  updated_at: '',
  ...over,
})

describe('pickDefaultPart', () => {
  it('на пустом списке частей выбирать нечего', () => {
    expect(pickDefaultPart([], [])).toBe(null)
  })

  it('берёт начатую — ту, по которой есть конспект, но отметки нет', () => {
    const one = part({ id: 'p1', done: true, sort: 0 })
    const two = part({ id: 'p2', sort: 1 })
    const three = part({ id: 'p3', sort: 2 })
    const notes = [note({ part_id: 'p2' })]

    expect(pickDefaultPart([one, two, three], notes)).toBe(two)
  })

  it('начатая важнее непройденной, даже если стоит позже', () => {
    const one = part({ id: 'p1', sort: 0 })
    const two = part({ id: 'p2', sort: 1 })
    const notes = [note({ part_id: 'p2' })]

    expect(pickDefaultPart([one, two], notes)).toBe(two)
  })

  it('без начатых берёт первую непройденную', () => {
    const one = part({ id: 'p1', done: true, sort: 0 })
    const two = part({ id: 'p2', sort: 1 })
    const three = part({ id: 'p3', sort: 2 })

    expect(pickDefaultPart([one, two, three], [])).toBe(two)
  })

  it('когда всё пройдено, открывается последняя', () => {
    const one = part({ id: 'p1', done: true, sort: 0 })
    const two = part({ id: 'p2', done: true, sort: 1 })

    expect(pickDefaultPart([one, two], [])).toBe(two)
  })

  it('конспект чужой части начатой её не делает', () => {
    const one = part({ id: 'p1', sort: 0 })
    const two = part({ id: 'p2', sort: 1 })
    const notes = [note({ part_id: 'other' })]

    expect(pickDefaultPart([one, two], notes)).toBe(one)
  })

  it('порядок берётся из sort, а не из того, как список пришёл', () => {
    const one = part({ id: 'p1', sort: 0 })
    const two = part({ id: 'p2', sort: 1 })

    expect(pickDefaultPart([two, one], [])).toBe(one)
  })
})
