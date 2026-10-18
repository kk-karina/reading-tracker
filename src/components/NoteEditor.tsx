import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { continueList, listEdits, listOf, type ListKind } from '../lib/learning/lists'
import { MARK_COLORS, type MarkColor } from '../lib/learning/marks'
import {
  htmlToMd,
  markColorOf,
  mdToHtml,
  type HtmlNode,
  type MarkPalette,
} from '../lib/learning/noteHtml'
import type { NoteTag } from '../lib/types'
import { useLocale } from '../state/LocaleContext'
import { Icon } from './Icon'

const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']

type Fmt = 'bold' | 'italic' | 'wave'

/**
 * Три начертания. Буква на кнопке набрана своим же форматом — она и есть
 * подпись: показать жирную «B» короче, чем объяснить словом, и не требует
 * перевода.
 */
const FORMATS = [
  { id: 'bold', glyph: 'B', hot: 'B', label: 'note.bold' },
  { id: 'italic', glyph: 'I', hot: 'I', label: 'note.italic' },
  { id: 'wave', glyph: 'U', hot: 'U', label: 'note.wave' },
] as const satisfies readonly { id: Fmt; glyph: string; hot: string; label: string }[]

/** Маркер по клавише — лимонный: главный цвет, им отмечают чаще всего. */
const MARK_HOT = 'H'

/**
 * Два списка. Значок вместо буквы: знак списка сам по себе ни во что не
 * набирается. Клавиши — как в Google Docs и Notion, с Shift по цифре: по
 * `code`, а не `key`, иначе в русской раскладке ⇧7 — это «?».
 */
const LISTS = [
  { id: 'ul', icon: 'list-unordered', code: 'Digit8', hot: '⇧8', label: 'note.ul' },
  { id: 'ol', icon: 'list-ordered', code: 'Digit7', hot: '⇧7', label: 'note.ol' },
] as const satisfies readonly { id: ListKind; icon: string; code: string; hot: string; label: string }[]

type Spot = { x: number; y: number }
type Active = Record<Fmt, boolean> & { mark: MarkColor | null; list: ListKind | null }

const NONE: Active = { bold: false, italic: false, wave: false, mark: null, list: null }

/** От края окна до панельки и меню. Ряд из десяти кнопок на телефоне шире выделения. */
const EDGE = 8

/** Сколько ждать, пока выделение устоится. Иначе панелька гонится за курсором. */
const SETTLE = 150

/** Палитра маркера, как её задаёт тема (`--mark-*`): один источник цветов на всё. */
function paletteOf(el: HTMLElement): MarkPalette {
  const css = getComputedStyle(el)
  const out: MarkPalette = {}
  for (const c of MARK_COLORS) out[c] = css.getPropertyValue(`--mark-${c}`).trim() || undefined
  return out
}

/** Каким маркером отмечено место, где стоит курсор. Тега `<mark>` браузер не ставит — см. `noteHtml`. */
function markedAt(root: HTMLElement): MarkColor | null {
  const palette = paletteOf(root)
  let node: Node | null = document.getSelection()?.anchorNode ?? null
  while (node && node !== root) {
    if (node.nodeType === 1) {
      const color = markColorOf(node as unknown as HtmlNode, palette)
      if (color) return color
    }
    node = node.parentNode
  }
  return null
}

/**
 * Строки поля, которых касается выделение. Строка — блок верхнего уровня:
 * так их кладёт `mdToHtml` и так их делает браузер по Enter.
 */
function linesAt(root: HTMLElement): Node[] {
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0) return []
  const range = sel.getRangeAt(0)
  return Array.from(root.childNodes).filter((n) => range.intersectsNode(n))
}

/** Точка в строке по номеру знака: каретку ставят в текст, а не в узел-обёртку. */
function pointAt(line: Node, offset: number): [Node, number] {
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT)
  let left = offset
  let tail: [Node, number] | null = null
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const len = (n as Text).data.length
    if (left <= len) return [n, left]
    left -= len
    tail = [n, len]
  }
  // Пустая строка держится на служебном `<br>`, и за ним браузер не пишет —
  // каретка встаёт перед ним.
  return tail ?? [line, 0]
}

/** Список строки, где стоит курсор: по нему горит кнопка. */
function listAt(root: HTMLElement): ListKind | null {
  const [line] = linesAt(root)
  return line ? (listOf(line.textContent ?? '')?.kind ?? null) : null
}

function activeFormats(root: HTMLElement): Active {
  try {
    return {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      wave: document.queryCommandState('underline'),
      mark: markedAt(root),
      list: listAt(root),
    }
  } catch {
    // Движок может отказаться отвечать про состояние — тогда просто не гасим кнопки.
    return NONE
  }
}

/**
 * Поле конспекта: пишешь, выделяешь, форматируешь.
 *
 * Постоянной кнопки нет. Форматирование живёт на выделении — правым кликом и
 * панелькой, всплывающей над ним: то и другое об одном и том же, но панелька
 * находится без подсказки и работает там, где правой кнопки не бывает, а меню
 * объясняет словами и учит клавишам.
 *
 * В хранилище по-прежнему уходит markdown, а не разметка поля, — перевод в обе
 * стороны лежит в `lib/learning/noteHtml.ts`.
 *
 * Метки необязательны. В листе занятия разметка по категориям решается не в
 * момент записи: там важно успеть записать, а разобрать написанное можно потом,
 * на самом конспекте. Поэтому `tags`/`onTags` приходят парой или не приходят
 * вовсе, и без них ряд чипов просто не рисуется.
 */
export function NoteEditor({
  body,
  tags,
  onBody,
  onTags,
  autoFocus,
}: {
  body: string
  tags?: NoteTag[]
  onBody: (next: string) => void
  onTags?: (next: NoteTag[]) => void
  /** Курсор сюда при появлении: карточку только что добавили, чтобы писать. */
  autoFocus?: boolean
}) {
  const { t } = useLocale()
  const ref = useRef<HTMLDivElement>(null)

  /** Что компонент отдал наверх последним. Всё, что не равно ему, пришло извне. */
  const mine = useRef<string | null>(null)

  const [bar, setBar] = useState<Spot | null>(null)
  const [menu, setMenu] = useState<Spot | null>(null)
  const [on, setOn] = useState<Active>(NONE)
  const barRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  /**
   * Открыто ли меню — для таймера панельки. Правый клик в macOS выделяет слово
   * под курсором, выделение меняется, и через миг рядом с меню всплывала бы
   * панелька с теми же кнопками. Пока меню открыто, панелька молчит.
   */
  const menuOpen = useRef(false)
  menuOpen.current = menu !== null

  /**
   * Значение кладётся в поле только когда оно пришло со стороны.
   *
   * Перерисовывать поле на каждый набранный знак нельзя: браузер потеряет
   * каретку и отправит её в начало. Поэтому собственное эхо узнаётся и
   * пропускается.
   */
  // Только при появлении: карточку, добавленную в лист, сразу пишут. Позже
  // курсор сюда не возвращается — это значило бы отнимать его у соседнего поля.
  const focusOnMount = useRef(autoFocus)
  useEffect(() => {
    if (focusOnMount.current) ref.current?.focus()
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || body === mine.current) return
    el.innerHTML = mdToHtml(body)
    mine.current = body
  }, [body])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const md = htmlToMd(el as unknown as HtmlNode, paletteOf(el))
    mine.current = md
    onBody(md)
  }, [onBody])

  const apply = useCallback(
    (fmt: Fmt | MarkColor) => {
      const el = ref.current
      if (!el) return
      el.focus()
      // Без этого флага браузер отдаёт `<span style>` вместо тегов, и
      // сериализатор перестаёт узнавать собственное оформление.
      document.execCommand('styleWithCSS', false, 'false')

      if (fmt === 'bold' || fmt === 'italic' || fmt === 'wave') {
        document.execCommand(fmt === 'wave' ? 'underline' : fmt, false)
      } else {
        // Цвет берётся из темы, а не задаётся числом. Тот же цвет второй раз —
        // снять маркер, другой — перекрасить: так ведёт себя маркер в руке.
        const fill = getComputedStyle(el).getPropertyValue(`--mark-${fmt}`).trim()
        document.execCommand('hiliteColor', false, markedAt(el) === fmt || !fill ? 'transparent' : fill)
      }

      setOn(activeFormats(el))
      emit()
    },
    [emit],
  )

  /**
   * Список ставится и снимается знаками в начале строк — см. `lib/learning/lists`.
   *
   * Правка идёт командами редактора, а не прямой заменой текста: так ⌘Z
   * отменяет список целиком, как и любое другое оформление.
   */
  const toggleList = useCallback(
    (kind: ListKind) => {
      const el = ref.current
      const sel = document.getSelection()
      if (!el || !sel) return
      el.focus()

      // Пустое поле: строки ещё нет, знак встаёт прямо в него.
      if (!el.textContent) {
        document.execCommand('insertText', false, kind === 'ul' ? '- ' : '1. ')
        return emit()
      }

      const lines = linesAt(el)
      if (lines.length === 0) return

      // Где стоял курсор в своей строке — чтобы после правки вернуть его туда
      // же, сдвинув на знак. Без этого первая же буква заменила бы строку.
      const caret = sel.isCollapsed && sel.anchorNode ? document.createRange() : null
      if (caret && sel.anchorNode) {
        caret.setStart(lines[0], 0)
        caret.setEnd(sel.anchorNode, sel.anchorOffset)
      }
      const caretAt = caret ? caret.toString().length : 0
      const above = lines[0].previousSibling
      const prev = above ? listOf(above.textContent ?? '') : null
      const start = prev?.kind === 'ol' ? prev.n + 1 : 1
      const edits = listEdits(
        lines.map((l) => l.textContent ?? ''),
        kind,
        start,
      )

      // С конца: правка строки не сдвигает те, что выше.
      for (let i = lines.length - 1; i >= 0; i--) {
        const { cut, put } = edits[i]
        if (!cut && !put) continue
        const range = document.createRange()
        range.setStart(...pointAt(lines[i], 0))
        range.setEnd(...pointAt(lines[i], cut))
        sel.removeAllRanges()
        sel.addRange(range)
        document.execCommand(put ? 'insertText' : 'delete', false, put)
      }

      // Выделение возвращается на всю правленую полосу строк: панелька
      // остаётся над ней, и вторым нажатием список так же снимается.
      // Просто курсор остаётся курсором — на том же знаке, что и был.
      const first = lines[0]
      const last = lines[lines.length - 1]
      if (caret && first.isConnected) {
        const { cut, put } = edits[0]
        const range = document.createRange()
        range.setStart(...pointAt(first, Math.max(put.length, caretAt - cut + put.length)))
        sel.removeAllRanges()
        sel.addRange(range)
      } else if (first.isConnected && last.isConnected) {
        const range = document.createRange()
        range.setStart(...pointAt(first, 0))
        range.setEnd(...pointAt(last, (last.textContent ?? '').length))
        sel.removeAllRanges()
        sel.addRange(range)
      }

      setOn(activeFormats(el))
      emit()
    },
    [emit],
  )

  /**
   * Панелька и меню встают у выделения и у курсора, но в окне: у края
   * телефона ряд из десяти кнопок иначе уходил бы за экран наполовину.
   */
  useLayoutEffect(() => {
    for (const node of [barRef.current, menuRef.current]) {
      if (!node) continue
      node.style.translate = ''
      const box = node.getBoundingClientRect()
      const dx =
        box.left < EDGE ? EDGE - box.left : box.right > innerWidth - EDGE ? innerWidth - EDGE - box.right : 0
      const dy = box.bottom > innerHeight - EDGE ? innerHeight - EDGE - box.bottom : 0
      if (dx || dy) node.style.translate = `${dx}px ${dy}px`
    }
  }, [bar, menu])

  // Панелька появляется сама, когда выделение внутри поля устоялось.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const check = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const el = ref.current
        const sel = document.getSelection()
        if (menuOpen.current) return
        if (!el || !sel || sel.isCollapsed || sel.rangeCount === 0) return setBar(null)
        if (!sel.anchorNode || !el.contains(sel.anchorNode)) return setBar(null)

        const box = sel.getRangeAt(0).getBoundingClientRect()
        if (box.width === 0 && box.height === 0) return setBar(null)

        setOn(activeFormats(el))
        setBar({ x: box.left + box.width / 2, y: box.top })
      }, SETTLE)
    }

    document.addEventListener('selectionchange', check)
    return () => {
      document.removeEventListener('selectionchange', check)
      clearTimeout(timer)
    }
  }, [])

  // Esc, клик мимо и скролл убирают и панельку, и меню.
  useEffect(() => {
    if (!bar && !menu) return

    const close = () => {
      setBar(null)
      setMenu(null)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // На перехвате и со стопом: лист снаружи тоже слушает Escape, и без этого
      // первое же нажатие закрывало бы всю панель вместе с несохранённым текстом.
      e.stopPropagation()
      close()
    }

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (target && (target as Element).closest?.('.note-menu, .note-bar')) return
      // Правая кнопка меню не закрывает: следом придёт `contextmenu` и откроет
      // его на новом месте, а закрытие в промежутке выпустило бы панельку.
      if (e.button === 2) return setBar(null)
      close()
    }

    document.addEventListener('keydown', onKey, true)
    document.addEventListener('mousedown', onDown)
    // Скролл закрывает, а не пересчитывает: в ряду из четырёх кнопок догонять нечего.
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', close, true)
    }
  }, [bar, menu])

  const tools = FORMATS.map((f) => (
    <button
      key={f.id}
      type="button"
      className={`note-fmt note-fmt-${f.id}${on[f.id] ? ' on' : ''}`}
      aria-pressed={on[f.id]}
      title={`${t(f.label)} ⌘${f.hot}`}
      // Выделение должно пережить нажатие: без этого браузер снимет его раньше,
      // чем команда доберётся до текста.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => apply(f.id)}
    >
      <span aria-hidden>{f.glyph}</span>
      <span className="visually-hidden">{t(f.label)}</span>
    </button>
  ))

  const listTools = LISTS.map((l) => (
    <button
      key={l.id}
      type="button"
      className={`note-fmt${on.list === l.id ? ' on' : ''}`}
      aria-pressed={on.list === l.id}
      title={`${t(l.label)} ⌘${l.hot}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => toggleList(l.id)}
    >
      <Icon name={l.icon} size={18} />
      <span className="visually-hidden">{t(l.label)}</span>
    </button>
  ))

  /**
   * Маркеры — рядом кружков своего цвета: образец и есть подпись, как буква у
   * начертаний. Включённый обведён чернилами, а не залит: заливка у кружка уже
   * занята цветом, который он ставит.
   */
  const swatches = (role?: 'menuitemradio') =>
    MARK_COLORS.map((c) => {
      const label = `${t('note.mark')}: ${t(`mark.${c}`)}`
      return (
        <button
          key={c}
          type="button"
          role={role}
          className={`note-swatch${on.mark === c ? ' on' : ''}`}
          style={{ '--swatch': `var(--mark-${c})` } as CSSProperties}
          aria-pressed={role ? undefined : on.mark === c}
          aria-checked={role ? on.mark === c : undefined}
          aria-label={label}
          title={c === 'lemon' ? `${label} ⌘${MARK_HOT}` : label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            apply(c)
            if (role) setMenu(null)
          }}
        />
      )
    })

  return (
    <div className="note-editor">
      {tags && onTags && (
        <div className="note-tools">
          <div className="chips">
            {TAGS.map((g) => (
              <button
                key={g}
                type="button"
                className={`chip${tags.includes(g) ? ' on' : ''}`}
                aria-pressed={tags.includes(g)}
                onClick={() => onTags(tags.includes(g) ? tags.filter((x) => x !== g) : [...tags, g])}
              >
                {t(`tag.${g}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        ref={ref}
        className="note-input"
        contentEditable
        suppressContentEditableWarning
        /* Ловушка фокуса в `Sheet` собирает элементы селектором, и
           `contentEditable` в него не входит — в отличие от прежней `textarea`.
           Без этого Tab перепрыгивал бы через конспект, а на краю списка
           заворачивался бы мимо него. */
        tabIndex={0}
        data-autofocus={autoFocus || undefined}
        role="textbox"
        aria-multiline
        aria-label={t('note.body')}
        data-empty={body.trim() === '' ? '' : undefined}
        data-placeholder={t('note.bodyPlaceholder')}
        onInput={() => {
          const el = ref.current
          // Первая строка, набранная в пустом поле, ложится голым текстом, а
          // следующие браузер кладёт блоками. Без блока у первой отступ до второй
          // не встаёт — поле рисовало бы её прижатой. Переводится одна эта строка,
          // каретка остаётся на месте.
          if (el?.firstChild?.nodeType === Node.TEXT_NODE) {
            document.execCommand('formatBlock', false, '<div>')
          }
          emit()
        }}
        onContextMenu={(e) => {
          const sel = document.getSelection()
          // Без выделения форматировать нечего — системное меню с орфографией
          // и вставкой остаётся на месте.
          if (!sel || sel.isCollapsed) return
          e.preventDefault()
          if (ref.current) setOn(activeFormats(ref.current))
          setBar(null)
          setMenu({ x: e.clientX, y: e.clientY })
        }}
        onPaste={(e) => {
          // Вставляется текст, а не чужая разметка: она всё равно не доедет до
          // хранилища, и показывать оформление, которое исчезнет, — врать.
          e.preventDefault()
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.nativeEvent.isComposing) {
            const el = ref.current
            const [line] = el ? linesAt(el) : []
            const step = line ? continueList(line.textContent ?? '') : null
            if (!line || !step) return
            e.preventDefault()
            if ('end' in step) {
              // Пустой пункт: знак уходит, строка остаётся — из списка вышли.
              const range = document.createRange()
              range.setStart(...pointAt(line, 0))
              range.setEnd(...pointAt(line, step.end))
              const sel = document.getSelection()
              sel?.removeAllRanges()
              sel?.addRange(range)
              document.execCommand('delete')
            } else {
              document.execCommand('insertParagraph')
              document.execCommand('insertText', false, step.next)
            }
            return
          }
          if (!(e.metaKey || e.ctrlKey)) return
          const list = e.shiftKey ? LISTS.find((l) => l.code === e.code) : undefined
          if (list) {
            e.preventDefault()
            return toggleList(list.id)
          }
          const key = e.key.toLowerCase()
          const hit =
            key === MARK_HOT.toLowerCase() ? 'lemon' : FORMATS.find((f) => f.hot.toLowerCase() === key)?.id
          if (!hit) return
          e.preventDefault()
          apply(hit)
        }}
      />

      {bar &&
        createPortal(
          <div
            ref={barRef}
            className="note-bar"
            role="toolbar"
            aria-label={t('note.format')}
            style={{ left: bar.x, top: bar.y }}
          >
            {tools}
            <span className="note-bar-sep" aria-hidden />
            {listTools}
            <span className="note-bar-sep" aria-hidden />
            {swatches()}
          </div>,
          document.body,
        )}

      {menu &&
        createPortal(
          <div ref={menuRef} className="note-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="menuitem"
                className={`note-menu-row${on[f.id] ? ' on' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  apply(f.id)
                  setMenu(null)
                }}
              >
                <span className={`note-fmt-glyph note-fmt-${f.id}`} aria-hidden>
                  {f.glyph}
                </span>
                {t(f.label)}
                <span className="note-menu-hot mono">⌘{f.hot}</span>
              </button>
            ))}
            <div className="note-menu-sep" aria-hidden />
            {LISTS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="menuitem"
                className={`note-menu-row${on.list === l.id ? ' on' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  toggleList(l.id)
                  setMenu(null)
                }}
              >
                <span className="note-fmt-glyph" aria-hidden>
                  <Icon name={l.icon} size={16} />
                </span>
                {t(l.label)}
                <span className="note-menu-hot mono">⌘{l.hot}</span>
              </button>
            ))}
            <div className="note-menu-marks" role="group" aria-label={t('note.mark')}>
              <span className="note-menu-marks-label">{t('note.mark')}</span>
              <span className="note-menu-marks-row">{swatches('menuitemradio')}</span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
