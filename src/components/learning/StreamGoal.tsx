import { motion } from 'motion/react'
import { useState } from 'react'
import { funnyGoal } from '../../lib/learning/goals'
import type { Stream } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { GoalRoll } from './GoalRoll'

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
 *
 * Пока цели нет, на её месте стоит придуманная по имени потока — приглушённо,
 * чтобы читалась предложением, а не ответом (см. `funnyGoal`). Нажатие
 * открывает её на правку уже вписанной: поправить чужую шутку проще, чем
 * начать с пустого поля, а оставить как есть — тоже ответ.
 */
export function StreamGoal({ stream }: { stream: Stream }) {
  const { t, locale } = useLocale()
  const { updateStream } = useLearning()
  const [editing, setEditing] = useState(false)
  const [goal, setGoal] = useState(stream.goal ?? '')
  const [roll, setRoll] = useState(0)

  const idea = stream.goal ? null : funnyGoal(stream.name, locale, roll)

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

  const edit = () => {
    // Цель подтягивается заново по клику, а не с монтирования: её мог
    // поменять другой редактор, пока поле было свёрнуто, и blur иначе
    // перезаписал бы чужую правку старым текстом.
    setGoal(stream.goal ?? idea ?? '')
    setEditing(true)
  }

  if (idea) {
    return (
      <div className="hero-goal-idea">
        <button className="hero-goal" type="button" title={t('stream.goalHint')} onClick={edit}>
          {/* Новая цель проявляется из размытия, а не из нуля: старая уходит
              в тот же кадр, и строка ни на миг не пустеет. */}
          <motion.span
            key={idea}
            className="hero-goal-empty"
            initial={roll === 0 ? false : { opacity: 0.35, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            {idea}
          </motion.span>
        </button>
        <GoalRoll onClick={() => setRoll((r) => r + 1)} />
      </div>
    )
  }

  return (
    <button className="hero-goal" type="button" title={t('stream.goalHint')} onClick={edit}>
      {stream.goal}
    </button>
  )
}
