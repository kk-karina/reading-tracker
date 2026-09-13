import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Jelly, listItem } from '../components/ui'
import { CATEGORIES, type Category } from '../lib/categories'
import { fmtMinutes, pct } from '../lib/format'
import type { Topic } from '../lib/types'
import { minutesByCategory, minutesByTopic, useData } from '../state/DataContext'

export function Topics() {
  const { topics, log, loading } = useData()
  const { hash } = useLocation()
  const byCat = minutesByCategory(log)
  const byTopic = minutesByTopic(log)
  const total = Object.values(byCat).reduce((a, b) => a + b, 0)

  useEffect(() => {
    if (!hash || loading) return
    const el = document.getElementById(hash.slice(1))
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, loading])

  if (loading) return null

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="display">Topics</h1>
          <p className="muted">
            A map of what there is to learn, not a checklist. A topic is never finished — only
            time goes into it. Rename, add or remove anything.
          </p>
        </div>
        {total > 0 && (
          <motion.div
            className="total-pill"
            initial={{ rotate: 6, scale: 0.8, opacity: 0 }}
            animate={{ rotate: -3, scale: 1, opacity: 1 }}
            whileHover={{ rotate: 2, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          >
            {fmtMinutes(total)} so far
          </motion.div>
        )}
      </div>

      <div className="cat-grid">
        {CATEGORIES.map((c, i) => (
          <CategoryBlock
            key={c.id}
            index={i}
            category={c}
            total={byCat[c.id]}
            share={pct(byCat[c.id], total)}
            topics={topics.filter((t) => t.category === c.id)}
            byTopic={byTopic}
          />
        ))}
      </div>
    </>
  )
}

function CategoryBlock({
  index,
  category,
  total,
  share,
  topics,
  byTopic,
}: {
  index: number
  category: Category
  total: number
  share: number
  topics: Topic[]
  byTopic: Record<string, number>
}) {
  const { addTopic } = useData()
  const [draft, setDraft] = useState('')
  const max = Math.max(...topics.map((t) => byTopic[t.id] ?? 0), 1)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const title = draft.trim()
    if (!title) return
    setDraft('')
    await addTopic({ category: category.id, title, sort: topics.length })
  }

  return (
    <motion.section
      className="cat"
      id={category.id}
      style={{ '--c': category.color, '--cd': category.deep, scrollMarginTop: 88 } as CSSProperties}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.06, type: 'spring', stiffness: 200, damping: 22 }}
      whileHover={{ y: -3 }}
    >
      <div className="cat-head">
        <motion.span
          className="cat-badge"
          whileHover={{ rotate: -12, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 14 }}
        >
          <Icon name={category.icon} size={22} />
        </motion.span>
        <div className="cat-title">
          <h2 className="h2">{category.name}</h2>
          <p className="cat-scope">{category.scope}</p>
        </div>
        <div className="cat-num">
          <span className="big">{total === 0 ? '—' : fmtMinutes(total)}</span>
          {total > 0 && <span className="small faint">{share}% of all time</span>}
        </div>
      </div>

      <div className="cat-list">
        <AnimatePresence initial={false}>
          {topics.map((t) => (
            <TopicRow key={t.id} topic={t} minutes={byTopic[t.id] ?? 0} max={max} />
          ))}
        </AnimatePresence>

        <form className="topic-add" onSubmit={submit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a topic"
            aria-label={`Add a topic to ${category.name}`}
          />
          {draft.trim() && (
            <Jelly type="submit" className="btn sm ghost">
              Add
            </Jelly>
          )}
        </form>
      </div>
    </motion.section>
  )
}

function TopicRow({ topic, minutes, max }: { topic: Topic; minutes: number; max: number }) {
  const { updateTopic, deleteTopic } = useData()
  const nav = useNavigate()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(topic.title)

  async function commit() {
    setEditing(false)
    const t = title.trim()
    if (!t || t === topic.title) {
      setTitle(topic.title)
      return
    }
    await updateTopic(topic.id, { title: t })
  }

  function key(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') {
      setTitle(topic.title)
      setEditing(false)
    }
  }

  return (
    <motion.div className="topic" layout="position" {...listItem}>
      <div className="title">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={key}
            aria-label="Topic title"
          />
        ) : (
          <span onDoubleClick={() => setEditing(true)}>{topic.title}</span>
        )}
      </div>
      <div className="acts">
        <button
          type="button"
          className="link-btn"
          onClick={() => nav('/log', { state: { category: topic.category, topic_id: topic.id } })}
        >
          log
        </button>
        <button type="button" className="link-btn" onClick={() => setEditing(true)}>
          rename
        </button>
        <button
          type="button"
          className="link-btn danger"
          onClick={() => {
            if (minutes === 0 || confirm(`Remove "${topic.title}"? Logged time stays, without a topic.`))
              deleteTopic(topic.id)
          }}
        >
          remove
        </button>
      </div>
      <span className={`m${minutes === 0 ? ' zero' : ''}`}>{minutes === 0 ? '—' : fmtMinutes(minutes)}</span>
      {minutes > 0 && (
        <motion.span
          className="bar"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: `${(minutes / max) * 100}%` }}
        />
      )}
    </motion.div>
  )
}
