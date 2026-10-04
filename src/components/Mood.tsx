import awful from '../assets/moods/awful.webp'
import flat from '../assets/moods/flat.webp'
import glad from '../assets/moods/glad.webp'
import great from '../assets/moods/great.webp'
import unsure from '../assets/moods/unsure.webp'
import { MOODS, moodOf, type MoodId } from '../lib/rating'
import { useT } from '../state/LocaleContext'

/**
 * Лица оценки — герой того же пака, что аватары и пустые места, вместо
 * системных эмодзи: те рисуются каждой платформой по-своему и в приложении
 * со своим героем выглядели чужими. Запись полная: забытый файл ловит `tsc`.
 */
const MOOD_SRC: Record<MoodId, string> = { awful, unsure, flat, glad, great }

type Rating = 1 | 2 | 3 | 4 | 5

/**
 * Лицо оценки в строке журнала — у правого края (`LogRow mood`). Вызывается
 * как `s.rating && <Mood … />`: без оценки лица нет.
 */
export function Mood({ rating }: { rating: number }) {
  const t = useT()
  const id = moodOf(rating)
  if (!id) return null
  const name = t(`face.${rating as Rating}`)
  return <img className="mood-face" src={MOOD_SRC[id]} alt={name} title={name} width={36} height={36} />
}

/**
 * Ряд из пяти лиц: «как прошло» у сессии и занятия и «как книга» у рецензии.
 *
 * Кнопка — само лицо, без рамки вокруг: пять лимонных кругов подряд кричали
 * бы, поэтому невыбранные стоят серыми, а выбранное загорается цветом и
 * получает кольцо. Повторное нажатие снимает оценку.
 */
export function MoodPicker({
  value,
  onChange,
  label,
  size = 'md',
  className,
}: {
  value: number | null
  onChange: (next: number | null) => void
  /** Чем ряд зовётся для диктора: «Как прошло», «Как книга». */
  label?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const t = useT()
  return (
    <div className={`faces${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      {MOODS.map((id, i) => {
        const n = (i + 1) as Rating
        const name = t(`face.${n}`)
        const on = value === n
        return (
          <button
            key={id}
            type="button"
            className={`face-btn ${size}${on ? ' on' : ''}`}
            aria-pressed={on}
            aria-label={name}
            title={name}
            onClick={() => onChange(on ? null : n)}
          >
            <img src={MOOD_SRC[id]} alt="" draggable={false} />
          </button>
        )
      })}
    </div>
  )
}
