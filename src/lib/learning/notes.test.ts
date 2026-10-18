import { describe, expect, it } from 'vitest'
import { isBlankNote, noteHeading, noteOutline, notesOfStream } from './notes'
import type { Material, MaterialPart, StudyNote } from './types'

const material = (id: string, streamId: string): Material => ({
  book_id: null,
  id,
  stream_id: streamId,
  title: id,
  kind: 'book',
  author: null,
  url: null,
  status: 'active',
  cover_url: null,
  scale: null,
  pages_total: null,
  page_current: null,
  sort: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
})

const note = (id: string, materialId: string): StudyNote => ({
  id,
  material_id: materialId,
  session_id: null,
  part_id: null,
  part: null,
  title: null,
  body: '',
  tags: [],
  date: '2026-09-21',
  sort: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
})

describe('notesOfStream', () => {
  it('исключает конспекты чужого потока', () => {
    const materials = [material('m1', 's1'), material('m2', 's2')]
    const notes = [note('n1', 'm1'), note('n2', 'm2')]
    expect(notesOfStream(materials, notes, 's1').map((n) => n.id)).toEqual(['n1'])
  })

  it('исключает конспект материала, которого больше нет', () => {
    const materials = [material('m1', 's1')]
    const notes = [note('n1', 'm1'), note('n2', 'ghost')]
    expect(notesOfStream(materials, notes, 's1').map((n) => n.id)).toEqual(['n1'])
  })

  it('пустой поток даёт пустой список', () => {
    expect(notesOfStream([], [], 's1')).toEqual([])
  })
})

const part = (id: string, title: string, sort: number): MaterialPart => ({
  started: false,
  id,
  material_id: 'm1',
  title,
  done: false,
  sort,
})

describe('noteHeading', () => {
  const label = (p: MaterialPart, i: number) => p.title.trim() || `Глава ${i + 1}`
  const parts = [part('p1', 'Про имена', 0), part('p2', '', 1)]

  it('зовёт лист именем главы, на которую он указывает', () => {
    const n = { ...note('n1', 'm1'), part_id: 'p1' }
    expect(noteHeading(n, parts, label)).toBe('Про имена')
  })

  it('безымянная глава зовётся своим номером', () => {
    const n = { ...note('n1', 'm1'), part_id: 'p2' }
    expect(noteHeading(n, parts, label)).toBe('Глава 2')
  })

  it('старый конспект держится за набранное руками имя', () => {
    const n = { ...note('n1', 'm1'), part: 'Глава 1. Nobody Thinks Like You' }
    expect(noteHeading(n, parts, label)).toBe('Глава 1. Nobody Thinks Like You')
  })

  it('без главы берёт собственный заголовок', () => {
    const n = { ...note('n1', 'm1'), title: 'Мысли на полях' }
    expect(noteHeading(n, parts, label)).toBe('Мысли на полях')
  })

  it('указатель на главу, которой больше нет, именем не считается', () => {
    const n = { ...note('n1', 'm1'), part_id: 'ушла', part: 'Глава 9' }
    expect(noteHeading(n, parts, label)).toBe('Глава 9')
  })

  it('безымянный лист остаётся безымянным', () => {
    expect(noteHeading(note('n1', 'm1'), parts, label)).toBe(null)
  })
})

describe('isBlankNote', () => {
  it('пустая строка и одни пробелы — пусто', () => {
    expect(isBlankNote('', null)).toBe(true)
    expect(isBlankNote('   \n  ', null)).toBe(true)
  })

  it('нетронутый контур потока — тоже пусто', () => {
    const outline = '## Главное\n\n## Вопросы'
    expect(isBlankNote(outline, outline)).toBe(true)
    expect(isBlankNote(`\n${outline}  `, outline)).toBe(true)
  })

  it('дописанное в контур — уже конспект', () => {
    const outline = '## Главное\n\n## Вопросы'
    expect(isBlankNote(`${outline}\n- рекурсия`, outline)).toBe(false)
  })

  it('написанное без контура — конспект', () => {
    expect(isBlankNote('одна строка', null)).toBe(false)
  })
})

describe('noteOutline', () => {
  const parts = [part('p1', 'Первая', 0), part('p2', '', 1), part('p3', 'Третья', 2)]
  const at = (id: string, date: string, extra: Partial<StudyNote> = {}) => ({
    ...note(id, 'm1'),
    date,
    ...extra,
  })
  const shape = (notes: StudyNote[]) =>
    noteOutline(notes, parts).map((g) => [g.key, g.notes.map((n) => n.id)])

  it('собирает листы одной главы вместе, главы — в порядке материала', () => {
    const notes = [
      at('a', '2026-10-01', { part_id: 'p3' }),
      at('b', '2026-10-02', { part_id: 'p1' }),
      at('c', '2026-10-03', { part_id: 'p3' }),
    ]
    expect(shape(notes)).toEqual([
      ['p1', ['b']],
      ['p3', ['a', 'c']],
    ])
  })

  it('внутри главы — по дате, листы одного дня в порядке написания', () => {
    const notes = [
      at('late', '2026-10-05', { part_id: 'p1' }),
      at('x', '2026-10-01', { part_id: 'p1' }),
      at('y', '2026-10-01', { part_id: 'p1' }),
    ]
    expect(shape(notes)).toEqual([['p1', ['x', 'y', 'late']]])
  })

  it('старые имена текстом идут за главами, листы без главы — в конце', () => {
    const notes = [
      at('free', '2026-10-01'),
      at('old', '2026-10-01', { part: 'Глава 1. Nobody' }),
      at('ch', '2026-10-09', { part_id: 'p2' }),
    ]
    expect(shape(notes)).toEqual([
      ['p2', ['ch']],
      ['name:Глава 1. Nobody', ['old']],
      ['none', ['free']],
    ])
  })

  it('указатель на удалённую главу не теряет лист', () => {
    const notes = [at('ghost', '2026-10-01', { part_id: 'gone' })]
    expect(shape(notes)).toEqual([['none', ['ghost']]])
  })
})
