import { describe, expect, it } from 'vitest'
import {
  activityDates,
  applySession,
  diffSession,
  isLatest,
  lastTouched,
  markPart,
  rollbackSession,
} from './sessions'
import type { Material, StudyNote, StudySession } from './types'

const material = (over: Partial<Material> = {}): Material => ({
  book_id: null,
  id: 'm1',
  stream_id: 's1',
  title: 'Книга',
  kind: 'book',
  author: null,
  url: null,
  status: 'active',
  cover_url: null,
  scale: 'pages',
  pages_total: 300,
  page_current: 120,
  sort: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
})

const session = (over: Partial<StudySession> = {}): StudySession => ({
  started_ids: [],
  book_session_id: null,
  id: 'x1',
  material_id: 'm1',
  date: '2026-10-03',
  page_from: null,
  page_to: null,
  part_ids: [],
  completed: false,
  minutes: null,
  rating: null,
  created_at: '2026-10-03T10:00:00Z',
  ...over,
})

describe('applySession', () => {
  it('moves the page to where the session ended', () => {
    const fx = applySession(material(), session({ page_from: 120, page_to: 164 }))
    expect(fx.material).toEqual({ page_current: 164 })
    expect(fx.parts).toEqual([])
  })

  it('marks every part of the session done', () => {
    const fx = applySession(
      material({ scale: 'parts' }),
      session({ part_ids: ['p3', 'p4'] }),
    )
    expect(fx.parts).toEqual([
      { id: 'p3', done: true },
      { id: 'p4', done: true },
    ])
    expect(fx.material).toEqual({})
  })

  it('closes an article read through', () => {
    const fx = applySession(material({ kind: 'article', scale: null }), session({ completed: true }))
    expect(fx.material).toEqual({ status: 'done' })
  })

  it('writes nothing a session did not change', () => {
    const fx = applySession(material(), session({ page_from: 120, page_to: 120 }))
    expect(fx.material).toEqual({})
  })
})

describe('isLatest', () => {
  const a = session({ id: 'a', date: '2026-10-01', page_to: 100 })
  const b = session({ id: 'b', date: '2026-10-03', page_to: 164 })
  const other = session({ id: 'o', material_id: 'm2', date: '2026-10-09', page_to: 10 })

  it('compares only sessions of the same material', () => {
    expect(isLatest([a, b, other], b)).toBe(true)
    expect(isLatest([a, b, other], a)).toBe(false)
  })

  it('breaks a tie of dates by when it was written', () => {
    const c = session({ id: 'c', date: '2026-10-03', page_to: 180, created_at: '2026-10-03T20:00:00Z' })
    expect(isLatest([b, c], c)).toBe(true)
    expect(isLatest([b, c], b)).toBe(false)
  })
})

describe('diffSession', () => {
  it('moves the page when the latest session is corrected', () => {
    const before = session({ page_from: 120, page_to: 164 })
    const after = { ...before, page_to: 170 }
    const fx = diffSession(material({ page_current: 164 }), [before], before, after)
    expect(fx.material).toEqual({ page_current: 170 })
  })

  it('leaves the page alone when an older session is corrected', () => {
    const old = session({ id: 'old', date: '2026-09-01', page_from: 0, page_to: 50 })
    const fresh = session({ id: 'new', page_from: 50, page_to: 164 })
    const fx = diffSession(material({ page_current: 164 }), [old, fresh], old, { ...old, page_to: 60 })
    expect(fx.material).toEqual({})
  })

  it('unmarks a part taken out and marks a part added', () => {
    const before = session({ part_ids: ['p3', 'p4'] })
    const fx = diffSession(material({ scale: 'parts' }), [before], before, {
      ...before,
      part_ids: ['p4', 'p5'],
    })
    expect(fx.parts).toEqual([
      { id: 'p3', done: false },
      { id: 'p5', done: true },
    ])
  })

  it('reopens an article when the session no longer completes it', () => {
    const before = session({ completed: true })
    const fx = diffSession(material({ kind: 'article', scale: null, status: 'done' }), [before], before, {
      ...before,
      completed: false,
    })
    expect(fx.material).toEqual({ status: 'backlog' })
  })
})

describe('started parts — главы наполовину', () => {
  const m = material({ scale: 'parts' })

  it('a new session marks its half-done parts started', () => {
    const fx = applySession(m, session({ part_ids: ['p1'], started_ids: ['p2'] }))
    expect(fx.parts).toEqual([
      { id: 'p1', done: true },
      { id: 'p2', started: true },
    ])
  })

  it('an edit starts what was added and unstarts what was taken out', () => {
    const before = session({ id: 'x', started_ids: ['p1', 'p2'] })
    const after = { ...before, started_ids: ['p2', 'p3'] }
    expect(diffSession(m, [before], before, after).parts).toEqual([
      { id: 'p1', started: false },
      { id: 'p3', started: true },
    ])
  })

  it('a deleted session unstarts what it started', () => {
    const fx = rollbackSession(m, [], session({ started_ids: ['p2'] }))
    expect(fx.parts).toEqual([{ id: 'p2', started: false }])
  })

  it('a session with only a half-done part is not empty', () => {
    const s = session({ id: 'x', date: '2026-10-04', part_ids: ['p1'], started_ids: ['p2'] })
    expect(markPart([s], [], m, 'p1', 'fresh', '2026-10-04')?.kind).toBe('update')
  })
})

describe('rollbackSession', () => {
  it('returns the page to where the latest session started', () => {
    const s = session({ page_from: 120, page_to: 164 })
    const fx = rollbackSession(material({ page_current: 164 }), [s], s)
    expect(fx.material).toEqual({ page_current: 120 })
  })

  it('keeps the page when an older session goes', () => {
    const old = session({ id: 'old', date: '2026-09-01', page_from: 0, page_to: 50 })
    const fresh = session({ id: 'new', page_from: 50, page_to: 164 })
    expect(rollbackSession(material({ page_current: 164 }), [old, fresh], old).material).toEqual({})
  })

  it('unmarks the parts it marked', () => {
    const s = session({ part_ids: ['p3'] })
    expect(rollbackSession(material({ scale: 'parts' }), [s], s).parts).toEqual([
      { id: 'p3', done: false },
    ])
  })

  it('reopens what it completed', () => {
    const s = session({ completed: true })
    const fx = rollbackSession(material({ kind: 'video', scale: null, status: 'done' }), [s], s)
    expect(fx.material).toEqual({ status: 'backlog' })
  })
})

describe('activityDates', () => {
  it('counts a day with progress and no notes', () => {
    const notes = [{ date: '2026-10-01' }] as StudyNote[]
    expect(activityDates([session({ date: '2026-10-03' })], notes).sort()).toEqual([
      '2026-10-01',
      '2026-10-03',
    ])
  })

  it('counts a day once however much was done in it', () => {
    const notes = [{ date: '2026-10-03' }, { date: '2026-10-03' }] as StudyNote[]
    expect(activityDates([session()], notes)).toEqual(['2026-10-03'])
  })
})

describe('lastTouched', () => {
  it('takes the later of a session and a note of the same material', () => {
    const notes = [{ material_id: 'm1', date: '2026-10-01' }, { material_id: 'm2', date: '2026-10-09' }]
    expect(lastTouched('m1', [session({ date: '2026-10-03' })], notes)).toBe('2026-10-03')
    expect(lastTouched('m3', [], notes)).toBeNull()
  })
})

describe('markPart — точка, отмеченная на странице материала', () => {
  const today = '2026-10-04'
  const m = material({ scale: 'parts' })

  it('opens a session for today when there is none', () => {
    const op = markPart([], [], m, 'p3', 'done', today)
    expect(op).toEqual({
      kind: 'add',
      session: {
        material_id: 'm1',
        date: today,
        page_from: null,
        page_to: null,
        part_ids: ['p3'],
        started_ids: [],
        completed: false,
        minutes: null,
        rating: null,
      },
    })
  })

  it('adds the part to today’s session of this material', () => {
    const s = session({ id: 'x', date: today, part_ids: ['p1'] })
    expect(markPart([s], [], m, 'p3', 'done', today)).toEqual({
      kind: 'update',
      id: 'x',
      patch: { part_ids: ['p1', 'p3'] },
    })
  })

  it('does not touch another material’s session of today', () => {
    const other = session({ id: 'o', material_id: 'm2', date: today })
    expect(markPart([other], [], m, 'p3', 'done', today)?.kind).toBe('add')
  })

  it('takes the part out of the session that marked it', () => {
    const s = session({ id: 'x', date: '2026-10-01', part_ids: ['p1', 'p3'] })
    expect(markPart([s], [], m, 'p3', 'fresh', today)).toEqual({
      kind: 'update',
      id: 'x',
      patch: { part_ids: ['p1'] },
    })
  })

  it('removes a session left with nothing in it', () => {
    const s = session({ id: 'x', date: today, part_ids: ['p3'] })
    expect(markPart([s], [], m, 'p3', 'fresh', today)).toEqual({ kind: 'delete', id: 'x' })
  })

  it('keeps an emptied session that still has notes or minutes', () => {
    const s = session({ id: 'x', date: today, part_ids: ['p3'], minutes: 20 })
    expect(markPart([s], [], m, 'p3', 'fresh', today)?.kind).toBe('update')
    const t = session({ id: 'y', date: today, part_ids: ['p3'] })
    const notes = [{ session_id: 'y' }] as StudyNote[]
    expect(markPart([t], notes, m, 'p3', 'fresh', today)?.kind).toBe('update')
  })

  it('does nothing when a part marked before sessions existed is unmarked', () => {
    expect(markPart([], [], m, 'p3', 'fresh', today)).toBeNull()
  })

  it('marks a part started in today’s session', () => {
    const op = markPart([], [], m, 'p3', 'started', today)
    expect(op?.kind).toBe('add')
    expect(op?.kind === 'add' && op.session.started_ids).toEqual(['p3'])
    expect(op?.kind === 'add' && op.session.part_ids).toEqual([])
    const s = session({ id: 'x', date: today, part_ids: ['p1'] })
    expect(markPart([s], [], m, 'p3', 'started', today)).toEqual({
      kind: 'update',
      id: 'x',
      patch: { started_ids: ['p3'] },
    })
  })

  it('started and finished on one day is one “done”', () => {
    const s = session({ id: 'x', date: today, started_ids: ['p3'] })
    expect(markPart([s], [], m, 'p3', 'done', today)).toEqual({
      kind: 'update',
      id: 'x',
      patch: { part_ids: ['p3'], started_ids: [] },
    })
  })

  it('a part started on another day stays started there', () => {
    const before = session({ id: 'x', date: '2026-10-01', started_ids: ['p3'] })
    expect(markPart([before], [], m, 'p3', 'done', today)?.kind).toBe('add')
  })
})
