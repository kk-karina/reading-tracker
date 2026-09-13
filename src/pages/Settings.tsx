import { useRef, useState } from 'react'
import { Segmented } from '../components/ui'
import type { Locale } from '../lib/i18n/translate'
import { emptySnapshot, type Snapshot } from '../lib/types'
import { useAuth } from '../state/AuthContext'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]

export function Settings() {
  const { user, mode, signOut } = useAuth()
  const { books, sessions, notes, importSnapshot } = useData()
  const { locale, setLocale, t } = useLocale()
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('settings.title')}</h1>
      </div>

      <div className="settings">
        <section>
          <div className="label">{t('settings.account')}</div>
          <div className="row">
            <span>{user?.email}</span>
            {mode === 'supabase' ? (
              <button className="btn ghost sm" onClick={signOut}>
                {t('settings.signOut')}
              </button>
            ) : (
              <span className="small muted">{t('settings.localMode')}</span>
            )}
          </div>
        </section>

        <section>
          <div className="label">{t('settings.language')}</div>
          <div className="row">
            <span className="small muted">{t('locale.label')}</span>
            <Segmented
              name={t('settings.language')}
              value={locale}
              options={LOCALES}
              onChange={setLocale}
            />
          </div>
        </section>

        <section>
          <div className="label">{t('settings.data')}</div>
          <div className="row">
            <span>
              {t('settings.exportHint')}
              <div className="small muted">
                {t('count.books', { n: books.length })} · {t('count.sessions', { n: sessions.length })}{' '}
                · {t('count.notes', { n: notes.length })}
              </div>
            </span>
            <button className="btn ghost sm" onClick={exportJSON}>
              {t('settings.export')}
            </button>
          </div>

          {mode === 'local' && (
            <>
              <div className="row">
                <span>{t('settings.importHint')}</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) importJSON(f)
                    e.target.value = ''
                  }}
                />
                <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>
                  {t('settings.import')}
                </button>
              </div>
              <div className="row">
                <span>{t('settings.clearHint')}</span>
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    if (confirm(t('settings.confirmClear'))) importSnapshot(emptySnapshot())
                  }}
                >
                  {t('settings.clear')}
                </button>
              </div>
            </>
          )}
          {msg && <div className="small muted">{msg}</div>}
        </section>
      </div>
    </>
  )
}
