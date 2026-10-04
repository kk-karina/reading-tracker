import { useLocale } from '../../state/LocaleContext'

/**
 * Листание листов: ‹ 2/5 ›.
 *
 * Стоит в начале служебной строки листа, а не рядом с «Править» и
 * «Удалить»: стрелку жмут часто и не глядя, и промах по соседней кнопке
 * открывал правку или спрашивал об удалении. Между листанием и действиями
 * теперь вся ширина листа.
 */
export function SheetFlip({
  at,
  count,
  onPrev,
  onNext,
}: {
  at: number
  count: number
  onPrev: () => void
  onNext: () => void
}) {
  const { t } = useLocale()
  return (
    <span className="row-tight sheet-flip">
      <button
        type="button"
        className="link-btn"
        disabled={at <= 0}
        aria-label={t('note.prev')}
        title={t('note.prev')}
        onClick={onPrev}
      >
        ‹
      </button>
      <span className="small faint mono">
        {at + 1}/{count}
      </span>
      <button
        type="button"
        className="link-btn"
        disabled={at >= count - 1}
        aria-label={t('note.next')}
        title={t('note.next')}
        onClick={onNext}
      >
        ›
      </button>
    </span>
  )
}
