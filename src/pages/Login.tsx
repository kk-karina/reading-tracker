import { motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'

export function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const err = mode === 'in' ? await signIn(email, password) : await signUp(email, password)
    setMsg(err)
    setBusy(false)
  }

  return (
    <div className="login">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="wordmark" style={{ fontSize: 22 }}>
          <span className="dot" />
          lowend
        </span>
        <h1 className="display" style={{ marginTop: 40, fontSize: 44 }}>
          {mode === 'in' ? 'Welcome back.' : 'Start a log.'}
        </h1>

        <form onSubmit={submit}>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {msg && <div className="error">{msg}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 8 }}>
            {mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            className="link-btn"
            style={{ alignSelf: 'flex-start', marginTop: 8 }}
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in')
              setMsg(null)
            }}
          >
            {mode === 'in' ? 'No account yet? Create one' : 'Have an account? Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
