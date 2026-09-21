import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/Icon'
import { StreamForm } from '../../components/StreamForm'
import { Jelly } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { backlogCounts } from '../../lib/learning/buckets'
import { materialProgress } from '../../lib/learning/metrics'
import { lastActivity } from '../../lib/learning/rhythm'
import type { Stream } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'

/** Подсказки при пустом разделе — быстрый старт, а не константы системы. */
const SUGGESTED: { name: string; icon: IconName }[] = [
  { name: 'Professional Growth', icon: 'compass' },
  { name: 'Driving', icon: 'car' },
  { name: 'English', icon: 'chat' },
]

export function Streams() {
  const { t, locale } = useLocale()
  const { streams, materials, notes, loading, addStream } = useLearning()
  const [adding, setAdding] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  if (loading) return null

  const live = streams.filter((s) => !s.archived)
  const archived = streams.filter((s) => s.archived)

  const card = (s: Stream) => {
    const focus = s.focus_material_id
      ? materials.find((m) => m.id === s.focus_material_id)
      : undefined
    const mine = materials.filter((m) => m.stream_id === s.id)
    const last = lastActivity(
      notes.filter((n) => mine.some((m) => m.id === n.material_id)).map((n) => n.date),
    )
    const p = focus ? materialProgress(focus, notes) : null
    const inbox = backlogCounts(materials, s.id).inbox

    return (
      <li key={s.id}>
        <Link
          to={`/learning/${s.slug}`}
          className="stream-card"
          data-accent={s.accent ?? undefined}
        >
          <span className="stream-card-head">
            <Icon name={s.icon} size={18} />
            <span className="stream-card-name">{s.name}</span>
          </span>
          {/* Без фокуса карточка не пустует: она говорит, сколько всего лежит. */}
          <span className="stream-card-focus">
            {focus ? focus.title : <span className="faint">{t('hub.noFocus')}</span>}
          </span>
          <span className="small faint">
            {focus && p?.total
              ? t('material.progress', { done: p.done, total: p.total })
              : t('hub.materialCount', { n: mine.length })}
          </span>
          <span className="stream-card-foot small faint">
            <span>{last ? fmtDate(last, locale) : t('stream.neverNoted')}</span>
            {inbox > 0 && <span className="chip sm">{inbox}</span>}
          </span>
        </Link>
      </li>
    )
  }

  // Архив живёт в обеих ветках: заархивировать все потоки — это состояние, а не
  // пустота, и путь к ним из него обязан оставаться.
  const archiveBlock = archived.length > 0 && (
    <>
      <button className="link-btn" type="button" onClick={() => setShowArchive((v) => !v)}>
        {t('hub.archived', { n: archived.length })}
      </button>
      {showArchive && <ul className="stream-grid dim">{archived.map(card)}</ul>}
    </>
  )

  if (live.length === 0) {
    return (
      <>
        <div className="page-head">
          <h1 className="display">{t('hub.title')}</h1>
        </div>
        <div className="hero-empty">
          <p className="muted">{t('hub.empty')}</p>
          <Jelly className="btn" onClick={() => setAdding(true)}>
            {t('hub.newStream')}
          </Jelly>
          <p className="small faint">{t('hub.suggest')}</p>
          <div className="row-tight">
            {SUGGESTED.map((s, i) => (
              <button
                key={s.name}
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  void addStream({ name: s.name, icon: s.icon, accent: null, outline: null, sort: i })
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
        {archiveBlock}
        {adding && <StreamForm onClose={() => setAdding(false)} />}
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('hub.title')}</h1>
        <Jelly className="btn" onClick={() => setAdding(true)}>
          {t('hub.newStream')}
        </Jelly>
      </div>

      <ul className="stream-grid">{live.map(card)}</ul>

      {/* Архив не прячется совсем и не мешает: строка есть, только когда в нём что-то лежит. */}
      {archiveBlock}

      {adding && <StreamForm onClose={() => setAdding(false)} />}
    </>
  )
}
