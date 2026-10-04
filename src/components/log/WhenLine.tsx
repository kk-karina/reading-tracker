import { useRef } from 'react'
import { fmtDate } from '../../lib/format'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { MoodPicker } from '../Mood'

/**
 * Тихая строка: когда, сколько и как прошло.
 *
 * Всё здесь необязательно, и строка так и выглядит — одним рядом под главным
 * шагом, без подписей над каждым полем. Дата словом («Сегодня»), а не полем
 * с маской: почти всегда пишут сегодняшнее, и спрашивать об этом незачем.
 * Нажатие открывает системный календарь — тот, что пользователь уже знает.
 *
 * Без `minutes` строка остаётся одной датой — так её берёт лист мысли.
 */
export function WhenLine({
  date,
  onDate,
  minutes,
  onMinutes,
  rating,
  onRating,
}: {
  date: string
  onDate: (iso: string) => void
  minutes?: string
  onMinutes?: (v: string) => void
  rating?: number | null
  onRating?: (r: number | null) => void
}) {
  const { t, locale } = useLocale()
  const picker = useRef<HTMLInputElement>(null)

  const open = () => {
    const el = picker.current
    if (!el) return
    // `showPicker` есть не везде; без него фокус на поле — и браузер покажет своё.
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.focus()
  }

  return (
    <div className={`when-line${onMinutes || onRating ? '' : ' solo'}`}>
      <span className="when-date">
        <button type="button" className="chip sm when-chip" onClick={open}>
          <Icon name="calendar-days" size={14} />
          {fmtDate(date, locale)}
        </button>
        <input
          ref={picker}
          className="when-picker"
          type="date"
          tabIndex={-1}
          aria-label={t('session.date')}
          value={date}
          onChange={(e) => e.target.value && onDate(e.target.value)}
        />
      </span>

      {onMinutes && (
        <label className="when-minutes" title={t('session.minutesHint')}>
          <Icon name="clock" size={14} />
          <input
            className="when-minutes-input"
            inputMode="numeric"
            aria-label={t('session.minutes')}
            placeholder="—"
            value={minutes ?? ''}
            onChange={(e) => onMinutes(e.target.value.replace(/\D/g, ''))}
          />
          <span className="small muted">{t('step.min')}</span>
        </label>
      )}

      {onRating && (
        <MoodPicker
          className="when-faces"
          size="sm"
          value={rating ?? null}
          onChange={onRating}
          label={t('session.how')}
        />
      )}
    </div>
  )
}
