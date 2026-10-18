import type { ReactNode } from 'react'
import { useLocale } from '../../state/LocaleContext'

/**
 * Листание листов: ‹ 2/5 ›.
 *
 * Стоит в начале служебной строки листа, а не рядом с «Править» и
 * «Удалить»: стрелку жмут часто и не глядя, и промах по соседней кнопке
 * открывал правку или спрашивал об удалении. Между листанием и действиями
 * теперь вся ширина листа.
 *
 * Исключение — вкладка «Конспекты» у материала: там листалка сквозная, и
 * стоять ей надо на месте, а в начале строки её толкала подпись слева. Она
 * у правого края, у самого края, а соседом у неё одна «Изменить» через
 * широкий зазор, без «Удалить» — см. `.sheet-head-actions`.
 *
 * С `onList` счётчик — дверь к оглавлению: на узком экране колонки с главами
 * рядом с листом нет, и прыгнуть через десять листов иначе нечем.
 *
 * С `label` вместо счётчика стоит подпись — так листают не листы, а время на
 * графике: «‹ май – окт. 2026 ›». Тогда и стрелки называются по-своему.
 */
export function SheetFlip({
  at,
  count,
  onPrev,
  onNext,
  onList,
  label,
  prevLabel,
  nextLabel,
}: {
  at: number
  count: number
  onPrev: () => void
  onNext: () => void
  onList?: () => void
  label?: ReactNode
  prevLabel?: string
  nextLabel?: string
}) {
  const { t } = useLocale()
  const prev = prevLabel ?? t('note.prev')
  const next = nextLabel ?? t('note.next')
  return (
    <span className="row-tight sheet-flip">
      <button
        type="button"
        className="link-btn"
        disabled={at <= 0}
        aria-label={prev}
        title={prev}
        onClick={onPrev}
      >
        ‹
      </button>
      {label !== undefined ? (
        // Подпись — слова и даты, а не счётчик: без моноширинного, которым
        // набраны «2/5».
        <span className="small faint">{label}</span>
      ) : onList ? (
        <button
          type="button"
          className="link-btn sheet-flip-n small mono"
          aria-haspopup="dialog"
          aria-label={t('note.toc')}
          title={t('note.toc')}
          onClick={onList}
        >
          {at + 1}/{count}
        </button>
      ) : (
        <span className="small faint mono">
          {at + 1}/{count}
        </span>
      )}
      <button
        type="button"
        className="link-btn"
        disabled={at >= count - 1}
        aria-label={next}
        title={next}
        onClick={onNext}
      >
        ›
      </button>
    </span>
  )
}
