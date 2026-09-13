import { useRef, useState } from 'react'
import { buildDemo } from '../lib/demo'
import type { Snapshot } from '../lib/types'
import { useAuth } from '../state/AuthContext'
import { useData } from '../state/DataContext'

export function Settings() {
  const { user, mode, signOut } = useAuth()
  const { topics, songs, log, restoreSampleTopics, importSnapshot } = useData()
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function exportJSON() {
    const snap: Snapshot = { topics, songs, log }
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `slap-that-bass-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importJSON(file: File) {
    try {
      const snap = JSON.parse(await file.text()) as Snapshot
      if (!Array.isArray(snap.topics) || !Array.isArray(snap.songs) || !Array.isArray(snap.log))
        throw new Error('Not a slap that bass export.')
      if (!confirm('Replace everything on this device with the file contents?')) return
      await importSnapshot(snap)
      setMsg('Imported.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not import.')
    }
  }

  return (
    <>
      <div className="page-head">
        <h1 className="display">Settings</h1>
      </div>

      <div className="settings">
        <section>
          <div className="label">Account</div>
          <div className="row">
            <span>{user?.email}</span>
            {mode === 'supabase' ? (
              <button className="btn ghost sm" onClick={signOut}>
                Sign out
              </button>
            ) : (
              <span className="small muted">Local mode — data stays in this browser</span>
            )}
          </div>
        </section>

        <section>
          <div className="label">Data</div>
          <div className="row">
            <span>
              Export everything as JSON
              <div className="small muted">
                {topics.length} topics · {songs.length} songs · {log.length} log entries
              </div>
            </span>
            <button className="btn ghost sm" onClick={exportJSON}>
              Export
            </button>
          </div>
          {mode === 'local' && (
            <div className="row">
              <span>Import a JSON export (replaces current data)</span>
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
                Import
              </button>
            </div>
          )}
          <div className="row">
            <span>
              Restore sample topics
              <div className="small muted">Adds back any of the topics from the brief you removed.</div>
            </span>
            <button
              className="btn ghost sm"
              onClick={async () => {
                const n = await restoreSampleTopics()
                setMsg(n ? `Added ${n} topic${n === 1 ? '' : 's'}.` : 'Nothing missing.')
              }}
            >
              Restore
            </button>
          </div>
          {msg && <div className="small muted">{msg}</div>}
        </section>

        {mode === 'local' && (
          <section>
            <div className="label">Local mode</div>
            <div className="row">
              <span>
                Load sample data
                <div className="small muted">A month of made-up entries and placeholder songs, to see the pages filled in.</div>
              </span>
              <button
                className="btn ghost sm"
                onClick={() => {
                  if (confirm('Replace current data with sample data?')) importSnapshot(buildDemo(topics))
                }}
              >
                Load
              </button>
            </div>
            <div className="row">
              <span>Clear everything on this device</span>
              <button
                className="btn ghost sm"
                onClick={() => {
                  if (confirm('Delete all local data? Sample topics will be re-added.'))
                    importSnapshot({ topics: [], songs: [], log: [] })
                }}
              >
                Clear
              </button>
            </div>
          </section>
        )}

        <section>
          <div className="label">About</div>
          <p className="small muted" style={{ margin: 0 }}>
            The six categories and the sample topics come from the 26‑week brief. Nothing here is
            an assessment; logged minutes and self‑ratings are your own evidence.
          </p>
        </section>
      </div>
    </>
  )
}
