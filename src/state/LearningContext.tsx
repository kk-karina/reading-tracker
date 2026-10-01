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
import {
  learningStore,
  type NewMaterial,
  type NewMaterialPart,
  type NewStream,
  type NewStudyNote,
} from '../lib/learning/store'
import { carried, carryOver, markCarried, worthCarrying } from '../lib/learning/store/carry'
import { localLearning } from '../lib/learning/store/local'
import * as rules from '../lib/learning/store/rules'
import {
  emptyLearning,
  type LearningSnapshot,
  type Material,
  type MaterialPart,
  type Stream,
  type StudyNote,
} from '../lib/learning/types'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

/**
 * Обучение держит своё состояние отдельно от чтения.
 *
 * Не из любви к симметрии: `DataContext` перечитывает весь снимок после каждой
 * мутации, и по сети это два запроса на галочку. Обучение считает правку само
 * — правилами из `store/rules.ts`, теми же, которым подчиняются оба
 * хранилища, — показывает результат сразу и пишет в фон. Провал возвращает
 * снимок к тому, что было, и говорит об этом вслух.
 *
 * Очереди офлайн-правок здесь нет намеренно. Правка, пережидающая обрыв в
 * браузере и ложащаяся через сутки поверх написанного с другого устройства, —
 * это потеря данных, которая выглядит как успех.
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

  addPart(item: NewMaterialPart): Promise<MaterialPart | undefined>
  updatePart(id: string, patch: Partial<MaterialPart>): Promise<void>
  deletePart(id: string): Promise<void>

  addNote(item: NewStudyNote): Promise<StudyNote | undefined>
  updateNote(id: string, patch: Partial<StudyNote>): Promise<void>
  deleteNote(id: string): Promise<void>

  /**
   * Сколько строк лежит в браузере сверх облака, и перенос их туда.
   * `null` — переносить нечего или некуда (локальный режим).
   */
  pending: number | null
  carry(): Promise<number | null>
}

const LearningContext = createContext<LearningValue | null>(null)

const now = () => new Date().toISOString()

/** Сколько строк в снимке — число для строки в настройках. */
const size = (s: LearningSnapshot) =>
  s.streams.length + s.materials.length + s.parts.length + s.notes.length

export function LearningProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [snap, setSnap] = useState<LearningSnapshot>(emptyLearning)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<number | null>(null)

  /**
   * Снимок держится ещё и ссылкой: откат должен вернуть то, что было в момент
   * правки, а не то, что увидел последний рендер.
   */
  const held = useRef<LearningSnapshot>(snap)
  const put = useCallback((next: LearningSnapshot) => {
    held.current = next
    setSnap(next)
  }, [])

  const say = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e))
  }, [])

  /** Перенос накопленного в облако. Зовётся сам при первом входе и кнопкой из настроек. */
  const carry = useCallback(async (): Promise<number | null> => {
    if (!supabase || !user) return null
    try {
      const [cloud, local] = await Promise.all([learningStore.load(), localLearning.load()])
      if (!worthCarrying(cloud, local)) {
        markCarried(user.id)
        setPending(null)
        return 0
      }
      const moved = await carryOver(supabase, local)
      markCarried(user.id)
      setPending(null)
      put(await learningStore.load())
      setError(null)
      return moved
    } catch (e) {
      say(e)
      return null
    }
  }, [user, put, say])

  const load = useCallback(async () => {
    try {
      const cloud = await learningStore.load()
      put(cloud)
      setError(null)

      if (supabase && user && !carried(user.id)) {
        const local = await localLearning.load()
        if (worthCarrying(cloud, local)) {
          const moved = await carryOver(supabase, local)
          markCarried(user.id)
          put(await learningStore.load())
          setPending(null)
          return void moved
        }
        // Перенести нечего, но и отмечать нечего: в облаке уже что-то есть, а
        // в браузере лежит старое. Кнопка в настройках покажет, сколько.
        if (size(local) > 0 && cloud.streams.length > 0) setPending(size(local))
        else markCarried(user.id)
      }
    } catch (e) {
      say(e)
    } finally {
      setLoading(false)
    }
  }, [user, put, say])

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    // Вне тика колбэка авторизации: Supabase держит на нём замок, и запрос,
    // начатый внутри, ждёт сам себя. Та же причина, что в DataContext.
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [userId, load])

  /** Показать результат сразу, записать в фон, вернуть снимок при отказе. */
  const change = useCallback(
    async (rule: (s: LearningSnapshot) => LearningSnapshot, write: () => Promise<unknown>) => {
      const before = held.current
      put(rule(before))
      try {
        await write()
        setError(null)
      } catch (e) {
        put(before)
        say(e)
      }
    },
    [put, say],
  )

  /**
   * Созданная строка ждёт ответа: `id` и `created_at` выдаёт хранилище, и
   * экран на них опирается. Правило применяется к вернувшейся строке, а не к
   * выдуманной.
   */
  const add = useCallback(
    async <K extends keyof rules.Rows>(
      collection: K,
      create: () => Promise<rules.Rows[K]>,
    ): Promise<rules.Rows[K] | undefined> => {
      try {
        const row = await create()
        put(rules.insert(held.current, collection, row))
        setError(null)
        return row
      } catch (e) {
        say(e)
        return undefined
      }
    },
    [put, say],
  )

  const value = useMemo<LearningValue>(
    () => ({
      ...snap,
      loading,
      error,
      pending,
      carry,

      addStream: (s) => add('streams', () => learningStore.addStream(s)),
      updateStream: (id, p) =>
        change(
          (s) => rules.updateStream(s, id, p, now()),
          () => learningStore.updateStream(id, p),
        ),
      deleteStream: (id) =>
        change(
          (s) => rules.removeStream(s, id),
          () => learningStore.deleteStream(id),
        ),

      addMaterial: (m) => add('materials', () => learningStore.addMaterial(m)),
      updateMaterial: (id, p) =>
        change(
          (s) => rules.updateMaterial(s, id, p, now()),
          () => learningStore.updateMaterial(id, p),
        ),
      deleteMaterial: (id) =>
        change(
          (s) => rules.removeMaterial(s, id),
          () => learningStore.deleteMaterial(id),
        ),

      addPart: (p) => add('parts', () => learningStore.addPart(p)),
      updatePart: (id, p) =>
        change(
          (s) => rules.updatePart(s, id, p),
          () => learningStore.updatePart(id, p),
        ),
      deletePart: (id) =>
        change(
          (s) => rules.removePart(s, id),
          () => learningStore.deletePart(id),
        ),

      addNote: (n) => add('notes', () => learningStore.addNote(n)),
      updateNote: (id, p) =>
        change(
          (s) => rules.updateNote(s, id, p, now()),
          () => learningStore.updateNote(id, p),
        ),
      deleteNote: (id) =>
        change(
          (s) => rules.removeNote(s, id),
          () => learningStore.deleteNote(id),
        ),
    }),
    [snap, loading, error, pending, carry, add, change],
  )

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>
}

export function useLearning(): LearningValue {
  const v = useContext(LearningContext)
  if (!v) throw new Error('useLearning outside LearningProvider')
  return v
}
