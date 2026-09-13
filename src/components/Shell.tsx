import { motion } from 'motion/react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { DictKey } from '../lib/i18n/dict'
import type { Locale } from '../lib/i18n/translate'
import { useAuth } from '../state/AuthContext'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'
import { CursorDot } from './fun'
import { Segmented } from './ui'

const LINKS: { to: string; key: DictKey }[] = [
  { to: '/', key: 'nav.progress' },
  { to: '/shelf', key: 'nav.shelf' },
  { to: '/journal', key: 'nav.journal' },
  { to: '/settings', key: 'nav.settings' },
]

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ru', label: 'РУ' },
  { value: 'en', label: 'EN' },
]

export function Shell() {
  const { user } = useAuth()
  const { error } = useData()
  const { locale, setLocale, t } = useLocale()
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
                    <span className="nav-label">{t(l.key)}</span>
                  </motion.span>
                )}
              </NavLink>
            ))}
          </nav>
          {/* In the bar rather than tucked away in settings: the language follows the book. */}
          <div className="topbar-right">
            <Segmented
              name={t('locale.label')}
              value={locale}
              options={LOCALES}
              onChange={setLocale}
              className="sm"
            />
            <span className="who">{user?.email}</span>
          </div>
        </div>
      </header>

      {/* Keyed by route: a plain fade-in on mount, no exit animation to wait for. */}
      <motion.main
        key={location.pathname}
        className="page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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
