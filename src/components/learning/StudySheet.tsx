import { useState } from 'react'
import { todayISO } from '../../lib/format'
import { sourceOrder } from '../../lib/learning/buckets'
import { materialProgress } from '../../lib/learning/metrics'
import { cycleMark, partLabel, partWord, partsOf, type PartMark } from '../../lib/learning/parts'
import type { Material, MaterialPart, Stream, StudySession } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useSessionWrites } from '../../state/useSessionWrites'
import { DraftStack } from '../log/DraftStack'
import { FlagStep } from '../log/FlagStep'
import { noteBlank, noteDraft, savedDrafts, type NoteDraft } from '../log/drafts'
import { NoteFields } from '../log/NoteFields'
import { PagesStep } from '../log/PagesStep'
import { PartsStep } from '../log/PartsStep'
import { SubjectPick } from '../log/SubjectPick'
import { materialCover } from '../log/subjects'
import { WhenLine } from '../log/WhenLine'
import { Sheet } from '../Sheet'
import { FormStack, Jelly } from '../ui'

/** С чего шаг начинается для выбранного материала: зависит только от него. */
function stepFor(material: Material | null, session?: StudySession) {
  if (session) {
    return {
      from: String(session.page_from ?? material?.page_current ?? 0),
      to: session.page_to === null ? '' : String(session.page_to),
      picked: [
        ...session.part_ids.map((id) => ({ id, half: false })),
        ...session.started_ids.map((id) => ({ id, half: true })),
      ],
      completed: session.completed,
    }
  }
  return {
    from: String(material?.page_current ?? 0),
    to: '',
    picked: [] as PartMark[],
    // У статьи занятие почти всегда и есть «прочитала»: отметка стоит сразу,
    // снимают её реже, чем ставили бы.
    completed: material?.status !== 'done',
  }
}

/**
 * Занятие: за что села, что из этого закрылось и что осталось в голове.
 *
 * Тот же лист, что сессия в чтении, — шапка с обложкой, шаг крупно, тихая
 * строка «когда · сколько · как», конспекты карточками ниже, — потому что это
 * то же действие в другом разделе. Шаг зависит от того, чем материал меряется:
 * у книги по страницам — «от → до», у книги по главам и курса — ряд точек,
 * у статьи и ролика — одна отметка «целиком».
 *
 * Конспектов по умолчанию ноль: занятие — это прогресс, и записанное без
 * текста теперь оставляет день в ритме. Конспект без занятия заводится другой
 * дверью — `NoteAddSheet`.
 *
 * С `session` лист правит занятие; удаление откатывает его шаг (см.
 * `rollbackSession`), а конспекты оставляет — без занятия.
 */
export function StudySheet({
  stream,
  material,
  session,
  onClose,
}: {
  stream: Stream
  /** Известный материал. Без него лист спрашивает его сам. */
  material?: Material | null
  session?: StudySession
  onClose: () => void
}) {
  const { t } = useLocale()
  const { materials, parts, notes, addNote, deleteNote } = useLearning()
  const writes = useSessionWrites()

  const options = material || session ? [] : sourceOrder(materials, stream.id, stream.focus_material_id)
  const [pickedId, setPickedId] = useState(
    () => material?.id ?? session?.material_id ?? options[0]?.id ?? '',
  )
  const subject = material ?? materials.find((m) => m.id === pickedId) ?? null

  const first = stepFor(subject, session)
  const [date, setDate] = useState(session?.date ?? todayISO())
  const [minutes, setMinutes] = useState(session?.minutes ? String(session.minutes) : '')
  const [rating, setRating] = useState<number | null>(session?.rating ?? null)
  const [from, setFrom] = useState(first.from)
  const [to, setTo] = useState(first.to)
  const [picked, setPicked] = useState<PartMark[]>(first.picked)
  const [names, setNames] = useState<Record<string, string>>({})
  const [completed, setCompleted] = useState(first.completed)
  const [drafts, setDrafts] = useState<NoteDraft[]>(() =>
    savedDrafts(session ? notes.filter((n) => n.session_id === session.id) : []),
  )
  const [busy, setBusy] = useState(false)
  const state = () =>
    JSON.stringify({ date, minutes, rating, from, to, picked, names, completed, drafts })
  const [start] = useState(state)

  // Смена материала пересобирает шаг: главы и страницы у другого свои. Дата,
  // минуты и написанное набирались руками и переживают смену.
  const pick = (id: string) => {
    setPickedId(id)
    const next = stepFor(materials.find((m) => m.id === id) ?? null)
    setFrom(next.from)
    setTo(next.to)
    setPicked(next.picked)
    setNames({})
    setCompleted(next.completed)
    setDrafts((list) => list.map((d) => ({ ...d, partId: '' })))
  }

  const title = t(session ? 'study.editTitle' : 'study.log')

  if (!subject) {
    return (
      <Sheet title={title} onClose={onClose}>
        <p className="small faint">{t('study.noMaterials')}</p>
      </Sheet>
    )
  }

  const p = materialProgress(subject, parts)
  const chapters = partsOf(parts, subject.id)
  const word = partWord(subject.kind)
  const label = (part: MaterialPart, i = chapters.indexOf(part)) =>
    partLabel(part, i, (n) => t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n }))
  const own = new Set(session?.part_ids ?? [])
  const ownStarted = new Set(session?.started_ids ?? [])
  const locked = new Set(chapters.filter((c) => c.done && !own.has(c.id)).map((c) => c.id))
  // Начатые раньше — не этим занятием: руками другим или конспектом. Своя
  // половинка в этом листе — отметка, а не прошлое.
  const wroteAbout = new Set(
    notes
      .filter((n) => n.material_id === subject.id && n.part_id)
      .map((n) => n.part_id as string),
  )
  const started = new Set(
    chapters.filter((c) => wroteAbout.has(c.id) || (c.started && !ownStarted.has(c.id))).map((c) => c.id),
  )
  const pickedIds = picked.map((m) => m.id)
  // Конспект занятия пишется о том, что в нём прошли — целиком или до
  // середины: выбор из отмеченного.
  const pickedParts = pickedIds
    .map((id) => chapters.find((c) => c.id === id))
    .filter((c): c is MaterialPart => !!c)
  const named = (part: MaterialPart) => {
    const typed = names[part.id]?.trim()
    return typed ? typed : label(part)
  }

  const fromNum = Number(from) || 0
  const toNum = to.trim() ? Number(to) : null
  const backwards = p.unit === 'page' && toNum !== null && toNum < fromNum
  const dirty = state() !== start

  const toggle = (id: string) => setPicked((list) => cycleMark(list, id, started.has(id)))

  /** Имена глав, вписанные в листе, — поверх отметок занятия, одной записью на часть. */
  const typedNames = () => {
    const out = new Map<string, Partial<MaterialPart>>()
    for (const [id, typed] of Object.entries(names)) {
      const part = chapters.find((c) => c.id === id)
      if (part && typed.trim() !== part.title) out.set(id, { title: typed.trim() })
    }
    return out
  }

  const save = async () => {
    if (backwards || busy) return
    setBusy(true)

    const fields = {
      material_id: subject.id,
      date,
      page_from: p.unit === 'page' && toNum !== null ? fromNum : null,
      page_to: p.unit === 'page' ? toNum : null,
      part_ids: p.unit === 'part' ? picked.filter((m) => !m.half).map((m) => m.id) : [],
      started_ids: p.unit === 'part' ? picked.filter((m) => m.half).map((m) => m.id) : [],
      completed: p.unit === 'flag' && completed,
      minutes: Number(minutes) > 0 ? Number(minutes) : null,
      rating,
    }

    // Шаг материала и пара на полке, если материал связан с книгой, — там же.
    const saved = await writes.saveStudy(subject, session, fields, typedNames())
    if (!saved) {
      setBusy(false)
      return
    }

    const blank = noteBlank(stream.outline)
    const written = notes.filter((n) => n.material_id === subject.id).length
    let i = 0
    for (const d of drafts) {
      if (d.id) {
        if (d.removed) await deleteNote(d.id)
        continue
      }
      if (d.removed || blank(d)) continue
      await addNote({
        material_id: subject.id,
        session_id: saved.id,
        part_id: pickedIds.includes(d.partId) ? d.partId : null,
        part: null,
        title: null,
        body: d.body.trim(),
        tags: [],
        date,
        sort: written + i++,
      })
    }

    setBusy(false)
    onClose()
  }

  const remove = async () => {
    if (!session) return
    const twin = writes.twinOfStudy(session)
    if (!confirm(t(twin ? 'study.confirmDeleteTwin' : 'study.confirmDelete'))) return
    setBusy(true)
    await writes.removeStudy(subject, session)
    onClose()
  }

  const head = (
    <SubjectPick
      value={subject}
      options={options}
      onPick={pick}
      cover={materialCover}
      title={(m) => m.title}
      author={(m) => m.author}
      label={t('study.source')}
    />
  )

  return (
    <Sheet title={title} head={head} onClose={onClose} dirty={dirty} onSubmit={() => void save()}>
      <FormStack>
        {p.unit === 'page' && (
          <PagesStep
            from={from}
            to={to}
            total={subject.pages_total}
            onFrom={setFrom}
            onTo={setTo}
            backwards={backwards}
          />
        )}
        {p.unit === 'part' && (
          <PartsStep
            parts={chapters}
            marks={picked}
            locked={locked}
            started={started}
            names={names}
            word={word}
            label={label}
            onToggle={toggle}
            onName={(id, value) => setNames((m) => ({ ...m, [id]: value }))}
          />
        )}
        {p.unit === 'flag' && (
          <FlagStep video={subject.kind === 'video'} on={completed} onChange={setCompleted} />
        )}

        <WhenLine
          date={date}
          onDate={setDate}
          minutes={minutes}
          onMinutes={setMinutes}
          rating={rating}
          onRating={setRating}
        />

        <DraftStack
          drafts={drafts}
          onDrafts={setDrafts}
          // Контур потока — только в первый новый конспект листа: второй
          // пишут о чём-то другом, и тот же скелет там чаще мешает.
          make={() =>
            noteDraft(
              drafts.some((d) => !d.saved) ? '' : (stream.outline ?? ''),
              pickedIds[pickedIds.length - 1] ?? '',
            )
          }
          isBlank={noteBlank(stream.outline)}
          addLabel={t('draft.addNote')}
          paper="sheet-page slip"
          render={(d, patch, fresh) => (
            <NoteFields
              draft={d}
              patch={patch}
              fresh={fresh}
              parts={d.saved ? chapters : pickedParts}
              label={named}
              slug={stream.slug}
            />
          )}
        />

        <div className="sheet-foot">
          {session && (
            <button type="button" className="link-btn danger" onClick={remove} disabled={busy}>
              {t('study.delete')}
            </button>
          )}
          <Jelly className="btn" onClick={() => void save()} disabled={backwards || busy}>
            {t('form.save')}
          </Jelly>
        </div>
      </FormStack>
    </Sheet>
  )
}
