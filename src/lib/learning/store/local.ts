import { hasParts } from '../parts'
import { streamSlug } from '../slug'
import {
  emptyLearning,
  KINDS,
  type LearningSnapshot,
  type Material,
  type MaterialKind,
  type MaterialPart,
  type Stream,
  type StudyNote,
} from '../types'
import type {
  LearningStore,
  NewMaterial,
  NewMaterialPart,
  NewStream,
  NewStudyNote,
} from './types'

const KEY = 'readingtracker.learning.v3'
/** Снимок до того, как вид материала стал определять его поля. */
const KEY_V2 = 'readingtracker.learning.v2'
/** Снимок до переименования категории в поток. Читается один раз и остаётся на месте. */
const KEY_V1 = 'readingtracker.learning.v1'

type CategoryV1 = Omit<Stream, 'slug' | 'goal' | 'focus_material_id'>
interface MaterialV1 extends Omit<MaterialV2, 'stream_id'> {
  category_id: string
}
interface SnapshotV1 {
  categories: CategoryV1[]
  materials: MaterialV1[]
  notes: StudyNote[]
}

/** Материал v2: один набор полей на все виды, число частей вместо списка. */
interface MaterialV2 extends Omit<Material, 'scale' | 'pages_total' | 'page_current' | 'kind'> {
  kind: string
  parts_total: number | null
}
interface SnapshotV2 {
  streams: Stream[]
  materials: MaterialV2[]
  notes: StudyNote[]
}

/**
 * Адреса выдаются в порядке сортировки, поэтому переезд одного и того же
 * снимка всегда даёт одни и те же ссылки.
 */
function migrateV1(old: SnapshotV1): SnapshotV2 {
  // Снимок v1 приходит из JSON: доверять его форме нельзя — битые поля не
  // должны ронять переезд и превращать read-only сессию в пустую.
  const categories = Array.isArray(old.categories) ? old.categories : []
  const oldMaterials = Array.isArray(old.materials) ? old.materials : []
  const notes = Array.isArray(old.notes) ? old.notes : []
  const taken: string[] = []
  const streams = categories.map((c) => {
    // Категория без имени всё равно получает адрес: `stream-N` вместо падения на `.toLowerCase()`.
    const slug = streamSlug(String(c.name ?? ''), taken)
    taken.push(slug)
    return { ...c, slug, goal: null, focus_material_id: null }
  })
  const materials = oldMaterials.map(({ category_id, ...rest }) => ({
    ...rest,
    stream_id: category_id,
  }))
  return { streams, materials, notes }
}

/**
 * Куда деваются виды, которых больше нет.
 *
 * Подкаст уходит в видео: слушала или смотрела — тумблер один и тот же.
 * «Другое» уходит в статью: цельная вещь, которую прочла или не прочла, — это
 * самое безобидное, чем может оказаться материал без собственного поведения.
 */
function migrateKind(kind: string): MaterialKind {
  if (kind === 'podcast') return 'video'
  return (KINDS as readonly string[]).includes(kind) ? (kind as MaterialKind) : 'article'
}

/**
 * Переезд v2 → v3: вид начинает определять поля, число частей становится списком.
 *
 * Пройденными помечаются первые части по числу написанных конспектов. Это
 * перенос показания, а не утверждение о том, какие именно главы пройдены:
 * человек видел на экране «12 из 20» и после обновления должен увидеть то же
 * самое. Угадывать по тексту конспекта, какая это была глава, честнее не будет.
 */
function migrateV2(old: SnapshotV2): LearningSnapshot {
  const streams = Array.isArray(old.streams) ? old.streams : []
  const oldMaterials = Array.isArray(old.materials) ? old.materials : []
  const notes = Array.isArray(old.notes) ? old.notes : []

  const materials: Material[] = []
  const parts: MaterialPart[] = []

  for (const { parts_total, ...rest } of oldMaterials) {
    const kind = migrateKind(String(rest.kind ?? ''))
    const count = Number(parts_total) > 0 ? Math.floor(Number(parts_total)) : 0
    const scale: Material['scale'] = kind === 'book' ? (count > 0 ? 'parts' : 'pages') : null

    const material: Material = {
      ...rest,
      kind,
      scale,
      pages_total: null,
      page_current: null,
      cover_url: rest.cover_url ?? null,
    }
    materials.push(material)

    if (count > 0 && (kind === 'course' || scale === 'parts')) {
      const written = notes.filter((n) => n.material_id === material.id).length
      for (let i = 0; i < count; i++) {
        // Имени нет намеренно: безымянная часть зовётся своим номером по
        // порядку, и хранилищу не нужно знать язык, на котором это напишут.
        parts.push({ id: uid(), material_id: material.id, title: '', done: i < written, sort: i })
      }
    }
  }

  return { streams, materials, parts, notes }
}

function read(): LearningSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...emptyLearning(), ...(JSON.parse(raw) as Partial<LearningSnapshot>) }

    // Записи прежних версий не удаляются: пара килобайт против единственной
    // копии конспектов.
    const v2 = localStorage.getItem(KEY_V2)
    const v1 = v2 ? null : localStorage.getItem(KEY_V1)
    if (!v2 && !v1) return emptyLearning()

    const before: SnapshotV2 = v2
      ? { streams: [], materials: [], notes: [], ...(JSON.parse(v2) as Partial<SnapshotV2>) }
      : migrateV1({
          categories: [],
          materials: [],
          notes: [],
          ...(JSON.parse(v1 as string) as Partial<SnapshotV1>),
        })

    const moved = migrateV2(before)
    // Сохранить не получилось — не повод выбрасывать уже посчитанный снимок:
    // он годен для показа независимо от записи, а его потеря выглядит для
    // пользователя неотличимо от настоящей потери данных.
    try {
      write(moved)
    } catch {
      /* хранилище недоступно на запись: сеанс проживёт без сохранения */
    }
    return moved
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
    snap.streams = snap.streams
      .filter((s) => s.id !== id)
      // Указатель на удалённый материал не переживает чистку, чей бы поток он ни держал.
      .map((s) =>
        s.focus_material_id && gone.has(s.focus_material_id)
          ? { ...s, focus_material_id: null, updated_at: now() }
          : s,
      )
    snap.materials = snap.materials.filter((m) => m.stream_id !== id)
    snap.parts = snap.parts.filter((p) => !gone.has(p.material_id))
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
    // Вид или шкала, при которых частей не бывает, уносят и сами части.
    // Иначе они остаются невидимым грузом и возвращаются на экран, стоит
    // переключить вид обратно, — с отметками, которых человек уже не помнит.
    const after = snap.materials.find((m) => m.id === id)
    if (after && !hasParts(after)) snap.parts = snap.parts.filter((p) => p.material_id !== id)

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
    snap.parts = snap.parts.filter((p) => p.material_id !== id)
    snap.notes = snap.notes.filter((n) => n.material_id !== id)
    snap.streams = snap.streams.map((s) =>
      s.focus_material_id === id ? { ...s, focus_material_id: null, updated_at: now() } : s,
    )
    write(snap)
  },

  async addPart(item: NewMaterialPart) {
    const snap = read()
    const made: MaterialPart = { ...item, id: uid() }
    snap.parts.push(made)
    write(snap)
    return made
  },
  async updatePart(id, patch) {
    const snap = read()
    snap.parts = snap.parts.map((p) => (p.id === id ? { ...p, ...patch } : p))
    write(snap)
  },
  async deletePart(id) {
    const snap = read()
    snap.parts = snap.parts.filter((p) => p.id !== id)
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
