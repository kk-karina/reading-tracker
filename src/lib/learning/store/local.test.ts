import { beforeEach, describe, expect, it } from 'vitest'
import { localLearning } from './local'

/** Node без DOM: свой localStorage, чтобы тест не зависел от окружения. */
class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  get length() {
    return this.map.size
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage() as unknown as Storage
})

const aStream = {
  name: 'Professional Growth',
  icon: 'compass' as const,
  accent: null,
  outline: null,
  sort: 0,
}

describe('localLearning', () => {
  it('начинает с пустого снимка', async () => {
    expect(await localLearning.load()).toEqual({ streams: [], materials: [], parts: [], notes: [] })
  })

  it('заводит поток и возвращает его из load', async () => {
    const made = await localLearning.addStream(aStream)
    expect(made.id).toBeTruthy()
    expect(made.archived).toBe(false)
    const snap = await localLearning.load()
    expect(snap.streams).toEqual([made])
  })

  it('правит поток, не трогая created_at', async () => {
    const made = await localLearning.addStream(aStream)
    await localLearning.updateStream(made.id, { name: 'Рост' })
    const snap = await localLearning.load()
    expect(snap.streams[0].name).toBe('Рост')
    expect(snap.streams[0].created_at).toBe(made.created_at)
  })

  it('удаление потока уносит его материалы и их конспекты', async () => {
    const stream = await localLearning.addStream(aStream)
    const other = await localLearning.addStream({ ...aStream, name: 'English' })
    const mat = await localLearning.addMaterial({
      stream_id: stream.id,
      title: 'Product Design Psychology',
      kind: 'book',
      author: null,
      url: null,
      status: 'active',
      cover_url: null,
      scale: 'parts' as const,
      pages_total: null,
      page_current: null,
      sort: 0,
    })
    const kept = await localLearning.addMaterial({
      stream_id: other.id,
      title: 'Talk',
      kind: 'video',
      author: null,
      url: null,
      status: 'inbox',
      cover_url: null,
      scale: null,
      pages_total: null,
      page_current: null,
      sort: 0,
    })
    await localLearning.addNote({
      material_id: mat.id,
      part: 'Глава 1',
      title: null,
      body: 'текст',
      tags: ['idea'],
      date: '2026-09-21',
      sort: 0,
    })

    await localLearning.deleteStream(stream.id)

    const snap = await localLearning.load()
    expect(snap.streams.map((s) => s.id)).toEqual([other.id])
    expect(snap.materials.map((m) => m.id)).toEqual([kept.id])
    expect(snap.notes).toEqual([])
  })

  it('удаление материала уносит только его конспекты', async () => {
    const stream = await localLearning.addStream(aStream)
    const a = await localLearning.addMaterial({
      stream_id: stream.id,
      title: 'A',
      kind: 'book',
      author: null,
      url: null,
      status: 'active',
      cover_url: null,
      scale: null,
      pages_total: null,
      page_current: null,
      sort: 0,
    })
    const b = await localLearning.addMaterial({
      stream_id: stream.id,
      title: 'B',
      kind: 'article',
      author: null,
      url: null,
      status: 'inbox',
      cover_url: null,
      scale: null,
      pages_total: null,
      page_current: null,
      sort: 1,
    })
    await localLearning.addNote({
      material_id: a.id,
      part: null,
      title: null,
      body: 'а',
      tags: [],
      date: '2026-09-21',
      sort: 0,
    })
    const keep = await localLearning.addNote({
      material_id: b.id,
      part: null,
      title: null,
      body: 'б',
      tags: [],
      date: '2026-09-21',
      sort: 0,
    })

    await localLearning.deleteMaterial(a.id)

    const snap = await localLearning.load()
    expect(snap.materials.map((m) => m.id)).toEqual([b.id])
    expect(snap.notes.map((n) => n.id)).toEqual([keep.id])
  })

  it('правит конспект', async () => {
    const stream = await localLearning.addStream(aStream)
    const mat = await localLearning.addMaterial({
      stream_id: stream.id,
      title: 'A',
      kind: 'book',
      author: null,
      url: null,
      status: 'active',
      cover_url: null,
      scale: null,
      pages_total: null,
      page_current: null,
      sort: 0,
    })
    const note = await localLearning.addNote({
      material_id: mat.id,
      part: null,
      title: null,
      body: 'было',
      tags: [],
      date: '2026-09-21',
      sort: 0,
    })
    await localLearning.updateNote(note.id, { body: 'стало', tags: ['quote', 'question'] })
    const snap = await localLearning.load()
    expect(snap.notes[0].body).toBe('стало')
    expect(snap.notes[0].tags).toEqual(['quote', 'question'])
  })

  it('переживает испорченное хранилище', async () => {
    localStorage.setItem('readingtracker.learning.v1', '{не json')
    expect(await localLearning.load()).toEqual({ streams: [], materials: [], parts: [], notes: [] })
  })

  it('достраивает недостающие массивы в старом снимке', async () => {
    localStorage.setItem('readingtracker.learning.v2', JSON.stringify({ streams: [] }))
    const snap = await localLearning.load()
    expect(snap.materials).toEqual([])
    expect(snap.notes).toEqual([])
  })
})

describe('переезд снимка v1 → v2', () => {
  it('переносит категории в потоки с адресами и оставляет v1 на месте', async () => {
    const v1 = {
      categories: [
        { id: 'c1', name: 'Professional Growth', icon: 'compass', accent: null,
          outline: null, sort: 0, archived: false,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
        { id: 'c2', name: 'Английский', icon: 'chat', accent: 'sage',
          outline: null, sort: 1, archived: false,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
      ],
      materials: [
        { id: 'm1', category_id: 'c1', title: 'Book', kind: 'book', author: null, url: null,
          status: 'active', parts_total: 8, sort: 0,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
      ],
      notes: [],
    }
    localStorage.setItem('readingtracker.learning.v1', JSON.stringify(v1))

    const snap = await localLearning.load()

    expect(snap.streams.map((s) => s.slug)).toEqual(['professional-growth', 'angliyskiy'])
    expect(snap.streams[0].goal).toBeNull()
    expect(snap.streams[0].focus_material_id).toBeNull()
    expect(snap.materials[0].stream_id).toBe('c1')
    expect(localStorage.getItem('readingtracker.learning.v1')).toBe(JSON.stringify(v1))
    // Снимок v1 доезжает до текущей версии за один раз: промежуточный v2 не
    // пишется, иначе следующая загрузка прочитала бы его и переехала повторно.
    expect(localStorage.getItem('readingtracker.learning.v2')).toBeNull()
    expect(localStorage.getItem('readingtracker.learning.v3')).not.toBeNull()
    // Восемь глав из v1 доезжают списком, а не числом.
    expect(snap.parts).toHaveLength(8)
    expect(snap.materials[0].scale).toBe('parts')
  })

  it('не трогает v1, когда v2 уже есть', async () => {
    const v1 = JSON.stringify({ categories: [{ id: 'c1', name: 'Old' }], materials: [], notes: [] })
    localStorage.setItem('readingtracker.learning.v1', v1)
    localStorage.setItem('readingtracker.learning.v2',
      JSON.stringify({ streams: [], materials: [], notes: [] }))

    expect((await localLearning.load()).streams).toEqual([])
    // Раз v2 уже есть, переезд не запускается вовсе — v1 должен остаться байт в байт.
    expect(localStorage.getItem('readingtracker.learning.v1')).toBe(v1)
  })

  it('достраивает недостающие materials и notes в старом снимке v1', async () => {
    localStorage.setItem('readingtracker.learning.v1', JSON.stringify({
      categories: [{ id: 'c1', name: 'Growth', icon: 'compass', accent: null, outline: null,
        sort: 0, archived: false, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
      // materials и notes отсутствуют вовсе.
    }))

    const snap = await localLearning.load()

    expect(snap.streams.map((s) => s.slug)).toEqual(['growth'])
    expect(snap.materials).toEqual([])
    expect(snap.notes).toEqual([])
  })

  it('переживает отказ записи и всё равно отдаёт мигрированный снимок', async () => {
    localStorage.setItem('readingtracker.learning.v1', JSON.stringify({
      categories: [{ id: 'c1', name: 'Growth', icon: 'compass', accent: null, outline: null,
        sort: 0, archived: false, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
      materials: [], notes: [],
    }))
    const original = localStorage.setItem.bind(localStorage)
    localStorage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      const snap = await localLearning.load()
      expect(snap.streams.map((s) => s.slug)).toEqual(['growth'])
    } finally {
      localStorage.setItem = original
    }
  })

  it('мигрирует категорию без имени в запасной адрес вместо падения', async () => {
    localStorage.setItem('readingtracker.learning.v1', JSON.stringify({
      categories: [{ id: 'c1', icon: 'compass', accent: null, outline: null,
        sort: 0, archived: false, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
      materials: [], notes: [],
    }))

    const snap = await localLearning.load()

    expect(snap.streams[0].slug).toBe('stream-1')
  })

  it('переживает v1, где categories — не массив', async () => {
    localStorage.setItem('readingtracker.learning.v1',
      JSON.stringify({ categories: 'oops', materials: [], notes: [] }))

    expect(await localLearning.load()).toEqual({ streams: [], materials: [], parts: [], notes: [] })
  })
})

describe('целостность фокуса', () => {
  it('снимает фокус с удалённого материала', async () => {
    const stream = await localLearning.addStream({
      name: 'Professional Growth', icon: 'compass', accent: null, outline: null, sort: 0,
    })
    const material = await localLearning.addMaterial({
      stream_id: stream.id, title: 'Book', kind: 'book', author: null, url: null,
      status: 'active', cover_url: null, scale: null, pages_total: null, page_current: null, sort: 0,
    })
    await localLearning.updateStream(stream.id, { focus_material_id: material.id })

    await localLearning.deleteMaterial(material.id)

    expect((await localLearning.load()).streams[0].focus_material_id).toBeNull()
  })

  it('снимает фокус с материала, уехавшего в другой поток', async () => {
    const from = await localLearning.addStream({
      name: 'From', icon: 'compass', accent: null, outline: null, sort: 0,
    })
    const to = await localLearning.addStream({
      name: 'To', icon: 'compass', accent: null, outline: null, sort: 1,
    })
    const material = await localLearning.addMaterial({
      stream_id: from.id, title: 'Book', kind: 'book', author: null, url: null,
      status: 'active', cover_url: null, scale: null, pages_total: null, page_current: null, sort: 0,
    })
    await localLearning.updateStream(from.id, { focus_material_id: material.id })

    await localLearning.updateMaterial(material.id, { stream_id: to.id })

    const snap = await localLearning.load()
    expect(snap.streams.find((s) => s.id === from.id)?.focus_material_id).toBeNull()
  })

  it('снимает фокус с материала, ушедшего из работы', async () => {
    const stream = await localLearning.addStream({
      name: 'Professional Growth', icon: 'compass', accent: null, outline: null, sort: 0,
    })
    const material = await localLearning.addMaterial({
      stream_id: stream.id, title: 'Book', kind: 'book', author: null, url: null,
      status: 'active', cover_url: null, scale: null, pages_total: null, page_current: null, sort: 0,
    })
    await localLearning.updateStream(stream.id, { focus_material_id: material.id })

    await localLearning.updateMaterial(material.id, { status: 'inbox' })

    expect((await localLearning.load()).streams[0].focus_material_id).toBeNull()
  })

  it('снимает фокус у любого потока, указывающего на материал удалённого потока', async () => {
    const stream = await localLearning.addStream({
      name: 'Professional Growth', icon: 'compass', accent: null, outline: null, sort: 0,
    })
    const other = await localLearning.addStream({
      name: 'Other', icon: 'compass', accent: null, outline: null, sort: 1,
    })
    const material = await localLearning.addMaterial({
      stream_id: stream.id, title: 'Book', kind: 'book', author: null, url: null,
      status: 'active', cover_url: null, scale: null, pages_total: null, page_current: null, sort: 0,
    })
    // В обычном UI поток фокусируется только на своём материале, но патч
    // хранилища это не проверяет — указатель должен сняться, чей бы поток он ни держал.
    await localLearning.updateStream(other.id, { focus_material_id: material.id })

    await localLearning.deleteStream(stream.id)

    const snap = await localLearning.load()
    expect(snap.streams.find((s) => s.id === other.id)?.focus_material_id).toBeNull()
  })

  it('оставляет фокус, когда материал правят, не уводя из работы', async () => {
    const stream = await localLearning.addStream({
      name: 'Professional Growth', icon: 'compass', accent: null, outline: null, sort: 0,
    })
    const material = await localLearning.addMaterial({
      stream_id: stream.id, title: 'Book', kind: 'book', author: null, url: null,
      status: 'active', cover_url: null, scale: null, pages_total: null, page_current: null, sort: 0,
    })
    await localLearning.updateStream(stream.id, { focus_material_id: material.id })

    await localLearning.updateMaterial(material.id, { title: 'Book, second edition' })

    expect((await localLearning.load()).streams[0].focus_material_id).toBe(material.id)
  })
})

describe('адрес потока', () => {
  it('выдаётся при создании и переживает переименование', async () => {
    const stream = await localLearning.addStream({
      name: 'Professional Growth', icon: 'compass', accent: null, outline: null, sort: 0,
    })
    expect(stream.slug).toBe('professional-growth')

    await localLearning.updateStream(stream.id, { name: 'Профессия', slug: 'professiya' })

    const after = (await localLearning.load()).streams[0]
    expect(after.name).toBe('Профессия')
    expect(after.slug).toBe('professional-growth')
  })

  it('разводит два потока с одним именем', async () => {
    await localLearning.addStream({ name: 'Driving', icon: 'car', accent: null, outline: null, sort: 0 })
    const second = await localLearning.addStream({ name: 'Driving', icon: 'car', accent: null, outline: null, sort: 1 })
    expect(second.slug).toBe('driving-2')
  })
})

describe('переезд v2 → v3', () => {
  const V2 = 'readingtracker.learning.v2'

  const stream = {
    id: 's1',
    slug: 'growth',
    name: 'Growth',
    icon: 'compass',
    accent: null,
    goal: null,
    focus_material_id: null,
    outline: null,
    sort: 0,
    archived: false,
    created_at: '',
    updated_at: '',
  }

  const matV2 = (over: Record<string, unknown> = {}) => ({
    id: 'm1',
    stream_id: 's1',
    title: 'Материал',
    kind: 'book',
    author: null,
    url: null,
    status: 'active',
    cover_url: null,
    parts_total: null,
    sort: 0,
    created_at: '',
    updated_at: '',
    ...over,
  })

  const noteV2 = (over: Record<string, unknown> = {}) => ({
    id: crypto.randomUUID(),
    material_id: 'm1',
    part: null,
    title: null,
    body: '',
    tags: [],
    date: '2026-09-21',
    sort: 0,
    created_at: '',
    updated_at: '',
    ...over,
  })

  const put = (materials: unknown[], notes: unknown[] = []) =>
    localStorage.setItem(V2, JSON.stringify({ streams: [stream], materials, notes }))

  it('книга с числом глав получает список глав и шкалу «по главам»', async () => {
    put([matV2({ parts_total: 3 })])
    const snap = await localLearning.load()

    expect(snap.materials[0].scale).toBe('parts')
    expect(snap.parts).toHaveLength(3)
    expect(snap.parts.map((p) => p.sort)).toEqual([0, 1, 2])
    // Имени нет намеренно: безымянная часть зовётся своим номером по порядку.
    expect(snap.parts.every((p) => p.title === '')).toBe(true)
  })

  it('книга без глав считается по страницам', async () => {
    put([matV2({ parts_total: null })])
    const snap = await localLearning.load()

    expect(snap.materials[0]).toMatchObject({
      scale: 'pages',
      pages_total: null,
      page_current: null,
    })
    expect(snap.parts).toEqual([])
  })

  it('переносит видимую цифру: первые части по числу конспектов отмечены', async () => {
    put([matV2({ parts_total: 5 })], [noteV2(), noteV2()])
    const snap = await localLearning.load()

    expect(snap.parts.map((p) => p.done)).toEqual([true, true, false, false, false])
  })

  it('конспектов больше, чем глав, — отмечены все, и ни одной лишней', async () => {
    put([matV2({ parts_total: 2 })], [noteV2(), noteV2(), noteV2()])
    const snap = await localLearning.load()

    expect(snap.parts).toHaveLength(2)
    expect(snap.parts.every((p) => p.done)).toBe(true)
  })

  it('считает конспекты своего материала, а не все подряд', async () => {
    put([matV2({ parts_total: 3 })], [noteV2({ material_id: 'чужой' })])
    expect((await localLearning.load()).parts.every((p) => !p.done)).toBe(true)
  })

  it('у курса появляются лекции, шкала остаётся пустой', async () => {
    put([matV2({ kind: 'course', parts_total: 4 })])
    const snap = await localLearning.load()

    expect(snap.materials[0].scale).toBeNull()
    expect(snap.parts).toHaveLength(4)
  })

  it('подкаст становится видео, «другое» — статьёй', async () => {
    put([matV2({ id: 'a', kind: 'podcast' }), matV2({ id: 'b', kind: 'other' })])
    const snap = await localLearning.load()

    expect(snap.materials.map((m) => m.kind)).toEqual(['video', 'article'])
  })

  it('неизвестный вид не роняет переезд', async () => {
    put([matV2({ kind: 'сон' })])
    expect((await localLearning.load()).materials[0].kind).toBe('article')
  })

  it('у статьи ни частей, ни шкалы, и статус не трогается конспектами', async () => {
    put([matV2({ kind: 'article', parts_total: 7, status: 'inbox' })], [noteV2(), noteV2()])
    const snap = await localLearning.load()

    expect(snap.parts).toEqual([])
    expect(snap.materials[0]).toMatchObject({ scale: null, status: 'inbox' })
  })

  it('parts_total из материала исчезает', async () => {
    put([matV2({ parts_total: 2 })])
    expect('parts_total' in (await localLearning.load()).materials[0]).toBe(false)
  })

  it('переехавший снимок сохраняется и второй раз не пересчитывается', async () => {
    put([matV2({ parts_total: 2 })])
    const first = await localLearning.load()
    const again = await localLearning.load()

    expect(again.parts.map((p) => p.id)).toEqual(first.parts.map((p) => p.id))
  })

  it('битый снимок не роняет переезд', async () => {
    localStorage.setItem(V2, JSON.stringify({ streams: 'нет', materials: null, notes: 7 }))
    expect(await localLearning.load()).toEqual({
      streams: [],
      materials: [],
      parts: [],
      notes: [],
    })
  })

  it('отрицательное и дробное число глав не создаёт частей', async () => {
    put([matV2({ id: 'a', parts_total: -3 }), matV2({ id: 'b', parts_total: 0.4 })])
    expect((await localLearning.load()).parts).toEqual([])
  })
})

describe('части', () => {
  const aMaterial = (streamId: string, over: Record<string, unknown> = {}) => ({
    stream_id: streamId,
    title: 'Курс',
    kind: 'course' as const,
    author: null,
    url: null,
    status: 'active' as const,
    cover_url: null,
    scale: null,
    pages_total: null,
    page_current: null,
    sort: 0,
    ...over,
  })

  it('заводит часть и возвращает её из load', async () => {
    const s = await localLearning.addStream(aStream)
    const m = await localLearning.addMaterial(aMaterial(s.id))
    await localLearning.addPart({ material_id: m.id, title: '', done: false, sort: 0 })

    expect((await localLearning.load()).parts).toHaveLength(1)
  })

  it('отмечает часть, не трогая соседей', async () => {
    const s = await localLearning.addStream(aStream)
    const m = await localLearning.addMaterial(aMaterial(s.id))
    const a = await localLearning.addPart({ material_id: m.id, title: '', done: false, sort: 0 })
    await localLearning.addPart({ material_id: m.id, title: '', done: false, sort: 1 })

    await localLearning.updatePart(a.id, { done: true })

    const parts = (await localLearning.load()).parts.sort((x, y) => x.sort - y.sort)
    expect(parts.map((p) => p.done)).toEqual([true, false])
  })

  it('удаление материала уносит его части', async () => {
    const s = await localLearning.addStream(aStream)
    const m = await localLearning.addMaterial(aMaterial(s.id))
    const other = await localLearning.addMaterial(aMaterial(s.id, { title: 'Второй' }))
    await localLearning.addPart({ material_id: m.id, title: '', done: false, sort: 0 })
    await localLearning.addPart({ material_id: other.id, title: '', done: false, sort: 0 })

    await localLearning.deleteMaterial(m.id)

    const parts = (await localLearning.load()).parts
    expect(parts).toHaveLength(1)
    expect(parts[0].material_id).toBe(other.id)
  })

  it('удаление потока уносит части его материалов', async () => {
    const s = await localLearning.addStream(aStream)
    const m = await localLearning.addMaterial(aMaterial(s.id))
    await localLearning.addPart({ material_id: m.id, title: '', done: false, sort: 0 })

    await localLearning.deleteStream(s.id)

    expect((await localLearning.load()).parts).toEqual([])
  })

  it('смена вида на статью уносит части: невидимый груз не возвращается', async () => {
    const s = await localLearning.addStream(aStream)
    const m = await localLearning.addMaterial(aMaterial(s.id))
    await localLearning.addPart({ material_id: m.id, title: '', done: true, sort: 0 })

    await localLearning.updateMaterial(m.id, { kind: 'article' })

    expect((await localLearning.load()).parts).toEqual([])
  })

  it('смена шкалы книги с глав на страницы уносит главы', async () => {
    const s = await localLearning.addStream(aStream)
    const m = await localLearning.addMaterial(aMaterial(s.id, { kind: 'book', scale: 'parts' }))
    await localLearning.addPart({ material_id: m.id, title: '', done: false, sort: 0 })

    await localLearning.updateMaterial(m.id, { scale: 'pages' })

    expect((await localLearning.load()).parts).toEqual([])
  })

  it('правка, не меняющая вид, части не трогает', async () => {
    const s = await localLearning.addStream(aStream)
    const m = await localLearning.addMaterial(aMaterial(s.id))
    await localLearning.addPart({ material_id: m.id, title: '', done: false, sort: 0 })

    await localLearning.updateMaterial(m.id, { title: 'Другое имя' })

    expect((await localLearning.load()).parts).toHaveLength(1)
  })
})
