import { streamSlug } from '../slug'
import { emptyLearning, type LearningSnapshot, type Material, type Stream, type StudyNote } from '../types'
import type { LearningStore, NewMaterial, NewStream, NewStudyNote } from './types'

const KEY = 'readingtracker.learning.v2'
/** Снимок до переименования категории в поток. Читается один раз и остаётся на месте. */
const KEY_V1 = 'readingtracker.learning.v1'

type CategoryV1 = Omit<Stream, 'slug' | 'goal' | 'focus_material_id'>
interface MaterialV1 extends Omit<Material, 'stream_id'> {
  category_id: string
}
interface SnapshotV1 {
  categories: CategoryV1[]
  materials: MaterialV1[]
  notes: StudyNote[]
}

/**
 * Адреса выдаются в порядке сортировки, поэтому переезд одного и того же
 * снимка всегда даёт одни и те же ссылки.
 */
function migrate(old: SnapshotV1): LearningSnapshot {
  const taken: string[] = []
  const streams = old.categories.map((c) => {
    const slug = streamSlug(c.name, taken)
    taken.push(slug)
    return { ...c, slug, goal: null, focus_material_id: null }
  })
  const materials = old.materials.map(({ category_id, ...rest }) => ({
    ...rest,
    stream_id: category_id,
  }))
  return { streams, materials, notes: old.notes }
}

function read(): LearningSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...emptyLearning(), ...(JSON.parse(raw) as Partial<LearningSnapshot>) }

    // Запись v1 не удаляется: пара килобайт против единственной копии конспектов.
    const old = localStorage.getItem(KEY_V1)
    if (old) {
      const moved = migrate({
        categories: [],
        materials: [],
        notes: [],
        ...(JSON.parse(old) as Partial<SnapshotV1>),
      })
      write(moved)
      return moved
    }
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

  async addStream(item: NewStream) {
    const snap = read()
    const made: Stream = {
      ...item,
      id: uid(),
      slug: streamSlug(item.name, snap.streams.map((s) => s.slug)),
      goal: null,
      focus_material_id: null,
      archived: false,
      created_at: now(),
      updated_at: now(),
    }
    snap.streams.push(made)
    write(snap)
    return made
  },
  async updateStream(id, patch) {
    const snap = read()
    // Адрес не меняется никогда, даже если его прислали: ссылка должна пережить переименование.
    const { slug: _keep, ...safe } = patch
    snap.streams = snap.streams.map((s) =>
      s.id === id ? { ...s, ...safe, updated_at: now() } : s,
    )
    write(snap)
  },
  async deleteStream(id) {
    const snap = read()
    const gone = new Set(snap.materials.filter((m) => m.stream_id === id).map((m) => m.id))
    snap.streams = snap.streams.filter((s) => s.id !== id)
    snap.materials = snap.materials.filter((m) => m.stream_id !== id)
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
    const before = snap.materials.find((m) => m.id === id)
    snap.materials = snap.materials.map((m) =>
      m.id === id ? { ...m, ...patch, updated_at: now() } : m,
    )
    // Материал, уехавший в другой поток, не может оставаться фокусом прежнего.
    if (before && patch.stream_id && patch.stream_id !== before.stream_id) {
      snap.streams = snap.streams.map((s) =>
        s.id === before.stream_id && s.focus_material_id === id
          ? { ...s, focus_material_id: null, updated_at: now() }
          : s,
      )
    }
    // Фокус — это «за что сесть». Материал, ушедший из работы, перестаёт им быть,
    // иначе дашборд продолжает звать к тому, что уже отложено или пройдено.
    if (patch.status && patch.status !== 'active') {
      snap.streams = snap.streams.map((s) =>
        s.focus_material_id === id ? { ...s, focus_material_id: null, updated_at: now() } : s,
      )
    }
    write(snap)
  },
  async deleteMaterial(id) {
    const snap = read()
    snap.materials = snap.materials.filter((m) => m.id !== id)
    snap.notes = snap.notes.filter((n) => n.material_id !== id)
    snap.streams = snap.streams.map((s) =>
      s.focus_material_id === id ? { ...s, focus_material_id: null, updated_at: now() } : s,
    )
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
