import type { LearningCategory, LearningSnapshot, Material, StudyNote } from '../types'

export type NewCategory = Pick<LearningCategory, 'name' | 'icon' | 'accent' | 'outline' | 'sort'>
export type NewMaterial = Pick<
  Material,
  'category_id' | 'title' | 'kind' | 'author' | 'url' | 'status' | 'parts_total' | 'sort'
>
export type NewStudyNote = Pick<
  StudyNote,
  'material_id' | 'part' | 'title' | 'body' | 'tags' | 'date' | 'sort'
>

export interface LearningStore {
  load(): Promise<LearningSnapshot>

  addCategory(item: NewCategory): Promise<LearningCategory>
  updateCategory(id: string, patch: Partial<LearningCategory>): Promise<void>
  /** Каскадом уносит материалы категории и их конспекты. */
  deleteCategory(id: string): Promise<void>

  addMaterial(item: NewMaterial): Promise<Material>
  updateMaterial(id: string, patch: Partial<Material>): Promise<void>
  /** Каскадом уносит конспекты материала. */
  deleteMaterial(id: string): Promise<void>

  addNote(item: NewStudyNote): Promise<StudyNote>
  updateNote(id: string, patch: Partial<StudyNote>): Promise<void>
  deleteNote(id: string): Promise<void>
}
