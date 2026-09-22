import { Link } from 'react-router-dom'
import { plainText } from '../../lib/learning/markdown'
import type { Material, Stream, StudyNote } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'

/** Три заполняют ряд карточек на широком экране; остальное живёт в «Заметках». */
const SHOWN = 3

/**
 * Конспект — карточка, а не строка в рамке: ряд карточек сам выравнивается по
 * высоте, и это единственная причина, по которой они карточки. Форма та же,
 * что у мыслей на дашборде чтения.
 *
 * Собственной шапки у блока больше нет: он стоит внутри зоны «Что осталось»,
 * и её имя со ссылкой на все заметки было ровно тем же самым, написанным
 * дважды подряд.
 *
 * У конспекта тегов может быть несколько, а цвет карточки один — берётся
 * первый: он и выбран первым.
 */
export function RecentStudyNotes({
  stream,
  materials,
  notes,
}: {
  stream: Stream
  materials: Material[]
  notes: StudyNote[]
}) {
  const { t } = useLocale()
  const from = { to: `/learning/${stream.slug}`, label: t('nav.dashboard') }

  const recent = [...notes]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .slice(0, SHOWN)

  if (recent.length === 0) return <div className="queue-empty">{t('stream.notesNone')}</div>

  return (
    <div className="thought-cards">
      {recent.map((n) => {
        const m = materials.find((x) => x.id === n.material_id)
        return (
          <article key={n.id} className="thought-card" data-tag={n.tags[0]}>
            {n.tags[0] && <span className="label thought-tag">{t(`tag.${n.tags[0]}`)}</span>}
            {/* В теле — сам конспект без разметки. Название главы стоит
                ниже, у материала, и повторять его здесь незачем. */}
            <p className="thought-body">{plainText(n.body)}</p>
            {m && (
              <Link
                to={`/learning/${stream.slug}/n/${n.id}`}
                state={{ from }}
                className="thought-book"
              >
                <span className="thought-book-text">
                  <span className="thought-book-title">{m.title}</span>
                  {n.part && <span className="thought-book-author">{n.part}</span>}
                </span>
              </Link>
            )}
          </article>
        )
      })}
    </div>
  )
}
