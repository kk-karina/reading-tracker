import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isAvatarId, randomAvatar, type AvatarId } from '../lib/avatars'
import { supabase } from '../lib/supabase'

interface AuthUser {
  id: string
  email: string
}

interface AuthValue {
  mode: 'supabase' | 'local'
  ready: boolean
  user: AuthUser | null
  /**
   * Рядом с пользователем, а не внутри него: объект пользователя меняется
   * только при смене входа, и от этого зависят загрузки данных. Сменить
   * картинку — не значит войти заново.
   */
  avatar: AvatarId | null
  setAvatar(next: AvatarId): void
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
}

const LOCAL_USER: AuthUser = { id: 'local', email: 'local device' }

/**
 * Копия на устройстве — на случай, когда запись в профиль не дошла: иначе
 * после перезагрузки выпал бы новый случайный, и выбор пропал бы молча.
 * По id пользователя, чтобы на общем компьютере у двоих не был один аватар.
 */
const avatarKey = (userId: string) => `readingtracker.avatar.${userId}`

function storedAvatar(userId: string): AvatarId | null {
  try {
    const v = localStorage.getItem(avatarKey(userId))
    return isAvatarId(v) ? v : null
  } catch {
    return null
  }
}

function storeAvatar(userId: string, id: AvatarId) {
  try {
    localStorage.setItem(avatarKey(userId), id)
  } catch {
    /* blocked storage: the profile copy, if any, still holds it */
  }
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(supabase ? null : LOCAL_USER)
  const [ready, setReady] = useState(!supabase)
  const [avatar, setAvatarState] = useState<AvatarId | null>(() =>
    supabase ? null : storedAvatar(LOCAL_USER.id),
  )
  const userId = useRef<string | null>(supabase ? null : LOCAL_USER.id)

  useEffect(() => {
    if (!supabase) return
    // INITIAL_SESSION arrives right after subscribing, so one listener covers start-up too.
    // Only swap the user object when the id actually changes; token refreshes must not
    // look like a new sign-in to the data layer.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      const id = u?.id ?? null
      // Аватар читается из профиля только при смене входа. Ответ на нашу же
      // запись приходит сюда событием позже — и при двух быстрых сменах
      // подряд вернул бы на миг предыдущий выбор.
      if (id !== userId.current) {
        userId.current = id
        const saved = u?.user_metadata?.avatar
        setAvatarState(u ? (isAvatarId(saved) ? saved : storedAvatar(u.id)) : null)
      }
      setUser((prev) => {
        if (!u) return null
        if (prev && prev.id === u.id) return prev
        return { id: u.id, email: u.email ?? '' }
      })
      setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const setAvatar = (next: AvatarId) => {
    const id = userId.current
    if (!id) return
    setAvatarState(next)
    storeAvatar(id, next)
    // В профиль — чтобы аватар был тем же на телефоне и на ноутбуке. Не
    // дождались — не беда: копия на устройстве уже записана.
    if (supabase) void supabase.auth.updateUser({ data: { avatar: next } })
  }

  // Без выбора аватар не пустует: случайный ставится сразу и записывается,
  // чтобы при следующем входе не выпал другой.
  const pickRandom = useEffectEvent(() => setAvatar(randomAvatar()))
  useEffect(() => {
    if (ready && user && avatar === null) pickRandom()
  }, [ready, user, avatar])

  const value: AuthValue = {
    mode: supabase ? 'supabase' : 'local',
    ready,
    user,
    avatar,
    setAvatar,
    async signIn(email, password) {
      if (!supabase) return null
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? error.message : null
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
