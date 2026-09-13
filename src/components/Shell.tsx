import { motion } from 'motion/react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CursorDot } from './fun'
import { useAuth } from '../state/AuthContext'
import { useData } from '../state/DataContext'

const LINKS = [
  { to: '/', label: 'Progress' },
  { to: '/topics', label: 'Topics' },
  { to: '/songs', label: 'Songs' },
  { to: '/log', label: 'Log' },
  { to: '/settings', label: 'Settings' },
]

export function Shell() {
  const { user } = useAuth()
  const { error } = useData()
  const location = useLocation()

  return (
    <div className="shell">
      <CursorDot />
      <header className="topbar">
        <div className="topbar-inner">
          <nav className="nav" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'}>
                {({ isActive }) => (
                  <motion.span
                    className="nav-item"
                    whileHover={{ y: -2, rotate: isActive ? 0 : -2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="nav-pill"
                        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                      />
                    )}
                    <span className="nav-label">{l.label}</span>
                  </motion.span>
                )}
              </NavLink>
            ))}
          </nav>
          <span className="who">{user?.email}</span>
        </div>
      </header>

      {/* Keyed by route: a plain fade-in on mount, no exit animation to wait for. */}
      <motion.main
        key={location.pathname}
        className="page"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {error && (
          <div className="error" style={{ marginBottom: 24 }}>
            {error}
          </div>
        )}
        <Outlet />
      </motion.main>
    </div>
  )
}
