import type { Draft } from '../../lib/compose/draft'
import { BOOK_SCALES, type BookScale } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Segmented } from '../ui'

const digits = (v: string) => v.replace(/\D/g, '')

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
