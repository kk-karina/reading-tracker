import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Toast } from '../components/fun'
import { Burst, Jelly, Segmented, listItem } from '../components/ui'
import { CATEGORIES, CATEGORY_BY_ID } from '../lib/categories'
import { fmtDate, fmtMinutes, todayISO } from '../lib/format'
import { FACES, FACE_LABELS, face } from '../lib/rating'
import type { CategoryId, LogEntry } from '../lib/types'
import { useData } from '../state/DataContext'

const QUICK = [10, 15, 20, 25, 30, 45]

interface Prefill {
  category?: CategoryId
  topic_id?: string
}

export function Log() {
  const { log, topics, loading, addLog, updateLog, deleteLog } = useData()
  const { state } = useLocation() as { state: Prefill | null }

  const [editing, setEditing] = useState<LogEntry | null>(null)
  const [date, setDate] = useState(todayISO())
  const [category, setCategory] = useState<CategoryId>(state?.category ?? 'technique')
  const [topicId, setTopicId] = useState<string>(state?.topic_id ?? '')
  const [minutes, setMinutes] = useState<string>('')
  const [note, setNote] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const [burst, setBurst] = useState(0)
  const [toast, setToast] = useState<{ id: number; text: string }>({ id: 0, text: '' })

  const catTopics = topics.filter((t) => t.category === category)
  useEffect(() => {
    if (topicId && !catTopics.some((t) => t.id === topicId)) setTopicId('')
  }, [category, topicId, catTopics])

  const days = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    for (const l of log) {
      const arr = map.get(l.date) ?? []
      arr.push(l)
      map.set(l.date, arr)
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([d, items]) => ({
        date: d,
        items: items.sort((a, b) => b.created_at.localeCompare(a.created_at)),
        total: items.reduce((s, l) => s + l.minutes, 0),
      }))
  }, [log])

  function reset() {
    setEditing(null)
    setDate(todayISO())
    setMinutes('')
    setNote('')
    setTopicId('')
    setRating(null)
  }

  function startEdit(l: LogEntry) {
    setEditing(l)
    setDate(l.date)
    setCategory(l.category)
    setTopicId(l.topic_id ?? '')
    setMinutes(String(l.minutes))
    setNote(l.note ?? '')
    setRating(l.rating ?? null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const m = parseInt(minutes, 10)
    if (!m || m <= 0) return
    const payload = {
      date,
      category,
      topic_id: topicId || null,
      minutes: m,
      note: note.trim() || null,
      rating,
    }
    if (editing) await updateLog(editing.id, payload)
    else {
      const before = log.reduce((a, l) => a + l.minutes, 0)
      await addLog(payload)
      const hoursBefore = Math.floor(before / 60)
      const hoursAfter = Math.floor((before + m) / 60)
      if (hoursAfter > hoursBefore) {
        setToast({ id: Date.now(), text: `That's ${hoursAfter} ${hoursAfter === 1 ? 'hour' : 'hours'} on the bass.` })
      }
    }
    reset()
    setSaved(true)
    setBurst(Date.now())
    setTimeout(() => setSaved(false), 1600)
  }

  const topicName = (id: string | null) => topics.find((t) => t.id === id)?.title

  if (loading) return null

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">Log</h1>
          <p className="muted">Write it down after you put the bass back. Minutes, roughly. No timer.</p>
        </div>
      </div>

      <Toast id={toast.id}>{toast.text}</Toast>

      <div className="log-grid">
        <form className="log-form" onSubmit={submit}>
          <div className="label">{editing ? 'Editing an entry' : 'New entry'}</div>

          <div className="field">
            <span className="label">Category</span>
            <Segmented
              name="category"
              className="grid3"
              color={CATEGORY_BY_ID[category].deep}
              value={category}
              options={CATEGORIES.map((c) => ({ value: c.id, label: c.short }))}
              onChange={setCategory}
            />
          </div>

          <label className="field">
            <span className="label">Topic (optional)</span>
            <select className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">— none —</option>
              {catTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span className="label">Minutes</span>
            <div className="minutes-big">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                placeholder="25"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                aria-label="Minutes"
                required
              />
              <span>min</span>
            </div>
            {parseInt(minutes, 10) >= 90 && (
              <motion.div className="small muted" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                Long one. Stretch your hands.
              </motion.div>
            )}
            <div className="chips" style={{ marginTop: 8 }}>
              {QUICK.map((q) => (
                <motion.button
                  key={q}
                  type="button"
                  className={`chip${minutes === String(q) ? ' on' : ''}`}
                  onClick={() => setMinutes(String(q))}
                  whileTap={{ scale: 0.85, rotate: -6 }}
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="label">Date</span>
            <input
              className="input mono"
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <div className="field">
            <span className="label">How did it go? (optional)</span>
            <div className="rates" role="radiogroup" aria-label="Session rating">
              {FACES.map((f, i) => {
                const v = i + 1
                const on = rating === v
                return (
                  <motion.button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={FACE_LABELS[i]}
                    title={FACE_LABELS[i]}
                    className={`rate${on ? ' on' : ''}${rating && !on ? ' dim' : ''}`}
                    onClick={() => setRating(on ? null : v)}
                    whileHover={{ scale: 1.25, rotate: i % 2 ? 8 : -8 }}
                    whileTap={{ scale: 0.8 }}
                    animate={on ? { scale: [1, 1.5, 1.2], rotate: [0, -12, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                  >
                    {f}
                  </motion.button>
                )
              })}
            </div>
          </div>

          <label className="field">
            <span className="label">Note (optional)</span>
            <textarea
              className="textarea"
              placeholder="What worked, what did not, what next"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="has-burst" style={{ display: 'inline-block' }}>
              <Jelly className={`btn${saved ? ' accent' : ''}`} type="submit" disabled={!minutes}>
                {saved ? 'Saved' : editing ? 'Save changes' : 'Add entry'}
              </Jelly>
              <Burst id={burst} />
            </span>
            {editing && (
              <button className="btn ghost" type="button" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div>
          {days.length === 0 ? (
            <div className="empty">Nothing here yet. The first entry is the hardest.</div>
          ) : (
            days.map((d) => (
              <section key={d.date} className="day">
                <div className="day-head">
                  <span className="h3">{fmtDate(d.date)}</span>
                  <span className="mono small muted">{fmtMinutes(d.total)}</span>
                </div>
                <AnimatePresence initial={false}>
                  {d.items.map((l) => (
                    <motion.div key={l.id} className="entry" layout="position" {...listItem}>
                      <span className="m">
                        {l.minutes}m
                        {face(l.rating) && <span className="face-sm">{face(l.rating)}</span>}
                      </span>
                      <div>
                        <span className="cat-dot" style={{ background: CATEGORY_BY_ID[l.category].color }} />
                        <span className="cat">{CATEGORY_BY_ID[l.category].name}</span>
                        {l.topic_id && topicName(l.topic_id) && (
                          <span className="topic-name"> · {topicName(l.topic_id)}</span>
                        )}
                        {l.note && <div className="note">{l.note}</div>}
                      </div>
                      <div className="acts">
                        <button type="button" className="link-btn" onClick={() => startEdit(l)}>
                          edit
                        </button>
                        <button
                          type="button"
                          className="link-btn danger"
                          onClick={() => confirm('Delete this entry?') && deleteLog(l.id)}
                        >
                          delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  )
}
