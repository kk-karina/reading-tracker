import type { Material, StudyNote } from './types'

/**
 * Конспекты потока — через материалы, а не напрямую: у конспекта нет своего
 * `stream_id`. Три экрана считали это порознь и разошлись; здесь одно
 * правило и один проход, а не вложенный перебор на каждый конспект.
 */
export function notesOfStream(
  materials: Material[],
  notes: StudyNote[],
  streamId: string,
): StudyNote[] {
  const ids = new Set(materials.filter((m) => m.stream_id === streamId).map((m) => m.id))
  return notes.filter((n) => ids.has(n.material_id))
}
