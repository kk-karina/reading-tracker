import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { addDays, fmtDate, fmtMinutes, fromISO, toISO } from './format'

describe('fmtMinutes', () => {
  test('shows bare minutes under an hour', () => {
    expect(fmtMinutes(45, 'en')).toBe('45m')
    expect(fmtMinutes(45, 'ru')).toBe('45 мин')
  })

  test('drops the minutes on a whole hour', () => {
    expect(fmtMinutes(120, 'en')).toBe('2h')
    expect(fmtMinutes(120, 'ru')).toBe('2 ч')
  })

  test('pads the minutes when both parts show', () => {
    expect(fmtMinutes(125, 'en')).toBe('2h 05m')
    expect(fmtMinutes(125, 'ru')).toBe('2 ч 05 мин')
  })

  test('shows zero rather than an empty string', () => {
    expect(fmtMinutes(0, 'en')).toBe('0m')
    expect(fmtMinutes(0, 'ru')).toBe('0 мин')
  })
})

describe('fmtDate', () => {
  const today = '2026-09-13'

  test('names today and yesterday in the current locale', () => {
    expect(fmtDate('2026-09-13', 'en', today)).toBe('Today')
    expect(fmtDate('2026-09-13', 'ru', today)).toBe('Сегодня')
    expect(fmtDate('2026-09-12', 'en', today)).toBe('Yesterday')
    expect(fmtDate('2026-09-12', 'ru', today)).toBe('Вчера')
  })

  test('omits the year inside the current year', () => {
    expect(fmtDate('2026-03-04', 'en', today)).toContain('Mar')
    expect(fmtDate('2026-03-04', 'en', today)).not.toContain('2026')
    expect(fmtDate('2026-03-04', 'ru', today)).toContain('мар')
  })

  test('shows the year for an older date', () => {
    expect(fmtDate('2024-03-04', 'en', today)).toContain('2024')
    expect(fmtDate('2024-03-04', 'ru', today)).toContain('2024')
  })
})

describe('addDays', () => {
  // A zone with summer time, where the naive "add 86_400_000 ms" walk drifts.
  beforeAll(() => vi.stubEnv('TZ', 'Europe/Berlin'))
  afterAll(() => vi.unstubAllEnvs())

  test('walks whole days across the spring change, when an hour goes missing', () => {
    // Clocks go forward on 29 March 2026 in Berlin.
    expect(toISO(addDays(fromISO('2026-03-27'), 4))).toBe('2026-03-31')
    expect(toISO(addDays(fromISO('2026-09-14'), -175))).toBe('2026-03-23')
  })

  test('walks whole days across the autumn change, when an hour comes back', () => {
    // Clocks go back on 25 October 2026, the change that repeats a day.
    expect(toISO(addDays(fromISO('2026-10-23'), 4))).toBe('2026-10-27')
  })

  test('lands on local midnight whatever time of day it starts from', () => {
    const noon = new Date(2026, 8, 14, 12, 30, 45)
    expect(addDays(noon, 1).getHours()).toBe(0)
    expect(toISO(addDays(noon, 1))).toBe('2026-09-15')
  })
})
