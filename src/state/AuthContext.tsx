import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface AuthUser {
  id: string
  email: string
}

interface AuthValue {
  mode: 'supabase' | 'local'
  ready: boolean
  user: AuthUser | null
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
}

const LOCAL_USER: AuthUser = { id: 'local', email: 'local device' }

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(supabase ? null : LOCAL_USER)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
      setReady(true)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email ?? '' } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthValue = {
    mode: supabase ? 'supabase' : 'local',
    ready,
    user,
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
