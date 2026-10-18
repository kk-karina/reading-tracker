/**
 * Списки в поле конспекта.
 *
 * Поле правит строки, а не документ: заголовок в нём остаётся `## `, и список
 * так же остаётся строками с `- ` и `1. ` впереди. Кнопка списка не заводит
 * `<ul>` в поле — она ставит и снимает эти знаки. Так в поле видно ровно то,
 * что уйдёт в хранилище, а готовый конспект рисует из них настоящий список
 * (`renderMarkdown`).
 *
 * Здесь только арифметика строк; что делать с DOM, решает `NoteEditor`.
 */

export type ListKind = 'ul' | 'ol'

/** Знак списка в начале строки. Как в `renderMarkdown`: после знака — пробел. */
const PREFIX = /^(?:(-)|(\d+)\.)\s/

export interface ListLine {
  kind: ListKind
  /** Номер у нумерованного, 0 у маркированного. */
  n: number
  /** Сколько знаков занимает префикс вместе с пробелом. */
  len: number
}

export function listOf(line: string): ListLine | null {
  const m = PREFIX.exec(line)
  if (!m) return null
  return m[1] ? { kind: 'ul', n: 0, len: m[0].length } : { kind: 'ol', n: Number(m[2]), len: m[0].length }
}

/** Что сделать со строкой: срезать `cut` знаков с начала и поставить `put`. */
export interface LineEdit {
  cut: number
  put: string
}

const KEEP: LineEdit = { cut: 0, put: '' }

/**
 * Префиксы для выделенных строк.
 *
 * Если все непустые строки уже этим списком — кнопка его снимает, как жирный
 * снимается с жирного. Иначе список ставится всем: другой вид меняется на
 * этот, голые строки получают знак. Пустые строки внутри выделения знака не
 * получают — пустой пункт посреди списка читается опечаткой. Одна пустая
 * строка, на которой стоит курсор, получает: с неё список и начинают.
 *
 * `start` — с какого номера считать: продолжение списка над выделением.
 */
export function listEdits(lines: string[], kind: ListKind, start = 1): LineEdit[] {
  const filled = lines.map((l) => {
    const at = listOf(l)
    return l.slice(at?.len ?? 0).trim() !== ''
  })
  const lone = lines.length === 1

  const all = lines.every((l, i) => (!filled[i] && !lone) || listOf(l)?.kind === kind)
  if (all) {
    return lines.map((l) => {
      const at = listOf(l)
      return at ? { cut: at.len, put: '' } : KEEP
    })
  }

  let n = start
  return lines.map((l, i) => {
    if (!filled[i] && !lone) return KEEP
    return { cut: listOf(l)?.len ?? 0, put: kind === 'ul' ? '- ' : `${n++}. ` }
  })
}

/**
 * Что делает Enter в строке списка.
 *
 * Пункт с текстом — новая строка с тем же знаком, номер на один больше.
 * Пустой пункт — список кончился: знак снимается, как в любом редакторе,
 * где второй Enter выводит из списка. Не список — Enter обычный.
 */
export function continueList(line: string): { next: string } | { end: number } | null {
  const at = listOf(line)
  if (!at) return null
  if (line.slice(at.len).trim() === '') return { end: at.len }
  return { next: at.kind === 'ul' ? '- ' : `${at.n + 1}. ` }
}
