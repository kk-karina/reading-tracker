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
import { store, type NewBook, type NewNote, type NewSession } from '../lib/store'
import { emptySnapshot, type Book, type Note, type Session, type Snapshot } from '../lib/types'
import { useAuth } from './AuthContext'

interface DataValue extends Snapshot {
  loading: boolean
  error: string | null
  /** True once a load has succeeded. Until then an empty snapshot means nothing. */
  loaded: boolean
  reload(): Promise<void>

  addBook(item: NewBook): Promise<Book | undefined>
  updateBook(id: string, patch: Partial<Book>): Promise<void>
  deleteBook(id: string): Promise<void>
  setFocus(id: string | null): Promise<void>

  addSession(item: NewSession): Promise<Session | undefined>
  updateSession(id: string, patch: Partial<NewSession>): Promise<void>
  deleteSession(id: string): Promise<void>

  addNote(item: NewNote): Promise<Note | undefined>
  updateNote(id: string, patch: Partial<NewNote>): Promise<void>
  deleteNote(id: string): Promise<void>

  importSnapshot(snap: Snapshot): Promise<void>
}

const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [snap, setSnap] = useState<Snapshot>(emptySnapshot)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // An empty shelf and a shelf that failed to arrive look identical in the
  // snapshot, and the app used to show the second as the first: "no books yet",
  // under an error, on an account with eight of them.
  const [loaded, setLoaded] = useState(false)

  // One load at a time, so two overlapping refreshes (StrictMode, fast clicks) never race.
  const inflight = useRef<Promise<void> | null>(null)

  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current
    const p = (async () => {
      try {
        setSnap(await store.load())
        setError(null)
        setLoaded(true)
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

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    // Run outside the auth callback's tick: Supabase holds a lock while it fires, and a query
    // started inside it can wait on itself.
    const t = setTimeout(() => refresh(), 0)
    return () => clearTimeout(t)
  }, [userId, refresh])

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await fn()
        if (inflight.current) await inflight.current
        await refresh()
        return result
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return undefined
      }
    },
    [refresh],
  )

  const value = useMemo<DataValue>(
    () => ({
      ...snap,
      loading,
      error,
      loaded,
      reload: async () => {
        setLoading(true)
        await refresh()
      },

      addBook: (b) => run(() => store.addBook(b)),
      updateBook: async (id, p) => void (await run(() => store.updateBook(id, p))),
      deleteBook: async (id) => void (await run(() => store.deleteBook(id))),
      setFocus: async (id) => void (await run(() => store.setFocus(id))),

      addSession: (s) => run(() => store.addSession(s)),
      updateSession: async (id, p) => void (await run(() => store.updateSession(id, p))),
      deleteSession: async (id) => void (await run(() => store.deleteSession(id))),

      addNote: (n) => run(() => store.addNote(n)),
      updateNote: async (id, p) => void (await run(() => store.updateNote(id, p))),
      deleteNote: async (id) => void (await run(() => store.deleteNote(id))),

      importSnapshot: async (s) => void (await run(async () => store.replaceAll?.(s))),
    }),
    [snap, loading, error, loaded, refresh, run],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataValue {
  const v = useContext(DataContext)
  if (!v) throw new Error('useData outside DataProvider')
  return v
}
