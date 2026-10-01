import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createSupabaseLearningStore } from './supabase'

/**
 * Проверяется не база, а то, во что стор превращает мутацию: какие таблицы он
 * трогает, в каком порядке и с какими условиями. Для этого нужен клиент,
 * который записывает запросы и отвечает заготовленным, включая отказы, —
 * живой проект такие ответы выдаёт только случайно.
 *
 * Тот же приём, что в `src/lib/store/supabase.test.ts`, но с записью вызовов:
 * у обучения правка материала — это несколько запросов, и важен их порядок.
 */
interface Answer {
  data: unknown
  error: { code?: string; message: string } | null
}

interface Call {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  payload?: unknown
  /** Условия в порядке появления: `['id', 'm1']`, `['neq:id', 's1']`. */
  filters: [string, unknown][]
}

const empty: Answer = { data: [], error: null }

function fakeClient(answer: (call: Call, n: number) => Answer = () => empty) {
  const calls: Call[] = []
  let n = 0

  const from = (table: string) => {
    const call: Call = { table, op: 'select', filters: [] }
    let recorded = false
    const node: unknown = new Proxy(
      {},
      {
        get(_target, prop) {
          if (typeof prop === 'symbol') return undefined
          if (prop === 'then') {
            if (!recorded) {
              calls.push(call)
              recorded = true
            }
            return (resolve: (a: Answer) => unknown, reject: (e: unknown) => unknown) =>
              Promise.resolve()
                .then(() => answer(call, n++))
                .then(resolve, reject)
          }
          return (...args: unknown[]) => {
            if (prop === 'insert' || prop === 'update') {
              call.op = prop
              call.payload = args[0]
            } else if (prop === 'delete') {
              call.op = 'delete'
            } else if (prop === 'eq') {
              call.filters.push([String(args[0]), args[1]])
            } else if (prop === 'neq' || prop === 'in') {
              call.filters.push([`${prop}:${String(args[0])}`, args[1]])
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

const aMaterial = {
  id: 'm1',
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
}

describe('загрузка', () => {
  it('читает четыре таблицы', async () => {
    const { sb, calls } = fakeClient()
    const snap = await createSupabaseLearningStore(sb).load()

    expect(calls.map((c) => c.table).sort()).toEqual([
      'material_parts',
      'materials',
      'streams',
      'study_notes',
    ])
    expect(snap).toEqual({ streams: [], materials: [], parts: [], notes: [] })
  })

  it('отказ одной таблицы не оставляет соседние отказы без ожидающего', async () => {
    const { sb } = fakeClient((call) =>
      call.table === 'study_notes'
        ? { data: null, error: { code: '42P01', message: 'relation "study_notes" does not exist' } }
        : empty,
    )
    await expect(createSupabaseLearningStore(sb).load()).rejects.toThrow('study_notes')
  })
})

describe('удаление', () => {
  it('поток уходит одним запросом: остальное уносит каскад в базе', async () => {
    const { sb, calls } = fakeClient()
    await createSupabaseLearningStore(sb).deleteStream('s1')

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ table: 'streams', op: 'delete', filters: [['id', 's1']] })
  })

  it('часть уходит одним запросом: указатель в конспекте обнуляет база', async () => {
    const { sb, calls } = fakeClient()
    await createSupabaseLearningStore(sb).deletePart('p1')

    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ table: 'material_parts', op: 'delete' })
  })
})

describe('правка материала', () => {
  const answering = (after: Record<string, unknown>) =>
    fakeClient((call) => (call.table === 'materials' ? { data: after, error: null } : empty))

  it('сначала материал, потом зачистка', async () => {
    const { sb, calls } = answering(aMaterial)
    await createSupabaseLearningStore(sb).updateMaterial('m1', { title: 'Другое' })

    expect(calls[0]).toMatchObject({ table: 'materials', op: 'update' })
    expect(calls.slice(1).every((c) => c.table !== 'materials')).toBe(true)
  })

  it('снимает фокус у потока, которому материал больше не принадлежит', async () => {
    const { sb, calls } = answering({ ...aMaterial, stream_id: 's2' })
    await createSupabaseLearningStore(sb).updateMaterial('m1', { stream_id: 's2' })

    const stale = calls.find((c) => c.table === 'streams')
    expect(stale).toMatchObject({
      op: 'update',
      payload: { focus_material_id: null },
      filters: [
        ['focus_material_id', 'm1'],
        ['neq:id', 's2'],
      ],
    })
  })

  it('материал, ушедший из работы, перестаёт быть фокусом у кого бы то ни было', async () => {
    const { sb, calls } = answering({ ...aMaterial, status: 'done' })
    await createSupabaseLearningStore(sb).updateMaterial('m1', { status: 'done' })

    const blanket = calls.find(
      (c) => c.table === 'streams' && c.filters.every(([k]) => !k.startsWith('neq')),
    )
    expect(blanket).toMatchObject({ payload: { focus_material_id: null } })
  })

  it('вид без частей уносит части', async () => {
    const { sb, calls } = answering({ ...aMaterial, kind: 'article', scale: null })
    await createSupabaseLearningStore(sb).updateMaterial('m1', { kind: 'article', scale: null })

    expect(calls.find((c) => c.table === 'material_parts')).toMatchObject({
      op: 'delete',
      filters: [['material_id', 'm1']],
    })
  })

  it('материал в работе со своими главами не теряет ни частей, ни фокуса', async () => {
    const { sb, calls } = answering(aMaterial)
    await createSupabaseLearningStore(sb).updateMaterial('m1', { title: 'Другое' })

    expect(calls.find((c) => c.table === 'material_parts')).toBeUndefined()
    const blanket = calls.find(
      (c) => c.table === 'streams' && c.filters.every(([k]) => !k.startsWith('neq')),
    )
    expect(blanket).toBeUndefined()
  })
})

describe('адрес нового потока', () => {
  const made = { id: 's9', slug: 'rost-2', name: 'Рост' }

  it('берётся следующий свободный, когда база отвергла занятый', async () => {
    let inserts = 0
    const { sb, calls } = fakeClient((call) => {
      if (call.op === 'select') return { data: [{ slug: 'rost' }], error: null }
      inserts += 1
      // Гонка двух устройств: адрес заняли между чтением и вставкой.
      return inserts === 1
        ? { data: null, error: { code: '23505', message: 'duplicate key value' } }
        : { data: made, error: null }
    })

    const stream = await createSupabaseLearningStore(sb).addStream({
      name: 'Рост',
      icon: 'compass',
      accent: null,
      outline: null,
      sort: 0,
    })

    expect(stream).toEqual(made)
    const tried = calls
      .filter((c) => c.op === 'insert')
      .map((c) => (c.payload as { slug: string }).slug)
    // Первый адрес уже был занят в прочитанном списке, второй — перехвачен.
    expect(tried).toEqual(['rost-2', 'rost-3'])
  })

  it('сдаётся, а не крутится вечно', async () => {
    const { sb, calls } = fakeClient((call) =>
      call.op === 'select'
        ? { data: [], error: null }
        : { data: null, error: { code: '23505', message: 'duplicate key value' } },
    )

    await expect(
      createSupabaseLearningStore(sb).addStream({
        name: 'Рост',
        icon: 'compass',
        accent: null,
        outline: null,
        sort: 0,
      }),
    ).rejects.toThrow()
    expect(calls.filter((c) => c.op === 'insert')).toHaveLength(3)
  })
})

describe('адрес потока не меняется', () => {
  it('slug из заплатки не доезжает до базы', async () => {
    const { sb, calls } = fakeClient()
    await createSupabaseLearningStore(sb).updateStream('s1', { name: 'Новое', slug: 'podmena' })

    expect(calls[0].payload).toMatchObject({ name: 'Новое' })
    expect(calls[0].payload).not.toHaveProperty('slug')
  })
})
