import type { SupabaseClient } from '@supabase/supabase-js'
import type { Book, Note, Session } from '../types'
import type { DataStore, NewBook, NewNote, NewSession } from './types'

// Tables: books, sessions, notes. See supabase/schema.sql.
// user_id is filled by a column default (auth.uid()) and scoped by RLS.
export function createSupabaseStore(sb: SupabaseClient): DataStore {
  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(e.message)
  }

  return {
    async load() {
      const [b, s, n] = await Promise.all([
        sb.from('books').select('*').order('sort').order('created_at'),
        sb
          .from('sessions')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        sb.from('notes').select('*').order('created_at', { ascending: false }),
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
      const { data, error } = await sb.from('books').insert(item).select('*').single()
      fail(error)
      return data as Book
    },
    async updateBook(id, patch) {
      const res = await sb
        .from('books')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
      fail(res.error)
    },
    async deleteBook(id) {
      // sessions and notes carry "on delete cascade", so the rows go with the book.
      fail((await sb.from('books').delete().eq('id', id)).error)
    },
    async setFocus(id) {
      // The partial unique index allows one focused book per user, so clear before setting.
      fail((await sb.from('books').update({ is_focus: false }).eq('is_focus', true)).error)
      if (id) fail((await sb.from('books').update({ is_focus: true }).eq('id', id)).error)
    },

    async addSession(item: NewSession) {
      const { data, error } = await sb.from('sessions').insert(item).select('*').single()
      fail(error)
      return data as Session
    },
    async updateSession(id, patch) {
      fail((await sb.from('sessions').update(patch).eq('id', id)).error)
    },
    async deleteSession(id) {
      fail((await sb.from('sessions').delete().eq('id', id)).error)
    },

    async addNote(item: NewNote) {
      const { data, error } = await sb.from('notes').insert(item).select('*').single()
      fail(error)
      return data as Note
    },
    async updateNote(id, patch) {
      fail((await sb.from('notes').update(patch).eq('id', id)).error)
    },
    async deleteNote(id) {
      fail((await sb.from('notes').delete().eq('id', id)).error)
    },
  }
}
