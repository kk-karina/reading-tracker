import type { Locale } from './i18n/translate'

// Units are abbreviations, so no plural forms are needed; Russian sets them off with a space.
const UNITS: Record<Locale, { h: string; m: string; gap: string; today: string; yesterday: string }> = {
  en: { h: 'h', m: 'm', gap: '', today: 'Today', yesterday: 'Yesterday' },
  ru: { h: 'ч', m: 'мин', gap: ' ', today: 'Сегодня', yesterday: 'Вчера' },
}

const TAGS: Record<Locale, string> = { en: 'en-GB', ru: 'ru-RU' }

/** The BCP 47 tag behind a locale, for Intl formatting inside charts. */
export const localeTag = (locale: Locale): string => TAGS[locale]

/**
 * «окт. 26»: месяц и год двумя цифрами. Собирается из частей, потому что
 * по-русски браузер дописывает «г.», а в подписи под столбиком ему не место.
 * Полгода переходят через Новый год, и без года январь не отличить от января.
 */
export function monthYear(d: Date, tag: string, year: '2-digit' | 'numeric' = '2-digit'): string {
  const p = monthParts(d, tag, year)
  return `${p.month} ${p.year}`
}

/** Те же месяц и год по отдельности — когда год показывают не всегда. */
export function monthParts(
  d: Date,
  tag: string,
  year: '2-digit' | 'numeric' = '2-digit',
): { month: string; year: string } {
  const parts = new Intl.DateTimeFormat(tag, { month: 'short', year }).formatToParts(d)
  return {
    month: parts.find((p) => p.type === 'month')?.value ?? '',
    year: parts.find((p) => p.type === 'year')?.value ?? '',
  }
}

export function fmtMinutes(min: number, locale: Locale): string {
  const u = UNITS[locale]
  if (min <= 0) return `0${u.gap}${u.m}`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}${u.gap}${u.m}`
  if (m === 0) return `${h}${u.gap}${u.h}`
  return `${h}${u.gap}${u.h} ${String(m).padStart(2, '0')}${u.gap}${u.m}`
}

/**
 * The same time as `fmtMinutes`, in pieces: a headline sets the numbers large
 * and the units small, and needs them apart to do it.
 */
export function minutesParts(min: number, locale: Locale): { n: number; unit: string }[] {
  const u = UNITS[locale]
  const h = Math.floor(Math.max(0, min) / 60)
  const m = Math.max(0, min) % 60
  if (h === 0) return [{ n: m, unit: u.m }]
  if (m === 0) return [{ n: h, unit: u.h }]
  return [
    { n: h, unit: u.h },
    { n: m, unit: u.m },
  ]
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

/**
 * `n` days from `d`, as a new date at local midnight.
 *
 * Charts walk months of days, and walking them by adding 86_400_000 ms breaks
 * twice a year: an hour goes missing in spring and comes back in autumn, so
 * the walk drifts off midnight and eventually lands on the wrong day. Calendar
 * arithmetic has no such thing as a short day.
 */
export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Monday of the week containing `d`, at local midnight. Weeks here start on Monday. */
export function mondayOf(d: Date): Date {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * ISO week number, the one calendars print: weeks start on Monday, and week 1
 * is the one holding the year's first Thursday — so the first days of January
 * can still be week 52 or 53, and the last days of December week 1.
 */
export function isoWeek(d: Date): number {
  const thu = addDays(mondayOf(d), 3)
  const jan1 = new Date(thu.getFullYear(), 0, 1)
  return Math.floor(Math.round((thu.getTime() - jan1.getTime()) / 86_400_000) / 7) + 1
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
