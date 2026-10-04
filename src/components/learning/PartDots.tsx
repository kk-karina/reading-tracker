import { type CSSProperties } from 'react'
import { partState, type PartState } from '../../lib/learning/parts'
import type { MaterialPart } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'

/**
 * Насколько точка мельчает на длинном курсе.
 *
 * Ряд живёт в той же колонке, что полоса прогресса, и длинный курс в ней
 * просто переносится на вторую строку. Но сорок точек в четыре ряда перестают
 * читаться как один предмет, поэтому с ростом числа точка ужимается. Ниже
 * семи пикселей не опускаемся: меньшая точка уже не различает заливку и
 * обводку, то есть перестаёт говорить то единственное, ради чего нарисована.
 *
 * Второе число — для пальца. Точка размером с букву под пальцем не
 * нажимается, а промах здесь не «ничего не случилось», а отметка на чужой
 * лекции. Но и поднимать её до пальца одинаково для всех нельзя: сотня точек
 * по восемнадцать пикселей занимает на телефоне пол-экрана. Поэтому запас
 * тает вместе с размером — выбирает между ними CSS, по виду указателя.
 */
const DOT = [
  { upTo: 24, base: 12, touch: 18 },
  { upTo: 60, base: 9, touch: 14 },
  { upTo: Infinity, base: 7, touch: 11 },
]

const dotSize = (n: number) => DOT.find((d) => n <= d.upTo) ?? DOT[DOT.length - 1]

/**
 * Прогресс материала точками: по точке на главу или лекцию.
 *
 * Полоса отвечает «примерно сколько», ряд точек — «сколько из скольких» и
 * заодно «каких именно»: закрашенная пройдена, закрашенная слева наполовину —
 * начата, пустая не тронута. Те же три состояния и в списке частей, и в выборе главы на листе
 * занятия; здесь они просто видны все сразу.
 *
 * Точка нажимается и идёт по циклу: пусто → начата → пройдена → пусто
 * (`nextPartState`). Это не украшение поверх списка, а самый короткий путь к
 * тому, ради чего в список и заходят: отметить лекцию пройденной — или
 * пройденной до середины. Имя части живёт в подсказке — потому и стоит её
 * называть.
 *
 * Движение здесь одно и одно на все двери: заливка вырастает из центра левой
 * половиной, когда часть начата, и дозаливает правую, когда пройдена, —
 * отмечена она точкой, галочкой в списке ниже или листом занятия. Залпа и прочего праздника на последней части нет: в
 * приложении нет такого обычая ни у дочитанной книги, ни у закрытого потока, и
 * заводить его одному экрану — значит обещать то, чего остальные не делают.
 */
export function PartDots({
  parts,
  started,
  label,
  word,
  onToggle,
  locked,
  className,
}: {
  parts: MaterialPart[]
  /** Части, по которым конспект есть, а отметки нет. */
  started: ReadonlySet<string>
  label: (part: MaterialPart, index: number) => string
  word: 'chapter' | 'lecture'
  /** Нажали точку; `state` — как она выглядит сейчас, от него идёт цикл. */
  onToggle: (part: MaterialPart, state: PartState) => void
  /**
   * Части, которые здесь не нажимаются. Лист занятия отмечает то, что пройдено
   * в этот заход; закрытое раньше стоит залитым, но снять его отсюда значило
   * бы переписать чужое занятие.
   */
  locked?: ReadonlySet<string>
  className?: string
}) {
  const { t } = useLocale()

  if (parts.length === 0) return null

  const size = dotSize(parts.length)

  return (
    <div
      className={`dots${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={t(word === 'lecture' ? 'part.lectures' : 'part.chapters')}
      style={
        {
          '--dot-base': `${size.base}px`,
          '--dot-touch': `${size.touch}px`,
        } as CSSProperties
      }
    >
      {parts.map((part, i) => {
        const state = partState(part, started)
        const name = label(part, i)
        return (
          <button
            key={part.id}
            type="button"
            className={`dot ${state}`}
            // Начатая — «наполовину нажата»: так диктор и читает тройной переключатель.
            aria-pressed={state === 'done' ? true : state === 'started' ? 'mixed' : false}
            disabled={locked?.has(part.id)}
            // Подпись диктору — имя и состояние; подсказка мыши — одно имя:
            // состояние она и так показывает заливкой.
            aria-label={`${name} — ${t(`part.state.${state}`)}`}
            title={name}
            onClick={() => onToggle(part, state)}
          >
            <span className="dot-fill" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
