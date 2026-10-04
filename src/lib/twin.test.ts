import { describe, expect, it } from 'vitest'
import type { StudySession } from './learning/types'
import { canLink, mergeHistory, mirrorOp, readingStep, studyStep, type Step } from './twin'
import type { Session } from './types'

const study = (over: Partial<StudySession> = {}): StudySession => ({
  id: 'x1',
  material_id: 'm1',
  date: '2026-10-03',
  page_from: 100,
  page_to: 140,
  part_ids: [],
  completed: false,
  minutes: null,
  rating: null,
  book_session_id: null,
  created_at: '2026-10-03T10:00:00Z',
  ...over,
})

const reading = (over: Partial<Session> = {}): Session => ({
  id: 'r1',
  book_id: 'b1',
  date: '2026-10-03',
  page_from: 100,
  page_to: 140,
  minutes: null,
  rating: null,
  created_at: '2026-10-03T10:00:00Z',
  ...over,
})

const step = (over: Partial<Step> = {}): Step => ({
  date: '2026-10-03',
  page_from: 100,
  page_to: 140,
  minutes: null,
  rating: null,
  ...over,
})

describe('canLink', () => {
  it('links only a book measured in pages', () => {
    expect(canLink({ kind: 'book', scale: 'pages' })).toBe(true)
    expect(canLink({ kind: 'book', scale: 'parts' })).toBe(false)
    expect(canLink({ kind: 'article', scale: null })).toBe(false)
    expect(canLink({ kind: 'course', scale: null })).toBe(false)
  })
})

describe('studyStep / readingStep', () => {
  it('takes date, pages, minutes and rating', () => {
    expect(studyStep(study({ minutes: 30, rating: 4 }))).toEqual(step({ minutes: 30, rating: 4 }))
    expect(readingStep(reading({ minutes: 30, rating: 4 }))).toEqual(step({ minutes: 30, rating: 4 }))
  })

  it('has no step for a study session without pages', () => {
    expect(studyStep(study({ page_from: null, page_to: null, minutes: 20 }))).toBeNull()
  })

  it('starts where it ended when the start was not written', () => {
    expect(studyStep(study({ page_from: null, page_to: 50 }))).toEqual(step({ page_from: 50, page_to: 50 }))
  })
})

describe('mirrorOp', () => {
  it('adds a twin for a new step', () => {
    expect(mirrorOp(step(), null)).toEqual({ kind: 'add', step: step() })
  })

  it('does nothing without a step and without a twin', () => {
    expect(mirrorOp(null, null)).toBeNull()
  })

  it('updates the twin when the step changed', () => {
    const op = mirrorOp(step({ page_to: 160 }), { id: 't1', step: step() })
    expect(op).toEqual({ kind: 'update', id: 't1', step: step({ page_to: 160 }) })
  })

  it('carries minutes and rating, not only pages', () => {
    const op = mirrorOp(step({ rating: 5 }), { id: 't1', step: step() })
    expect(op).toEqual({ kind: 'update', id: 't1', step: step({ rating: 5 }) })
  })

  it('leaves an identical twin alone', () => {
    expect(mirrorOp(step(), { id: 't1', step: step() })).toBeNull()
  })

  it('deletes the twin when the step is gone', () => {
    expect(mirrorOp(null, { id: 't1', step: step() })).toEqual({ kind: 'delete', id: 't1' })
  })
})

describe('mergeHistory', () => {
  it('pairs the same sitting written on both sides instead of copying it', () => {
    const plan = mergeHistory([reading()], [study()])
    expect(plan.pairs).toEqual([{ studyId: 'x1', sessionId: 'r1', study: {}, session: {} }])
    expect(plan.toReading).toEqual([])
    expect(plan.toStudy).toEqual([])
  })

  it('fills minutes and rating from the side that has them', () => {
    const plan = mergeHistory([reading({ minutes: 25 })], [study({ rating: 4 })])
    expect(plan.pairs[0].study).toEqual({ minutes: 25 })
    expect(plan.pairs[0].session).toEqual({ rating: 4 })
  })

  it('keeps both values when both sides have them', () => {
    const plan = mergeHistory([reading({ minutes: 25 })], [study({ minutes: 30 })])
    expect(plan.pairs[0].study).toEqual({})
    expect(plan.pairs[0].session).toEqual({})
  })

  it('copies what only one side has', () => {
    const plan = mergeHistory(
      [reading({ id: 'r1', date: '2026-10-01', page_from: 0, page_to: 40 })],
      [study({ id: 'x1', date: '2026-10-02', page_from: 40, page_to: 90 })],
    )
    expect(plan.pairs).toEqual([])
    expect(plan.toReading).toEqual([
      { studyId: 'x1', step: step({ date: '2026-10-02', page_from: 40, page_to: 90 }) },
    ])
    expect(plan.toStudy).toEqual([
      { sessionId: 'r1', step: step({ date: '2026-10-01', page_from: 0, page_to: 40 }) },
    ])
  })

  it('does not pair a different page on the same day', () => {
    const plan = mergeHistory([reading({ page_to: 120 })], [study({ page_to: 140 })])
    expect(plan.pairs).toEqual([])
    expect(plan.toReading).toHaveLength(1)
    expect(plan.toStudy).toHaveLength(1)
  })

  it('pairs each sitting at most once', () => {
    const plan = mergeHistory(
      [reading({ id: 'r1' })],
      [study({ id: 'x1' }), study({ id: 'x2', created_at: '2026-10-03T12:00:00Z' })],
    )
    expect(plan.pairs).toHaveLength(1)
    expect(plan.toReading.map((c) => c.studyId)).toEqual(['x2'])
  })

  it('leaves a study session without pages on its side', () => {
    const plan = mergeHistory([], [study({ page_from: null, page_to: null, minutes: 20 })])
    expect(plan.toReading).toEqual([])
  })

  it('skips sittings that are already a pair', () => {
    const plan = mergeHistory([reading({ id: 'r1' })], [study({ id: 'x1', book_session_id: 'r1' })])
    expect(plan).toEqual({ pairs: [], toReading: [], toStudy: [], page: 140 })
  })

  it('treats a pointer to a gone session as no pair', () => {
    const plan = mergeHistory([], [study({ book_session_id: 'gone' })])
    expect(plan.toReading).toHaveLength(1)
  })

  it('reports the furthest page reached on either side', () => {
    const plan = mergeHistory([reading({ page_to: 200 })], [study({ page_to: 140 })])
    expect(plan.page).toBe(200)
    expect(mergeHistory([], []).page).toBeNull()
  })
})
