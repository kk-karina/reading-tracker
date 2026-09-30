import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { htmlToMd, isMarked, mdToHtml, type HtmlNode } from '../lib/learning/noteHtml'
import type { NoteTag } from '../lib/types'
import { useLocale } from '../state/LocaleContext'

const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']

type Fmt = 'bold' | 'italic' | 'wave' | 'mark'

/**
 * Четыре формата. Буква на кнопке набрана своим же форматом — она и есть
 * подпись: показать жирную «B» короче, чем объяснить словом, и не требует
 * перевода.
 */
const FORMATS = [
  { id: 'bold', glyph: 'B', hot: 'B', label: 'note.bold' },
  { id: 'italic', glyph: 'I', hot: 'I', label: 'note.italic' },
  { id: 'wave', glyph: 'U', hot: 'U', label: 'note.wave' },
  { id: 'mark', glyph: 'A', hot: 'H', label: 'note.mark' },
] as const satisfies readonly { id: Fmt; glyph: string; hot: string; label: string }[]

type Spot = { x: number; y: number }
type Active = Record<Fmt, boolean>

const NONE: Active = { bold: false, italic: false, wave: false, mark: false }

/** Сколько ждать, пока выделение устоится. Иначе панелька гонится за курсором. */
const SETTLE = 150

/** Есть ли маркер в том месте, где стоит курсор. Тега `<mark>` браузер не ставит — см. `noteHtml`. */
function markedAt(root: HTMLElement): boolean {
  let node: Node | null = document.getSelection()?.anchorNode ?? null
  while (node && node !== root) {
    if (node.nodeName === 'MARK') return true
    if (node.nodeType === 1 && isMarked(node as unknown as HtmlNode)) return true
    node = node.parentNode
  }
  return false
}

function activeFormats(root: HTMLElement): Active {
  try {
    return {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      wave: document.queryCommandState('underline'),
      mark: markedAt(root),
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
}: {
  body: string
  tags?: NoteTag[]
  onBody: (next: string) => void
  onTags?: (next: NoteTag[]) => void
}) {
  const { t } = useLocale()
  const ref = useRef<HTMLDivElement>(null)

  /** Что компонент отдал наверх последним. Всё, что не равно ему, пришло извне. */
  const mine = useRef<string | null>(null)

  const [bar, setBar] = useState<Spot | null>(null)
  const [menu, setMenu] = useState<Spot | null>(null)
  const [on, setOn] = useState<Active>(NONE)

  /**
   * Значение кладётся в поле только когда оно пришло со стороны.
   *
   * Перерисовывать поле на каждый набранный знак нельзя: браузер потеряет
   * каретку и отправит её в начало. Поэтому собственное эхо узнаётся и
   * пропускается.
   */
  useEffect(() => {
    const el = ref.current
    if (!el || body === mine.current) return
    el.innerHTML = mdToHtml(body)
    mine.current = body
  }, [body])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const md = htmlToMd(el as unknown as HtmlNode)
    mine.current = md
    onBody(md)
  }, [onBody])

  const apply = useCallback(
    (fmt: Fmt) => {
      const el = ref.current
      if (!el) return
      el.focus()
      // Без этого флага браузер отдаёт `<span style>` вместо тегов, и
      // сериализатор перестаёт узнавать собственное оформление.
      document.execCommand('styleWithCSS', false, 'false')

      if (fmt === 'mark') {
        // Цвет берётся из темы, а не задаётся числом: лимон системы и есть маркер.
        const brand = getComputedStyle(el).getPropertyValue('--brand').trim() || '#e9f86b'
        document.execCommand('hiliteColor', false, markedAt(el) ? 'transparent' : brand)
      } else {
        document.execCommand(fmt === 'wave' ? 'underline' : fmt, false)
      }

      setOn(activeFormats(el))
      emit()
    },
    [emit],
  )

  // Панелька появляется сама, когда выделение внутри поля устоялось.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const check = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const el = ref.current
        const sel = document.getSelection()
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
        role="textbox"
        aria-multiline
        aria-label={t('note.body')}
        data-empty={body.trim() === '' ? '' : undefined}
        data-placeholder={t('note.bodyPlaceholder')}
        onInput={emit}
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
          if (!(e.metaKey || e.ctrlKey)) return
          const hit = FORMATS.find((f) => f.hot.toLowerCase() === e.key.toLowerCase())
          if (!hit) return
          e.preventDefault()
          apply(hit.id)
        }}
      />

      {bar &&
        createPortal(
          <div
            className="note-bar"
            role="toolbar"
            aria-label={t('note.format')}
            style={{ left: bar.x, top: bar.y }}
          >
            {tools}
          </div>,
          document.body,
        )}

      {menu &&
        createPortal(
          <div className="note-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
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
          </div>,
          document.body,
        )}
    </div>
  )
}
