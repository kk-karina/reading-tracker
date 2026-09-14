import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseStore } from './supabase'

/**
 * The store is tested against a stand-in for the client rather than a live
 * project, because the thing under test is what it does with an answer — retry
 * it or give up — and that needs answers on demand, including the failures a
 * real project only produces by accident.
 */
interface Answer {
  data: unknown
  error: { code?: string; message: string } | null
}

/** A query builder where every call chains and awaiting it yields `answer()`. */
function chain(answer: () => Answer): unknown {
  const node: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop === 'symbol') return undefined
        if (prop === 'then') {
          return (resolve: (a: Answer) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve()
              .then(answer)
              .then(resolve, reject)
        }
        return () => node
      },
    },
  )
  return node
}

const rows = { data: [], error: null }
const jwtSkew = { data: null, error: { code: 'PGRST303', message: 'JWT issued at future' } }

function clientAnswering(answers: Answer[]) {
  const calls: { rpc: [string, unknown][] } = { rpc: [] }
  let i = 0
  const next = () => answers[Math.min(i++, answers.length - 1)]
  const sb = {
    from: () => chain(next),
    rpc: (name: string, args: unknown) => {
      calls.rpc.push([name, args])
      return chain(next)
    },
  } as unknown as SupabaseClient
  return { sb, calls, attempts: () => i }
}

describe('supabase store', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('retries a load that PostgREST refused for a future "issued at"', async () => {
    // Two refusals then an answer: the clocks on the Supabase side caught up.
    const { sb, attempts } = clientAnswering([jwtSkew, jwtSkew, jwtSkew, rows])
    const store = createSupabaseStore(sb)

    const loading = store.load()
    await vi.advanceTimersByTimeAsync(400 + 1200 + 3000)
    const snap = await loading

    expect(snap.books).toEqual([])
    // Three tables, and the first three answers were spent on refusals.
    expect(attempts()).toBeGreaterThan(3)
  })

  it('gives up on a refusal that waiting cannot cure', async () => {
    const { sb, attempts } = clientAnswering([
      { data: null, error: { code: '42P01', message: 'relation "books" does not exist' } },
    ])
    const store = createSupabaseStore(sb)

    // No waiting involved: this one is refused once and reported straight away.
    await expect(store.load()).rejects.toThrow('relation "books" does not exist')
    // One try per table and no more: a missing table is not going to appear.
    expect(attempts()).toBe(3)
  })

  it('moves the focus in one call, so it cannot land between two books', async () => {
    const { sb, calls } = clientAnswering([{ data: null, error: null }])
    const store = createSupabaseStore(sb)

    await store.setFocus('book-1')

    expect(calls.rpc).toEqual([['set_focus', { book: 'book-1' }]])
  })

  it('clears the focus through the same call', async () => {
    const { sb, calls } = clientAnswering([{ data: null, error: null }])
    const store = createSupabaseStore(sb)

    await store.setFocus(null)

    expect(calls.rpc).toEqual([['set_focus', { book: null }]])
  })
})
