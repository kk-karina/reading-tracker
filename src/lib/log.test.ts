import { describe, expect, it } from 'vitest'
import { groupItems, timeOf } from './log'

interface Row {
  id: string
  date: string
  subject: string
  created_at: string
}
const row = (id: string, date: string, subject: string, h = 10): Row => ({
  id,
  date,
  subject,
  created_at: `${date}T${String(h).padStart(2, '0')}:00:00`,
})

const byDay = (r: Row) => r.date
const bySubject = (r: Row) => r.subject
const at = (r: Row) => `${r.date}|${r.created_at}`

describe('groupItems', () => {
  const rows = [
    row('a', '2026-10-01', 'b1'),
    row('b', '2026-10-03', 'b2', 9),
    row('c', '2026-10-03', 'b1', 19),
    row('d', '2026-09-20', 'b2'),
  ]

  it('groups by day, newest day first, newest entry first inside', () => {
    const groups = groupItems(rows, byDay, at)
    expect(groups.map((g) => g.key)).toEqual(['2026-10-03', '2026-10-01', '2026-09-20'])
    expect(groups[0].items.map((r) => r.id)).toEqual(['c', 'b'])
  })

  it('groups by subject, the one touched last first', () => {
    const groups = groupItems(rows, bySubject, at)
    expect(groups.map((g) => g.key)).toEqual(['b1', 'b2'])
    expect(groups[0].items.map((r) => r.id)).toEqual(['c', 'a'])
    expect(groups[1].items.map((r) => r.id)).toEqual(['b', 'd'])
  })

  it('is empty for nothing', () => {
    expect(groupItems([], byDay, at)).toEqual([])
  })
})

describe('timeOf', () => {
  it('gives the clock time of an entry written on its own day', () => {
    expect(timeOf('2026-10-03', '2026-10-03T19:40:00')).toBe('19:40')
  })

  it('stays silent when the entry was written on another day', () => {
    // Записано задним числом: время записи о самом чтении ничего не говорит.
    expect(timeOf('2026-10-02', '2026-10-03T00:30:00')).toBeNull()
  })
})
