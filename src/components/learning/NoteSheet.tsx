import type { ReactNode } from 'react'
import { fmtDate } from '../../lib/format'
import { renderMarkdown } from '../../lib/learning/markdown'
import { noteHeading } from '../../lib/learning/notes'
import { partLabel, partWord } from '../../lib/learning/parts'
import type { Stream, StudyNote } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'

/**
 * Лист конспекта.
 *
 * Одна бумага на два места: страница листа и вкладка «Конспекты» у материала,
 * где листы листают на месте. Раньше разметка жила только на странице листа, и
 * материал показывал вместо неё список ссылок — читать написанное приходилось
 * уходя со страницы и возвращаясь.
 *
 * `actions` — то, что стоит в верхней строке справа: правка и удаление на
 * странице листа, стрелки листания у материала. Лист не решает, что с ним
 * можно сделать; он решает, как выглядит.
 *
 * `children` подменяют всё, что ниже верхней строки, — на время правки там
 * стоят поля, а рамка остаётся той же самой.
 */
export function NoteSheet({
  note,
  stream,
  lead,
  actions,
  children,
}: {
  note: StudyNote
  stream: Stream
  /** Перед подписью листа, слева: листание. Подальше от действий справа. */
  lead?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const { t, locale } = useLocale()
  const { materials, parts } = useLearning()

  const material = materials.find((m) => m.id === note.material_id)
  const word = partWord(material?.kind ?? 'book')
  const heading = noteHeading(note, parts, (part, i) =>
    partLabel(part, i, (n) => t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n })),
  )

  return (
    <article className="sheet-page" data-accent={stream.accent ?? undefined}>
      <div className="sheet-head-line">
        <span className="sheet-head-lead">
          {lead}
          <span className="label">
            {stream.accent && <i className="stream-dot" data-accent={stream.accent} />}
            {stream.name} · {fmtDate(note.date, locale)}
          </span>
        </span>
        {actions}
      </div>

      {children ?? (
        <>
          {heading && <h1 className="sheet-title-big">{heading}</h1>}

          {note.tags.length > 0 && (
            <div className="chips sheet-tags">
              {note.tags.map((g) => (
                <span key={g} className="chip sm">
                  {t(`tag.${g}`)}
                </span>
              ))}
            </div>
          )}

          <div className="sheet-rule" aria-hidden />

          {note.body.trim() ? (
            <div
              className="sheet-body"
              // Безопасно: renderMarkdown экранирует весь ввод до того, как
              // появится первый наш тег, и наружу идут только известные теги.
              dangerouslySetInnerHTML={{ __html: renderMarkdown(note.body) }}
            />
          ) : (
            <p className="muted">{t('note.empty')}</p>
          )}
        </>
      )}
    </article>
  )
}
