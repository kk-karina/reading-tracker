import { useState } from 'react'
import { todayISO } from '../../lib/format'
import { sourceOrder } from '../../lib/learning/buckets'
import { partLabel, partWord, partsOf } from '../../lib/learning/parts'
import type { Material, MaterialPart, Stream, StudyNote } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { DraftStack } from '../log/DraftStack'
import { noteBlank, noteDraft, type NoteDraft } from '../log/drafts'
import { NoteFields } from '../log/NoteFields'
import { SubjectPick } from '../log/SubjectPick'
import { materialCover } from '../log/subjects'
import { WhenLine } from '../log/WhenLine'
import { Sheet } from '../Sheet'
import { FormStack, Jelly } from '../ui'

/**
 * Конспект без занятия.
 *
 * Вторая дверь рядом с «Записать занятие», и про другое: написать, что
 * осталось в голове, не отчитываясь о пройденном. Раньше обе двери вели в
 * один лист, и «Добавить конспект» каждый раз спрашивал главу и предлагал
 * отметить её пройденной — то есть требовал занятия, которого могло не быть.
 *
 * Здесь шага нет совсем: материал, дата чипом, одна карточка с курсором и
 * «+ конспект», если их несколько. Глава на карточке необязательна — по
 * умолчанию «без главы».
 */
export function NoteAddSheet({
  stream,
  material,
  onClose,
  onSaved,
}: {
  stream: Stream
  material?: Material | null
  onClose: () => void
  /** Чем кончилось — чтобы экран, позвавший лист, показал написанное. */
  onSaved?: (note: StudyNote) => void
}) {
  const { t } = useLocale()
  const { materials, parts, notes, addNote } = useLearning()

  const options = material ? [] : sourceOrder(materials, stream.id, stream.focus_material_id)
  const [pickedId, setPickedId] = useState(() => material?.id ?? options[0]?.id ?? '')
  const subject = material ?? materials.find((m) => m.id === pickedId) ?? null

  const [date, setDate] = useState(todayISO())
  const [drafts, setDrafts] = useState<NoteDraft[]>(() => [noteDraft(stream.outline ?? '')])
  const [busy, setBusy] = useState(false)
  const [start] = useState(() => JSON.stringify({ date, drafts }))

  const title = t('note.add')

  if (!subject) {
    return (
      <Sheet title={title} onClose={onClose}>
        <p className="small faint">{t('study.noMaterials')}</p>
      </Sheet>
    )
  }

  const chapters = partsOf(parts, subject.id)
  const word = partWord(subject.kind)
  const label = (part: MaterialPart) =>
    partLabel(part, chapters.indexOf(part), (n) =>
      t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n }),
    )

  const blank = noteBlank(stream.outline)
  const live = drafts.filter((d) => !d.removed && !blank(d))
  const dirty = JSON.stringify({ date, drafts }) !== start

  const save = async () => {
    if (live.length === 0 || busy) return
    setBusy(true)
    const written = notes.filter((n) => n.material_id === subject.id).length
    let last: StudyNote | undefined
    for (const [i, d] of live.entries()) {
      last =
        (await addNote({
          material_id: subject.id,
          session_id: null,
          part_id: chapters.some((c) => c.id === d.partId) ? d.partId : null,
          part: null,
          title: null,
          body: d.body.trim(),
          tags: [],
          date,
          sort: written + i,
        })) ?? last
    }
    setBusy(false)
    if (last) onSaved?.(last)
    onClose()
  }

  const head = (
    <SubjectPick
      value={subject}
      options={options}
      onPick={(id) => {
        setPickedId(id)
        // Главы у другого материала свои: прежний выбор в них ничего не значит.
        setDrafts((list) => list.map((d) => ({ ...d, partId: '' })))
      }}
      cover={materialCover}
      title={(m) => m.title}
      author={(m) => m.author}
      label={t('study.source')}
    />
  )

  return (
    <Sheet title={title} head={head} onClose={onClose} dirty={dirty} onSubmit={() => void save()}>
      <FormStack>
        <WhenLine date={date} onDate={setDate} />

        <DraftStack
          drafts={drafts}
          onDrafts={setDrafts}
          make={() => noteDraft('')}
          isBlank={blank}
          addLabel={t('draft.addNote')}
          paper="sheet-page slip"
          render={(d, patch, fresh) => (
            <NoteFields
              draft={d}
              patch={patch}
              parts={chapters}
              label={label}
              slug={stream.slug}
              // Первая карточка открыта с курсором: лист затем и открыли.
              fresh={fresh || d === drafts[0]}
            />
          )}
        />

        <div className="sheet-foot">
          <Jelly className="btn" onClick={() => void save()} disabled={live.length === 0 || busy}>
            {t('form.save')}
          </Jelly>
        </div>
      </FormStack>
    </Sheet>
  )
}
