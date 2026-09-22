import { describe, expect, it } from 'vitest'
import { notesOfStream } from './notes'
import type { Material, StudyNote } from './types'

const material = (id: string, streamId: string): Material => ({
  id,
  stream_id: streamId,
  title: id,
  kind: 'book',
  author: null,
  url: null,
  status: 'active',
  cover_url: null,
  scale: null,
  pages_total: null,
  page_current: null,
  sort: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
})

const note = (id: string, materialId: string): StudyNote => ({
  id,
  material_id: materialId,
  part: null,
  title: null,
  body: '',
  tags: [],
  date: '2026-09-21',
  sort: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
})

describe('notesOfStream', () => {
  it('исключает конспекты чужого потока', () => {
    const materials = [material('m1', 's1'), material('m2', 's2')]
    const notes = [note('n1', 'm1'), note('n2', 'm2')]
    expect(notesOfStream(materials, notes, 's1').map((n) => n.id)).toEqual(['n1'])
  })

  it('исключает конспект материала, которого больше нет', () => {
    const materials = [material('m1', 's1')]
    const notes = [note('n1', 'm1'), note('n2', 'ghost')]
    expect(notesOfStream(materials, notes, 's1').map((n) => n.id)).toEqual(['n1'])
  })

  it('пустой поток даёт пустой список', () => {
    expect(notesOfStream([], [], 's1')).toEqual([])
  })
})
