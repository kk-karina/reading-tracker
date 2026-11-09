import type { Draft } from '../../lib/compose/draft'
import { BOOK_SCALES, PRACTICE_SCALES, type BookScale } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Segmented } from '../ui'

const digits = (v: string) => v.replace(/\D/g, '')
/** Часы бывают дробными — «1,5». Одна запятая или точка, дальше только цифры. */
const decimal = (v: string) => {
  const clean = v.replace(/[^\d.,]/g, '')
  const at = clean.search(/[.,]/)
  return at < 0 ? clean : clean.slice(0, at + 1) + clean.slice(at + 1).replace(/[.,]/g, '')
}

/**
 * Чем меряется прогресс — одной фразой под автором: «218 страниц», «12 лекций».
 *
 * Шкала здесь не отдельный вопрос «считать по…», а единица после числа:
 * «страниц | глав» — это и есть выбор шкалы, только сказанный так, как его
 * произносят. Два поля с подписями превращались в анкету внутри карточки;
 * фраза читается как строка самой карточки — так она и ляжет в список.
 *
 * Статья и ролик меряются одной отметкой «уже», и фразы у них нет.
 */
export function MeasureRow({
  draft,
  scales,
  onChange,
  glow,
}: {
  draft: Draft
  scales: readonly BookScale[]
  onChange: (patch: Partial<Draft>) => void
  /** Подсветка числа, пришедшего из поиска. */
  glow?: React.ReactNode
}) {
  const { t } = useLocale()

  if (draft.kind === 'article' || draft.kind === 'video') return null

  /* Практика: «цель 20 часов | раз». Та же фраза, что «218 страниц | глав»:
     единица после числа и есть выбор шкалы. Только число здесь необязательно —
     без него практика просто копит время или разы. */
  if (draft.kind === 'practice') {
    const hours = draft.practice === 'minutes'
    const n = Number(draft.target.replace(',', '.')) || 0
    return (
      <div className="compose-measure" title={t('practice.targetHint')}>
        <span className="compose-unit">{t('practice.target')}</span>
        <span className="compose-count">
          <input
            className="input"
            inputMode={hours ? 'decimal' : 'numeric'}
            aria-label={hours ? t('practice.targetHours') : t('practice.targetTimes')}
            value={draft.target}
            placeholder="—"
            onChange={(e) => onChange({ target: hours ? decimal(e.target.value) : digits(e.target.value) })}
          />
        </span>
        <Segmented
          name={t('practice.scale')}
          value={draft.practice}
          options={PRACTICE_SCALES.map((s) => ({
            value: s,
            label: s === 'minutes' ? t('compose.unitHours', { n }) : t('unit.times', { n }),
          }))}
          // Разы дробными не бывают: дробь из часов при переключении отрезается.
          onChange={(practice) =>
            onChange(practice === 'times' ? { practice, target: digits(draft.target.split(/[.,]/)[0]) } : { practice })
          }
          className="sm"
        />
      </div>
    )
  }

  const byParts = draft.kind === 'course' || draft.scale === 'parts'
  const field = byParts ? 'parts' : 'pages'
  const n = Number(draft[field]) || 0
  const pick = draft.kind === 'book' && scales.length > 1

  const unit =
    draft.kind === 'course'
      ? t('compose.unitLectures', { n })
      : byParts
        ? t('compose.unitChapters', { n })
        : t('compose.unitPages', { n })

  return (
    <div className="compose-measure">
      <span className="compose-count">
        {glow}
        <input
          className="input"
          inputMode="numeric"
          aria-label={
            draft.kind === 'course'
              ? t('material.lecturesTotal')
              : byParts
                ? t('material.chaptersTotal')
                : t('material.pagesTotal')
          }
          value={draft[field]}
          placeholder="—"
          onChange={(e) => onChange({ [field]: digits(e.target.value) })}
        />
      </span>
      {pick ? (
        <Segmented
          name={t('material.scale')}
          value={draft.scale}
          options={BOOK_SCALES.filter((s) => scales.includes(s)).map((s) => ({
            value: s,
            label: s === 'pages' ? t('compose.unitPages', { n }) : t('compose.unitChapters', { n }),
          }))}
          onChange={(scale) => onChange({ scale })}
          className="sm"
        />
      ) : (
        <span className="compose-unit">{unit}</span>
      )}
    </div>
  )
}
