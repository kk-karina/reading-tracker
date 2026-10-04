import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { renderMarkdown } from '../../lib/learning/markdown'
import { noteHeading } from '../../lib/learning/notes'
import { partLabel, partWord } from '../../lib/learning/parts'
import type { Material, MaterialPart, StudyNote } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { NoteMeta } from '../NoteMeta'
import { noteLinkState } from './noteLink'
import { MaterialCover } from './MaterialCover'

/**
 * Конспект в ленте — вырезка того самого листа, который открывается по
 * нажатию (`NoteSheet`, `.sheet-page`): та же бумага с полем-линейкой, та же
 * служебная строка моноширинным над чертой, тот же текст с разметкой.
 *
 * Раньше в ленте стояла плитка мысли о книге — скруглённая, со штампом тега.
 * Один и тот же конспект выглядел в ленте записочкой, а на своей странице —
 * тетрадным листом, и одно не узнавалось в другом.
 *
 * Текст — началом самого конспекта, отрисованным, а не выдержкой: отмеченное
 * маркером остаётся внутри своего предложения, а не висит обрывком.
 *
 * `meta` — когда и о чём, внизу мелко (`NoteMeta`): главное на листе —
 * написанное, а не материал.
 */
export function StudyNoteCard({
  note,
  material,
  parts,
  slug,
  siblings,
  meta,
  credit,
}: {
  note: StudyNote
  material: Material | undefined
  parts: MaterialPart[]
  slug: string
  /** Соседи в порядке экрана — их листают в открывшемся листе. */
  siblings: string[]
  meta?: ReactNode[]
  /** Материал подписью под чертой, как книга у мысли на дашборде чтения. */
  credit?: boolean
}) {
  const { t } = useLocale()
  const location = useLocation()
  const word = partWord(material?.kind ?? 'book')
  const heading = noteHeading(note, parts, (part, i) =>
    partLabel(part, i, (n) => t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n })),
  )
  const head = heading ?? t('draft.noPart')

  return (
    <Link
      className="sheet-page slip"
      to={`/learning/${slug}/n/${note.id}`}
      // Лист ложится поверх этого экрана, а не уводит с него: см. `NoteOverlay`.
      state={noteLinkState(location, siblings)}
    >
      <span className="label slip-head">{head}</span>
      <div className="sheet-rule slip-rule" aria-hidden />
      <div
        className="sheet-body slip-body"
        // Безопасно: renderMarkdown экранирует ввод до того, как появится
        // первый наш тег, и наружу идут только известные теги.
        dangerouslySetInnerHTML={{ __html: renderMarkdown(note.body) }}
      />
      <NoteMeta parts={meta ?? []} />
      {credit && material && (
        // Не ссылка: весь лист уже ссылка, а вложенная ссылка в ссылке — ошибка.
        <span className="thought-book slip-credit" title={material.title}>
          <MaterialCover material={material} size="sm" />
          <span className="thought-book-text">
            <span className="thought-book-title">{material.title}</span>
            {material.author && <span className="thought-book-author">{material.author}</span>}
          </span>
        </span>
      )}
    </Link>
  )
}
