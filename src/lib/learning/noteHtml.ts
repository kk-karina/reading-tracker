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

import { isMarkColor, MARK, MARK_COLORS, markOpen, type MarkColor } from './marks'

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPE[c])

/**
 * Маркер в поле — заливкой, ровно как его ставит сам браузер (`hiliteColor`).
 * Тег `<mark>` здесь был бы чужим: команда его не узнаёт, и снять маркер с
 * текста, пришедшего из хранилища, было бы нельзя — заливка ложилась бы
 * поверх тега, а тег оставался. Цвет — переменной темы, а не числом.
 */
const markSpan = (_: string, color: string | undefined, body: string) =>
  `<span style="background-color: var(--mark-${color || 'lemon'})">${body}</span>`

/**
 * Из хранимого markdown в разметку поля.
 *
 * Теги выбраны те же, что ставит `execCommand`: `<b>`, `<i>`, `<u>`. Иначе
 * `queryCommandState` не узнавал бы собственное оформление, и кнопка «жирный»
 * не гасла бы на уже жирном тексте.
 *
 * Каждая строка — свой блок, как их и делает браузер по Enter: так отступ между
 * абзацами в поле тот же, что в готовом конспекте, а пустая строка остаётся
 * пустым блоком с `<br>`, без которого она схлопнулась бы в ничто.
 *
 * Экранирование идёт первым — по той же причине, что и в `renderMarkdown`:
 * обратный порядок означал бы, что написанный в конспекте script доезжает до
 * страницы.
 */
export function mdToHtml(md: string): string {
  if (md === '') return ''
  return escapeHtml(md)
    .split('\n')
    .map((line) => {
      let out = line.replace(MARK, markSpan)
      out = out.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      out = out.replace(/__(.+?)__/g, '<u>$1</u>')
      out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
      return `<div>${out || '<br>'}</div>`
    })
    .join('')
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

/** Чем залит узел, если залит. */
function fillOf(node: HtmlNode): string | null {
  const style = node.getAttribute?.('style')
  if (!style) return null
  const fill = /background(?:-color)?\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim()
  return fill && !EMPTY_FILL.test(fill) ? fill : null
}

/**
 * Маркер браузер делает заливкой, а не тегом: родной команды, дающей `<mark>`,
 * нет ни в одном движке. Поэтому выделение узнаётся по обоим следам.
 */
export function isMarked(node: HtmlNode): boolean {
  return fillOf(node) !== null
}

/** Цвета палитры, как их отдаёт тема: имя → `#rrggbb`. */
export type MarkPalette = Partial<Record<MarkColor, string>>

function rgbOf(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1]
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
  }
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(color.trim())
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null
}

/**
 * Какого цвета маркер на узле.
 *
 * Своя разметка пишет цвет переменной (`var(--mark-mint)`) — он читается по
 * имени. Браузер после команды пишет число, и не всегда то, что ему дали:
 * `#e9f86b` возвращается как `rgb(233, 248, 107)`. Поэтому число сводится к
 * ближайшему цвету палитры, а не сравнивается строкой. Непонятное — лимон:
 * маркер остаётся маркером, даже если оттенок не узнан.
 */
export function markColorOf(node: HtmlNode, palette: MarkPalette = {}): MarkColor | null {
  if (node.nodeName.toUpperCase() === 'MARK') {
    const named = node.getAttribute?.('data-mark')
    return isMarkColor(named) ? named : 'lemon'
  }
  const fill = fillOf(node)
  if (!fill) return null

  const named = /var\(\s*--mark-([a-z]+)/i.exec(fill)?.[1]
  if (isMarkColor(named)) return named

  const rgb = rgbOf(fill)
  if (!rgb) return 'lemon'
  let best: MarkColor = 'lemon'
  let gap = Infinity
  for (const c of MARK_COLORS) {
    const ref = palette[c] && rgbOf(palette[c])
    if (!ref) continue
    const d = (ref[0] - rgb[0]) ** 2 + (ref[1] - rgb[1]) ** 2 + (ref[2] - rgb[2]) ** 2
    if (d < gap) {
      gap = d
      best = c
    }
  }
  return best
}

/**
 * Из разметки поля обратно в markdown.
 *
 * Знакомые теги отдают свои знаки, незнакомые — только свой текст. Это не
 * упущение, а граница: разметка, приехавшая вставкой из буфера, не должна
 * доезжать до хранилища тегами, а терять при этом текст было бы хуже всего.
 */
export function htmlToMd(root: HtmlNode, palette: MarkPalette = {}): string {
  let out = ''

  const kids = (node: HtmlNode): HtmlNode[] => Array.from(node.childNodes ?? [])

  /** `inMark` — внутри уже открытого маркера. Вложенный второй знаков не ставит:
      `====` разметка не прочтёт, а закрасить дважды одно место нельзя. */
  function walk(node: HtmlNode, last: boolean, inMark: boolean): void {
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

    // Тег и заливка бывают на одном узле: красит браузер то, что уже стоит,
    // и на жирном слове заливка ложится на сам `<b>`. Маркер идёт снаружи —
    // разметка читает его первым, и внутри него жирный остаётся жирным.
    const mark = inMark ? null : markColorOf(node, palette)
    const wrap = WRAP[name] ?? ''
    const open = (mark ? markOpen(mark) : '') + wrap
    const close = wrap + (mark ? '==' : '')
    const before = out.length

    const children = kids(node)
    children.forEach((child, i) => walk(child, i === children.length - 1, inMark || !!mark))

    // Пустая обёртка знаков не оставляет: `<b></b>` — это ничто, а не `****`.
    // Пробелы по краям выносятся за знаки: браузер, снимая оформление с части
    // слова, оставляет пробел внутри, а `** жирный**` чужой markdown не узнает.
    const inner = out.slice(before)
    const body = inner.trim()
    if (open && body) {
      const lead = inner.slice(0, inner.length - inner.trimStart().length)
      const trail = inner.slice(inner.trimEnd().length)
      out = out.slice(0, before) + lead + open + body + close + trail
    }
  }

  const children = kids(root)
  children.forEach((child, i) => walk(child, i === children.length - 1, false))

  return out.replace(WRAPPED_LIST, '$2 $1')
}

/**
 * Знак списка, попавший внутрь оформления. Браузер дописывает текст в начало
 * строки тем же начертанием, что стоит за кареткой, и `- ` у жирной строки
 * становится жирным: `**- пункт**`. Списком такое не прочтётся — знак
 * выносится за оформление.
 */
const WRAPPED_LIST = /^((?:\*\*|\*|__|==(?:\{[a-z]+\})?)+)(-|\d+\.)\s+/gm
