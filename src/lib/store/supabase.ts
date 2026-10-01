import type { SupabaseClient } from '@supabase/supabase-js'
import type { Book, Note, Session } from '../types'
import { ok, retrying, throwIf } from './retry'
import type { DataStore, NewBook, NewNote, NewSession } from './types'

// Tables: books, sessions, notes. See supabase/schema.sql.
// user_id is filled by a column default (auth.uid()) and scoped by RLS.
export function createSupabaseStore(sb: SupabaseClient): DataStore {
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
      throwIf(b.error)
      throwIf(s.error)
      throwIf(n.error)
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
