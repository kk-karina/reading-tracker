import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { CoverRejected } from '../lib/compose/imageCover'
import { continueList, listEdits, listOf, type ListKind } from '../lib/learning/lists'
import { MARK_COLORS, type MarkColor } from '../lib/learning/marks'
import {
  htmlToMd,
  markColorOf,
  mdToHtml,
  type HtmlNode,
  type MarkPalette,
} from '../lib/learning/noteHtml'
import { fileToNoteImage } from '../lib/learning/noteImage'
import { useLocale } from '../state/LocaleContext'
import { Icon } from './Icon'
import { Tip } from './ui'


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

/**
 * Смайлики — короткий набор, а не каталог. Первые два ряда — пометки на полях:
 * ими в конспекте отмечают, что понято, что нет и к чему вернуться. Вторые
 * два — настроение. Полный каталог есть у системы (⌃⌘Пробел, Win+.), и
 * повторять его здесь значило бы листать сотни лиц ради трёх нужных.
 */
const EMOJI = [
  ['✅', '❌', '❓', '❗', '💡', '📌', '⭐', '🔥', '⚠️', '🎯', '🧠', '📚', '✏️', '🔑', '⏳', '🔁'],
  ['😊', '😂', '🤔', '😍', '😎', '😅', '😢', '🤯', '👍', '👎', '👏', '🙌', '💪', '❤️', '🎉', '✨'],
] as const

type Spot = { x: number; y: number }
/** Палитра смайликов встаёт под кнопкой, а у низа окна — над ней. */
type Drop = { x: number; top?: number; bottom?: number }
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

/**
 * Метит строки списка, чтобы стоять теснее абзацев — как в готовом листе, где
 * пункты идут через 6px, а абзацы через полторы строки. Различить их одним
 * CSS нельзя: знак списка — текст, а не тег. Атрибут не трогает каретку и в
 * хранилище не уходит — сериализатор читает только теги и заливку.
 */
function markLists(root: HTMLElement) {
  for (const line of Array.from(root.children)) {
    const li = listOf(line.textContent ?? '') !== null
    if (li !== line.hasAttribute('data-li')) line.toggleAttribute('data-li', li)
  }
}

/** Где курсор, если он в поле. */
function caretIn(root: HTMLElement | null): Range | null {
  const sel = document.getSelection()
  if (!root || !sel || sel.rangeCount === 0 || !root.contains(sel.anchorNode)) return null
  return sel.getRangeAt(0).cloneRange()
}

/** Ширина ряда палитры — по ней стрелки вверх и вниз прыгают через ряд. */
const EMOJI_COLS = 8

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
 * Меток у конспекта нет: категории мыслей — вещь чтения, в обучении они не
 * нужны. Ряд чипов, который здесь был, убран вместе с ними.
 */
export function NoteEditor({
  body,
  onBody,
  autoFocus,
}: {
  body: string
  onBody: (next: string) => void
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
  const [emoji, setEmoji] = useState<Drop | null>(null)
  const [picError, setPicError] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const emojiBtn = useRef<HTMLButtonElement>(null)

  /**
   * Где стоял курсор, когда открыли палитру. С мыши поле фокус не теряет, но с
   * клавиатуры Tab уводит его на кнопку, и смайлик без этой памяти уехал бы в
   * конец конспекта, а не туда, где писали.
   */
  const caret = useRef<Range | null>(null)
  /** Открыли с клавиатуры — фокус в палитру, иначе до неё не дотянуться: она в портале. */
  const emojiKeys = useRef(false)

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
    markLists(el)
    mine.current = body
  }, [body])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const md = htmlToMd(el as unknown as HtmlNode, paletteOf(el))
    mine.current = md
    onBody(md)
  }, [onBody])

  /** Вернуть курсор туда, где он был в поле, — или в конец, если его там не было. */
  const restoreCaret = useCallback((saved: Range | null) => {
    const el = ref.current
    const sel = document.getSelection()
    if (!el || !sel) return
    el.focus()
    if (saved && el.contains(saved.startContainer)) {
      sel.removeAllRanges()
      sel.addRange(saved)
    } else if (!sel.anchorNode || !el.contains(sel.anchorNode)) {
      sel.selectAllChildren(el)
      sel.collapseToEnd()
    }
  }, [])

  /**
   * Картинка из буфера. Сжатие идёт асинхронно, и за это время курсор мог
   * уйти — поэтому место вставки запоминается в миг вставки, а не после.
   *
   * Командой редактора, а не прямой правкой DOM: так ⌘Z убирает картинку, как
   * любую другую вставку. `data-fresh` — метка для проявления; сериализатор её
   * не видит, а после проявления она снимается.
   */
  const pastePicture = useCallback(
    async (file: File) => {
      const at = caretIn(ref.current)
      setPicError(null)
      try {
        const src = await fileToNoteImage(file)
        if (!ref.current?.isConnected) return
        restoreCaret(at)
        document.execCommand('insertHTML', false, `<img src="${src}" alt="" data-fresh="">`)
        emit()
      } catch (err) {
        const reason = err instanceof CoverRejected ? err.reason : 'broken'
        setPicError(
          t(
            reason === 'type'
              ? 'material.coverBadType'
              : reason === 'tooBig'
                ? 'material.coverTooBig'
                : 'material.coverBroken',
          ),
        )
      }
    },
    [emit, restoreCaret, t],
  )

  const putEmoji = useCallback(
    (glyph: string) => {
      restoreCaret(caret.current)
      document.execCommand('insertText', false, glyph)
      caret.current = null
      setEmoji(null)
      emit()
    },
    [emit, restoreCaret],
  )

  /** Под кнопкой, если внизу хватает места, иначе над ней — палитра не должна закрыть строку, куда пишут. */
  const toggleEmoji = (byKeys: boolean) => {
    if (emoji) return setEmoji(null)
    emojiKeys.current = byKeys
    const btn = emojiBtn.current
    if (!btn) return
    caret.current = caretIn(ref.current)
    const box = btn.getBoundingClientRect()
    const room = innerHeight - box.bottom
    setBar(null)
    setMenu(null)
    setEmoji(
      room > 220
        ? { x: box.left, top: box.bottom + 6 }
        : { x: box.left, bottom: innerHeight - box.top + 6 },
    )
  }

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
    for (const node of [barRef.current, menuRef.current, emojiRef.current]) {
      if (!node) continue
      node.style.translate = ''
      const box = node.getBoundingClientRect()
      const dx =
        box.left < EDGE ? EDGE - box.left : box.right > innerWidth - EDGE ? innerWidth - EDGE - box.right : 0
      const dy = box.bottom > innerHeight - EDGE ? innerHeight - EDGE - box.bottom : 0
      if (dx || dy) node.style.translate = `${dx}px ${dy}px`
    }
  }, [bar, menu, emoji])

  useEffect(() => {
    if (emoji && emojiKeys.current) emojiRef.current?.querySelector('button')?.focus()
  }, [emoji])

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

  // Esc, клик мимо и скролл убирают и панельку, и меню, и палитру.
  useEffect(() => {
    if (!bar && !menu && !emoji) return

    const close = () => {
      setBar(null)
      setMenu(null)
      setEmoji(null)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // На перехвате и со стопом: лист снаружи тоже слушает Escape, и без этого
      // первое же нажатие закрывало бы всю панель вместе с несохранённым текстом.
      e.stopPropagation()
      // С клавиатуры палитру закрывают, чтобы писать дальше: курсор — обратно в поле.
      if (emoji) restoreCaret(caret.current)
      close()
    }

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      // Кнопка палитры сама её и закрывает: закрытие на нажатии открыло бы её
      // снова на щелчке.
      if (target && (target as Element).closest?.('.note-menu, .note-bar, .note-emoji-btn')) return
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
  }, [bar, menu, emoji, restoreCaret])

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
          if (el) markLists(el)
          if (picError) setPicError(null)
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
          e.preventDefault()
          // Картинка из буфера — скриншот, «скопировать изображение». Ищется
          // среди элементов буфера, а не только файлов: Chrome кладёт
          // скопированную со страницы картинку элементом без файла в списке.
          const pic = Array.from(e.clipboardData.items)
            .find((i) => i.kind === 'file' && i.type.startsWith('image/'))
            ?.getAsFile()
          if (pic) return void pastePicture(pic)
          // Иначе вставляется текст, а не чужая разметка: она всё равно не
          // доедет до хранилища, и показывать оформление, которое исчезнет, — врать.
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
        }}
        onAnimationEnd={(e) => {
          // Проявилась — метка больше не нужна, иначе картинка проявлялась бы
          // заново при каждом переносе блока браузером.
          if (e.target instanceof HTMLImageElement) e.target.removeAttribute('data-fresh')
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

      {picError && (
        <div className="error" role="alert">
          {picError}
        </div>
      )}

      {/* Смайлик ставят туда, где курсор, а не на выделение, — поэтому у него,
          в отличие от оформления, своя постоянная кнопка. Тихая, под полем:
          писать она не мешает, а искать её не приходится. */}
      <div className="note-tools">
        <Tip text={t('note.emoji')}>
          <button
            ref={emojiBtn}
            type="button"
            className={`icon-act note-emoji-btn${emoji ? ' on' : ''}`}
            aria-label={t('note.emoji')}
            aria-haspopup="true"
            aria-expanded={emoji !== null}
            // С мыши поле не теряет курсор — смайлик встанет ровно туда.
            onMouseDown={(e) => e.preventDefault()}
            // `detail === 0` — нажатие не мышью, а Enter или пробелом.
            onClick={(e) => toggleEmoji(e.detail === 0)}
          >
            <Icon name="smile" size={17} />
          </button>
        </Tip>
      </div>

      {emoji &&
        createPortal(
          <div
            ref={emojiRef}
            className={`note-menu note-emoji${emoji.bottom !== undefined ? ' up' : ''}`}
            role="group"
            aria-label={t('note.emoji')}
            style={{ left: emoji.x, top: emoji.top, bottom: emoji.bottom }}
            onKeyDown={(e) => {
              // Стрелки ходят по сетке, как по любой палитре символов.
              const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -EMOJI_COLS, ArrowDown: EMOJI_COLS }[e.key]
              if (!step) return
              e.preventDefault()
              const cells = Array.from(emojiRef.current?.querySelectorAll('button') ?? [])
              const at = cells.indexOf(document.activeElement as HTMLButtonElement)
              cells[Math.min(cells.length - 1, Math.max(0, at + step))]?.focus()
            }}
          >
            {EMOJI.map((group, g) => (
              <div key={g} className="note-emoji-grid">
                {group.map((glyph) => (
                  <button
                    key={glyph}
                    type="button"
                    className="note-emoji-cell"
                    aria-label={glyph}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => putEmoji(glyph)}
                  >
                    {glyph}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}

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
