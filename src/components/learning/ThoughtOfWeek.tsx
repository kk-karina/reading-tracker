import { Link } from 'react-router-dom'
import { extractHighlights, thoughtOfWeek } from '../../lib/learning/highlights'
import type { Material, Stream, StudyNote } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'

/**
 * Одно выделение из конспектов потока, на неделю.
 *
 * Выделять отдельно ничего не надо: `==...==` в конспекте это уже пометка
 * «здесь главное». Нет ни одного выделения — панели нет вовсе: пустая рамка
 * с подписью «пока ничего» занимает место и ничего не сообщает.
 *
 * Текст стоит на лимонной заливке, и это не украшение: эта строка попала сюда
 * ровно потому, что была отчёркнута маркером в конспекте, а маркер системы
 * и есть лимон. Заливка обнимает строки по их длине — так же, как `mark`
 * внутри самого листа, только крупно. Заодно это единственное место экрана,
 * где фирменный цвет занимает площадь, а не пиксель: на белом он иначе
 * не виден вовсе.
 */
export function ThoughtOfWeek({
  stream,
  materials,
  notes,
}: {
  stream: Stream
  materials: Material[]
  notes: StudyNote[]
}) {
  const { t } = useLocale()
  const pick = thoughtOfWeek(extractHighlights(notes))
  if (!pick) return null

  const material = materials.find((m) => m.id === pick.materialId)
  const note = notes.find((n) => n.id === pick.noteId)

  return (
    <section className="thought-week">
      <p className="thought-week-text">
        <span className="thought-week-mark">{pick.text}</span>
      </p>
      {material && (
        <Link
          className="thought-week-source"
          to={`/learning/${stream.slug}/n/${pick.noteId}`}
          state={{ from: { to: `/learning/${stream.slug}`, label: t('nav.dashboard') } }}
        >
          {material.title}
          {note?.part ? ` · ${note.part}` : ''}
        </Link>
      )}
    </section>
  )
}
