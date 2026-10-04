import type { Material, MaterialPart, StudyNote } from './types'

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

/**
 * На какой части лист занятия открывается.
 *
 * Начатая важнее непройденной: часть, по которой конспект уже есть, а отметки
 * нет — это ровно то место, где чтение остановилось, и открывать лист надо
 * там, а не на следующей чистой. Когда начатых нет, берётся первая
 * непройденная; когда пройдено всё — последняя, чтобы было куда дописать.
 *
 * Возвращает саму часть, а не её `id`: звать `partLabel` всё равно придётся по
 * части, и лишний поиск по списку тут ни к чему.
 */
export function pickDefaultPart(parts: MaterialPart[], notes: StudyNote[]): MaterialPart | null {
  const order = [...parts].sort((a, b) => a.sort - b.sort)
  if (order.length === 0) return null

  const written = new Set(notes.map((n) => n.part_id).filter((id): id is string => id !== null))

  return (
    order.find((p) => !p.done && written.has(p.id)) ??
    order.find((p) => !p.done) ??
    order[order.length - 1]
  )
}

/**
 * Строки списка имён — в имена частей, строка к строке.
 *
 * Программу курса копируют с чужой страницы, и приходит она пронумерованной:
 * «1. Вступление», «2) Что такое поток». Номер здесь лишний — его рисует сам
 * экран, и свой он держит верным при вставке и удалении соседей, а
 * скопированный застыл бы в названии. Поэтому ведущая нумерация снимается.
 *
 * Пустая строка внутри списка — это не пропуск, а часть без своего имени:
 * пустое имя и значит «зовётся номером» (см. `partLabel`). Иначе список имён
 * нельзя было бы открыть тем, что уже есть, — безымянная часть не имеет чем
 * себя в нём обозначить, и всё, что ниже неё, съехало бы на строку вверх.
 * Пустые строки по краям — это разрядка, и они уходят.
 */
export function parseTitles(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\s*[.)]\s*/, '').trim())

  let from = 0
  let to = lines.length
  while (from < to && lines[from] === '') from++
  while (to > from && lines[to - 1] === '') to--
  return lines.slice(from, to)
}

export interface NamePlan {
  /** Существующие части, которым меняется имя. */
  rename: { id: string; title: string }[]
  /** Имена, которым части ещё нет. Встают в конец, по порядку. */
  add: { title: string; sort: number }[]
}

/**
 * Что сделать со списком частей, чтобы он назывался этими именами.
 *
 * Имена ложатся по порядку: первое на первую часть, второе на вторую. Имён
 * больше, чем частей, — недостающие заводятся; меньше — лишние части остаются
 * как были. Удалять здесь нечего: имён не хватило — это про список имён, а не
 * про то, что лекций стало меньше, и молча терять отмеченное на такой догадке
 * нельзя. Для «стало меньше» есть поле числа в форме материала.
 *
 * Часть, которой имя не меняется, в план не попадает: лишняя запись в
 * хранилище — это лишний круг перерисовки на каждую из сорока строк.
 */
export function planNames(existing: MaterialPart[], titles: string[]): NamePlan {
  const have = [...existing].sort((a, b) => a.sort - b.sort)
  const rename: NamePlan['rename'] = []

  for (let i = 0; i < Math.min(have.length, titles.length); i++) {
    if (have[i].title !== titles[i]) rename.push({ id: have[i].id, title: titles[i] })
  }

  return {
    rename,
    add: titles.slice(have.length).map((title, i) => ({ title, sort: have.length + i })),
  }
}

/** Состояние части одним словом — тем же, которым её читает экранный диктор. */
export type PartState = 'done' | 'started' | 'fresh'

/**
 * Как часть выглядит в ряду точек.
 *
 * Три состояния, а не два: «начата» — пройдена до середины (отмечено руками)
 * или конспект есть, а отметки нет. Ряд точек без него врал бы ровно про ту
 * часть, на которой человек сейчас сидит.
 */
export const partState = (part: MaterialPart, started: ReadonlySet<string>): PartState =>
  part.done ? 'done' : part.started || started.has(part.id) ? 'started' : 'fresh'

/**
 * Шаг цикла по клику: пусто → начата → пройдена → пусто.
 *
 * Цикл, а не двойной клик: два быстрых клика дают то же «пройдена», но
 * одиночному не приходится ждать таймера, который отличал бы его от двойного,
 * а на телефоне двойное касание и вовсе увеличивает страницу.
 */
export const nextPartState = (state: PartState): PartState =>
  state === 'fresh' ? 'started' : state === 'started' ? 'done' : 'fresh'

/** Отметка части этим занятием: пройдена до середины или целиком. */
export interface PartMark {
  id: string
  half: boolean
}

/**
 * Шаг цикла в листе занятия: нет → наполовину → целиком → нет.
 *
 * Часть, начатая раньше (руками или конспектом), уже стоит наполовину:
 * второй половинки ей не поставить, и цикл у неё короче — целиком и обратно.
 * Отметка держит место, на котором её поставили: строки под точками идут в
 * порядке отметок, и смена половинки на целую не должна их переставлять.
 */
export function cycleMark(marks: PartMark[], id: string, startedBefore: boolean): PartMark[] {
  const mine = marks.find((m) => m.id === id)
  if (!mine) return [...marks, { id, half: !startedBefore }]
  if (mine.half) return marks.map((m) => (m.id === id ? { id, half: false } : m))
  return marks.filter((m) => m.id !== id)
}
