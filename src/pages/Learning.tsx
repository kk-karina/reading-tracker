import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../components/Icon'
import { MaterialForm } from '../components/MaterialForm'
import { StreamForm } from '../components/StreamForm'
import { Jelly } from '../components/ui'
import { materialProgress } from '../lib/learning/metrics'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'

/** Подсказки при пустом разделе — быстрый старт, а не константы системы. */
const SUGGESTED: { name: string; icon: IconName }[] = [
  { name: 'Professional Growth', icon: 'compass' },
  { name: 'Driving', icon: 'car' },
  { name: 'English', icon: 'chat' },
]

export function Learning() {
  const { t } = useLocale()
  const { streams, materials, notes, loading, addStream } = useLearning()

  const [active, setActive] = useState<string | null>(null)
  const [editingStream, setEditingStream] = useState<string | null>(null)
  const [newStream, setNewStream] = useState(false)
  const [newMaterial, setNewMaterial] = useState(false)

  if (loading) return null

  const live = streams.filter((s) => !s.archived)
  // Первый поток подставляется сам: раздел не должен открываться ничем.
  const current = live.find((s) => s.id === active) ?? live[0] ?? null
  const mine = current ? materials.filter((m) => m.stream_id === current.id) : []

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('learning.title')}</h1>
      </div>

      {live.length === 0 ? (
        <div className="hero-empty">
          <p className="muted">{t('learning.empty')}</p>
          <Jelly className="btn" onClick={() => setNewStream(true)}>
            {t('learning.newStream')}
          </Jelly>
          <p className="small faint">{t('learning.suggest')}</p>
          <div className="row-tight">
            {SUGGESTED.map((s, i) => (
              <button
                key={s.name}
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  void addStream({
                    name: s.name,
                    icon: s.icon,
                    accent: null,
                    outline: null,
                    sort: i,
                  })
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="cat-tabs" role="tablist" aria-label={t('learning.title')}>
            {live.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === current?.id}
                className={`cat-tab${s.id === current?.id ? ' on' : ''}`}
                data-accent={s.accent ?? undefined}
                onClick={() => setActive(s.id)}
              >
                <Icon name={s.icon} size={16} />
                {s.name}
              </button>
            ))}
            <button
              type="button"
              className="cat-tab add"
              aria-label={t('learning.newStream')}
              onClick={() => setNewStream(true)}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>

          {current && (
            <>
              <div className="panel-head">
                <span className="label">{current.name}</span>
                <div className="row-tight">
                  <button
                    className="link-btn"
                    type="button"
                    onClick={() => setEditingStream(current.id)}
                  >
                    {t('stream.edit')}
                  </button>
                  <Jelly className="btn sm" onClick={() => setNewMaterial(true)}>
                    {t('learning.newMaterial')}
                  </Jelly>
                </div>
              </div>

              {mine.length === 0 ? (
                <div className="empty small">{t('learning.materialsEmpty')}</div>
              ) : (
                <ul className="mat-list">
                  {mine.map((m) => {
                    const p = materialProgress(m, notes)
                    return (
                      <li key={m.id}>
                        <Link to={`/learning/m/${m.id}`} className="mat-row">
                          <span className="mat-main">
                            <span className="mat-title">{m.title}</span>
                            <span className="small faint">
                              {t(`kind.${m.kind}`)}
                              {m.author ? ` · ${m.author}` : ''}
                            </span>
                          </span>
                          <span className="mat-meta">
                            <span className="chip sm">{t(`mstatus.${m.status}`)}</span>
                            <span className="small faint mono">
                              {p.total
                                ? t('material.progress', { done: p.done, total: p.total })
                                : t('note.count', { n: p.done })}
                            </span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </>
      )}

      {newStream && <StreamForm onClose={() => setNewStream(false)} />}
      {editingStream && (
        <StreamForm
          stream={live.find((s) => s.id === editingStream)}
          onClose={() => setEditingStream(null)}
        />
      )}
      {newMaterial && current && (
        <MaterialForm streamId={current.id} onClose={() => setNewMaterial(false)} />
      )}
    </>
  )
}
