import type { SupabaseClient } from '@supabase/supabase-js'
import type { Book, Note, Session } from '../types'
import type { DataStore, NewBook, NewNote, NewSession } from './types'

/**
 * PostgREST refuses a token whose `iat` sits ahead of its own clock and answers
 * PGRST303, "JWT issued at future". Both clocks in that comparison are
 * Supabase's own — the auth service stamps the token, the API reads it — so no
 * change on this side prevents it, and refreshing the session makes it worse: a
 * newer token carries a newer `iat`. The cure is to wait and send the same
 * token again, which is what these delays are for.
 *
 * Only the auth codes count as transient. They are decided before the query
 * runs, so nothing reached the database and even an insert is safe to repeat; a
 * dropped connection carries no such promise and is left alone.
 */
const TRANSIENT_CODES = new Set(['PGRST301', 'PGRST303'])
const BACKOFF_MS = [400, 1200, 3000]

interface Failure {
  code?: string
  message: string
}
interface Result<T> {
  data: T
  error: Failure | null
}

function isTransient(error: Failure | null): boolean {
  if (!error) return false
  if (error.code && TRANSIENT_CODES.has(error.code)) return true
  return error.message.includes('JWT issued at future')
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

/** Runs the query, and runs it again — same token, later — while it fails transiently. */
async function retrying<T>(query: () => PromiseLike<Result<T>>): Promise<Result<T>> {
  let result = await query()
  for (const wait of BACKOFF_MS) {
    if (!isTransient(result.error)) return result
    await sleep(wait)
    result = await query()
  }
  return result
}

// Tables: books, sessions, notes. See supabase/schema.sql.
// user_id is filled by a column default (auth.uid()) and scoped by RLS.
export function createSupabaseStore(sb: SupabaseClient): DataStore {
  const fail = (e: Failure | null) => {
    if (e) throw new Error(e.message)
  }

  /** Awaits a query with the retry above, then throws if it still failed. */
  const ok = async <T,>(query: () => PromiseLike<Result<T>>): Promise<T> => {
    const { data, error } = await retrying(query)
    fail(error)
    return data
  }

  return {
    async load() {
      // All three answers are collected before any of them is allowed to throw:
      // rejecting the moment the first one fails leaves the other two rejections
      // with nobody waiting on them, which the browser reports as unhandled.
      const [b, s, n] = await Promise.all([
        retrying(() => sb.from('books').select('*').order('sort').order('created_at')),
        retrying(() =>
          sb
            .from('sessions')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
        ),
        retrying(() => sb.from('notes').select('*').order('created_at', { ascending: false })),
      ])
      fail(b.error)
      fail(s.error)
      fail(n.error)
      return {
        books: (b.data ?? []) as Book[],
        sessions: (s.data ?? []) as Session[],
        notes: (n.data ?? []) as Note[],
      }
    },

    async addBook(item: NewBook) {
      return (await ok(() => sb.from('books').insert(item).select('*').single())) as Book
    },
    async updateBook(id, patch) {
      await ok(() =>
        sb
          .from('books')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', id),
      )
    },
    async deleteBook(id) {
      // sessions and notes carry "on delete cascade", so the rows go with the book.
      await ok(() => sb.from('books').delete().eq('id', id))
    },
    async setFocus(id) {
      // Clearing the old focus and setting the new one are one statement to the
      // database, so a failure half way cannot leave the shelf with no focus at
      // all. See supabase/migrations/002_set_focus.sql.
      await ok(() => sb.rpc('set_focus', { book: id }))
    },

    async addSession(item: NewSession) {
      return (await ok(() => sb.from('sessions').insert(item).select('*').single())) as Session
    },
    async updateSession(id, patch) {
      await ok(() => sb.from('sessions').update(patch).eq('id', id))
    },
    async deleteSession(id) {
      await ok(() => sb.from('sessions').delete().eq('id', id))
    },

    async addNote(item: NewNote) {
      return (await ok(() => sb.from('notes').insert(item).select('*').single())) as Note
    },
    async updateNote(id, patch) {
      await ok(() => sb.from('notes').update(patch).eq('id', id))
    },
    async deleteNote(id) {
      await ok(() => sb.from('notes').delete().eq('id', id))
    },
  }
}
