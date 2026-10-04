import type {
  LearningSnapshot,
  Material,
  MaterialPart,
  Stream,
  StudyNote,
  StudySession,
} from '../types'

/** Адрес, цель и фокус не спрашиваются при создании: адрес выдаёт хранилище, остальное появляется потом. */
export type NewStream = Pick<Stream, 'name' | 'accent' | 'outline' | 'sort'>
export type NewMaterial = Pick<
  Material,
  | 'stream_id'
  | 'title'
  | 'kind'
  | 'author'
  | 'url'
  | 'cover_url'
  | 'status'
  | 'scale'
  | 'pages_total'
  | 'page_current'
  | 'sort'
> &
  Partial<Pick<Material, 'book_id'>>
export type NewMaterialPart = Pick<MaterialPart, 'material_id' | 'title' | 'done' | 'sort'> &
  Partial<Pick<MaterialPart, 'started'>>
export type NewStudyNote = Pick<
  StudyNote,
  'material_id' | 'session_id' | 'part_id' | 'part' | 'title' | 'body' | 'tags' | 'date' | 'sort'
>
export type NewStudySession = Omit<StudySession, 'id' | 'created_at' | 'book_session_id' | 'started_ids'> &
  Partial<Pick<StudySession, 'book_session_id' | 'started_ids'>>

export interface LearningStore {
  load(): Promise<LearningSnapshot>

  addStream(item: NewStream): Promise<Stream>
  /** `slug` в заплатке игнорируется: адрес выдаётся один раз. */
  updateStream(id: string, patch: Partial<Stream>): Promise<void>
  /** Каскадом уносит материалы потока и их конспекты. */
  deleteStream(id: string): Promise<void>

  addMaterial(item: NewMaterial): Promise<Material>
  /** Вид или шкала, при которых частей не бывает, уносят части этого материала. */
  updateMaterial(id: string, patch: Partial<Material>): Promise<void>
  /** Каскадом уносит части, занятия и конспекты материала. */
  deleteMaterial(id: string): Promise<void>

  /**
   * Части заводятся по одной, даже когда их двадцать: один способ добавить
   * часть проще двух, а за раз их десятки, не тысячи.
   */
  addPart(item: NewMaterialPart): Promise<MaterialPart>
  updatePart(id: string, patch: Partial<MaterialPart>): Promise<void>
  deletePart(id: string): Promise<void>

  addSession(item: NewStudySession): Promise<StudySession>
  updateSession(id: string, patch: Partial<StudySession>): Promise<void>
  /** Конспекты занятия остаются — без занятия, как мысли в чтении. */
  deleteSession(id: string): Promise<void>

  addNote(item: NewStudyNote): Promise<StudyNote>
  updateNote(id: string, patch: Partial<StudyNote>): Promise<void>
  deleteNote(id: string): Promise<void>
}
