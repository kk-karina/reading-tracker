import type { MaterialProgress } from '../../lib/learning/metrics'
import { useLocale } from '../../state/LocaleContext'

/**
 * Прогресс словами.
 *
 * Одна функция на все экраны, потому что «12 из 20» без единицы измерения
 * читается по-разному у книги, курса и статьи, а три места, где это собирают
 * заново, — три случая разойтись.
 */
export function useProgressText() {
  const { t } = useLocale()
  return (p: MaterialProgress): string | null => {
    if (p.unit === 'flag') return null
    if (p.total === null) return null
    return p.unit === 'page'
      ? t('material.progressPages', { done: p.done, total: p.total })
      : t('material.progress', { done: p.done, total: p.total })
  }
}

/** Полоса. Не рисуется, когда мерить нечем: врать шириной хуже, чем молчать. */
export function Meter({ percent }: { percent: number | null }) {
  if (percent === null) return null
  return (
    <div className="meter" aria-hidden>
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}
