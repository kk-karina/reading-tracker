import type { Material, StudyNote } from './types'

export interface MaterialProgress {
  done: number
  total: number | null
  percent: number | null
}

/**
 * Глава считается пройденной, когда по ней есть конспект.
 *
 * Отдельной отметки «прочитано» нет намеренно: потребление и обучение это
 * не одно и то же, и модель не должна делать вид, что одно.
 */
export function materialProgress(material: Material, notes: StudyNote[]): MaterialProgress {
  const done = notes.filter((n) => n.material_id === material.id).length
  const total = material.parts_total && material.parts_total > 0 ? material.parts_total : null
  const percent = total === null ? null : Math.min(100, Math.round((done / total) * 100))
  return { done, total, percent }
}
