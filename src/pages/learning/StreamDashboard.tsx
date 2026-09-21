import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StreamForm } from '../../components/StreamForm'
import { fmtDate } from '../../lib/format'
import { backlogCounts, studying } from '../../lib/learning/buckets'
import { materialProgress } from '../../lib/learning/metrics'
import { activeWeeks, lastActivity } from '../../lib/learning/rhythm'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

export function StreamDashboard() {
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials, notes, updateStream } = useLearning()
  const [editingStream, setEditingStream] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goal, setGoal] = useState(stream.goal ?? '')

  const mine = materials.filter((m) => m.stream_id === stream.id)
  const mineNotes = notes.filter((n) => mine.some((m) => m.id === n.material_id))
  const dates = mineNotes.map((n) => n.date)
  const focus = stream.focus_material_id
    ? materials.find((m) => m.id === stream.focus_material_id)
    : undefined
  const p = focus ? materialProgress(focus, notes) : null
  const counts = backlogCounts(materials, stream.id)
  const inWork = studying(materials, stream.id).length
  const last = lastActivity(dates)

  const saveGoal = async () => {
    setEditingGoal(false)
    if (goal.trim() !== (stream.goal ?? '')) await updateStream(stream.id, { goal: goal.trim() || null })
  }

  return (
    <>
      {/* Цель правится по клику, без формы: одна строка не стоит листа. */}
      {editingGoal ? (
        <input
          className="input stream-goal-input"
          value={goal}
          autoFocus
          aria-label={t('stream.goal')}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={() => void saveGoal()}
          onKeyDown={(e) => e.key === 'Enter' && void saveGoal()}
        />
      ) : (
        <button className="stream-goal" type="button" onClick={() => setEditingGoal(true)}>
          {stream.goal ?? <span className="faint">{t('stream.goalEmpty')}</span>}
        </button>
      )}

      <div className="focus-box">
        <span className="label">{t('stream.focus')}</span>
        {focus ? (
          <>
            <span className="focus-box-title">{focus.title}</span>
            <span className="small faint">
              {p?.total ? t('material.progress', { done: p.done, total: p.total }) : ''}
              {p?.total && last ? ' · ' : ''}
              {last ? t('stream.lastNote', { date: fmtDate(last, locale) }) : t('stream.neverNoted')}
            </span>
            <Link className="btn sm" to={`/learning/${stream.slug}/m/${focus.id}`}>
              {t('stream.open')}
            </Link>
          </>
        ) : (
          <span className="muted">{t('stream.focusEmpty')}</span>
        )}
      </div>

      {/* Пока строки-сводки, а не ссылки: экранов, куда вести, ещё нет. */}
      <ul className="stream-rows">
        <li>
          <span className="label">{t('nav.studying')}</span>
          <span className="small faint">{t('hub.materialCount', { n: inWork })}</span>
        </li>
        <li>
          <span className="label">{t('nav.backlog')}</span>
          <span className="small faint">
            {t('mstatus.inbox')} {counts.inbox} · {t('mstatus.someday')} {counts.someday} ·{' '}
            {t('mstatus.reference')} {counts.reference}
          </span>
        </li>
        <li>
          <span className="label">{t('nav.notes')}</span>
          <span className="small faint">{t('note.count', { n: mineNotes.length })}</span>
        </li>
      </ul>

      <p className="small faint">{t('stream.activeWeeks', { n: activeWeeks(dates) })}</p>

      <button className="link-btn" type="button" onClick={() => setEditingStream(true)}>
        {t('stream.edit')}
      </button>

      {editingStream && <StreamForm stream={stream} onClose={() => setEditingStream(false)} />}
    </>
  )
}
