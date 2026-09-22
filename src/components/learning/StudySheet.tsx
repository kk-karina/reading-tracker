import { useState } from 'react'
import { todayISO } from '../../lib/format'
import { materialProgress } from '../../lib/learning/metrics'
import type { Material, Stream, StudyNote } from '../../lib/learning/types'
import type { NoteTag } from '../../lib/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { NoteEditor } from '../NoteEditor'
import { Sheet } from '../Sheet'
import { FormStack, Jelly } from '../ui'

/**
 * Одно занятие: что прошла и что из этого осталось.
 *
 * Тот же лист, что у чтения, и та же сделка: отмечается пройденное, а
 * конспект пишется здесь же, а не отдельным заходом. Считанная глава без
 * записи в этой модели не бывает — прогресс и есть конспекты, — поэтому
 * лист один, а не два.
 *
 * Открывается с дашборда по материалу в фокусе и с самого материала. Контур
 * потока подставляется в пустое тело: у потока он на то и заведён.
 */
export function StudySheet({
  stream,
  material,
  notes,
  onClose,
}: {
  stream: Stream
  material: Material
  notes: StudyNote[]
  onClose: () => void
}) {
  const { t } = useLocale()
  const { addNote, updateMaterial, parts } = useLearning()

  const mine = notes.filter((n) => n.material_id === material.id)
  const p = materialProgress(material, parts)

  const [date, setDate] = useState(todayISO())
  const [part, setPart] = useState('')
  const [body, setBody] = useState(stream.outline ?? '')
  const [tags, setTags] = useState<NoteTag[]>([])
  const [busy, setBusy] = useState(false)

  // Показывается до сохранения: «залогать» — это про число, и число должно
  // быть видно в момент решения, а не после него.
  const next = p.total ? Math.min(p.done + 1, p.total) : p.done + 1

  async function save() {
    setBusy(true)
    await addNote({
      material_id: material.id,
      part: part.trim() || null,
      title: null,
      body: body.trim(),
      tags,
      date,
      sort: mine.length,
    })
    // Записать занятие по материалу из бэклога значит сесть за него.
    if (material.status !== 'active') await updateMaterial(material.id, { status: 'active' })
    setBusy(false)
    onClose()
  }

  return (
    <Sheet title={t('study.log')} onClose={onClose}>
      <FormStack>
        <p className="small muted study-sheet-what">{material.title}</p>

        <div className="field-row">
          <label className="field">
            <span className="label">{t('session.date')}</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="field study-sheet-part">
            <span className="label">{t('note.part')}</span>
            <input
              className="input"
              value={part}
              autoFocus
              placeholder={t('note.partPlaceholder')}
              onChange={(e) => setPart(e.target.value)}
            />
          </label>
        </div>

        <p className="small faint study-sheet-after">
          {p.total
            ? t('study.willBe', { done: next, total: p.total })
            : t('study.willBeNoTotal', { n: next })}
        </p>

        <div className="field">
          <span className="label">{t('note.body')}</span>
          <NoteEditor body={body} tags={tags} onBody={setBody} onTags={setTags} />
        </div>

        <div className="row-tight" style={{ alignSelf: 'flex-start' }}>
          <Jelly className="btn" onClick={() => void save()} disabled={busy}>
            {t('form.save')}
          </Jelly>
        </div>
      </FormStack>
    </Sheet>
  )
}
