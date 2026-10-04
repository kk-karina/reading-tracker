import { useLocale } from '../../state/LocaleContext'

/**
 * Шаг у статьи и ролика: считать нечего, есть только «прошла целиком».
 *
 * Одна крупная отметка, а не галочка в ряду полей: другого вопроса про
 * прогресс у такого материала нет, и это единственное, на что лист отвечает.
 */
export function FlagStep({
  video,
  on,
  onChange,
}: {
  video: boolean
  on: boolean
  onChange: (next: boolean) => void
}) {
  const { t } = useLocale()
  return (
    <div className="step">
      <label className="step-flag">
        <input type="checkbox" checked={on} onChange={() => onChange(!on)} data-autofocus />
        <span>{t(video ? 'material.watched' : 'material.read')}</span>
      </label>
    </div>
  )
}
