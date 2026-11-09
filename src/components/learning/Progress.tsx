import { fmtMinutes } from '../../lib/format'
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
  const { t, locale } = useLocale()
  return (p: MaterialProgress): string | null => {
    if (p.unit === 'flag') return null
    // Практика: время часами и минутами, разы — числом. Без цели — только
    // накопленное, и пока ничего не накоплено, сказать нечего.
    if (p.unit === 'minute') {
      if (p.total === null) return p.done > 0 ? fmtMinutes(p.done, locale) : null
      return t('material.progress', { done: fmtMinutes(p.done, locale), total: fmtMinutes(p.total, locale) })
    }
    if (p.unit === 'time') {
      if (p.total === null) return p.done > 0 ? t('count.times', { n: p.done }) : null
      return t('practice.timesOf', { done: p.done, total: p.total })
    }
    // Книга без числа страниц: «из скольких» неизвестно, но докуда дошла —
    // известно, и это не повод молчать о прогрессе вовсе.
    if (p.total === null) return p.unit === 'page' && p.done > 0 ? t('count.pages', { n: p.done }) : null
    return p.unit === 'page'
      ? t('material.progressPages', { done: p.done, total: p.total })
      : t('material.progress', { done: p.done, total: p.total })
  }
}
