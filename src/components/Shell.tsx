import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { DictKey } from '../lib/i18n/dict'
import { configError } from '../lib/supabase'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'
import { CursorDot } from './fun'
import { Profile } from './ProfileBookmark'
import { Jelly, inkSlide } from './ui'

/** Разделов ровно два. Настройки — инструмент, а не третье место. */
const SECTIONS: { to: string; key: DictKey }[] = [
  { to: '/reading', key: 'nav.reading' },
  { to: '/learning', key: 'nav.hub' },
]

export function Shell() {
  const { error, loaded, loading, reload } = useData()
  const { t } = useLocale()
  const location = useLocation()

  // На телефоне пять пунктов не помещаются, и меню прокручивается. Активный
  // пункт, обрезанный краем, читается как поломка, а не как прокрутка.
  const nav = useRef<HTMLElement>(null)
  useEffect(() => {
    nav.current
      ?.querySelector('a.active')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [location.pathname])

  // Nothing ever arrived, so every page below would speak about an empty shelf
  // as though it were the truth. Say what happened instead, and offer to retry.
  const stalled = !loaded && error !== null

  return (
    <div className="shell">
      <CursorDot />
      <header className="topbar">
        <div className="topbar-inner">
          <nav className="nav" aria-label="Main" ref={nav}>
            {SECTIONS.map((l) => (
              <NavLink key={l.to} to={l.to} end={false}>
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
                        transition={inkSlide}
                      />
                    )}
                    <span className="nav-label">{t(l.key)}</span>
                  </motion.span>
                )}
              </NavLink>
            ))}
          </nav>
          {/* Справа одно лицо. Язык, выгрузка и выход свисают из-под него
              закладкой: всё это — про тебя и про устройство, а не про книги. */}
          <Profile />
        </div>
      </header>

      {/*
        Страница не проявляется и не перемонтируется по адресу.

        Раньше здесь стоял `key={location.pathname}` с проявлением от нуля, и
        это било дважды. Во-первых, видимо: на каждой смене адреса — а по
        вкладкам и подразделам щёлкают постоянно — всё содержимое гасло в ноль
        и разгоралось обратно. Переход между двумя почти одинаковыми экранами
        выглядел морганием, и чем чаще переключаешься, тем хуже.

        Во-вторых, незаметно: ключ выбрасывал и пересобирал всё поддерево на
        каждый переход. Поэтому смена потока начинала счётчики с нуля вместо
        того, чтобы доводить их от прежних значений, а полоса потоков не могла
        доехать до новых мест — ей нечего было сравнивать, она рождалась
        заново. Всё, что должно меняться на месте, менялось перерождением.

        Теперь `main` живёт всё время, а маршрутизатор подменяет под ним ровно
        то, что действительно другое. О переходе говорят чернила под
        подразделом и заголовок потока; содержимое просто становится другим.
      */}
      <main className="page">
        {/* A broken backend configuration is not a passing error: it stays on
            screen until it is fixed, because the app silently ran local instead. */}
        {configError && (
          <div className="error" style={{ marginBottom: 24 }}>
            {configError}
          </div>
        )}
        {error && (
          <div className="error" style={{ marginBottom: 24 }}>
            {error}
          </div>
        )}
        {stalled ? (
          <div className="hero-empty">
            <p className="muted">{t('error.loadFailed')}</p>
            <Jelly className="btn" onClick={() => void reload()} disabled={loading}>
              {t(loading ? 'error.retrying' : 'error.retry')}
            </Jelly>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
