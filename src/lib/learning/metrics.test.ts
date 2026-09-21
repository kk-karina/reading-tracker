import { describe, expect, it } from 'vitest'
import { materialProgress } from './metrics'
import type { Material, StudyNote } from './types'

const material = (over: Partial<Material> = {}): Material => ({
  id: 'm1',
  category_id: 'c1',
  title: 'Книга',
  kind: 'book',
  author: null,
  url: null,
  status: 'active',
  parts_total: null,
  sort: 0,
  created_at: '',
  updated_at: '',
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

describe('materialProgress', () => {
  it('без конспектов — ноль', () => {
    expect(materialProgress(material(), [])).toEqual({ done: 0, total: null, percent: null })
  })

  it('считает конспекты только своего материала', () => {
    const notes = [note(), note(), note({ material_id: 'другой' })]
    expect(materialProgress(material(), notes).done).toBe(2)
  })

  it('с известным числом глав даёт проценты', () => {
    expect(materialProgress(material({ parts_total: 41 }), [note(), note()])).toEqual({
      done: 2,
      total: 41,
      percent: 5,
    })
  })

  it('не даёт больше ста процентов, если конспектов больше глав', () => {
    expect(materialProgress(material({ parts_total: 2 }), [note(), note(), note()]).percent).toBe(
      100,
    )
  })

  it('ноль глав не делит на ноль', () => {
    expect(materialProgress(material({ parts_total: 0 }), [note()]).percent).toBe(null)
  })
})
