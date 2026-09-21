import { useRef } from 'react'
import type { NoteTag } from '../lib/types'
import { useLocale } from '../state/LocaleContext'
import { Icon } from './Icon'

const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']

export function NoteEditor({
  body,
  tags,
  onBody,
  onTags,
}: {
  body: string
  tags: NoteTag[]
  onBody: (next: string) => void
  onTags: (next: NoteTag[]) => void
}) {
  const { t } = useLocale()
  const ref = useRef<HTMLTextAreaElement>(null)

  /**
   * Оборачивает выделенное в ==…==, снимая обёртку при повторном нажатии.
   *
   * Разметка Obsidian, а не своя: выделение переживает копирование в vault
   * и чтение файла глазами. Цвет брать неоткуда не нужно — акцент системы
   * и есть лимонный маркер.
   */
  function highlight() {
    const el = ref.current
    if (!el) return
    const from = el.selectionStart
    const to = el.selectionEnd
    if (from === to) return

    const picked = body.slice(from, to)
    const wrapped = picked.length > 4 && picked.startsWith('==') && picked.endsWith('==')
    const inner = wrapped ? picked.slice(2, -2) : `==${picked}==`
    onBody(body.slice(0, from) + inner + body.slice(to))

    // Выделение восстанавливается после того, как React отрисовал новое значение.
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(from, from + inner.length)
    })
  }

  return (
    <div className="note-editor">
      <div className="note-tools">
        <button type="button" className="btn ghost sm" onClick={highlight} title="⌘H">
          <Icon name="pen" size={15} /> {t('note.highlight')}
        </button>
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

      <textarea
        ref={ref}
        className="note-input"
        value={body}
        placeholder={t('note.bodyPlaceholder')}
        onChange={(e) => onBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
            e.preventDefault()
            highlight()
          }
        }}
      />
    </div>
  )
}
