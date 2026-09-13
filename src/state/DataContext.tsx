import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CATEGORIES } from '../lib/categories'
import { SEED_TOPICS } from '../lib/seedTopics'
import { store, type NewLog, type NewSong, type NewTopic } from '../lib/store'
import type { LogEntry, Snapshot, Song, Topic } from '../lib/types'
import { useAuth } from './AuthContext'

interface DataValue extends Snapshot {
  loading: boolean
  error: string | null

  addTopic(t: NewTopic): Promise<void>
  updateTopic(id: string, patch: Partial<NewTopic>): Promise<void>
  deleteTopic(id: string): Promise<void>
  restoreSampleTopics(): Promise<number>

  addSong(s: NewSong): Promise<void>
  updateSong(id: string, patch: Partial<NewSong>): Promise<void>
  deleteSong(id: string): Promise<void>

  addLog(l: NewLog): Promise<void>
  updateLog(id: string, patch: Partial<NewLog>): Promise<void>
  deleteLog(id: string): Promise<void>

  importSnapshot(snap: Snapshot): Promise<void>
}

const DataContext = createContext<DataValue | null>(null)

function seedItems(existing: Topic[]): NewTopic[] {
  const have = new Set(existing.map((t) => `${t.category}::${t.title.trim().toLowerCase()}`))
  const items: NewTopic[] = []
  for (const c of CATEGORIES) {
    SEED_TOPICS[c.id].forEach((title, i) => {
      if (!have.has(`${c.id}::${title.toLowerCase()}`)) {
        items.push({ category: c.id, title, sort: i })
      }
    })
  }
  return items
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [snap, setSnap] = useState<Snapshot>({ topics: [], songs: [], log: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // One load at a time, so two overlapping refreshes (StrictMode, fast clicks) never seed twice.
  const inflight = useRef<Promise<void> | null>(null)

  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current
    const p = (async () => {
      try {
        let s = await store.load()
        // A brand-new account gets the sample topics from the brief.
        if (s.topics.length === 0 && s.log.length === 0) {
          await store.addTopics(seedItems([]))
          s = await store.load()
        }
        // Clean up duplicate topics (same category + title) that carry no time.
        const seen = new Set<string>()
        const used = new Set(s.log.map((l) => l.topic_id))
        const dupes = s.topics.filter((t) => {
          const k = `${t.category}::${t.title.trim().toLowerCase()}`
          if (seen.has(k) && !used.has(t.id)) return true
          seen.add(k)
          return false
        })
        if (dupes.length) {
          for (const d of dupes) await store.deleteTopic(d.id)
          s = await store.load()
        }
        setSnap(s)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
        inflight.current = null
      }
    })()
    inflight.current = p
    return p
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    refresh()
  }, [user, refresh])

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn()
        if (inflight.current) await inflight.current
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [refresh],
  )

  const value = useMemo<DataValue>(
    () => ({
      ...snap,
      loading,
      error,

      addTopic: (t) => run(() => store.addTopics([t])),
      updateTopic: (id, p) => run(() => store.updateTopic(id, p)),
      deleteTopic: (id) => run(() => store.deleteTopic(id)),
      restoreSampleTopics: async () => {
        const items = seedItems(snap.topics)
        if (items.length) await run(() => store.addTopics(items))
        return items.length
      },

      addSong: (s) => run(() => store.addSong(s)),
      updateSong: (id, p) => run(() => store.updateSong(id, p)),
      deleteSong: (id) => run(() => store.deleteSong(id)),

      addLog: (l) => run(() => store.addLog(l)),
      updateLog: (id, p) => run(() => store.updateLog(id, p)),
      deleteLog: (id) => run(() => store.deleteLog(id)),

      importSnapshot: (s) => run(async () => store.replaceAll?.(s)),
    }),
    [snap, loading, error, run],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataValue {
  const v = useContext(DataContext)
  if (!v) throw new Error('useData outside DataProvider')
  return v
}

// Small derived helpers used by several pages.
export function minutesByCategory(log: LogEntry[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of CATEGORIES) out[c.id] = 0
  for (const l of log) out[l.category] = (out[l.category] ?? 0) + l.minutes
  return out
}

export function minutesByTopic(log: LogEntry[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const l of log) if (l.topic_id) out[l.topic_id] = (out[l.topic_id] ?? 0) + l.minutes
  return out
}

export function countByStatus(songs: Song[]): Record<Song['status'], number> {
  const out = { backlog: 0, learning: 0, learned: 0 }
  for (const s of songs) out[s.status]++
  return out
}
