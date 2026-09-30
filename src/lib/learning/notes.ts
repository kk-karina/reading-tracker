import { partsOf } from './parts'
import type { Material, MaterialPart, StudyNote } from './types'

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

/**
 * Чем лист подписан.
 *
 * Имя главы, на которую он указывает, — а не то, что было набрано руками
 * когда-то: переименованная глава должна унести свои листы за собой. Старые
 * конспекты указателя не имеют и держатся за собственный текст, поэтому он
 * стоит следующим, а не первым.
 *
 * Правило одно на все экраны: навигация по листам и сам лист обязаны звать
 * конспект одинаково, иначе в чипе «Глава 4», а на листе пусто.
 *
 * `label` приходит снаружи, потому что безымянная глава зовётся номером, а
 * слово для номера знает только экран: у книги главы, у курса лекции.
 */
export function noteHeading(
  note: StudyNote,
  parts: MaterialPart[],
  label: (part: MaterialPart, index: number) => string,
): string | null {
  if (note.part_id) {
    const mine = partsOf(parts, note.material_id)
    const i = mine.findIndex((p) => p.id === note.part_id)
    if (i >= 0) return label(mine[i], i)
  }
  return note.part ?? note.title ?? null
}
