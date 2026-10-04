import { fmtDate } from '../../lib/format'
import { isBlankNote } from '../../lib/learning/notes'
import type { Material, MaterialPart, Stream, StudyNote } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Empty } from '../ui'
import { StudyNoteCard } from './StudyNoteCard'

/** Три последних конспекта. Дальше — Дневник, ссылка на него стоит в шапке зоны. */
const SHOWN = 3

/**
 * Последние конспекты — листами, рядом из трёх, как последние мысли на
 * дашборде чтения: то же место, тот же жест, та же бумага.
 *
 * Здесь была лента отрывков голым текстом, без подложки. Она ушла от плитки
 * мысли, которая схлопывала конспект в сплошную серую стену («Main takeaway
 * … My correction …»). Лист этой беды не повторяет: он рисует разметку, и
 * разделы контура стоят в нём подписями, а не сливаются с текстом. А голая
 * лента расходилась с правилом подложек — вещь стоит на бумаге — и с
 * соседним разделом, где мысли лежат карточками.
 *
 * Пустые листы сюда не попадают: от них оставалась одна подпись без текста.
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

  const recent = notes
    .filter((n) => !isBlankNote(n.body, stream.outline))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .slice(0, SHOWN)

  // Имя зоны стоит над блоком, поэтому здесь только рисунок и строка.
  if (recent.length === 0)
    return (
      <Empty size="sm" art="writing">
        {t('stream.notesNone')}
      </Empty>
    )

  return (
    <div className="thought-cards">
      {recent.map((note) => {
        const material = materials.find((m) => m.id === note.material_id)
        return (
          <StudyNoteCard
            key={note.id}
            note={note}
            material={material}
            parts={parts}
            slug={stream.slug}
            siblings={recent.map((x) => x.id)}
            meta={[fmtDate(note.date, locale)]}
            credit
          />
        )
      })}
    </div>
  )
}
