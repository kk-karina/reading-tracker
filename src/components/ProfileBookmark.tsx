import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AVATAR_IDS } from '../lib/avatars'
import type { Locale } from '../lib/i18n/translate'
import { addSampleShelf } from '../lib/seed'
import { emptySnapshot, type Snapshot } from '../lib/types'
import { useAuth } from '../state/AuthContext'
import { useData } from '../state/DataContext'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { AvatarButton, AvatarFace } from './Avatar'
import { Icon, type IconName } from './Icon'
import { Segmented } from './ui'

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]

/**
 * Лента выезжает из-под шапки, как закладка из-под переплёта: разворачивается
 * вниз от верхнего края и сворачивается туда же. Кривая — выдвижная панель:
 * быстро трогается, долго дотягивает. Обратно — короче: уходящее не ждут.
 */
const UNROLL = { duration: 0.3, ease: [0.32, 0.72, 0, 1] as const }
const ROLL_UP = { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const }
const ROLLED = 'inset(0% 0% 100% 0%)'
const OPEN = 'inset(0% 0% 0% 0%)'

/**
 * Профиль — закладка, а не страница.
 *
 * Здесь всё, что про тебя и про это устройство, а не про книги: лицо, почта,
 * язык, выгрузка данных, выход. Страница под это была третьим местом рядом с
 * двумя разделами, а шапка держала половину этого россыпью — шестерёнку, язык,
 * почту. Теперь в шапке одно лицо, и всё остальное свисает из-под него.
 */
export function Profile() {
  const t = useLocale().t
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const location = useLocation()

  // Переход по ссылке — тоже «ушла отсюда»: закладка не едет следом.
  const [path, setPath] = useState(location.pathname)
  if (path !== location.pathname) {
    setPath(location.pathname)
    setOpen(false)
  }

  return (
    <div className="profile">
      <button
        ref={trigger}
        type="button"
        className={`profile-trigger${open ? ' on' : ''}`}
        aria-label={t('profile.title')}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <AvatarFace size={40} />
      </button>
      <AnimatePresence>
        {open && (
          <Bookmark
            onClose={(refocus) => {
              setOpen(false)
              if (refocus) trigger.current?.focus()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Bookmark({ onClose }: { onClose: (refocus: boolean) => void }) {
  const { user, mode, signOut, avatar, setAvatar } = useAuth()
  const { books, sessions, notes, addBook, addSession, importSnapshot } = useData()
  const { locale, setLocale, t } = useLocale()
  const { pending, carry, error: learningError } = useLearning()
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<'sample' | 'carry' | null>(null)

  // Закрывается щелчком мимо и Esc. Лист выбора аватара открыт поверх — он
  // живёт в `body`, и щелчок по нему не «мимо закладки», а Esc в нём
  // закрывает его, а не её.
  const onDown = useEffectEvent((e: PointerEvent) => {
    const target = e.target as Element | null
    if (!target || box.current?.contains(target)) return
    if (target.closest('.sheet-scrim, .profile-trigger')) return
    onClose(false)
  })
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== 'Escape' || document.querySelector('.sheet-scrim')) return
    onClose(true)
  })
  useEffect(() => {
    const down = (e: PointerEvent) => onDown(e)
    const key = (e: KeyboardEvent) => onKey(e)
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    // Фокус — на лицо: закладку открывают чаще всего ради него.
    box.current?.querySelector<HTMLElement>('.avatar-btn')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [])

  function flip(step: 1 | -1) {
    const at = avatar ? AVATAR_IDS.indexOf(avatar) : 0
    setAvatar(AVATAR_IDS[(at + step + AVATAR_IDS.length) % AVATAR_IDS.length])
  }

  function exportJSON() {
    const snap: Snapshot = { books, sessions, notes }
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reading-tracker-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function loadSample() {
    setBusy('sample')
    const added = await addSampleShelf(books, addBook, addSession)
    setBusy(null)
    setMsg(added > 0 ? t('settings.sampleAdded', { n: added }) : t('settings.sampleNone'))
  }

  /**
   * Обычно обучение уезжает в облако само при первом входе. Эта кнопка — для
   * случая, когда само не взялось: в облаке уже что-то есть, а в браузере
   * осталось написанное до аккаунта.
   */
  async function carryLearning() {
    setBusy('carry')
    const moved = await carry()
    setBusy(null)
    if (moved === null) setMsg(learningError ?? t('settings.importFailed'))
    else setMsg(moved > 0 ? t('settings.carryDone', { n: moved }) : t('settings.carryNothing'))
  }

  async function importJSON(file: File) {
    try {
      const snap = JSON.parse(await file.text()) as Snapshot
      if (!Array.isArray(snap.books) || !Array.isArray(snap.sessions) || !Array.isArray(snap.notes))
        throw new Error(t('settings.notAnExport'))
      if (!confirm(t('settings.confirmImport'))) return
      await importSnapshot(snap)
      setMsg(t('settings.imported'))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t('settings.importFailed'))
    }
  }

  const fade = { opacity: 0 }
  return (
    <div className="bookmark">
      <motion.div
        ref={box}
        className="bookmark-roll"
        role="dialog"
        aria-label={t('profile.title')}
        initial={reduce ? fade : { clipPath: ROLLED }}
        animate={reduce ? { opacity: 1 } : { clipPath: OPEN, transition: UNROLL }}
        exit={reduce ? fade : { clipPath: ROLLED, transition: ROLL_UP }}
      >
        <div className="bookmark-ribbon">
          <div className="bookmark-face">
            <button
              type="button"
              className="bookmark-flip prev"
              onClick={() => flip(-1)}
              aria-label={t('avatar.prev')}
            >
              <Icon name="chevron-down" size={18} />
            </button>
            <AvatarButton size={96} />
            <button
              type="button"
              className="bookmark-flip next"
              onClick={() => flip(1)}
              aria-label={t('avatar.next')}
            >
              <Icon name="chevron-down" size={18} />
            </button>
          </div>
          {/* Подпись к рисунку — почта, рукой: так подписывают своё — на
              форзаце, на закладке. Шрифт тот же, что у подписей к рисункам
              пустых мест. Имя рисунка зрячему не нужно — он его видит, — а
              диктору говорится при каждой смене. */}
          <div className="bookmark-who">
            <span className="bookmark-email">
              <Email value={user?.email ?? ''} />
            </span>
            {mode === 'local' && <span className="bookmark-note">{t('settings.localMode')}</span>}
            <span className="visually-hidden" aria-live="polite">
              {avatar ? t(`avatar.${avatar}`) : ''}
            </span>
          </div>

          <Segmented
            name={t('settings.language')}
            value={locale}
            options={LOCALES}
            onChange={setLocale}
            className="sm bookmark-lang"
            color="var(--paper)"
          />

          <div className="bookmark-acts">
            <button type="button" className="bookmark-act" onClick={exportJSON}>
              <Sticker icon="download" />
              <span className="bookmark-act-text">
                {t('profile.export')}
                <span className="bookmark-note">
                  {t('count.books', { n: books.length })} · {t('count.sessions', { n: sessions.length })}
                </span>
              </span>
            </button>
            <button type="button" className="bookmark-act" onClick={loadSample} disabled={busy !== null}>
              <Sticker icon="book-open" />
              <span className="bookmark-act-text">
                {t(busy === 'sample' ? 'settings.sampleLoading' : 'settings.sample')}
              </span>
            </button>
            {pending !== null && (
              <button type="button" className="bookmark-act" onClick={carryLearning} disabled={busy !== null}>
                <Sticker icon="cloud-upload" />
                <span className="bookmark-act-text">
                  {t(busy === 'carry' ? 'settings.carryWorking' : 'profile.carry')}
                  <span className="bookmark-note">{t('count.rows', { n: pending })}</span>
                </span>
              </button>
            )}
            {mode === 'local' && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void importJSON(f)
                    e.target.value = ''
                  }}
                />
                <button type="button" className="bookmark-act" onClick={() => fileRef.current?.click()}>
                  <Sticker icon="file-upload" />
                  <span className="bookmark-act-text">
                    {t('profile.import')}
                    <span className="bookmark-note">{t('profile.importNote')}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="bookmark-act danger"
                  onClick={() => {
                    if (confirm(t('settings.confirmClear'))) void importSnapshot(emptySnapshot())
                  }}
                >
                  <Sticker icon="trash" />
                  <span className="bookmark-act-text">{t('profile.clear')}</span>
                </button>
              </>
            )}
            {msg && (
              <p className="bookmark-note bookmark-msg" role="status">
                {msg}
              </p>
            )}
          </div>

          {mode === 'supabase' && (
            <button type="button" className="bookmark-out link-btn" onClick={() => void signOut()}>
              {t('settings.signOut')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/**
 * Значок действия — наклейкой на ленте: белый кружок, налепленный чуть
 * вкривь. Наклон у каждой свой и берётся из места в списке (`nth-child` в
 * стилях), а не случаем: случайный менялся бы при каждом открытии.
 */
function Sticker({ icon }: { icon: IconName }) {
  return (
    <span className="bookmark-sticker" aria-hidden>
      <Icon name={icon} size={16} />
    </span>
  )
}

/**
 * Длинный адрес переносится перед «@», а не посреди слова: имя и домен
 * читаются целыми. Посреди слова — только если и половина не влезает.
 */
function Email({ value }: { value: string }) {
  const at = value.indexOf('@')
  if (at <= 0) return <>{value}</>
  return (
    <>
      {value.slice(0, at)}
      <wbr />
      {value.slice(at)}
    </>
  )
}
