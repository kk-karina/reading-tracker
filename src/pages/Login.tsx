import { motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { Wave } from '../components/fun'
import { Jelly } from '../components/ui'
import { useAuth } from '../state/AuthContext'

const GREETING = 'Tune up. Log in.'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    setMsg(await signIn(email, password))
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
        <span className="label">slap that bass</span>
        <h1 className="display" style={{ marginTop: 28, fontSize: 40 }}>
          <Wave>{GREETING}</Wave>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {msg && <div className="error">{msg}</div>}
          <Jelly className="btn" type="submit" disabled={busy} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
            Sign in
          </Jelly>
        </form>
      </motion.div>
    </div>
  )
}
