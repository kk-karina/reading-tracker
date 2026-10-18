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

/**
 * Группа оглавления: глава со своими листами.
 *
 * `part` — глава из списка материала, `name` — имя, набранное руками у старых
 * конспектов. Ни того ни другого — листы без главы.
 */
export interface NoteGroup<T> {
  key: string
  part: MaterialPart | null
  /** Номер главы в материале, с нуля. Только при `part`. */
  index: number
  name: string | null
  notes: T[]
}

/**
 * Листы материала по главам — оглавление, по которому их и листают.
 *
 * Главы идут в порядке материала, а не в порядке написания: конспект читают
 * как книгу, а не как журнал, и два листа к одной главе должны стоять рядом,
 * даже если между ними написаны три других. Внутри главы — по дате. Старые
 * листы с именем главы текстом встают за главами, листы без главы — в конец.
 *
 * Листание идёт по этому же порядку: соседний лист — тот, что ниже в
 * оглавлении, иначе стрелка прыгала бы по колонке вверх-вниз.
 */
export function noteOutline<T extends Pick<StudyNote, 'part_id' | 'part' | 'date'>>(
  notes: T[],
  parts: MaterialPart[],
): NoteGroup<T>[] {
  const index = new Map(parts.map((p, i) => [p.id, i]))
  const chapters = new Map<string, NoteGroup<T>>()
  const named = new Map<string, NoteGroup<T>>()
  const loose: NoteGroup<T> = { key: 'none', part: null, index: -1, name: null, notes: [] }

  for (const n of notes) {
    // Указатель на удалённую главу ничего не значит: лист держится за своё имя.
    const i = n.part_id ? index.get(n.part_id) : undefined
    if (i !== undefined) {
      const part = parts[i]
      const g = chapters.get(part.id) ?? { key: part.id, part, index: i, name: null, notes: [] }
      g.notes.push(n)
      chapters.set(part.id, g)
    } else if (n.part?.trim()) {
      const name = n.part.trim()
      const g = named.get(name) ?? { key: `name:${name}`, part: null, index: -1, name, notes: [] }
      g.notes.push(n)
      named.set(name, g)
    } else {
      loose.notes.push(n)
    }
  }

  const groups = [
    ...[...chapters.values()].sort((a, b) => a.index - b.index),
    ...named.values(),
    ...(loose.notes.length > 0 ? [loose] : []),
  ]
  // Сортировка устойчивая: листы одного дня остаются в порядке написания.
  for (const g of groups) g.notes.sort((a, b) => a.date.localeCompare(b.date))
  return groups
}
