import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  learningStore,
  type NewMaterial,
  type NewStream,
  type NewStudyNote,
} from '../lib/learning/store'
import {
  emptyLearning,
  type LearningSnapshot,
  type Material,
  type Stream,
  type StudyNote,
} from '../lib/learning/types'

/**
 * Обучение держит своё состояние отдельно от чтения.
 *
 * Не из любви к симметрии: `DataContext` перечитывает весь снимок после
 * каждой мутации, и когда чтение переедет в сеть, это станет дорого. Раздел,
 * который обязан быть мгновенным, не должен ждать этой переделки.
 */
interface LearningValue extends LearningSnapshot {
  loading: boolean
  error: string | null

  addStream(item: NewStream): Promise<Stream | undefined>
  updateStream(id: string, patch: Partial<Stream>): Promise<void>
  deleteStream(id: string): Promise<void>

  addMaterial(item: NewMaterial): Promise<Material | undefined>
  updateMaterial(id: string, patch: Partial<Material>): Promise<void>
  deleteMaterial(id: string): Promise<void>

  addNote(item: NewStudyNote): Promise<StudyNote | undefined>
  updateNote(id: string, patch: Partial<StudyNote>): Promise<void>
  deleteNote(id: string): Promise<void>
}

const LearningContext = createContext<LearningValue | null>(null)

export function LearningProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<LearningSnapshot>(emptyLearning)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setSnap(await learningStore.load())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await fn()
        await refresh()
        return result
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return undefined
      }
    },
    [refresh],
  )

  const value = useMemo<LearningValue>(
    () => ({
      ...snap,
      loading,
      error,

      addStream: (s) => run(() => learningStore.addStream(s)),
      updateStream: async (id, p) => void (await run(() => learningStore.updateStream(id, p))),
      deleteStream: async (id) => void (await run(() => learningStore.deleteStream(id))),

      addMaterial: (m) => run(() => learningStore.addMaterial(m)),
      updateMaterial: async (id, p) => void (await run(() => learningStore.updateMaterial(id, p))),
      deleteMaterial: async (id) => void (await run(() => learningStore.deleteMaterial(id))),

      addNote: (n) => run(() => learningStore.addNote(n)),
      updateNote: async (id, p) => void (await run(() => learningStore.updateNote(id, p))),
      deleteNote: async (id) => void (await run(() => learningStore.deleteNote(id))),
    }),
    [snap, loading, error, run],
  )

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export function useLearning(): LearningValue {
  const v = useContext(LearningContext)
  if (!v) throw new Error('useLearning outside LearningProvider')
  return v
}
