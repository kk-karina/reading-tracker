import { describe, expect, it } from 'vitest'
import {
  canComplete,
  canMove,
  canUndo,
  currentStep,
  doneCount,
  isFinal,
  nextSort,
  pickCheer,
  reorder,
  stepsOf,
} from './steps'
import type { StreamStep } from './types'

const step = (over: Partial<StreamStep>): StreamStep => ({
  id: 'x',
  stream_id: 's1',
  title: '',
  prize: '',
  wish: '',
  image: null,
  sort: 0,
  done_on: null,
  created_at: '2026-10-01T00:00:00.000Z',
  ...over,
})

/** Пять шагов, первый закрыт. */
const ladder = () =>
  ['a', 'b', 'c', 'd', 'e'].map((id, i) => step({ id, sort: i, done_on: i === 0 ? '2026-10-12' : null }))

describe('stepsOf', () => {
  it('берёт шаги своего потока по порядку', () => {
    const list = stepsOf(
      [step({ id: 'b', sort: 1 }), step({ id: 'o', stream_id: 's2' }), step({ id: 'a', sort: 0 })],
      's1',
    )
    expect(list.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('при одинаковом sort ставит раньше заведённый', () => {
    const list = stepsOf(
      [step({ id: 'late', created_at: '2026-10-02T00:00:00Z' }), step({ id: 'early', created_at: '2026-10-01T00:00:00Z' })],
      's1',
    )
    expect(list.map((x) => x.id)).toEqual(['early', 'late'])
  })
})

describe('текущий и главный', () => {
  it('текущий — первый незакрытый', () => {
    expect(currentStep(ladder())?.id).toBe('b')
    expect(doneCount(ladder())).toBe(1)
  })

  it('все закрыты — текущего нет', () => {
    expect(currentStep(ladder().map((x) => ({ ...x, done_on: '2026-10-20' })))).toBeNull()
  })

  it('главный — последний по порядку', () => {
    expect(isFinal(ladder(), 'e')).toBe(true)
    expect(isFinal(ladder(), 'd')).toBe(false)
    expect(isFinal([], 'e')).toBe(false)
  })
})

describe('закрыть и снять', () => {
  it('закрыть можно только текущий', () => {
    expect(canComplete(ladder(), 'b')).toBe(true)
    expect(canComplete(ladder(), 'c')).toBe(false)
    expect(canComplete(ladder(), 'a')).toBe(false)
  })

  it('снять можно только у последнего закрытого', () => {
    const two = ladder().map((x, i) => ({ ...x, done_on: i < 2 ? '2026-10-12' : null }))
    expect(canUndo(two, 'b')).toBe(true)
    expect(canUndo(two, 'a')).toBe(false)
    expect(canUndo(two, 'c')).toBe(false)
  })
})

describe('перестановка', () => {
  it('не поднимает выше пройденных и не двигает их', () => {
    expect(canMove(ladder(), 3, 0)).toBe(false)
    expect(canMove(ladder(), 0, 2)).toBe(false)
    expect(canMove(ladder(), 3, 1)).toBe(true)
  })

  it('пишет sort только сдвинутым', () => {
    expect(reorder(ladder(), 3, 1)).toEqual([
      { id: 'd', sort: 1 },
      { id: 'b', sort: 2 },
      { id: 'c', sort: 3 },
    ])
  })

  it('запрещённое — пусто', () => {
    expect(reorder(ladder(), 3, 0)).toEqual([])
    expect(reorder(ladder(), 2, 2)).toEqual([])
  })

  it('новый шаг встаёт в конец', () => {
    expect(nextSort(ladder())).toBe(5)
    expect(nextSort([])).toBe(0)
  })
})

describe('pickCheer', () => {
  it('не повторяет прошлый подряд', () => {
    for (let r = 0; r < 1; r += 0.05) expect(pickCheer(10, 3, r, false)).not.toBe(3)
  })

  it('покрывает все, кроме прошлого', () => {
    const seen = new Set<number | null>()
    for (let r = 0; r < 1; r += 0.01) seen.add(pickCheer(4, 1, r, false))
    expect([...seen].sort()).toEqual([0, 2, 3])
  })

  it('у последнего шага — свой', () => {
    expect(pickCheer(10, 3, 0.5, true)).toBeNull()
  })
})
