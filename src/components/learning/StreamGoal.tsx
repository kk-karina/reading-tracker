import { useState } from 'react'
import type { Stream } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'

/**
 * Цель — заголовок экрана и его единственная крупная строка.
 *
 * Имя потока уже написано в ряду сверху, и повторять его крупно незачем.
 * Крупным идёт «зачем»: это единственная строка экрана, которая отвечает не
 * на «что дальше», а на «ради чего», и мотивирует только она.
 *
 * Подписи над ней нет намеренно. Строка такого кегля на подложке потока не
 * нуждается в том, чтобы её представили, а «ЦЕЛЬ» сверху — ровно тот ярлык,
 * который отнимает у заголовка его вес.
 */
export function StreamGoal({ stream }: { stream: Stream }) {
  const { t } = useLocale()
  const { updateStream } = useLearning()
  const [editing, setEditing] = useState(false)
  const [goal, setGoal] = useState(stream.goal ?? '')

  const save = async () => {
    setEditing(false)
    if (goal.trim() !== (stream.goal ?? '')) {
      await updateStream(stream.id, { goal: goal.trim() || null })
    }
  }

  if (editing) {
    return (
      <input
        className="hero-goal-input"
        value={goal}
        autoFocus
        aria-label={t('stream.goal')}
        onChange={(e) => setGoal(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => e.key === 'Enter' && void save()}
      />
    )
  }

  return (
    <button
      className="hero-goal"
      type="button"
      title={t('stream.goalHint')}
      onClick={() => {
        // Цель подтягивается заново по клику, а не с монтирования: её мог
        // поменять другой редактор, пока поле было свёрнуто, и blur иначе
        // перезаписал бы чужую правку старым текстом.
        setGoal(stream.goal ?? '')
        setEditing(true)
      }}
    >
      {stream.goal ?? <span className="hero-goal-empty">{t('stream.goalEmpty')}</span>}
    </button>
  )
}
