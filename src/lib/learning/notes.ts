import { partsOf } from './parts'
import type { Material, MaterialPart, StudyNote } from './types'

/**
 * Конспекты потока — через материалы, а не напрямую: у конспекта нет своего
 * `stream_id`. Три экрана считали это порознь и разошлись; здесь одно
 * правило и один проход, а не вложенный перебор на каждый конспект.
 */
export function notesOfStream<T extends Pick<StudyNote, 'material_id'>>(
  materials: Material[],
  notes: T[],
  streamId: string,
): T[] {
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

/**
 * Пустой ли лист — то есть стоит ли его вообще класть в хранилище.
 *
 * Лист занятия открывается с контуром потока в теле: контур на то и заведён,
 * чтобы не начинать с чистого места. Но нетронутый контур — это всё ещё
 * ничего не написанное, и раньше он уезжал в хранилище наравне с конспектом:
 * записала занятие, отметила главу — в ленте появился лист, в котором нечего
 * читать. Десять занятий подряд давали десять одинаковых пустышек.
 *
 * Поэтому пустым считается и нетронутый контур, а не только пустая строка.
 * Прогресс от этого не страдает: главу закрывает отметка, страницу — число,
 * статью — флаг, и ни одному из них конспект не нужен.
 */
export function isBlankNote(body: string, outline: string | null): boolean {
  const written = body.trim()
  return written === '' || written === (outline ?? '').trim()
}
