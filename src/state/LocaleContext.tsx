import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DICT, type DictKey } from '../lib/i18n/dict'
import { translate, type Locale, type Params } from '../lib/i18n/translate'

const KEY = 'readingtracker.locale'

interface LocaleValue {
  locale: Locale
  setLocale(next: Locale): void
  t(key: DictKey, params?: Params): string
}

const LocaleContext = createContext<LocaleValue | null>(null)

/** Stored per device, not in the database: waiting on the server would flash the wrong language. */
function initial(): Locale {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    /* blocked storage: fall through to the browser's language */
  }
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initial)

  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem(KEY, locale)
    } catch {
      /* blocked storage: the choice just does not survive a reload */
    }
  }, [locale])

  const t = useCallback(
    (key: DictKey, params?: Params) => translate(DICT, locale, key, params),
    [locale],
  )

  const value = useMemo<LocaleValue>(() => ({ locale, setLocale, t }), [locale, t])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleValue {
  const v = useContext(LocaleContext)
  if (!v) throw new Error('useLocale outside LocaleProvider')
  return v
}

/** Shorthand for components that only need the translate function. */
export function useT() {
  return useLocale().t
}
