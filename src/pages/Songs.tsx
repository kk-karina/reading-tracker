import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type CSSProperties, type DragEvent, type FormEvent } from 'react'
import { Bounce } from '../components/fun'
import { Burst, Counter, Jelly, listItem } from '../components/ui'
import type { Song, SongSlot, SongStatus } from '../lib/types'
import { useData } from '../state/DataContext'

const STATUSES: { id: SongStatus; label: string; hint: string; color: string; deep: string }[] = [
  { id: 'backlog', label: 'Backlog', hint: 'Want to learn', color: 'var(--cyan)', deep: 'var(--cyan-d)' },
  { id: 'learning', label: 'Learning', hint: 'Started', color: 'var(--violet)', deep: 'var(--violet-d)' },
  { id: 'learned', label: 'Learned', hint: 'Can play through', color: 'var(--teal)', deep: 'var(--teal-d)' },
]

const SLOTS: { id: SongSlot; label: string }[] = [
  { id: null, label: 'No slot' },
  { id: 'easy', label: 'Easy win' },
  { id: 'growth', label: 'Growth' },
  { id: 'dream', label: 'Dream' },
]

const slotLabel = (s: SongSlot) => SLOTS.find((x) => x.id === s)?.label ?? ''

export function Songs() {
  const { songs, loading, addSong, updateSong } = useData()
  const [artist, setArtist] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<SongStatus>('backlog')
  const [slot, setSlot] = useState<SongSlot>(null)
  const [link, setLink] = useState('')
  const [over, setOver] = useState<SongStatus | null>(null)
  const [cheer, setCheer] = useState(0)

  function move(id: string, to: SongStatus) {
    const s = songs.find((x) => x.id === id)
    if (!s || s.status === to) return
    if (to === 'learned') setCheer(Date.now())
    updateSong(id, { status: to })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!artist.trim() || !title.trim()) return
    await addSong({
      artist: artist.trim(),
      title: title.trim(),
      status,
      slot,
      link: link.trim() || null,
      sort: songs.length,
    })
    setArtist('')
    setTitle('')
    setLink('')
    setSlot(null)
  }

  function drop(e: DragEvent, to: SongStatus) {
    e.preventDefault()
    setOver(null)
    move(e.dataTransfer.getData('text/song'), to)
  }

  if (loading) return null

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">Songs</h1>
          <p className="muted">Pick without thinking: something to start, something to keep going, something to revisit.</p>
        </div>
      </div>

      <form className="song-form" onSubmit={submit}>
        <label className="field">
          <span className="label">Artist</span>
          <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Status</span>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as SongStatus)}>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Slot</span>
          <select className="select" value={slot ?? ''} onChange={(e) => setSlot((e.target.value || null) as SongSlot)}>
            {SLOTS.map((s) => (
              <option key={s.id ?? 'none'} value={s.id ?? ''}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Link (optional)</span>
          <input className="input" type="url" placeholder="tab, video…" value={link} onChange={(e) => setLink(e.target.value)} />
        </label>
        <Jelly className="btn" type="submit" disabled={!artist.trim() || !title.trim()}>
          Add
        </Jelly>
      </form>

      <div className="board">
        {STATUSES.map((col) => {
          const items = songs.filter((s) => s.status === col.id)
          return (
            <div
              key={col.id}
              id={col.id}
              className={`col${over === col.id ? ' over' : ''}${col.id === 'learned' ? ' done' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                if (over !== col.id) setOver(col.id)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => drop(e, col.id)}
              style={{ scrollMarginTop: 88, '--c': col.color, '--cd': col.deep } as CSSProperties}
            >
              <div className="col-head has-burst">
                <div>
                  <h2 className="h3">{col.label}</h2>
                  <span className="small faint">{col.hint}</span>
                </div>
                <span className="n">
                  <Counter value={items.length} />
                </span>
                {col.id === 'learned' && <Burst id={cheer} n={14} />}
              </div>
              <AnimatePresence initial={false}>
                {items.map((s) => (
                  <SongCard key={s.id} song={s} onMove={move} />
                ))}
              </AnimatePresence>
              {items.length === 0 && (
                <div className="empty small">
                  <Bounce>↓</Bounce> Drop a song here.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function SongCard({ song, onMove }: { song: Song; onMove: (id: string, to: SongStatus) => void }) {
  const { updateSong, deleteSong } = useData()
  const [editing, setEditing] = useState(false)
  const [artist, setArtist] = useState(song.artist)
  const [title, setTitle] = useState(song.title)
  const [slot, setSlot] = useState<SongSlot>(song.slot)
  const [link, setLink] = useState(song.link ?? '')

  // Stamp animates only when the card has just arrived in Learned, not on page load.
  const prevStatus = useRef(song.status)
  const justLearned = song.status === 'learned' && prevStatus.current !== 'learned'
  prevStatus.current = song.status

  const idx = STATUSES.findIndex((s) => s.id === song.status)
  const prev = STATUSES[idx - 1]?.id
  const next = STATUSES[idx + 1]?.id

  async function save(e: FormEvent) {
    e.preventDefault()
    await updateSong(song.id, {
      artist: artist.trim() || song.artist,
      title: title.trim() || song.title,
      slot,
      link: link.trim() || null,
    })
    setEditing(false)
  }

  return (
    <motion.div
      layout
      layoutId={song.id}
      {...listItem}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
    <article
      className="song"
      draggable={!editing}
      onDragStart={(e) => e.dataTransfer.setData('text/song', song.id)}
    >
      {editing ? (
        <form onSubmit={save} style={{ display: 'grid', gap: 8 }}>
          <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} aria-label="Artist" />
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
          <select className="select" value={slot ?? ''} onChange={(e) => setSlot((e.target.value || null) as SongSlot)} aria-label="Slot">
            {SLOTS.map((s) => (
              <option key={s.id ?? 'none'} value={s.id ?? ''}>
                {s.label}
              </option>
            ))}
          </select>
          <input className="input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link" aria-label="Link" />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" type="submit">
              Save
            </button>
            <button className="btn sm ghost" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {song.status === 'learned' && (
            <motion.span
              className="stamp"
              aria-hidden
              initial={justLearned ? { scale: 3, opacity: 0, rotate: 20 } : false}
              animate={{ scale: 1, opacity: 1, rotate: -12 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18, delay: justLearned ? 0.25 : 0 }}
            >
              ✓
            </motion.span>
          )}
          <div className="artist">{song.artist}</div>
          <div className="t">
            <span className="h3">{song.title}</span>
            {song.slot && <span className={`slot ${song.slot}`}>{slotLabel(song.slot)}</span>}
          </div>
          <div className="foot">
            {prev && (
              <button type="button" className="link-btn" onClick={() => onMove(song.id, prev)}>
                ← {STATUSES[idx - 1].label.toLowerCase()}
              </button>
            )}
            {next && (
              <button type="button" className="link-btn" onClick={() => onMove(song.id, next)}>
                {STATUSES[idx + 1].label.toLowerCase()} →
              </button>
            )}
            {song.link && (
              <a className="link-btn" href={song.link} target="_blank" rel="noreferrer">
                open
              </a>
            )}
            <button type="button" className="link-btn" onClick={() => setEditing(true)}>
              edit
            </button>
            <button
              type="button"
              className="link-btn danger"
              onClick={() => confirm(`Remove "${song.title}"?`) && deleteSong(song.id)}
            >
              remove
            </button>
          </div>
        </>
      )}
    </article>
    </motion.div>
  )
}
