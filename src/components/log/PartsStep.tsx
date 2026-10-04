import { AnimatePresence, motion } from 'motion/react'
import type { PartMark } from '../../lib/learning/parts'
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
 * Точка идёт по циклу: наполовину → целиком → снята (`cycleMark`). Пройденная
 * до середины — та же «начата», что ядром стоит в ряду точек везде.
 *
 * Отмеченные части тут же встают строками с полем имени: главу называют в
 * тот заход, когда её только что прочитали, а не потом, вспоминая.
 */
export function PartsStep({
  parts,
  marks,
  locked,
  started,
  names,
  word,
  label,
  onToggle,
  onName,
}: {
  parts: MaterialPart[]
  /** Отмеченные этим занятием — по порядку отметки, наполовину или целиком. */
  marks: PartMark[]
  /** Закрытые раньше, другими занятиями или руками. */
  locked: ReadonlySet<string>
  /** Начатые раньше: руками другим занятием или конспектом. */
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

  const mine = new Map(marks.map((m) => [m.id, m.half]))
  // Ряд показывает, какой материал станет после сохранения: закрытое раньше и
  // отмеченное сейчас залиты одинаково — это одно и то же «пройдено»; начатое
  // раньше и отмеченное наполовину сейчас — одно и то же «начата».
  const shown = parts.map((p) => ({
    ...p,
    done: locked.has(p.id) || mine.get(p.id) === false,
    started: mine.get(p.id) === true,
  }))
  const after = shown.filter((p) => p.done).length
  const rows = marks
    .map((m) => {
      const i = parts.findIndex((p) => p.id === m.id)
      return i < 0 ? null : { part: parts[i], i, half: m.half }
    })
    .filter((r): r is { part: MaterialPart; i: number; half: boolean } => r !== null)

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
          {rows.map(({ part, i, half }) => (
            <motion.li key={part.id} className="step-part" layout="position" {...listItem}>
              {/* Знак — тем же местом и кеглем: ✓ целиком, ½ до середины. Диктору
                  — словом, знак ему ничего не скажет. */}
              <span className={`step-part-mark${half ? ' half' : ''}`} aria-label={half ? t('part.halfMark') : undefined}>
                {half ? '½' : '✓'}
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
