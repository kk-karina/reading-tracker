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

const aCategory = {
  name: 'Professional Growth',
  icon: 'compass' as const,
  accent: null,
  outline: null,
  sort: 0,
}

describe('localLearning', () => {
  it('начинает с пустого снимка', async () => {
    expect(await localLearning.load()).toEqual({ categories: [], materials: [], notes: [] })
  })

  it('заводит категорию и возвращает её из load', async () => {
    const made = await localLearning.addCategory(aCategory)
    expect(made.id).toBeTruthy()
    expect(made.archived).toBe(false)
    const snap = await localLearning.load()
    expect(snap.categories).toEqual([made])
  })

  it('правит категорию, не трогая created_at', async () => {
    const made = await localLearning.addCategory(aCategory)
    await localLearning.updateCategory(made.id, { name: 'Рост' })
    const snap = await localLearning.load()
    expect(snap.categories[0].name).toBe('Рост')
    expect(snap.categories[0].created_at).toBe(made.created_at)
  })

  it('удаление категории уносит её материалы и их конспекты', async () => {
    const cat = await localLearning.addCategory(aCategory)
    const other = await localLearning.addCategory({ ...aCategory, name: 'English' })
    const mat = await localLearning.addMaterial({
      category_id: cat.id,
      title: 'Product Design Psychology',
      kind: 'book',
      author: null,
      url: null,
      status: 'active',
      parts_total: 41,
      sort: 0,
    })
    const kept = await localLearning.addMaterial({
      category_id: other.id,
      title: 'Podcast',
      kind: 'podcast',
      author: null,
      url: null,
      status: 'inbox',
      parts_total: null,
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

    await localLearning.deleteCategory(cat.id)

    const snap = await localLearning.load()
    expect(snap.categories.map((c) => c.id)).toEqual([other.id])
    expect(snap.materials.map((m) => m.id)).toEqual([kept.id])
    expect(snap.notes).toEqual([])
  })

  it('удаление материала уносит только его конспекты', async () => {
    const cat = await localLearning.addCategory(aCategory)
    const a = await localLearning.addMaterial({
      category_id: cat.id,
      title: 'A',
      kind: 'book',
      author: null,
      url: null,
      status: 'active',
      parts_total: null,
      sort: 0,
    })
    const b = await localLearning.addMaterial({
      category_id: cat.id,
      title: 'B',
      kind: 'article',
      author: null,
      url: null,
      status: 'inbox',
      parts_total: null,
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
    const cat = await localLearning.addCategory(aCategory)
    const mat = await localLearning.addMaterial({
      category_id: cat.id,
      title: 'A',
      kind: 'book',
      author: null,
      url: null,
      status: 'active',
      parts_total: null,
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
    expect(await localLearning.load()).toEqual({ categories: [], materials: [], notes: [] })
  })

  it('достраивает недостающие массивы в старом снимке', async () => {
    localStorage.setItem('readingtracker.learning.v1', JSON.stringify({ categories: [] }))
    const snap = await localLearning.load()
    expect(snap.materials).toEqual([])
    expect(snap.notes).toEqual([])
  })
})
