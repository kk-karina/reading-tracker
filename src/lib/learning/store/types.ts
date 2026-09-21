import type { LearningSnapshot, Material, Stream, StudyNote } from '../types'

/** Адрес, цель и фокус не спрашиваются при создании: адрес выдаёт хранилище, остальное появляется потом. */
export type NewStream = Pick<Stream, 'name' | 'icon' | 'accent' | 'outline' | 'sort'>
export type NewMaterial = Pick<
  Material,
  'stream_id' | 'title' | 'kind' | 'author' | 'url' | 'status' | 'parts_total' | 'sort'
>
export type NewStudyNote = Pick<
  StudyNote,
  'material_id' | 'part' | 'title' | 'body' | 'tags' | 'date' | 'sort'
>

export interface LearningStore {
  load(): Promise<LearningSnapshot>

  addStream(item: NewStream): Promise<Stream>
  /** `slug` в заплатке игнорируется: адрес выдаётся один раз. */
  updateStream(id: string, patch: Partial<Stream>): Promise<void>
  /** Каскадом уносит материалы потока и их конспекты. */
  deleteStream(id: string): Promise<void>

  addMaterial(item: NewMaterial): Promise<Material>
  updateMaterial(id: string, patch: Partial<Material>): Promise<void>
  /** Каскадом уносит конспекты материала. */
  deleteMaterial(id: string): Promise<void>

  addNote(item: NewStudyNote): Promise<StudyNote>
  updateNote(id: string, patch: Partial<StudyNote>): Promise<void>
  deleteNote(id: string): Promise<void>
}
