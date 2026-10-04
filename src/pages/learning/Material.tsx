import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Crumbs } from '../../components/Crumbs'
import { Icon } from '../../components/Icon'
import { MaterialCover } from '../../components/learning/MaterialCover'
import { NoteSheet } from '../../components/learning/NoteSheet'
import { SheetFlip } from '../../components/learning/SheetFlip'
import { PartDots } from '../../components/learning/PartDots'
import { PartNames } from '../../components/learning/PartNames'
import { useProgressText } from '../../components/learning/Progress'
import { NoteAddSheet } from '../../components/learning/NoteAddSheet'
import { noteLinkState } from '../../components/learning/noteLink'
import { StudySheet } from '../../components/learning/StudySheet'
import { StudyNoteCard } from '../../components/learning/StudyNoteCard'
import { useStudyLine } from '../../components/learning/studyStep'
import { LogRow } from '../../components/log/LogRow'
import { MaterialForm } from '../../components/MaterialForm'
import { Empty, inkSlide, Jelly, Tip } from '../../components/ui'
import { fmtDate, fmtMinutes } from '../../lib/format'
import { focusOf } from '../../lib/learning/buckets'
import { sourceOf } from '../../lib/compose/linkMeta'
import { barWidth, materialProgress, remainingOf } from '../../lib/learning/metrics'
import { lastTouched } from '../../lib/learning/sessions'
import { face } from '../../lib/rating'
import { isBlankNote, noteHeading } from '../../lib/learning/notes'
import { timeOf } from '../../lib/log'
import { hasParts, partLabel, partWord, partsOf } from '../../lib/learning/parts'
import type { MaterialPart, StudySession } from '../../lib/learning/types'
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
    updatePart,
    deleteMaterial,
    updateStream,
    updateMaterial,
  } = useLearning()
  const [editing, setEditing] = useState(false)
  /* Лист один, а дверей к нему две, и зовутся они по-разному: плюс у полосы
     прогресса записывает занятие, кнопка над листами добавляет конспект.
     Состояние помнит, какая открыла, — лист представляется её словами. */
  const [logging, setLogging] = useState<'log' | 'note' | null>(null)
  const [editingSession, setEditingSession] = useState<StudySession | null>(null)
  const line = useStudyLine()
  const [openSession, setOpenSession] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('notes')
  /* Лист имён списком — вторая дверь к переименованию, для тех случаев, когда
     частей тридцать и наводить на каждую мышь не работа, а отказ от неё. */
  const [naming, setNaming] = useState(false)
  /* Открытый лист помнится по id, а не по номеру: номера сдвигаются, когда
     лист удаляют или дописывают новый, и запомненный номер показал бы соседа. */
  const [openNote, setOpenNote] = useState<string | null>(null)

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
  const p = materialProgress(material, parts)
  const left = remainingOf(p)
  const last = lastTouched(material.id, sessions, notes)
  const mySessions = sessions
    .filter((x) => x.material_id === material.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
  const word = partWord(material.kind)
  const withParts = hasParts(material)
  const done = material.status === 'done'
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

  /** Открытый лист. Пока ни один не выбран — последний написанный. */
  const found = mine.findIndex((n) => n.id === openNote)
  const at = found >= 0 ? found : mine.length - 1
  const shown = mine[at] ?? null

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

  const remove = async () => {
    if (!confirm(t('material.confirmDelete'))) return
    await deleteMaterial(material.id)
    navigate(`/learning/${stream.slug}/materials?view=backlog`)
  }

  const setPage = (value: string) => {
    const n = Number(value.replace(/\D/g, ''))
    const capped = material.pages_total ? Math.min(n, material.pages_total) : n
    void updateMaterial(material.id, { page_current: capped > 0 ? capped : null })
  }

  const dash = <span className="faint">{t('book.unknown')}</span>

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
                <Tip text={t('material.edit')}>
                  <Jelly
                    className="icon-act"
                    onClick={() => setEditing(true)}
                    aria-label={t('material.edit')}
                  >
                    <Icon name="pen" size={17} />
                  </Jelly>
                </Tip>
                <Tip text={t('material.delete')}>
                  <Jelly
                    className="icon-act danger"
                    onClick={() => void remove()}
                    aria-label={t('material.delete')}
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
      <div className="book-head">
        <div className="book-info">
          <h1 className="display book-title">{material.title}</h1>

          {/* Статус стоит здесь строкой, а не переключателем ниже: он больше не
              вопрос к человеку, а вывод из сделанного — см. `statusOf`. */}
          <p className="muted book-author">
            {[material.author, t(`kind.${material.kind}`), t(`mstatus.${material.status}`)]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {/* Плюс стоит вплотную к полосе: тот же жест, что у фокуса на
              дашборде, и в том же месте относительно своего результата.

              Там, где части есть, полосу заменяет ряд точек. Полоса отвечает
              «примерно сколько», а здесь, на странице самого материала, вопрос
              другой — сколько из скольких и каких именно, — и на него полоса
              ответить не умеет: двадцать лекций и двадцать страниц она рисует
              одинаково. Точка при этом не картинка: по ней ставят отметку, и
              это самый короткий путь к тому, ради чего в список и заходят. */}
          <div className={`prog-row${withParts && chapters.length > 0 ? ' prog-dots' : ''}`}>
            {withParts && chapters.length > 0 ? (
              <PartDots
                parts={chapters}
                started={started}
                label={label}
                word={word}
                onToggle={(part) => void updatePart(part.id, { done: !part.done })}
              />
            ) : (
              <div className="meter big" aria-hidden>
                <span style={{ width: `${barWidth(p.percent) ?? 0}%` }} />
              </div>
            )}
            {/* Номер страницы стоит у самой полосы, а не отдельной строкой
                контролов под шапкой: он и есть эта полоса, выраженная числом,
                и меняется он чаще всего на странице. */}
            {material.kind === 'book' && material.scale === 'pages' && (
              <input
                className="input mat-page-input"
                inputMode="numeric"
                aria-label={t('material.page')}
                title={t('material.page')}
                defaultValue={material.page_current ?? ''}
                onBlur={(e) => setPage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
              />
            )}
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
              <dt>{t('material.factDone')}</dt>
              <dd className="mono">
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
              </dd>
            </div>
            <div>
              <dt>{t('material.factLeft')}</dt>
              <dd className="mono">
                {left === null
                  ? dash
                  : p.unit === 'page'
                    ? t('count.pages', { n: left })
                    : t(word === 'lecture' ? 'count.lectures' : 'count.chapters', { n: left })}
              </dd>
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

      <div className="tabs" role="tablist" aria-label={material.title}>
        {TABS.map((key) => {
          const on = current === key
          const name = key === 'notes' ? t('nav.notes') : t('material.tabSessions')
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              className={`tab${on ? ' on' : ''}`}
              onClick={() => setTab(key)}
            >
              {/* Имя несёт своё имя ещё и атрибутом: по нему `.tab-label`
                  держит ширину жирного начертания всегда — см. `index.css`. */}
              <span className="tab-label" data-label={name}>
                {name}
              </span>
              {counts[key] > 0 && <span className="tab-n">{counts[key]}</span>}
              {on && (
                <motion.span
                  layoutId="material-tab"
                  className="tab-line"
                  transition={inkSlide}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Тело вкладки меняется в кадре. Гасить его — значит проводить всю
          страницу через пустоту: см. тот же разбор в `StreamLayout`. О
          переключении говорит полоска под вкладкой, и этого достаточно. */}
      {current === 'notes' && (
        <div className="tab-body">
          {/* Навигация по листам тем же рядом чипов, каким в чтении отбирают
              мысли по тегу: один жест, выученный на соседнем экране. Пока
              листов нет, навигации нет тоже — а с ней и полосы: ряд чипов
              пуст, и кнопка в ней осталась бы висеть над пустотой одна. */}
          {shown !== null && (
            <div className="panel-head">
              <div className="chips">
                {mine.map((n, i) => {
                  // Пустой лист не выдаёт себя за конспект: тихий чип с
                  // пометкой — открыть, дописать или удалить.
                  const blank = isBlankNote(n.body, stream.outline)
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`chip${i === at ? ' on' : ''}${blank ? ' blank' : ''}`}
                      aria-pressed={i === at}
                      onClick={() => setOpenNote(n.id)}
                    >
                      {noteHeading(n, parts, label) ?? fmtDate(n.date, locale)}
                      {blank && <span className="chip-note">{t('note.blankChip')}</span>}
                    </button>
                  )
                })}
              </div>
              <Jelly className="btn sm" onClick={() => setLogging('note')}>
                {t('note.add')}
              </Jelly>
            </div>
          )}

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
            <NoteSheet
              note={shown}
              stream={stream}
              lead={
                <SheetFlip
                  at={at}
                  count={mine.length}
                  onPrev={() => setOpenNote(mine[at - 1].id)}
                  onNext={() => setOpenNote(mine[at + 1].id)}
                />
              }
              actions={
                <div className="row-tight">
                  <Link
                    className="link-btn"
                    to={`/learning/${stream.slug}/n/${shown.id}`}
                    // Лист ложится поверх материала и сразу на правку — ссылка
                    // так и называется.
                    state={{
                      ...noteLinkState(
                        location,
                        mine.map((n) => n.id),
                      ),
                      edit: true,
                    }}
                  >
                    {t('note.edit')}
                  </Link>
                </div>
              }
            />
          )}
        </div>
      )}

      {/* Занятия — строками в линейку, как «Сессии» у книги: событие, не вещь,
          и подложки ему не положено. */}
      {current === 'sessions' && (
        <div className="tab-body">
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
                    when={[
                      fmtDate(x.date, locale),
                      timeOf(x.date, x.created_at),
                      x.minutes && l.unit ? fmtMinutes(x.minutes, locale) : null,
                      face(x.rating),
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
        </div>
      )}

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
