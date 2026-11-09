import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Crumbs } from '../../components/Crumbs'
import { Icon } from '../../components/Icon'
import { MetaLine } from '../../components/MetaLine'
import { MaterialCover } from '../../components/learning/MaterialCover'
import { NoteSheet } from '../../components/learning/NoteSheet'
import { NoteStack } from '../../components/learning/NoteStack'
import { SheetFlip } from '../../components/learning/SheetFlip'
import { NoteToc } from '../../components/learning/NoteToc'
import { PartDots, PracticeTally, TALLY_MAX } from '../../components/learning/PartDots'
import { FinishMark } from '../../components/learning/FinishMark'
import { KIND_ICON } from '../../components/learning/kindIcon'
import { PartNames } from '../../components/learning/PartNames'
import { useProgressText } from '../../components/learning/Progress'
import { NoteAddSheet } from '../../components/learning/NoteAddSheet'
import { noteLinkState } from '../../components/learning/noteLink'
import { StudySheet } from '../../components/learning/StudySheet'
import { StudyNoteCard } from '../../components/learning/StudyNoteCard'
import { useStudyLine } from '../../components/learning/studyStep'
import { useDirectProgress } from '../../components/learning/useDirectProgress'
import { LogRow } from '../../components/log/LogRow'
import { MaterialForm } from '../../components/MaterialForm'
import { PageTabs } from '../../components/PageTabs'
import { Sheet } from '../../components/Sheet'
import { Empty, Jelly, Tip } from '../../components/ui'
import { fmtDate, fmtMinutes } from '../../lib/format'
import { focusOf } from '../../lib/learning/buckets'
import { sourceOf } from '../../lib/compose/linkMeta'
import { barWidth, materialProgress, remainingOf } from '../../lib/learning/metrics'
import { lastTouched } from '../../lib/learning/sessions'
import { finishedByCount } from '../../lib/learning/status'
import { Mood } from '../../components/Mood'
import { isBlankNote, noteOutline } from '../../lib/learning/notes'
import { timeOf } from '../../lib/log'
import { hasParts, partLabel, partWord, partsOf } from '../../lib/learning/parts'
import type { MaterialPart, StudySession } from '../../lib/learning/types'
import { useMedia } from '../../lib/useMedia'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

/* Те же вкладки, что у книги в чтении: что написано и когда садилась.
   Написанное идёт первым — страницы и лекции средство, конспект результат.

   Вкладки «Главы» больше нет: состояние глав показывает ряд точек под
   названием, имя главы дают в листе занятия, число глав — в карточке
   материала. Единственное, чего нигде больше не было, — вписать названия
   списком, — открывается из ячейки «Пройдено». */
const TABS = ['notes', 'sessions'] as const
type Tab = (typeof TABS)[number]

export function Material() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, locale } = useLocale()
  const stream = useStream()
  const progressText = useProgressText()
  const {
    materials,
    parts,
    notes,
    sessions,
    loading,
    deleteMaterial,
    updateStream,
    updateMaterial,
    updateSession,
  } = useLearning()
  const [editing, setEditing] = useState(false)
  /* Лист один, а дверей к нему две, и зовутся они по-разному: плюс у полосы
     прогресса записывает занятие, кнопка над листами добавляет конспект.
     Состояние помнит, какая открыла, — лист представляется её словами. */
  const [logging, setLogging] = useState<'log' | 'note' | null>(null)
  const [editingSession, setEditingSession] = useState<StudySession | null>(null)
  const line = useStudyLine()
  const direct = useDirectProgress()
  const [openSession, setOpenSession] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('notes')
  /* Лист имён списком — вторая дверь к переименованию, для тех случаев, когда
     частей тридцать и наводить на каждую мышь не работа, а отказ от неё. */
  const [naming, setNaming] = useState(false)
  /* Открытый лист помнится по id, а не по номеру: номера сдвигаются, когда
     лист удаляют или дописывают новый, и запомненный номер показал бы соседа. */
  const [openNote, setOpenNote] = useState<string | null>(null)
  /* Колонка оглавления стоит рядом с листом, пока рядом есть место. Уже —
     её нет, и оглавление открывается листом со счётчика. Порог тот же, что
     у `.notes-read` в `learning.css`. */
  const narrow = useMedia('(max-width: 960px)')
  const [toc, setToc] = useState(false)

  if (loading) return null

  // Материал ищется внутри своего потока: id из чужого потока не должен
  // открываться под этим адресом.
  const material = materials.find((m) => m.id === id && m.stream_id === stream.id)
  if (!material) return <Navigate to={`/learning/${stream.slug}`} replace />

  const mine = notes
    .filter((n) => n.material_id === material.id)
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
  const chapters = partsOf(parts, material.id)
  /**
   * Части, по которым уже написано, но отметки нет, — начатые.
   *
   * Величина производная, а не третье состояние в данных: лист занятия умеет
   * оставить главу начатой, и это должно быть видно здесь, иначе состояние
   * создаётся и нигде не показывается.
   */
  const started = new Set(mine.map((n) => n.part_id).filter((id): id is string => id !== null))
  const p = materialProgress(material, parts, sessions)
  const left = remainingOf(p)
  const practice = material.kind === 'practice'
  const last = lastTouched(material.id, sessions, notes)
  const mySessions = sessions
    .filter((x) => x.material_id === material.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
  const word = partWord(material.kind)
  const withParts = hasParts(material)
  const done = material.status === 'done'
  /* Всё пройдено подсчётом, но не завершено: сама страница ничего не
     закрывает, только подсвечивает кнопку — решать человеку. */
  const ready = !done && finishedByCount(material, parts, p.done)
  // Через `focusOf`, а не сравнением с указателем: пройденный материал фокусом
  // быть перестаёт, и флажок на странице должен говорить то же, что подложка.
  const isFocus = focusOf(materials, stream.focus_material_id)?.id === material.id
  const host = material.url ? sourceOf(material.url) : null

  // Вкладка глав у статьи и книги по страницам заперта — как рецензия у
  // недочитанной книги: рама страницы одна на все материалы.
  const current: Tab = tab
  const counts: Record<Tab, number> = {
    notes: mine.length,
    sessions: mySessions.length,
  }

  const label = (part: MaterialPart, i: number) =>
    partLabel(part, i, (n) => t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n }))

  /* Листы в порядке оглавления: по главам, а не по написанию. Тем же порядком
     их листают стрелки и лист поверх экрана. */
  const groups = noteOutline(mine, chapters)
  const ordered = groups.flatMap((g) => g.notes)
  // Оглавление из одной строки ничего не оглавляет: листы одной главы — или
  // вовсе без глав — листаются стрелками в шапке листа, как раньше.
  const withToc = groups.length > 1

  /** Открытый лист. Пока ни один не выбран — последний написанный. */
  const found = ordered.findIndex((n) => n.id === openNote)
  const latest = mine[mine.length - 1]?.id
  const at = found >= 0 ? found : ordered.findIndex((n) => n.id === latest)
  const shown = ordered[at] ?? null

  /* Какой это лист своей главы. Говорится только там, где листов к главе
     несколько, — это исключение, и о нём надо знать, листая. */
  const group = groups.find((g) => g.notes.some((n) => n.id === shown?.id))
  const inGroup =
    withToc && group && group.notes.length > 1 && shown ? (
      <span className="small faint mono note-of">
        {t(word === 'lecture' ? 'note.inLecture' : 'note.inChapter', {
          n: group.notes.indexOf(shown) + 1,
          total: group.notes.length,
        })}
      </span>
    ) : null

  /** Сделать материал фокусом потока значит сесть за него: статус ставится
      первым же шагом. Порядок обязателен — `updateMaterial` сам снимает
      фокус у материала, покидающего `active`, и если поставить фокус раньше,
      этот же вызов немедленно стёр бы указатель, который мы только что задали. */
  const toggleFocus = async () => {
    if (isFocus) {
      void updateStream(stream.id, { focus_material_id: null })
      return
    }
    await updateMaterial(material.id, { status: 'active' })
    void updateStream(stream.id, { focus_material_id: material.id })
  }

  /** Завершить или вернуть в работу. Фокус с завершённого снимает само
      хранилище — `updateMaterial` при уходе из `active`. Возврат снимает и
      «Прочитано» с занятий статьи и ролика: иначе лист занятия спорил бы со
      статусом, показывая галочку у незавершённого. */
  const toggleDone = async () => {
    if (!done) {
      void updateMaterial(material.id, { status: 'done' })
      return
    }
    await updateMaterial(material.id, { status: 'active' })
    for (const x of mySessions) if (x.completed) void updateSession(x.id, { completed: false })
  }

  const remove = async () => {
    if (!confirm(t(practice ? 'practice.confirmDelete' : 'material.confirmDelete'))) return
    await deleteMaterial(material.id)
    navigate(`/learning/${stream.slug}/materials?view=backlog`)
  }


  const dash = <span className="faint">{t('book.unknown')}</span>

  /** Накопленное практикой словами — с нуля, раз её взяли в работу. */
  const zero = p.unit === 'time' ? t('count.times', { n: 0 }) : fmtMinutes(0, locale)
  const practiceText = progressText(p) ?? zero
  const tally = practice && p.unit === 'time' && p.total !== null && p.total <= TALLY_MAX
  const leftText =
    left === null
      ? dash
      : p.unit === 'page'
        ? t('count.pages', { n: left })
        : p.unit === 'minute'
          ? fmtMinutes(left, locale)
          : p.unit === 'time'
            ? t('count.times', { n: left })
            : t(word === 'lecture' ? 'count.lectures' : 'count.chapters', { n: left })

  /** Что стоит в ячейке «Пройдено»: у статьи и ролика отметка, у остальных
      число. Книга без заданного числа страниц не молчит — страницу, на
      которой стоишь, знаешь и без него. */
  const doneCell =
    p.unit === 'flag'
      ? done
        ? t(material.kind === 'video' ? 'material.watched' : 'material.read')
        : null
      : (progressText(p) ??
        (p.unit === 'page' && p.done > 0 ? t('count.pages', { n: p.done }) : null))

  return (
    <>
      {/* Действия над материалом целиком — в строке крошки, а не у названия:
          у длинного заголовка они переносились на вторую строку и вставали
          между названием и автором. Здесь строка всегда одной высоты. */}
      {/* Вид материала — не здесь, а в строке под названием, вместе со
          статусом: порознь, над названием и под ним, они зажимали его с двух
          сторон. */}
      <Crumbs
        fallback={{ to: `/learning/${stream.slug}`, label: stream.name }}
        actions={
              <div className="head-actions">
                <Tip text={isFocus ? t('material.isFocus') : t('material.makeFocus')}>
                  <Jelly
                    className={`icon-act${isFocus ? ' on' : ''}`}
                    onClick={() => void toggleFocus()}
                    aria-pressed={isFocus}
                    aria-label={isFocus ? t('material.isFocus') : t('material.makeFocus')}
                  >
                    <Icon name="flag" size={17} />
                  </Jelly>
                </Tip>
                {/* «Завершить» — сразу за фокусом: оба про то, где материал
                    в работе, а не про его карточку. В бэклоге кнопки нет —
                    завершить можно только то, за что взялась. */}
                {material.status !== 'backlog' && (
                  <Tip
                    text={
                      done ? t('material.reopen') : ready ? t('material.finishReady') : t('material.finish')
                    }
                  >
                    <Jelly
                      className={`icon-act finish${done ? ' on' : ''}${ready ? ' ready' : ''}`}
                      onClick={() => void toggleDone()}
                      aria-pressed={done}
                      aria-label={done ? t('material.reopen') : t('material.finish')}
                    >
                      <FinishMark on={done} />
                    </Jelly>
                  </Tip>
                )}
                <Tip text={t(practice ? 'practice.edit' : 'material.edit')}>
                  <Jelly
                    className="icon-act"
                    onClick={() => setEditing(true)}
                    aria-label={t(practice ? 'practice.edit' : 'material.edit')}
                  >
                    <Icon name="pen" size={17} />
                  </Jelly>
                </Tip>
                <Tip text={t(practice ? 'practice.delete' : 'material.delete')}>
                  <Jelly
                    className="icon-act danger"
                    onClick={() => void remove()}
                    aria-label={t(practice ? 'practice.delete' : 'material.delete')}
                  >
                    <Icon name="trash" size={17} />
                  </Jelly>
                </Tip>
              </div>
        }
      />

      {/* Обложка после текста и в разметке, и на экране: у материала лежачий
          кадр, и он справа — этим страница материала с первого взгляда
          отличается от страницы книги, где обложка стоячая и слева. */}
      <div className="book-head mat-head">
        <div className="book-info">
          <h1 className="display book-title">{material.title}</h1>

          {/* Статус стоит здесь строкой, а не переключателем ниже: он больше не
              вопрос к человеку, а вывод из сделанного — см. `statusOf`. */}
          {/* Вид, автор и статус — одной подписью, той же, что в шапке листа
              и на карточке. Порознь, над названием и под ним, вид и статус
              зажимали название с двух сторон. */}
          {/* Набрана `label`, как шапка листа конспекта: это одна и та же
              служебная подпись к заголовку, и шрифт у неё один. */}
          <div className="book-author">
            <MetaLine className="label" lead={<Icon name={KIND_ICON[material.kind]} size={15} />}>
              <span key="kind">{t(`kind.${material.kind}`)}</span>
              {material.author && <span key="author">{material.author}</span>}
              <span key="status">{t(`mstatus.${material.status}`)}</span>
            </MetaLine>
          </div>

          {/* Плюс стоит вплотную к полосе: тот же жест, что у фокуса на
              дашборде, и в том же месте относительно своего результата.

              Там, где части есть, полосу заменяет ряд точек. Полоса отвечает
              «примерно сколько», а здесь, на странице самого материала, вопрос
              другой — сколько из скольких и каких именно, — и на него полоса
              ответить не умеет: двадцать лекций и двадцать страниц она рисует
              одинаково. Точка при этом не картинка: по ней ставят отметку, и
              это самый короткий путь к тому, ради чего в список и заходят. */}
          <div className={`prog-row prog-wide${(withParts && chapters.length > 0) || tally ? ' prog-dots' : ''}`}>
            {/* Практика: разы до цели — кружками, время до цели — полосой,
                без цели — просто накопленное словами: мерить его не против
                чего, а пустая полоса врала бы, что работа не начата. */}
            {practice && p.total === null ? (
              <span className="prog-total mono">{practiceText}</span>
            ) : tally && p.total !== null ? (
              <PracticeTally done={Math.min(p.done, p.total)} total={p.total} label={practiceText} />
            ) : withParts && chapters.length > 0 ? (
              <PartDots
                parts={chapters}
                started={started}
                label={label}
                word={word}
                onToggle={(part, state) => void direct.togglePart(material, part, state)}
              />
            ) : (
              <div className="meter big" aria-hidden>
                <span style={{ width: `${barWidth(p.percent) ?? 0}%` }} />
              </div>
            )}
            {/* Страницу ставят плюсом — листом занятия, а не полем у полосы:
                сколько прочитано, и так стоит ниже, в «Пройдено». */}
            <Tip text={t('study.log')}>
              <Jelly
                className="log-dot"
                onClick={() => setLogging('log')}
                aria-label={t('study.log')}
              >
                <Icon name="plus" size={15} />
              </Jelly>
            </Tip>
          </div>

          {/* Всегда четыре ячейки, нули и прочерки включительно: пустая ячейка
              тоже сведение. Те же четыре вопроса, что у книги в чтении. */}
          <dl className="facts">
            <div>
              <dt>{t(practice ? 'practice.factTotal' : 'material.factDone')}</dt>
              <dd className="mono">
                {/* Только накопленное: сколько всего, говорит соседняя
                    «Осталось», а «4 ч 30 мин из 20 ч» в ячейку не влезало. */}
                {practice ? (
                  p.unit === 'time' ? t('count.times', { n: p.done }) : fmtMinutes(p.done, locale)
                ) : (
                  <>
                {/* У материала по частям ячейка открывает лист глав: вписать
                    названия списком, вставкой оглавления. Отдельной вкладки
                    ради одного этого больше нет. */}
                {withParts ? (
                  <button
                    type="button"
                    className="link-btn fact-link"
                    title={t(word === 'lecture' ? 'part.lectures' : 'part.chapters')}
                    onClick={() => setNaming(true)}
                  >
                    {chapters.length > 0 ? (doneCell ?? dash) : t('part.paste')}
                  </button>
                ) : (
                  (doneCell ?? dash)
                )}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>{t('material.factLeft')}</dt>
              <dd className="mono">{leftText}</dd>
            </div>
            <div>
              <dt>{t('material.factNotes')}</dt>
              <dd className="mono">{mine.length}</dd>
            </div>
            <div>
              <dt>{t('material.factLast')}</dt>
              <dd className="mono">{last ? fmtDate(last, locale) : dash}</dd>
            </div>
          </dl>

          {material.url && (
            <p className="small hint-line">
              <a className="link-btn" href={material.url} target="_blank" rel="noopener noreferrer">
                {host ?? t('material.url')} ↗
              </a>
            </p>
          )}
        </div>

        <div className="book-cover-tilt mirror">
          <MaterialCover material={material} size="xl" />
        </div>
      </div>

      <PageTabs
        id="material"
        label={material.title}
        value={current}
        onChange={setTab}
        items={[
          {
            id: 'notes',
            label: t('nav.notes'),
            count: counts.notes,
            add: { label: t('note.add'), onClick: () => setLogging('note') },
          },
          {
            id: 'sessions',
            label: t('material.tabSessions'),
            count: counts.sessions,
            add: { label: t('study.log'), onClick: () => setLogging('log') },
          },
        ]}
      />

      {/* Тело вкладки меняется в кадре. Гасить его — значит проводить всю
          страницу через пустоту: см. тот же разбор в `StreamLayout`. О
          переключении говорит полоска под вкладкой, и этого достаточно.

          И тело одно на все вкладки: меняется только содержимое. Когда у
          каждой вкладки был свой `.tab-body`, на смене старый уходил раньше,
          чем вставал новый, страница на миг становилась короче экрана, и
          браузер прижимал прокрутку к началу — вкладку переключали, стоя на
          ней, а оказывались у названия. Остающийся узел держит высоту. */}
      <div className="tab-body">
        {current === 'notes' && (
          <>
            {shown === null ? (
              <Empty
                size="sm"
                art="writing"
                action={
                  <Jelly className="btn ghost sm" onClick={() => setLogging('note')}>
                    {t('note.add')}
                  </Jelly>
                }
              >
                {t('material.notesEmpty')}
              </Empty>
            ) : (
              <div className={`notes-read${withToc ? ' with-toc' : ''}`}>
                {withToc && !narrow && (
                  <NoteToc
                    groups={groups}
                    current={shown.id}
                    label={label}
                    onPick={(g) => setOpenNote(g.notes[0].id)}
                    layout="material-toc"
                  />
                )}
                <NoteStack
                  at={at}
                  count={ordered.length}
                  onPrev={() => setOpenNote(ordered[at - 1].id)}
                  onNext={() => setOpenNote(ordered[at + 1].id)}
                >
                  <NoteSheet
                    note={shown}
                    stream={stream}
                    /* Шапка листа — две группы по близости. Слева про сам
                       лист: «Поток · дата · ✎». Справа про место в пачке:
                       «1/2 в главе» и листалка у самого края, где она стоит на
                       месте, что бы ни менялось левее. */
                    edit={
                      // Лист ложится поверх материала и сразу на правку.
                      <button
                        type="button"
                        className="label sheet-edit"
                        onClick={() =>
                          navigate(`/learning/${stream.slug}/n/${shown.id}`, {
                            state: {
                              ...noteLinkState(
                                location,
                                ordered.map((n) => n.id),
                              ),
                              edit: true,
                            },
                          })
                        }
                      >
                        {t('note.edit')}
                      </button>
                    }
                    actions={
                      <div className="row-tight sheet-head-actions">
                        {inGroup}
                        <SheetFlip
                          at={at}
                          count={ordered.length}
                          onPrev={() => setOpenNote(ordered[at - 1].id)}
                          onNext={() => setOpenNote(ordered[at + 1].id)}
                          onList={withToc && narrow ? () => setToc(true) : undefined}
                        />
                      </div>
                    }
                  />
                </NoteStack>
              </div>
            )}
          </>
        )}

        {/* Занятия — строками в линейку, как «Сессии» у книги: событие, не вещь,
            и подложки ему не положено. */}
        {current === 'sessions' && (
          <>
            {mySessions.length === 0 ? (
              <Empty
                size="sm"
                art="reading"
                action={
                  <Jelly className="btn ghost sm" onClick={() => setLogging('log')}>
                    {t('study.log')}
                  </Jelly>
                }
              >
                {t('material.sessionsEmpty')}
              </Empty>
            ) : (
              <div className="log">
                {mySessions.map((x) => {
                  const l = line(x, material, parts)
                  const written = mine.filter(
                    (n) => n.session_id === x.id && !isBlankNote(n.body, stream.outline),
                  )
                  return (
                    <LogRow
                      key={x.id}
                      step={l.step}
                      unit={l.unit}
                      detail={l.detail}
                      meter={l.meter}
                      mood={x.rating && <Mood rating={x.rating} />}
                      when={[
                        fmtDate(x.date, locale),
                        timeOf(x.date, x.created_at),
                        x.minutes && l.unit ? fmtMinutes(x.minutes, locale) : null,
                      ]}
                      written={written.length}
                      open={openSession === x.id}
                      onToggle={() => setOpenSession(openSession === x.id ? null : x.id)}
                      onEdit={() => setEditingSession(x)}
                    >
                      <div className="store-grid">
                        {written.map((n) => (
                          <StudyNoteCard
                            key={n.id}
                            note={n}
                            material={material}
                            parts={parts}
                            slug={stream.slug}
                            siblings={written.map((w) => w.id)}
                          />
                        ))}
                      </div>
                    </LogRow>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <MaterialForm
          streamId={material.stream_id}
          material={material}
          onClose={() => setEditing(false)}
          // Форма умеет удалять материал: его страница после этого пуста.
          onDeleted={() => navigate(`/learning/${stream.slug}/materials?view=backlog`)}
        />
      )}

      {naming && (
        <PartNames
          material={material}
          parts={chapters}
          started={started}
          word={word}
          onClose={() => setNaming(false)}
        />
      )}

      {toc && shown && (
        <Sheet title={t('note.toc')} onClose={() => setToc(false)}>
          <NoteToc
            groups={groups}
            current={shown.id}
            label={label}
            onPick={(g) => {
              setOpenNote(g.notes[0].id)
              setToc(false)
            }}
            layout="material-toc-sheet"
          />
        </Sheet>
      )}
      {logging === 'log' && (
        <StudySheet stream={stream} material={material} onClose={() => setLogging(null)} />
      )}
      {logging === 'note' && (
        <NoteAddSheet
          stream={stream}
          material={material}
          onClose={() => setLogging(null)}
          onSaved={(made) => setOpenNote(made.id)}
        />
      )}
      {editingSession && (
        <StudySheet
          stream={stream}
          material={material}
          session={editingSession}
          onClose={() => setEditingSession(null)}
        />
      )}
    </>
  )
}
