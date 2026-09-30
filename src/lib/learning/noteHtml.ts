/**
 * Конспект между хранилищем и полем правки.
 *
 * В хранилище лежит markdown — тот же, что читается глазами в чужом редакторе
 * и в котором «мысль недели» ищет свои `==…==`. В поле правки лежит разметка,
 * потому что показывать человеку служебные знаки вместо жирного шрифта незачем.
 * Здесь два перевода между ними, и оба чистые: DOM они только читают.
 *
 * Это не `renderMarkdown`. Тот рисует готовый конспект для чтения — заголовки,
 * цитаты, списки, ссылки. Поле правит строки, а не документ: блочные знаки
 * остаются в нём текстом и переживают круг нетронутыми.
 */

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPE[c])

/**
 * Из хранимого markdown в разметку поля.
 *
 * Теги выбраны те же, что ставит `execCommand`: `<b>`, `<i>`, `<u>`. Иначе
 * `queryCommandState` не узнавал бы собственное оформление, и кнопка «жирный»
 * не гасла бы на уже жирном тексте.
 *
 * Экранирование идёт первым — по той же причине, что и в `renderMarkdown`:
 * обратный порядок означал бы, что написанный в конспекте script доезжает до
 * страницы.
 */
export function mdToHtml(md: string): string {
  let out = escapeHtml(md)
  out = out.replace(/==(.+?)==/g, '<mark>$1</mark>')
  out = out.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  out = out.replace(/__(.+?)__/g, '<u>$1</u>')
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
  return out.replace(/\n/g, '<br>')
}

/**
 * Узел разметки — ровно то, что нужно обходу, и ничего больше.
 *
 * Структурный тип, а не `Node`: настоящий DOM в тестах этого проекта взять
 * неоткуда — `vitest` бежит в node, и заводить jsdom ради четырёх полей дороже,
 * чем назвать эти четыре поля. Настоящий элемент подходит сюда как есть.
 */
export interface HtmlNode {
  nodeName: string
  nodeValue?: string | null
  childNodes?: ArrayLike<HtmlNode>
  getAttribute?(name: string): string | null
}

/** Чем оборачивается содержимое тега. Оба написания каждого формата — браузеры расходятся. */
const WRAP: Record<string, string> = {
  B: '**',
  STRONG: '**',
  I: '*',
  EM: '*',
  U: '__',
  MARK: '==',
}

/** Теги, которые начинают новую строку. Список широкий: сюда попадает и вставленное из буфера. */
const BLOCK = new Set([
  'DIV',
  'P',
  'LI',
  'UL',
  'OL',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
  'TR',
])

/** Пустая заливка — не маркер: `transparent` браузер ставит сам, снимая выделение. */
const EMPTY_FILL = /^(transparent|none|inherit|initial|unset|rgba\(0,\s*0,\s*0,\s*0\))$/i

/**
 * Маркер браузер делает заливкой, а не тегом: родной команды, дающей `<mark>`,
 * нет ни в одном движке. Поэтому выделение узнаётся по обоим следам.
 */
export function isMarked(node: HtmlNode): boolean {
  const style = node.getAttribute?.('style')
  if (!style) return false
  const fill = /background(?:-color)?\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim()
  return !!fill && !EMPTY_FILL.test(fill)
}

/**
 * Из разметки поля обратно в markdown.
 *
 * Знакомые теги отдают свои знаки, незнакомые — только свой текст. Это не
 * упущение, а граница: разметка, приехавшая вставкой из буфера, не должна
 * доезжать до хранилища тегами, а терять при этом текст было бы хуже всего.
 */
export function htmlToMd(root: HtmlNode): string {
  let out = ''

  const kids = (node: HtmlNode): HtmlNode[] => Array.from(node.childNodes ?? [])

  function walk(node: HtmlNode, last: boolean): void {
    const name = node.nodeName.toUpperCase()

    if (name === '#TEXT') {
      out += node.nodeValue ?? ''
      return
    }

    if (name === 'BR') {
      // Замыкающий `<br>` браузер дописывает сам, чтобы пустой блок не схлопнулся
      // в ничто. Своей строки он не значит, и переносом его считать нельзя.
      if (!last) out += '\n'
      return
    }

    if (BLOCK.has(name) && out !== '') out += '\n'

    const wrap = WRAP[name] ?? (isMarked(node) ? '==' : '')
    const before = out.length

    const children = kids(node)
    children.forEach((child, i) => walk(child, i === children.length - 1))

    // Пустая обёртка знаков не оставляет: `<b></b>` — это ничто, а не `****`.
    if (wrap && out.length > before) {
      out = out.slice(0, before) + wrap + out.slice(before) + wrap
    }
  }

  const children = kids(root)
  children.forEach((child, i) => walk(child, i === children.length - 1))

  return out
}
