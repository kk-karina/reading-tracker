import { useState } from 'react'
import { todayISO } from '../../lib/format'
import { sourceOrder } from '../../lib/learning/buckets'
import { doneAfterPart, materialProgress } from '../../lib/learning/metrics'
import { partLabel, partWord, partsOf, pickDefaultPart } from '../../lib/learning/parts'
import type { Material, MaterialPart, Stream, StudyNote } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { NoteEditor } from '../NoteEditor'
import { Sheet } from '../Sheet'
import { Field, FormStack, Jelly } from '../ui'
import { MaterialCover } from './MaterialCover'

/** Состояние части одним знаком. Три знака в столбик читаются быстрее, чем их отсутствие. */
const DONE_MARK = '✓ '
const STARTED_MARK = '◐ '
const FRESH_MARK = '○ '

/**
 * С чего лист начинается для выбранного материала.
 *
 * Отдельно от состояния, потому что считается дважды: один раз при открытии и
 * ещё раз при каждой смене источника. Часть и страница — единственное, что от
 * материала зависит; дата и текст переживают смену, их набирали руками.
 */
function draftFor(material: Material | null, parts: MaterialPart[], notes: StudyNote[]) {
  if (!material) return { partId: '', page: '' }
  const mine = notes.filter((n) => n.material_id === material.id)
  return {
    partId: pickDefaultPart(partsOf(parts, material.id), mine)?.id ?? '',
    page: material.page_current ? String(material.page_current) : '',
  }
}

/**
 * Конспект: о чём, что из этого пройдено и что осталось в голове.
 *
 * Единственная дверь к новой записи. Раньше их было две, и вторая заводила
 * пустой конспект в хранилище и уводила на его страницу — читать то, чего ещё
 * никто не написал, и жать «Править». Лист открывается пустым, но это ещё
 * черновик: пока не сохранили, в данных ничего нет.
 *
 * `material` необязателен, и это вся разница между входами. Пришли от полосы
 * прогресса или со страницы материала — он известен, стоит в шапке и не
 * спрашивается. Пришли из ленты конспектов или плюсом с дашборда — первым полем
 * стоит источник, преднабранный фокусом потока: там выбирают, к чему относится
 * запись. `title` приходит оттуда же, потому что называют это по-разному:
 * у полосы прогресса записывают занятие, в ленте добавляют конспект.
 *
 * Поле прогресса одно, и какое оно — решает не вид листа, а то, чем материал
 * меряется: у книги по главам и у курса это список частей, у книги по
 * страницам — номер страницы, у статьи и ролика — отметка «прошла целиком».
 * Раньше поле было одно на всех, называлось «Глава или часть» и набиралось
 * руками — статье оно не значило ничего, а книге не умело поставить отметку.
 *
 * Контур потока подставляется в пустое тело: у потока он на то и заведён.
 */
export function StudySheet({
  stream,
  material,
  notes,
  title,
  onClose,
  onSaved,
}: {
  stream: Stream
  /** Известный источник. Без него лист спрашивает его сам. */
  material?: Material | null
  notes: StudyNote[]
  /** Чем назвалась дверь. Лист обязан называться так же, иначе кнопка обещает
      одно, а открывшаяся панель представляется другим. */
  title?: string
  onClose: () => void
  /** Чем всё кончилось — чтобы экран, позвавший лист, показал написанное. */
  onSaved?: (note: StudyNote) => void
}) {
  const { t } = useLocale()
  const { addNote, updateMaterial, updatePart, parts, materials } = useLearning()

  const name = title ?? t('note.add')

  const options = material ? [] : sourceOrder(materials, stream.id, stream.focus_material_id)
  const [pickedId, setPickedId] = useState(() => material?.id ?? options[0]?.id ?? '')
  const subject = material ?? materials.find((m) => m.id === pickedId) ?? null

  /** Имя части по её `id`. Пустое значит «зовётся номером» — см. `partLabel`. */
  const titleOf = (id: string) => parts.find((p) => p.id === id)?.title ?? ''

  const [date, setDate] = useState(todayISO())
  const [partId, setPartId] = useState(() => draftFor(subject, parts, notes).partId)
  /**
   * Имя выбранной части, правимое прямо здесь.
   *
   * Лист занятия — тот самый момент, когда имя главы известно: её только что
   * прочитали. Отправлять за этим на вкладку списка значит просить вспомнить
   * название позже и не тем жестом, которым сейчас заняты. Пишется вместе со
   * всем остальным, по «Сохранить»: до него лист — черновик целиком.
   */
  const [partTitle, setPartTitle] = useState(() => titleOf(draftFor(subject, parts, notes).partId))
  /**
   * Чем часть станет после сохранения, а не «поставить отметку».
   *
   * Поэтому включена всегда: непройденную ты сейчас проходишь, пройденная уже
   * пройдена. Формулировка «добавить отметку» позволяла бы галочке разойтись с
   * тем, что на самом деле лежит в данных.
   */
  const [done, setDone] = useState(true)
  const [page, setPage] = useState(() => draftFor(subject, parts, notes).page)
  const [body, setBody] = useState(stream.outline ?? '')
  const [busy, setBusy] = useState(false)

  // Смена источника пересобирает всё, что от него зависело: главы у нового
  // материала свои, и прошлый выбор в них ничего не значит.
  const pick = (id: string) => {
    setPickedId(id)
    const next = draftFor(materials.find((m) => m.id === id) ?? null, parts, notes)
    setPartId(next.partId)
    setPartTitle(titleOf(next.partId))
    setPage(next.page)
    setDone(true)
  }

  // Конспект пишется о чём-то. Потоку, в котором ещё ничего нет, лист говорит
  // это прямо, а не показывает пустой список источников.
  if (!subject) {
    return (
      <Sheet title={name} onClose={onClose}>
        <p className="small faint">{t('study.noMaterials')}</p>
      </Sheet>
    )
  }

  const mine = notes.filter((n) => n.material_id === subject.id)
  const chapters = partsOf(parts, subject.id)
  const p = materialProgress(subject, parts)
  const word = partWord(subject.kind)

  /** По каким частям уже написано. Отсюда берётся «начата». */
  const written = new Set(mine.map((n) => n.part_id).filter((id): id is string => id !== null))

  const part = chapters.find((c) => c.id === partId) ?? null

  const label = (item: MaterialPart, i: number) =>
    partLabel(item, i, (n) => t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n }))

  const mark = (item: MaterialPart) =>
    item.done ? DONE_MARK : written.has(item.id) ? STARTED_MARK : FRESH_MARK

  /** Имя в списке выбора. У правимой сейчас части — то, что набрано: иначе
      поле говорит одно, а строка прямо над ним всё ещё зовёт её номером. */
  const shown = (item: MaterialPart, i: number) =>
    item.id === partId && partTitle.trim() ? partTitle.trim() : label(item, i)

  // Показывается до сохранения: число должно быть перед глазами в момент
  // решения, а не после него.
  const after =
    p.unit === 'part'
      ? doneAfterPart(p, part?.done ?? false, done)
      : Math.max(0, Math.round(Number(page) || 0))

  /** Стрелочная, а не объявление: объявление поднимается выше проверки на
      `subject`, и сужение типа внутрь него не доходит. */
  const save = async () => {
    setBusy(true)

    const made = await addNote({
      material_id: subject.id,
      part_id: p.unit === 'part' ? partId || null : null,
      part: null,
      title: null,
      body: body.trim(),
      tags: [],
      date,
      sort: mine.length,
    })

    // Одна запись на часть, а не две: отметка и имя меняются здесь вместе, а
    // два вызова подряд — это два круга перерисовки и две точки отказа.
    if (part) {
      const partPatch: Partial<MaterialPart> = {}
      if (part.done !== done) partPatch.done = done
      const named = partTitle.trim()
      if (named !== part.title) partPatch.title = named
      if (Object.keys(partPatch).length > 0) await updatePart(part.id, partPatch)
    }

    const patch: Partial<Material> = {}

    if (p.unit === 'page' && page.trim() !== '') {
      const n = Math.max(0, Math.round(Number(page)))
      if (Number.isFinite(n) && n !== subject.page_current) patch.page_current = n
    }

    // Отметка нужна только там, где считать нечего: у статьи и ролика прогресса
    // нет вовсе. Всё остальное статус выводит сам из отмеченных частей,
    // страницы и написанного — см. `statusOf`, — и писать его сюда значило бы
    // завести второй ответ на тот же вопрос.
    const marked = subject.status === 'done'
    if (p.unit === 'flag' && marked !== done) patch.status = done ? 'done' : 'backlog'

    if (Object.keys(patch).length > 0) await updateMaterial(subject.id, patch)

    setBusy(false)
    if (made) onSaved?.(made)
    onClose()
  }

  const head = (
    <div className="sheet-subject">
      <MaterialCover material={subject} size="md" />
      <div className="sheet-subject-text">
        <h2 className="display sheet-title">{subject.title}</h2>
        {subject.author && <p className="small muted">{subject.author}</p>}
      </div>
    </div>
  )

  return (
    <Sheet title={name} head={head} onClose={onClose}>
      <FormStack>
        <div className="field-row study-sheet-row">
          {/* Источник спрашивается первым: от него зависят и главы, и
              страница, и то, что нарисовано в шапке. */}
          {!material && (
            <Field label={t('study.source')}>
              <select className="select" value={pickedId} onChange={(e) => pick(e.target.value)}>
                {options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label={t('session.date')}>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          {p.unit === 'part' && chapters.length > 0 && (
            <Field
              label={t(word === 'lecture' ? 'part.pickLecture' : 'part.pickChapter')}
            >
              <select
                className="select"
                value={partId}
                onChange={(e) => {
                  setPartId(e.target.value)
                  // Галочка и имя — про выбранную часть, а не про прошлую: со
                  // сменой части оба пересчитываются заново.
                  setPartTitle(titleOf(e.target.value))
                  setDone(true)
                }}
              >
                {chapters.map((item, i) => (
                  <option key={item.id} value={item.id}>
                    {mark(item)}
                    {shown(item, i)}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {p.unit === 'page' && (
            <Field label={t('study.toPage')}>
              <input
                className="input"
                inputMode="numeric"
                value={page}
                onChange={(e) => setPage(e.target.value)}
              />
            </Field>
          )}
        </div>

        {/* Имя главы правится здесь же, а не только в списке частей: читают
            главу один раз, и называется она в тот же заход. Поле во всю
            ширину, а не третьей колонкой в ряду выше, — там живут короткие
            ответы (когда, какая), а это длинная строка. */}
        {part && (
          <Field
            label={t(word === 'lecture' ? 'part.nameLecture' : 'part.nameChapter')}
            hint={t('part.nameHint')}
          >
            <input
              className="input"
              value={partTitle}
              placeholder={label(part, chapters.indexOf(part))}
              onChange={(e) => setPartTitle(e.target.value)}
            />
          </Field>
        )}

        {p.unit === 'part' && chapters.length === 0 && (
          <p className="small faint">{t('study.noParts')}</p>
        )}

        {p.unit === 'part' && chapters.length > 0 && (
          <label className="toggle">
            <input type="checkbox" checked={done} onChange={() => setDone(!done)} />
            <span>{t(word === 'lecture' ? 'part.doneLecture' : 'part.doneChapter')}</span>
          </label>
        )}

        {p.unit === 'flag' && (
          <label className="toggle">
            <input type="checkbox" checked={done} onChange={() => setDone(!done)} />
            <span>{t(subject.kind === 'video' ? 'material.watched' : 'material.read')}</span>
          </label>
        )}

        {p.unit !== 'flag' && p.total !== null && (
          <p className="small faint study-sheet-after">
            {p.unit === 'page'
              ? t('study.willBePage', { done: after, total: p.total })
              : t('study.willBe', { done: after, total: p.total })}
          </p>
        )}

        <div className="field">
          <span className="label">{t('note.body')}</span>
          <NoteEditor body={body} onBody={setBody} />
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
