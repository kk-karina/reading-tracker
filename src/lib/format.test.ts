import { describe, expect, test } from 'vitest'
import { fmtDate, fmtMinutes } from './format'

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
