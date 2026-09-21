import {
  emptyLearning,
  type LearningCategory,
  type LearningSnapshot,
  type Material,
  type StudyNote,
} from '../types'
import type { LearningStore, NewCategory, NewMaterial, NewStudyNote } from './types'

/** Отдельный ключ: обучение и чтение живут рядом, но не в одной записи. */
const KEY = 'readingtracker.learning.v1'

function read(): LearningSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...emptyLearning(), ...(JSON.parse(raw) as Partial<LearningSnapshot>) }
  } catch {
    /* испорченное или закрытое хранилище: начинаем с пустого */
  }
  return emptyLearning()
}

function write(snap: LearningSnapshot) {
  localStorage.setItem(KEY, JSON.stringify(snap))
}

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

export const localLearning: LearningStore = {
  async load() {
    return read()
  },

  async addCategory(item: NewCategory) {
    const snap = read()
    const made: LearningCategory = {
      ...item,
      id: uid(),
      archived: false,
      created_at: now(),
      updated_at: now(),
    }
    snap.categories.push(made)
    write(snap)
    return made
  },
  async updateCategory(id, patch) {
    const snap = read()
    snap.categories = snap.categories.map((c) =>
      c.id === id ? { ...c, ...patch, updated_at: now() } : c,
    )
    write(snap)
  },
  async deleteCategory(id) {
    const snap = read()
    const gone = new Set(snap.materials.filter((m) => m.category_id === id).map((m) => m.id))
    snap.categories = snap.categories.filter((c) => c.id !== id)
    snap.materials = snap.materials.filter((m) => m.category_id !== id)
    snap.notes = snap.notes.filter((n) => !gone.has(n.material_id))
    write(snap)
  },

  async addMaterial(item: NewMaterial) {
    const snap = read()
    const made: Material = { ...item, id: uid(), created_at: now(), updated_at: now() }
    snap.materials.push(made)
    write(snap)
    return made
  },
  async updateMaterial(id, patch) {
    const snap = read()
    snap.materials = snap.materials.map((m) =>
      m.id === id ? { ...m, ...patch, updated_at: now() } : m,
    )
    write(snap)
  },
  async deleteMaterial(id) {
    const snap = read()
    snap.materials = snap.materials.filter((m) => m.id !== id)
    snap.notes = snap.notes.filter((n) => n.material_id !== id)
    write(snap)
  },

  async addNote(item: NewStudyNote) {
    const snap = read()
    const made: StudyNote = { ...item, id: uid(), created_at: now(), updated_at: now() }
    snap.notes.push(made)
    write(snap)
    return made
  },
  async updateNote(id, patch) {
    const snap = read()
    snap.notes = snap.notes.map((n) => (n.id === id ? { ...n, ...patch, updated_at: now() } : n))
    write(snap)
  },
  async deleteNote(id) {
    const snap = read()
    snap.notes = snap.notes.filter((n) => n.id !== id)
    write(snap)
  },
}
