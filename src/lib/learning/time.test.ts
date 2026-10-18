import { describe, expect, it } from 'vitest'
import { addDays, fromISO, toISO } from '../format'
import type { StudySession } from './types'
import { minutesByDate, paceOf, totalIn, untimed, usualMonthSoFar, usualSoFar, weekSoFar, windowOf, windowsBack } from './time'

// Среда: неделя наполовину прошла, и в этом весь вопрос.
const TODAY = '2026-10-14'

const s = (date: string, minutes: number | null): StudySession => ({
  id: `${date}-${minutes}`,
  material_id: 'm1',
  date,
  page_from: null,
  page_to: null,
  part_ids: [],
  started_ids: [],
  completed: false,
  minutes,
  rating: null,
  book_session_id: null,
  created_at: `${date}T09:00:00.000Z`,
})

const days = (entries: [string, number][]) => new Map(entries)

describe('minutesByDate', () => {
  it('складывает минуты занятий одного дня', () => {
    expect(minutesByDate([s('2026-10-12', 30), s('2026-10-12', 45)]).get('2026-10-12')).toBe(75)
  })

  it('не заводит день из занятия без минут', () => {
    expect(minutesByDate([s('2026-10-12', null)]).has('2026-10-12')).toBe(false)
  })
})

describe('untimed', () => {
  it('считает занятия без минут внутри окна', () => {
    const sessions = [s('2026-10-12', null), s('2026-10-13', 40), s('2026-10-14', null)]
    expect(untimed(sessions, '2026-10-12', TODAY)).toBe(2)
  })

  it('не смотрит за пределы окна', () => {
    expect(untimed([s('2026-10-11', null)], '2026-10-12', TODAY)).toBe(0)
  })
})

describe('weekSoFar', () => {
  it('берёт с понедельника по сегодня', () => {
    const m = days([
      ['2026-10-11', 100], // воскресенье прошлой недели
      ['2026-10-12', 30],
      ['2026-10-14', 20],
    ])
    expect(weekSoFar(m, TODAY)).toBe(50)
  })
})

describe('usualSoFar', () => {
  it('сравнивает с тем же отрезком прошлых недель, а не с целыми неделями', () => {
    // Каждая прошлая неделя: 60 минут в пн–ср и 200 в субботу. Суббота ещё не
    // наступила, и в «обычно к среде» её быть не должно.
    const m = new Map<string, number>()
    for (const mon of ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05']) {
      m.set(mon, 60)
      m.set(toISO(addDays(fromISO(mon), 5)), 200)
    }
    expect(usualSoFar(m, TODAY)).toBe(60)
  })

  it('берёт медиану: одна бешеная неделя не задирает планку', () => {
    const m = days([
      ['2026-09-21', 30],
      ['2026-09-28', 40],
      ['2026-10-05', 600],
    ])
    expect(usualSoFar(m, TODAY)).toBe(40)
  })

  it('считает пустую неделю нулём, если она после первого занятия', () => {
    const m = days([
      ['2026-09-21', 60],
      // 28 сентября — пропущенная неделя
      ['2026-10-05', 60],
    ])
    expect(usualSoFar(m, TODAY)).toBe(60)
    const m2 = days([
      ['2026-09-21', 60],
      ['2026-10-05', 0],
    ])
    // 60, 0, 0 → 0
    expect(usualSoFar(m2, TODAY)).toBe(0)
  })

  it('не считает недели до самого первого занятия', () => {
    // Восемь недель назад приложения ещё не было: те нули — не отдых.
    const m = days([
      ['2026-09-28', 50],
      ['2026-10-05', 70],
    ])
    expect(usualSoFar(m, TODAY)).toBe(60)
  })

  it('молчит, пока прошлых недель меньше двух', () => {
    expect(usualSoFar(days([['2026-10-05', 50]]), TODAY)).toBeNull()
    expect(usualSoFar(days([['2026-10-13', 50]]), TODAY)).toBeNull()
  })

  it('не смотрит дальше восьми недель назад', () => {
    const m = days([
      ['2026-08-10', 500], // девять недель назад
      ['2026-09-28', 50],
      ['2026-10-05', 70],
    ])
    // Первое занятие было давно, так что все восемь недель в счёте: шесть
    // пустых и две по 50 и 70.
    expect(usualSoFar(m, TODAY)).toBe(0)
  })
})

describe('paceOf', () => {
  it('впереди, когда набежало заметно больше обычного', () => {
    expect(paceOf(205, 110)).toEqual({ kind: 'ahead', diff: 95 })
  })

  it('позади, когда заметно меньше', () => {
    expect(paceOf(40, 110)).toEqual({ kind: 'behind', diff: 70 })
  })

  it('как обычно, если разница в пределах десяти минут', () => {
    expect(paceOf(118, 110).kind).toBe('even')
  })

  it('как обычно, если разница в пределах десятой доли', () => {
    // 600 и 650: пятьдесят минут при десяти часах — шум, а не рывок.
    expect(paceOf(650, 600).kind).toBe('even')
  })
})

describe('usualMonthSoFar', () => {
  // 14 октября: с 1-го по 14-е каждого прошлого месяца.
  it('сравнивает с тем же отрезком прошлых месяцев', () => {
    const m = days([
      ['2026-08-05', 40],
      ['2026-08-20', 500], // после 14-го — не в счёт
      ['2026-09-10', 60],
      ['2026-09-25', 500],
    ])
    expect(usualMonthSoFar(m, TODAY)).toBe(50)
  })

  it('не считает месяцы до первого записанного времени', () => {
    const m = days([
      ['2026-09-03', 30],
      ['2026-09-04', 30],
    ])
    // Один прошлый месяц — сравнивать не с чем.
    expect(usualMonthSoFar(m, TODAY)).toBeNull()
  })

  it('31-е короткого месяца — его последний день', () => {
    const m = days([
      ['2026-09-30', 70],
      ['2026-08-31', 50],
    ])
    expect(usualMonthSoFar(m, '2026-10-31')).toBe(60)
  })
})

describe('windowOf', () => {
  it('двенадцать недель, последняя — эта', () => {
    expect(windowOf('weeks', 0, TODAY)).toEqual({ from: '2026-07-27', to: '2026-10-18' })
  })

  it('окно назад встык к текущему', () => {
    expect(windowOf('weeks', 1, TODAY)).toEqual({ from: '2026-05-04', to: '2026-07-26' })
  })

  it('полгода по месяцам и полгода перед ними', () => {
    expect(windowOf('months', 0, TODAY)).toEqual({ from: '2026-05-01', to: '2026-10-31' })
    expect(windowOf('months', 1, TODAY)).toEqual({ from: '2025-11-01', to: '2026-04-30' })
  })
})

describe('windowsBack', () => {
  it('ноль, пока вся история в текущем окне', () => {
    expect(windowsBack('weeks', days([['2026-08-01', 30]]), TODAY)).toBe(0)
    expect(windowsBack('months', days([['2026-05-02', 30]]), TODAY)).toBe(0)
  })

  it('столько окон, сколько нужно, чтобы дойти до первого занятия', () => {
    expect(windowsBack('weeks', days([['2026-07-26', 30]]), TODAY)).toBe(1)
    expect(windowsBack('months', days([['2025-10-31', 30]]), TODAY)).toBe(2)
  })

  it('ноль без записанного времени', () => {
    expect(windowsBack('months', new Map(), TODAY)).toBe(0)
  })
})

describe('totalIn', () => {
  it('складывает минуты внутри окна, края включительно', () => {
    const m = days([
      ['2026-04-30', 100],
      ['2026-05-01', 20],
      ['2026-10-31', 30],
      ['2026-11-01', 100],
    ])
    expect(totalIn(m, '2026-05-01', '2026-10-31')).toBe(50)
  })
})
