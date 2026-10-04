import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyLearning, type LearningSnapshot, type Stream } from '../types'
import { carried, carryOver, markCarried, worthCarrying } from './carry'

/** Node без DOM: своё хранилище, чтобы отметка о переносе ни от чего не зависела. */
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  get length() {
    return this.map.size
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage() as unknown as Storage
})

interface Call {
  table: string
  op: 'insert' | 'update' | 'select'
  payload?: unknown
}

function fakeClient(fail?: (call: Call) => boolean) {
  const calls: Call[] = []
  const from = (table: string) => {
    const call: Call = { table, op: 'select' }
    let recorded = false
    const node: unknown = new Proxy(
      {},
      {
        get(_t, prop) {
          if (typeof prop === 'symbol') return undefined
          if (prop === 'then') {
            if (!recorded) {
              calls.push(call)
              recorded = true
            }
            return (resolve: (a: unknown) => unknown, reject: (e: unknown) => unknown) =>
              Promise.resolve()
                .then(() =>
                  fail?.(call)
                    ? { data: null, error: { message: `отказ на ${call.table}` } }
                    : { data: [], error: null },
                )
                .then(resolve, reject)
          }
          return (...args: unknown[]) => {
            if (prop === 'insert' || prop === 'update') {
              call.op = prop
              call.payload = args[0]
            }
            return node
          }
        },
      },
    )
    return node
  }
  return { sb: { from } as unknown as SupabaseClient, calls }
}

const stream = (over: Partial<Stream> & { id: string }): Stream => ({
  slug: over.id,
  name: 'Поток',
  accent: null,
  goal: null,
  focus_material_id: null,
  outline: null,
  sort: 0,
  archived: false,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  ...over,
})

function local(): LearningSnapshot {
  return {
    streams: [stream({ id: 's1', focus_material_id: 'm1' })],
    materials: [
      {
        id: 'm1',
        book_id: null,
        stream_id: 's1',
        title: 'Книга',
        kind: 'book',
        author: null,
        url: null,
        status: 'active',
        cover_url: null,
        scale: 'parts',
        pages_total: null,
        page_current: null,
        sort: 0,
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-01T00:00:00.000Z',
      },
    ],
    parts: [{ id: 'p1', material_id: 'm1', title: '', done: true, sort: 0 }],
    sessions: [],
    notes: [
      {
        id: 'n1',
        material_id: 'm1',
        session_id: null,
        part_id: 'p1',
        part: null,
        title: null,
        body: 'тело',
        tags: ['idea'],
        date: '2026-09-01',
        sort: 0,
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-01T00:00:00.000Z',
      },
    ],
  }
}

describe('когда переносить', () => {
  it('облако пусто, локально есть — да', () => {
    expect(worthCarrying(emptyLearning(), local())).toBe(true)
  })

  it('в облаке уже есть поток — нет: это не слияние', () => {
    expect(worthCarrying(local(), local())).toBe(false)
  })

  it('локально пусто — нечего', () => {
    expect(worthCarrying(emptyLearning(), emptyLearning())).toBe(false)
  })

  it('отметка ставится на аккаунт: тот же браузер под другим входом переносит заново', () => {
    expect(carried('user-1')).toBe(false)
    markCarried('user-1')
    expect(carried('user-1')).toBe(true)
    expect(carried('user-2')).toBe(false)
  })
})

describe('порядок переноса', () => {
  it('потоки, материалы, части, конспекты — и фокус вторым проходом', async () => {
    const { sb, calls } = fakeClient()
    await carryOver(sb, local())

    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual([
      'streams:insert',
      'materials:insert',
      'material_parts:insert',
      'study_notes:insert',
      'streams:update',
    ])
  })

  it('поток едет без фокуса: материала, на который он указывает, ещё нет', async () => {
    const { sb, calls } = fakeClient()
    await carryOver(sb, local())

    const inserted = calls[0].payload as { id: string; focus_material_id: string | null }[]
    expect(inserted[0].focus_material_id).toBeNull()
    // Адрес и идентификатор переезжают как есть: ссылки перекладывать не нужно.
    expect(inserted[0].id).toBe('s1')
    expect(calls[4].payload).toMatchObject({ focus_material_id: 'm1' })
  })

  it('без фокуса второго прохода не бывает', async () => {
    const snap = local()
    snap.streams[0].focus_material_id = null
    const { sb, calls } = fakeClient()
    await carryOver(sb, snap)

    expect(calls.map((c) => `${c.table}:${c.op}`)).not.toContain('streams:update')
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(0)
  })

  it('пустые коллекции не порождают запросов', async () => {
    const snap = emptyLearning()
    snap.streams = [stream({ id: 's1' })]
    const { sb, calls } = fakeClient()
    await carryOver(sb, snap)

    expect(calls.map((c) => c.table)).toEqual(['streams'])
  })

  it('отказ посреди переноса не выдаётся за успех', async () => {
    const { sb } = fakeClient((c) => c.table === 'material_parts')
    await expect(carryOver(sb, local())).rejects.toThrow('отказ на material_parts')
  })
})
