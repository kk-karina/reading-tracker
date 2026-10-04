import { describe, expect, it } from 'vitest'
import { emptyLearning, type LearningSnapshot, type Material, type Stream } from '../types'
import {
  insert,
  materialEffects,
  nextSlug,
  removeMaterial,
  removePart,
  removeSession,
  removeStream,
  updateMaterial,
  updateNote,
  updatePart,
  updateStream,
} from './rules'

const NOW = '2026-10-01T10:00:00.000Z'
const BEFORE = '2026-09-01T10:00:00.000Z'

const stream = (over: Partial<Stream> & { id: string }): Stream => ({
  slug: over.id,
  name: 'Поток',
  accent: null,
  goal: null,
  focus_material_id: null,
  outline: null,
  sort: 0,
  archived: false,
  created_at: BEFORE,
  updated_at: BEFORE,
  ...over,
})

const material = (over: Partial<Material> & { id: string; stream_id: string }): Material => ({
  book_id: null,
  title: 'Материал',
  kind: 'book',
  author: null,
  url: null,
  status: 'active',
  cover_url: null,
  scale: 'parts',
  pages_total: null,
  page_current: null,
  sort: 0,
  created_at: BEFORE,
  updated_at: BEFORE,
  ...over,
})

/** Поток с фокусом на материале, у материала две части и конспект. */
function filled(): LearningSnapshot {
  return {
    streams: [stream({ id: 's1', focus_material_id: 'm1' }), stream({ id: 's2', slug: 'vtoroy' })],
    materials: [material({ id: 'm1', stream_id: 's1' }), material({ id: 'm2', stream_id: 's2' })],
    parts: [
      { id: 'p1', material_id: 'm1', title: '', done: true, started: false, sort: 0 },
      { id: 'p2', material_id: 'm1', title: '', done: false, started: false, sort: 1 },
      { id: 'p3', material_id: 'm2', title: '', done: false, started: false, sort: 0 },
    ],
    sessions: [
      {
        id: 'x1',
        book_session_id: null,
        started_ids: [],
        material_id: 'm1',
        date: '2026-09-02',
        page_from: null,
        page_to: null,
        part_ids: ['p1'],
        completed: false,
        minutes: null,
        rating: null,
        created_at: '2026-09-02T00:00:00.000Z',
      },
    ],
    notes: [
      {
        id: 'n1',
        material_id: 'm1',
        session_id: null,
        part_id: 'p1',
        part: null,
        title: null,
        body: 'тело',
        tags: ['idea'],
        date: '2026-09-01',
        sort: 0,
        created_at: BEFORE,
        updated_at: BEFORE,
      },
    ],
  }
}

describe('правила ничего не мутируют на месте', () => {
  it('исходный снимок остаётся прежним после правки', () => {
    const snap = filled()
    const copy = structuredClone(snap)
    updateMaterial(snap, 'm1', { status: 'done' }, NOW)
    removeStream(snap, 's1')
    expect(snap).toEqual(copy)
  })
})

describe('поток', () => {
  it('адрес не меняется, даже если прислан в заплатке', () => {
    const next = updateStream(filled(), 's1', { name: 'Новое', slug: 'podmena' }, NOW)
    expect(next.streams[0].name).toBe('Новое')
    expect(next.streams[0].slug).toBe('s1')
  })

  it('правка проставляет updated_at и не трогает created_at', () => {
    const next = updateStream(filled(), 's1', { name: 'Новое' }, NOW)
    expect(next.streams[0].updated_at).toBe(NOW)
    expect(next.streams[0].created_at).toBe(BEFORE)
  })

  it('удаление уносит материалы потока, их части и конспекты', () => {
    const next = removeStream(filled(), 's1')
    expect(next.streams.map((s) => s.id)).toEqual(['s2'])
    expect(next.materials.map((m) => m.id)).toEqual(['m2'])
    expect(next.parts.map((p) => p.id)).toEqual(['p3'])
    expect(next.notes).toEqual([])
  })

  it('удаление снимает фокус у чужого потока, указывавшего на этот материал', () => {
    const snap = filled()
    snap.streams[1].focus_material_id = 'm1'
    const next = removeStream(snap, 's1')
    expect(next.streams[0].focus_material_id).toBeNull()
  })
})

describe('адрес нового потока', () => {
  it('рождается из имени', () => {
    expect(nextSlug(emptyLearning(), 'Professional Growth')).toBe('professional-growth')
  })

  it('разводит два потока с одним именем', () => {
    const snap = emptyLearning()
    snap.streams = [stream({ id: 's1', slug: 'rost' })]
    expect(nextSlug(snap, 'Рост')).toBe('rost-2')
  })

  it('обходит адреса, уже занятые кем-то ещё', () => {
    const snap = emptyLearning()
    snap.streams = [stream({ id: 's1', slug: 'rost' })]
    expect(nextSlug(snap, 'Рост', ['rost-2'])).toBe('rost-3')
  })
})

describe('материал', () => {
  it('уехавший в другой поток перестаёт быть фокусом прежнего', () => {
    const next = updateMaterial(filled(), 'm1', { stream_id: 's2' }, NOW)
    expect(next.streams[0].focus_material_id).toBeNull()
  })

  it('ушедший из работы перестаёт быть фокусом', () => {
    const next = updateMaterial(filled(), 'm1', { status: 'done' }, NOW)
    expect(next.streams[0].focus_material_id).toBeNull()
  })

  it('остаётся фокусом, когда правка не уводит его из работы', () => {
    const next = updateMaterial(filled(), 'm1', { title: 'Другое имя' }, NOW)
    expect(next.streams[0].focus_material_id).toBe('m1')
  })

  it('смена вида на статью уносит его части', () => {
    const next = updateMaterial(filled(), 'm1', { kind: 'article', scale: null }, NOW)
    expect(next.parts.map((p) => p.id)).toEqual(['p3'])
  })

  it('смена шкалы книги с глав на страницы уносит главы', () => {
    const next = updateMaterial(filled(), 'm1', { scale: 'pages' }, NOW)
    expect(next.parts.map((p) => p.id)).toEqual(['p3'])
  })

  it('правка, не меняющая вид, части не трогает', () => {
    const next = updateMaterial(filled(), 'm1', { title: 'Другое' }, NOW)
    expect(next.parts).toHaveLength(3)
  })

  it('удаление уносит части и конспекты и снимает фокус', () => {
    const next = removeMaterial(filled(), 'm1')
    expect(next.materials.map((m) => m.id)).toEqual(['m2'])
    expect(next.parts.map((p) => p.id)).toEqual(['p3'])
    expect(next.sessions).toEqual([])
    expect(next.notes).toEqual([])
    expect(next.streams[0].focus_material_id).toBeNull()
  })

  it('правка неизвестного материала ничего не ломает', () => {
    const snap = filled()
    expect(updateMaterial(snap, 'нет-такого', { status: 'done' }, NOW)).toEqual(snap)
  })
})

/**
 * Сетевому стору снимок не нужен — ему нужно знать, какие ещё строки тронуть
 * сверх самого материала. Это та же развилка, что и в снимке, но названная
 * вслух, чтобы оба стора считали её одинаково.
 */
describe('следствия правки материала для сетевого стора', () => {
  it('переезд в другой поток снимает фокус у прежнего', () => {
    expect(materialEffects(filled(), 'm1', { stream_id: 's2' })).toEqual({
      unfocus: ['s1'],
      dropParts: [],
    })
  })

  it('уход из работы снимает фокус у того, кто на него указывал', () => {
    expect(materialEffects(filled(), 'm1', { status: 'backlog' })).toEqual({
      unfocus: ['s1'],
      dropParts: [],
    })
  })

  it('смена вида называет части, которые уходят', () => {
    expect(materialEffects(filled(), 'm1', { kind: 'video', scale: null })).toEqual({
      unfocus: [],
      dropParts: ['p1', 'p2'],
    })
  })

  it('безобидная правка не трогает ничего', () => {
    expect(materialEffects(filled(), 'm1', { title: 'Другое' })).toEqual({
      unfocus: [],
      dropParts: [],
    })
  })
})

describe('части и конспекты', () => {
  it('отметка части не трогает соседей', () => {
    const next = updatePart(filled(), 'p2', { done: true })
    expect(next.parts.map((p) => p.done)).toEqual([true, true, false])
  })

  it('удаление части оставляет конспект, потерявший указатель', () => {
    const next = removePart(filled(), 'p1')
    expect(next.parts.map((p) => p.id)).toEqual(['p2', 'p3'])
    expect(next.notes[0].part_id).toBeNull()
  })

  it('удаление части убирает её из занятий, которые её отметили', () => {
    expect(removePart(filled(), 'p1').sessions[0].part_ids).toEqual([])
  })

  it('удаление части убирает её и из начатых занятием', () => {
    const snap = filled()
    snap.sessions[0] = { ...snap.sessions[0], part_ids: [], started_ids: ['p1', 'p2'] }
    expect(removePart(snap, 'p1').sessions[0].started_ids).toEqual(['p2'])
  })

  it('смена вида, уносящая части, убирает их и из занятий', () => {
    const next = updateMaterial(filled(), 'm1', { kind: 'article', scale: null }, NOW)
    expect(next.sessions[0].part_ids).toEqual([])
  })

  it('правка конспекта проставляет updated_at', () => {
    const next = updateNote(filled(), 'n1', { body: 'другое' }, NOW)
    expect(next.notes[0].body).toBe('другое')
    expect(next.notes[0].updated_at).toBe(NOW)
  })
})

describe('вставка созданной строки', () => {
  it('кладёт материал в снимок, не трогая остальное', () => {
    const made = material({ id: 'm3', stream_id: 's2' })
    const next = insert(filled(), 'materials', made)
    expect(next.materials.map((m) => m.id)).toEqual(['m1', 'm2', 'm3'])
    expect(next.streams).toEqual(filled().streams)
  })
})

describe('занятия', () => {
  it('удаление занятия оставляет его конспекты без занятия', () => {
    const snap = filled()
    snap.notes[0].session_id = 'x1'
    const next = removeSession(snap, 'x1')
    expect(next.sessions).toEqual([])
    expect(next.notes.map((n) => n.session_id)).toEqual([null])
  })
})
