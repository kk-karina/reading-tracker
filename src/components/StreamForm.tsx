import { useState } from 'react'
import { funnyGoal } from '../lib/learning/goals'
import { ACCENTS, type Accent, type Stream } from '../lib/learning/types'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { GoalRoll } from './learning/GoalRoll'
import { Sheet } from './Sheet'
import { Field, FormStack, Jelly } from './ui'

export function StreamForm({
  stream,
  onClose,
  onCreated,
}: {
  stream?: Stream
  onClose: () => void
  /** Заведённый поток отдаётся наружу: экран создания не всегда тот, на котором его видно. */
  onCreated?: (made: Stream) => void
}) {
  const { t, locale } = useLocale()
  const { addStream, updateStream, deleteStream, streams } = useLearning()

  const [name, setName] = useState(stream?.name ?? '')
  /**
   * Новому потоку цвет достаётся сразу, по счёту заведённых.
   *
   * Раньше он начинался с «никакого»: цвет был украшением шапки дашборда, и
   * без него поток просто выглядел скромнее. Теперь это его метка в полосе
   * переключения, и поток без цвета — поток без метки; просить выбрать её
   * руками значит просить решить про поток раньше, чем в нём что-то есть.
   * Снять цвет по-прежнему можно, нажав на выбранный кружок второй раз.
   */
  const [accent, setAccent] = useState<Accent | null>(
    stream?.accent ?? ACCENTS[streams.length % ACCENTS.length],
  )
  const [outline, setOutline] = useState(stream?.outline ?? '')
  const [goal, setGoal] = useState(stream?.goal ?? '')
  /**
   * Пока цель не трогали руками, она придумывается из имени и меняется вместе
   * с ним: назвала поток «Driving» — цель уже про парковку. Первая же правка
   * поля делает цель своей, и дальше имя её не переписывает.
   */
  const [goalTouched, setGoalTouched] = useState(!!stream?.goal)
  const [roll, setRoll] = useState(0)
  const shownGoal = goalTouched ? goal : funnyGoal(name, locale, roll)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    const patch = {
      name: name.trim(),
      accent,
      outline: outline.trim() || null,
      goal: shownGoal.trim() || null,
    }
    if (stream) await updateStream(stream.id, patch)
    else {
      // `addStream` цель не принимает — она проставляется отдельным
      // `updateStream` сразу после создания.
      const made = await addStream({ name: patch.name, accent, outline: patch.outline, sort: streams.length })
      if (made && patch.goal) await updateStream(made.id, { goal: patch.goal })
      if (made) onCreated?.(made)
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
      <FormStack>
      <Field label={t('stream.name')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>

      <Field label={t('stream.goal')}>
        <input
          className="input"
          value={shownGoal}
          placeholder={t('stream.goalEmpty')}
          onChange={(e) => {
            setGoal(e.target.value)
            setGoalTouched(true)
          }}
        />
        {name.trim() && (
          <GoalRoll
            onClick={() => {
              setRoll((r) => r + 1)
              setGoalTouched(false)
            }}
          />
        )}
      </Field>

      <Field label={t('stream.accent')} group>
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
      </Field>

      <Field label={t('stream.outline')} hint={t('stream.outlineHint')}>
        <textarea
          className="textarea"
          rows={6}
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
        />
      </Field>

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
      </FormStack>
    </Sheet>
  )
}
