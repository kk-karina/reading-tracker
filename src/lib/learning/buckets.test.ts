import { describe, expect, it } from 'vitest'
import { backlog, backlogCounts, studying } from './buckets'
import type { Material, MaterialStatus } from './types'

const make = (id: string, stream_id: string, status: MaterialStatus): Material => ({
  id, stream_id, title: id, kind: 'book', author: null, url: null,
  status, cover_url: null, scale: null, pages_total: null, page_current: null, sort: 0,
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
})

const ALL = [
  make('a', 's1', 'active'),
  make('b', 's1', 'inbox'),
  make('c', 's1', 'someday'),
  make('d', 's1', 'reference'),
  make('e', 's1', 'done'),
  make('f', 's1', 'dropped'),
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

describe('backlog', () => {
  it('раскладывает по вкладкам', () => {
    expect(backlog(ALL, 's1', 'inbox').map((m) => m.id)).toEqual(['b'])
    expect(backlog(ALL, 's1', 'someday').map((m) => m.id)).toEqual(['c'])
    expect(backlog(ALL, 's1', 'reference').map((m) => m.id)).toEqual(['d'])
  })

  it('складывает пройденное и брошенное в архив', () => {
    expect(backlog(ALL, 's1', 'archive').map((m) => m.id)).toEqual(['e', 'f'])
  })

  it('не показывает материал в работе ни на одной вкладке', () => {
    const everywhere = (['inbox', 'someday', 'reference', 'archive'] as const)
      .flatMap((tab) => backlog(ALL, 's1', tab).map((m) => m.id))
    expect(everywhere).not.toContain('a')
  })
})

describe('backlogCounts', () => {
  it('считает по всем вкладкам сразу', () => {
    expect(backlogCounts(ALL, 's1')).toEqual({ inbox: 1, someday: 1, reference: 1, archive: 2 })
  })

  it('даёт нули пустому потоку', () => {
    expect(backlogCounts(ALL, 's3')).toEqual({ inbox: 0, someday: 0, reference: 0, archive: 0 })
  })
})
