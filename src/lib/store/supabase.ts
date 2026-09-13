import type { SupabaseClient } from '@supabase/supabase-js'
import type { LogEntry, Song, Topic } from '../types'
import type { DataStore, NewLog, NewSong, NewTopic } from './types'

// Tables: topics, songs, log_entries. See supabase/schema.sql.
// user_id is filled by a column default (auth.uid()) and scoped by RLS.
export function createSupabaseStore(sb: SupabaseClient): DataStore {
  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(e.message)
  }

  return {
    async load() {
      const [t, s, l] = await Promise.all([
        sb.from('topics').select('*').order('sort').order('created_at'),
        sb.from('songs').select('*').order('sort').order('created_at'),
        sb
          .from('log_entries')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
      ])
      fail(t.error)
      fail(s.error)
      fail(l.error)
      return {
        topics: (t.data ?? []) as Topic[],
        songs: (s.data ?? []) as Song[],
        log: (l.data ?? []) as LogEntry[],
      }
    },

    async addTopics(items: NewTopic[]) {
      const { data, error } = await sb.from('topics').insert(items).select('*')
      fail(error)
      return (data ?? []) as Topic[]
    },
    async updateTopic(id, patch) {
      fail((await sb.from('topics').update(patch).eq('id', id)).error)
    },
    async deleteTopic(id) {
      fail((await sb.from('topics').delete().eq('id', id)).error)
    },

    async addSong(item: NewSong) {
      const { data, error } = await sb.from('songs').insert(item).select('*').single()
      fail(error)
      return data as Song
    },
    async updateSong(id, patch) {
      const res = await sb
        .from('songs')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
      fail(res.error)
    },
    async deleteSong(id) {
      fail((await sb.from('songs').delete().eq('id', id)).error)
    },

    async addLog(item: NewLog) {
      const { data, error } = await sb.from('log_entries').insert(item).select('*').single()
      fail(error)
      return data as LogEntry
    },
    async updateLog(id, patch) {
      fail((await sb.from('log_entries').update(patch).eq('id', id)).error)
    },
    async deleteLog(id) {
      fail((await sb.from('log_entries').delete().eq('id', id)).error)
    },
  }
}
