import type { Locale } from './i18n/translate'

// Units are abbreviations, so no plural forms are needed; Russian sets them off with a space.
const UNITS: Record<Locale, { h: string; m: string; gap: string; today: string; yesterday: string }> = {
  en: { h: 'h', m: 'm', gap: '', today: 'Today', yesterday: 'Yesterday' },
  ru: { h: 'ч', m: 'мин', gap: ' ', today: 'Сегодня', yesterday: 'Вчера' },
}

const TAGS: Record<Locale, string> = { en: 'en-GB', ru: 'ru-RU' }

export function fmtMinutes(min: number, locale: Locale): string {
  const u = UNITS[locale]
  if (min <= 0) return `0${u.gap}${u.m}`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}${u.gap}${u.m}`
  if (m === 0) return `${h}${u.gap}${u.h}`
  return `${h}${u.gap}${u.h} ${String(m).padStart(2, '0')}${u.gap}${u.m}`
}

export function todayISO(): string {
  return toISO(new Date())
}

/**
 * `today` is injectable so the relative names can be tested without faking the clock,
 * and so "yesterday" is derived from the same reference the caller compares against.
 */
export function fmtDate(iso: string, locale: Locale, today: string = todayISO()): string {
  const u = UNITS[locale]
  if (iso === today) return u.today

  const yesterday = fromISO(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (iso === toISO(yesterday)) return u.yesterday

  const sameYear = iso.slice(0, 4) === today.slice(0, 4)
  return fromISO(iso).toLocaleDateString(TAGS[locale], {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  })
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(d: Date): string {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

export function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISO(d)
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}
