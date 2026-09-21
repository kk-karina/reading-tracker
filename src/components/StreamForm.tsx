import { useState } from 'react'
import { ACCENTS, type Accent, type Stream } from '../lib/learning/types'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { Icon, type IconName } from './Icon'
import { Sheet } from './Sheet'
import { Jelly } from './ui'

const PICKABLE: IconName[] = [
  'compass',
  'book',
  'bulb',
  'car',
  'chat',
  'headphones',
  'chart-bar',
  'trending-up',
]

export function StreamForm({
  stream,
  onClose,
}: {
  stream?: Stream
  onClose: () => void
}) {
  const { t } = useLocale()
  const { addStream, updateStream, deleteStream, streams } = useLearning()

  const [name, setName] = useState(stream?.name ?? '')
  const [icon, setIcon] = useState<IconName>(stream?.icon ?? 'compass')
  const [accent, setAccent] = useState<Accent | null>(stream?.accent ?? null)
  const [outline, setOutline] = useState(stream?.outline ?? '')
  const [goal, setGoal] = useState(stream?.goal ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    const patch = {
      name: name.trim(),
      icon,
      accent,
      outline: outline.trim() || null,
      goal: goal.trim() || null,
    }
    if (stream) await updateStream(stream.id, patch)
    else {
      // `addStream` цель не принимает — она проставляется отдельным
      // `updateStream` сразу после создания.
      const made = await addStream({ name: patch.name, icon, accent, outline: patch.outline, sort: streams.length })
      if (made && patch.goal) await updateStream(made.id, { goal: patch.goal })
    }
    setBusy(false)
    onClose()
  }

  async function remove() {
    if (!stream || !confirm(t('stream.confirmDelete'))) return
    await deleteStream(stream.id)
    onClose()
  }

  return (
    <Sheet title={stream ? t('stream.edit') : t('hub.newStream')} onClose={onClose}>
      <label className="field">
        <span className="label">{t('stream.name')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>

      <label className="field">
        <span className="label">{t('stream.goal')}</span>
        <input
          className="input"
          value={goal}
          placeholder={t('stream.goalEmpty')}
          onChange={(e) => setGoal(e.target.value)}
        />
      </label>

      <div className="field">
        <span className="label">{t('stream.icon')}</span>
        <div className="icon-pick">
          {PICKABLE.map((n) => (
            <button
              key={n}
              type="button"
              className={`icon-opt${icon === n ? ' on' : ''}`}
              aria-label={n}
              aria-pressed={icon === n}
              onClick={() => setIcon(n)}
            >
              <Icon name={n} />
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">{t('stream.accent')}</span>
        <div className="accent-pick">
          {ACCENTS.map((a) => (
            <button
              key={a}
              type="button"
              className={`accent-opt${accent === a ? ' on' : ''}`}
              data-accent={a}
              aria-label={a}
              aria-pressed={accent === a}
              onClick={() => setAccent(accent === a ? null : a)}
            />
          ))}
        </div>
      </div>

      <label className="field">
        <span className="label">{t('stream.outline')}</span>
        <textarea
          className="textarea"
          rows={6}
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
        />
        <span className="small faint">{t('stream.outlineHint')}</span>
      </label>

      <div className="row-tight">
        <Jelly className="btn" onClick={() => void save()} disabled={busy || !name.trim()}>
          {t('form.save')}
        </Jelly>
        {stream && (
          <button className="link-btn danger" type="button" onClick={() => void remove()}>
            {t('stream.delete')}
          </button>
        )}
      </div>
    </Sheet>
  )
}
