import type { Material, MaterialPart } from './types'

/** Есть ли у этого материала главы или лекции вообще. */
export function hasParts(material: Pick<Material, 'kind' | 'scale'>): boolean {
  return material.kind === 'course' || (material.kind === 'book' && material.scale === 'parts')
}

/** Слово, которым эти части называются на экране: у книги главы, у курса лекции. */
export function partWord(kind: Material['kind']): 'chapter' | 'lecture' {
  return kind === 'course' ? 'lecture' : 'chapter'
}

export const partsOf = (parts: MaterialPart[], materialId: string): MaterialPart[] =>
  parts.filter((p) => p.material_id === materialId).sort((a, b) => a.sort - b.sort)

export interface PartsPlan {
  /** Места, на которые встают новые части. Имени у них нет — см. `partLabel`. */
  add: { sort: number }[]
  /** Идентификаторы частей, которые уходят. */
  remove: string[]
  /** Есть ли среди уходящих отмеченные — форма на этом спрашивает подтверждение. */
  losesDone: boolean
}

/**
 * Что сделать со списком частей, чтобы их стало ровно `count`.
 *
 * Лишние снимаются с конца, недостающие дописываются в конец, существующие не
 * трогаются вовсе. Правило одно и то же в обе стороны, и потому переименованная
 * «Глава 3» переживает и увеличение числа глав, и уменьшение — пока номер 3 не
 * оказался за границей.
 *
 * Чистая функция: она ничего не пишет и говорит только, что произойдёт, — это
 * позволяет форме спросить подтверждение до того, как что-то случилось.
 */
export function planParts(existing: MaterialPart[], count: number): PartsPlan {
  const have = [...existing].sort((a, b) => a.sort - b.sort)
  const want = Math.max(0, Math.floor(count) || 0)

  if (want >= have.length) {
    return {
      add: Array.from({ length: want - have.length }, (_, i) => ({ sort: have.length + i })),
      remove: [],
      losesDone: false,
    }
  }

  const cut = have.slice(want)
  return { add: [], remove: cut.map((p) => p.id), losesDone: cut.some((p) => p.done) }
}

/**
 * Как часть называется на экране.
 *
 * Пустое имя значит «не переименовывали», и тогда часть зовётся своим номером
 * по порядку. Номер не хранится: удалили вторую главу из двадцати — третья
 * становится второй сама, а не остаётся «Главой 3» в списке из девятнадцати.
 * Заодно хранилищу не нужно знать язык, на котором это будет написано.
 */
export const partLabel = (part: MaterialPart, index: number, fallback: (n: number) => string) =>
  part.title.trim() || fallback(index + 1)
