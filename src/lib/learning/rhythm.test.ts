import { describe, expect, it } from 'vitest'
import { activeWeeks, lastActivity, notesByDate, studyStreak } from './rhythm'

const TODAY = '2026-09-21'

describe('activeWeeks', () => {
  it('считает ноль, когда записей нет', () => {
    expect(activeWeeks([], TODAY)).toBe(0)
  })

  it('считает одну неделю за одну запись', () => {
    expect(activeWeeks(['2026-09-21'], TODAY)).toBe(1)
  })

  it('не считает дважды две записи одной недели', () => {
    expect(activeWeeks(['2026-09-21', '2026-09-16'], TODAY)).toBe(1)
  })

  it('считает две недели, когда между записями больше семи дней', () => {
    expect(activeWeeks(['2026-09-21', '2026-09-13'], TODAY)).toBe(2)
  })

  it('не смотрит дальше восьми недель назад', () => {
    expect(activeWeeks(['2026-07-01'], TODAY)).toBe(0)
  })

  it('игнорирует даты из будущего', () => {
    expect(activeWeeks(['2026-09-22'], TODAY)).toBe(0)
  })
})

describe('lastActivity', () => {
  it('возвращает null на пустом списке', () => {
    expect(lastActivity([])).toBeNull()
  })

  it('находит самую свежую дату независимо от порядка', () => {
    expect(lastActivity(['2026-09-01', '2026-09-18', '2026-09-10'])).toBe('2026-09-18')
  })
})

describe('notesByDate', () => {
  it('возвращает пустую карту на пустом списке', () => {
    expect(notesByDate([]).size).toBe(0)
  })

  it('складывает конспекты одного дня в одно число', () => {
    const m = notesByDate(['2026-09-21', '2026-09-21', '2026-09-20'])
    expect(m.get('2026-09-21')).toBe(2)
    expect(m.get('2026-09-20')).toBe(1)
  })
})

describe('studyStreak', () => {
  it('считает ноль, когда записей нет', () => {
    expect(studyStreak([], TODAY)).toBe(0)
  })

  it('считает подряд идущие дни, кончая сегодняшним', () => {
    expect(studyStreak(['2026-09-21', '2026-09-20', '2026-09-19'], TODAY)).toBe(3)
  })

  it('не рвёт страйк из-за незаписанного сегодня — вечер не кончился', () => {
    expect(studyStreak(['2026-09-20', '2026-09-19'], TODAY)).toBe(2)
  })

  it('обнуляется, когда молчание длится два дня', () => {
    expect(studyStreak(['2026-09-19', '2026-09-18'], TODAY)).toBe(0)
  })

  it('останавливается на разрыве, а не считает все дни подряд', () => {
    expect(studyStreak(['2026-09-21', '2026-09-19', '2026-09-18'], TODAY)).toBe(1)
  })

  it('не считает один день дважды', () => {
    expect(studyStreak(['2026-09-21', '2026-09-21'], TODAY)).toBe(1)
  })
})
