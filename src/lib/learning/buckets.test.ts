import { describe, expect, it } from 'vitest'
import { focusOf, materialCounts, materialsOf, sourceOrder, studying } from './buckets'
import type { Material, MaterialStatus } from './types'

const make = (id: string, stream_id: string, status: MaterialStatus): Material => ({
  book_id: null,
  id, stream_id, title: id, kind: 'book', author: null, url: null,
  status, cover_url: null, scale: null, pages_total: null, page_current: null, sort: 0,
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
})

const ALL = [
  make('a', 's1', 'active'),
  make('b', 's1', 'backlog'),
  make('c', 's1', 'backlog'),
  make('d', 's1', 'backlog'),
  make('e', 's1', 'done'),
  make('f', 's1', 'done'),
  make('g', 's2', 'active'),
]

describe('studying', () => {
  it('берёт только материалы в работе своего потока', () => {
    expect(studying(ALL, 's1').map((m) => m.id)).toEqual(['a'])
  })

  it('возвращает пусто, когда в работе ничего нет', () => {
    expect(studying(ALL, 's3')).toEqual([])
  })
})

describe('materialsOf', () => {
  it('«на изучении» — только то, за чем сидят', () => {
    expect(materialsOf(ALL, 's1', 'active').map((m) => m.id)).toEqual(['a'])
  })

  it('«бэклог» — всё, что ждёт', () => {
    expect(materialsOf(ALL, 's1', 'backlog').map((m) => m.id)).toEqual(['b', 'c', 'd'])
  })

  it('не показывает в бэклоге то, за чем сидят', () => {
    expect(materialsOf(ALL, 's1', 'backlog').map((m) => m.id)).not.toContain('a')
  })

  it('«изучены» забирает и брошенное: оно тоже позади', () => {
    expect(materialsOf(ALL, 's1', 'done').map((m) => m.id)).toEqual(['e', 'f'])
  })

  it('не путает потоки', () => {
    expect(materialsOf(ALL, 's2', 'active').map((m) => m.id)).toEqual(['g'])
  })
})

describe('materialCounts', () => {
  it('считает все три среза', () => {
    expect(materialCounts(ALL, 's1')).toEqual({ active: 1, backlog: 3, done: 2 })
  })

  it('даёт нули пустому потоку', () => {
    expect(materialCounts(ALL, 's3')).toEqual({ active: 0, backlog: 0, done: 0 })
  })
})

describe('sourceOrder', () => {
  const sorted = (id: string, stream_id: string, status: MaterialStatus, sort: number) => ({
    ...make(id, stream_id, status),
    sort,
  })

  it('ставит фокус первым, потом работу, потом очередь, потом архив', () => {
    expect(sourceOrder(ALL, 's1', 'd').map((m) => m.id)).toEqual(['d', 'a', 'b', 'c', 'e', 'f'])
  })

  it('без фокуса начинает с того, за чем сидят', () => {
    expect(sourceOrder(ALL, 's1', null).map((m) => m.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('не берёт чужой поток — и чужой фокус тоже', () => {
    expect(sourceOrder(ALL, 's2', 'a').map((m) => m.id)).toEqual(['g'])
  })

  it('внутри группы держит порядок материала', () => {
    const many = [
      sorted('x', 's1', 'backlog', 2),
      sorted('y', 's1', 'backlog', 0),
      sorted('z', 's1', 'backlog', 1),
    ]
    expect(sourceOrder(many, 's1', null).map((m) => m.id)).toEqual(['y', 'z', 'x'])
  })

  it('переживает протухший фокус', () => {
    expect(sourceOrder(ALL, 's1', 'gone').map((m) => m.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })
})

describe('focusOf', () => {
  it('находит материал по указателю потока', () => {
    expect(focusOf(ALL, 'a')?.id).toBe('a')
  })

  it('протухший указатель не находит ничего', () => {
    expect(focusOf(ALL, 'нет такого')).toBeUndefined()
  })

  it('пустой указатель не находит ничего', () => {
    expect(focusOf(ALL, null)).toBeUndefined()
  })

  // Статус больше не ставят руками, и момента «ушёл из работы — слетел фокус»
  // не существует. Пройденный перестаёт быть фокусом при чтении.
  it('пройденный материал фокусом не считается', () => {
    expect(focusOf(ALL, 'e')).toBeUndefined()
  })
})
