import { Link } from 'react-router-dom'
import { fmtDate } from '../../lib/format'
import { excerptOf } from '../../lib/learning/highlights'
import { noteHeading } from '../../lib/learning/notes'
import { partLabel, partWord } from '../../lib/learning/parts'
import type { Material, MaterialPart, Stream, StudyNote } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'

/** Три последних конспекта. Дальше — вкладка, ссылка на неё стоит в шапке зоны. */
const SHOWN = 3

/**
 * Последние конспекты — лентой отрывков, а не карточками.
 *
 * Карточка пришла сюда от мысли о книге, где она и права: мысль коротка и
 * помещается в карточку целиком. Конспект — лист со структурой, и та же
 * карточка показывала его схлопнутым в сплошняк: «Main takeaway ... My
 * correction ... Question / disagreement ...» — три одинаковые серые стены,
 * по которым нельзя было сказать, о чём хоть одна из них.
 *
 * Теперь строка — это отрывок и подпись под ним. Отрывок берётся маркером
 * (см. `excerptOf`), и отмеченный маркером стоит на лимоне: крупно на экран
 * попадает ровно то, что было отчёркнуто рукой. Верхний отрывок — самый
 * свежий и потому набран крупнее: ленту читают сверху.
 *
 * Строка целиком ведёт на лист: за отрывком всегда идут за остальным.
 */
export function RecentStudyNotes({
  stream,
  materials,
  parts,
  notes,
}: {
  stream: Stream
  materials: Material[]
  parts: MaterialPart[]
  notes: StudyNote[]
}) {
  const { t, locale } = useLocale()
  const from = { to: `/learning/${stream.slug}`, label: t('nav.dashboard') }

  const recent = [...notes]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .slice(0, SHOWN)

  if (recent.length === 0) return <div className="queue-empty">{t('stream.notesNone')}</div>

  return (
    <ul className="recap">
      {recent.map((note, i) => {
        const material = materials.find((m) => m.id === note.material_id)
        const excerpt = excerptOf(note)
        // Глава зовётся тем же именем, что на листе и в навигации по листам, —
        // одно правило на все экраны, иначе здесь «Глава 4», а там пусто.
        const word = partWord(material?.kind ?? 'book')
        const heading = noteHeading(note, parts, (part, idx) =>
          partLabel(part, idx, (n) =>
            t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n }),
          ),
        )
        const source = [material?.title, heading, fmtDate(note.date, locale)]
          .filter(Boolean)
          .join(' · ')

        return (
          <li key={note.id}>
            <Link
              className="recap-row"
              to={`/learning/${stream.slug}/n/${note.id}`}
              state={{ from }}
              data-lead={i === 0 || undefined}
            >
              {excerpt && (
                <p className="recap-text" data-marked={excerpt.marked || undefined}>
                  <span className="recap-mark">{excerpt.text}</span>
                </p>
              )}
              <span className="recap-source">{source}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
