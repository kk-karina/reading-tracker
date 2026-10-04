import { AnimatePresence, motion } from 'motion/react'
import type { MaterialPart } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { PartDots } from '../learning/PartDots'
import { listItem } from '../ui'

/**
 * Шаг по главам или лекциям: что из них закрыто в этот заход.
 *
 * Тем же рядом точек, что у полосы прогресса материала, — жест один на оба
 * места. За одно занятие проходят и две-три лекции, поэтому отметок здесь
 * сколько угодно, а не одна галочка у одной выбранной главы.
 *
 * Отмеченные части тут же встают строками с полем имени: главу называют в
 * тот заход, когда её только что прочитали, а не потом, вспоминая.
 */
export function PartsStep({
  parts,
  picked,
  locked,
  started,
  names,
  word,
  label,
  onToggle,
  onName,
}: {
  parts: MaterialPart[]
  /** Отмеченные этим занятием — по порядку отметки. */
  picked: string[]
  /** Закрытые раньше, другими занятиями или руками. */
  locked: ReadonlySet<string>
  started: ReadonlySet<string>
  /** Набранные здесь имена. Нет ключа — имя части не трогали. */
  names: Record<string, string>
  word: 'chapter' | 'lecture'
  label: (part: MaterialPart, index: number) => string
  onToggle: (id: string) => void
  onName: (id: string, value: string) => void
}) {
  const { t } = useLocale()

  if (parts.length === 0) {
    return <p className="small faint">{t('study.noParts')}</p>
  }

  const mine = new Set(picked)
  // Ряд показывает, какой материал станет после сохранения: закрытое раньше и
  // отмеченное сейчас залиты одинаково — это одно и то же «пройдено».
  const shown = parts.map((p) => ({ ...p, done: locked.has(p.id) || mine.has(p.id) }))
  const after = shown.filter((p) => p.done).length
  const rows = parts
    .map((p, i) => ({ part: p, i }))
    .filter(({ part }) => mine.has(part.id))

  return (
    <div className="step">
      <PartDots
        className="dots-step"
        parts={shown}
        started={started}
        label={label}
        word={word}
        locked={locked}
        onToggle={(p) => onToggle(p.id)}
      />

      <ul className="step-parts">
        <AnimatePresence initial={false}>
          {rows.map(({ part, i }) => (
            <motion.li key={part.id} className="step-part" layout="position" {...listItem}>
              <span className="step-part-mark" aria-hidden>
                ✓
              </span>
              <input
                className="step-part-name"
                aria-label={t(word === 'lecture' ? 'part.nameLecture' : 'part.nameChapter')}
                placeholder={label({ ...part, title: '' }, i)}
                value={names[part.id] ?? part.title}
                onChange={(e) => onName(part.id, e.target.value)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <p className="small faint mono step-after">
        {rows.length === 0
          ? t(word === 'lecture' ? 'step.pickLectures' : 'step.pickChapters')
          : t('study.willBe', { done: after, total: parts.length })}
      </p>
    </div>
  )
}
