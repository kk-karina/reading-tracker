import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'

/**
 * «Придумать другую» — одна кнопка на оба места, где цель придумывают за
 * человека: шапку потока и форму. Жест один, и выглядеть он должен одинаково,
 * иначе в форме его пришлось бы узнавать заново.
 *
 * Звёздочки, а не кубик: в наборе они уже значат «догадка, а не гарантия».
 */
export function GoalRoll({ onClick }: { onClick: () => void }) {
  const { t } = useLocale()
  return (
    <button type="button" className="link-btn goal-roll" onClick={onClick}>
      <Icon name="sparkles" size={14} aria-hidden />
      {t('stream.goalAnother')}
    </button>
  )
}
