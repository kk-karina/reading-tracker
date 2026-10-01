import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Crumbs } from '../../components/Crumbs'
import { Icon } from '../../components/Icon'
import { MaterialCover } from '../../components/learning/MaterialCover'
import { NoteSheet } from '../../components/learning/NoteSheet'
import { PartDots } from '../../components/learning/PartDots'
import { PartNames } from '../../components/learning/PartNames'
import { useProgressText } from '../../components/learning/Progress'
import { StudySheet } from '../../components/learning/StudySheet'
import { MaterialForm } from '../../components/MaterialForm'
import { Jelly, Tip } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { focusOf } from '../../lib/learning/buckets'
import { sourceOf } from '../../lib/learning/cover'
import { barWidth, lastNoteDate, materialProgress, remainingOf } from '../../lib/learning/metrics'
import { noteHeading } from '../../lib/learning/notes'
import { hasParts, partLabel, partWord, partsOf } from '../../lib/learning/parts'
import type { MaterialPart } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

/* Те же две вкладки, что у книги в чтении: что написано и по чему пройдено.
   Написанное идёт первым — страницы и лекции средство, конспект результат. */
const TABS = ['notes', 'parts'] as const
type Tab = (typeof TABS)[number]

export function Material() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useLocale()
  const stream = useStream()
  const progressText = useProgressText()
  const {
    materials,
    parts,
    notes,
    loading,
    addPart,
    updatePart,
    deletePart,
    deleteMaterial,
    updateStream,
    updateMaterial,
  } = useLearning()
  const [editing, setEditing] = useState(false)
  /* Лист один, а дверей к нему две, и зовутся они по-разному: плюс у полосы
     прогресса записывает занятие, кнопка над листами добавляет конспект.
     Состояние помнит, какая открыла, — лист представляется её словами. */
  const [logging, setLogging] = useState<'log' | 'note' | null>(null)
  const [tab, setTab] = useState<Tab>('notes')
  /* Лист имён списком — вторая дверь к переименованию, для тех случаев, когда
     частей тридцать и наводить на каждую мышь не работа, а отказ от неё. */
  const [naming, setNaming] = useState(false)
  /* Только что заведённая часть: её поле имени получает курсор само. Иначе
     «Добавить» даёт ещё одну «Лекцию 12», и то, что её можно назвать, не
     сказано ничем — а это ровно то, чего от списка и ждут. */
  const [fresh, setFresh] = useState<string | null>(null)
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
  const last = lastNoteDate(material.id, notes)
  const word = partWord(material.kind)
  const withParts = hasParts(material)
  const done = material.status === 'done'
  // Через `focusOf`, а не сравнением с указателем: пройденный материал фокусом
  // быть перестаёт, и флажок на странице должен говорить то же, что подложка.
  const isFocus = focusOf(materials, stream.focus_material_id)?.id === material.id
  const host = material.url ? sourceOf(material.url) : null

  // Вкладка глав у статьи и книги по страницам заперта — как рецензия у
  // недочитанной книги: рама страницы одна на все материалы.
  const current: Tab = tab === 'parts' && !withParts ? 'notes' : tab
  const counts: Record<Tab, number> = { notes: mine.length, parts: chapters.length }

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

  const addChapter = async () => {
    const made = await addPart({
      material_id: material.id,
      title: '',
      done: false,
      sort: chapters.length,
    })
    if (made) setFresh(made.id)
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
              <dd className="mono">{doneCell ?? dash}</dd>
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
          const locked = key === 'parts' && !withParts
          const on = current === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={locked}
              title={locked ? t('material.partsLocked') : undefined}
              className={`tab${on ? ' on' : ''}`}
              onClick={() => setTab(key)}
            >
              {key === 'notes'
                ? t('nav.notes')
                : t(word === 'lecture' ? 'part.lectures' : 'part.chapters')}
              {counts[key] > 0 && <span className="tab-n">{counts[key]}</span>}
              {on && (
                <motion.span
                  layoutId="material-tab"
                  className="tab-line"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {current === 'notes' && (
        <div className="tab-body">
          {/* Навигация по листам тем же рядом чипов, каким в чтении отбирают
              мысли по тегу: один жест, выученный на соседнем экране. */}
          <div className="panel-head">
            <div className="chips">
              {mine.map((n, i) => (
                <button
                  key={n.id}
                  type="button"
                  className={`chip${i === at ? ' on' : ''}`}
                  aria-pressed={i === at}
                  onClick={() => setOpenNote(n.id)}
                >
                  {noteHeading(n, parts, label) ?? fmtDate(n.date, locale)}
                </button>
              ))}
            </div>
            <Jelly className="btn sm" onClick={() => setLogging('note')}>
              {t('note.add')}
            </Jelly>
          </div>

          {shown === null ? (
            <div className="empty small">{t('material.notesEmpty')}</div>
          ) : (
            <NoteSheet
              note={shown}
              stream={stream}
              actions={
                <div className="row-tight sheet-flip">
                  <button
                    type="button"
                    className="link-btn"
                    disabled={at === 0}
                    aria-label={t('note.prev')}
                    onClick={() => setOpenNote(mine[at - 1].id)}
                  >
                    ‹
                  </button>
                  <span className="small faint mono">
                    {at + 1}/{mine.length}
                  </span>
                  <button
                    type="button"
                    className="link-btn"
                    disabled={at === mine.length - 1}
                    aria-label={t('note.next')}
                    onClick={() => setOpenNote(mine[at + 1].id)}
                  >
                    ›
                  </button>
                  <Link
                    className="link-btn"
                    to={`/learning/${stream.slug}/n/${shown.id}`}
                    state={{
                      from: {
                        to: `/learning/${stream.slug}/m/${material.id}`,
                        label: material.title,
                      },
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

      {current === 'parts' && (
        <div className="tab-body">
          <div className="panel-head">
            <span className="label">
              {t(word === 'lecture' ? 'part.lectures' : 'part.chapters')}
            </span>
            <div className="row-tight">
              <button className="link-btn" type="button" onClick={() => setNaming(true)}>
                {t('part.names')}
              </button>
              <button className="link-btn" type="button" onClick={() => void addChapter()}>
                {t('part.add')}
              </button>
            </div>
          </div>

          {chapters.length === 0 ? (
            <div className="empty small">{t('material.partsEmpty')}</div>
          ) : (
            <ul className="part-list">
              {chapters.map((part, i) => (
                <li
                  key={part.id}
                  className={`part-row${part.done ? ' done' : ''}${
                    !part.done && started.has(part.id) ? ' started' : ''
                  }`}
                >
                  <label className="part-check">
                    <input
                      type="checkbox"
                      checked={part.done}
                      onChange={() => void updatePart(part.id, { done: !part.done })}
                    />
                    <span className="visually-hidden">
                      {label(part, i)}
                      {!part.done && started.has(part.id) ? ` — ${t('part.started')}` : ''}
                    </span>
                  </label>
                  {/* Имя правится на месте. Пустое остаётся пустым — тогда часть
                      зовётся своим номером и перенумеровывается сама.

                      Поле выглядит полем: до сих пор оно было неотличимо от
                      строки текста, пока на него не наведёшь, и «Лекцию 12»
                      принимали за имя, выданное навсегда. Теперь номер написан
                      в полную силу — он имя, а не подсказка, — а перо под
                      курсором говорит, что его правят.

                      Enter — то же, что уход из поля; Esc возвращает прежнее
                      имя, потому что набранное сюда ещё никуда не записано. */}
                  <span className="part-edit">
                    <input
                      className="part-name"
                      defaultValue={part.title}
                      placeholder={label(part, i)}
                      aria-label={t('part.rename')}
                      autoFocus={part.id === fresh}
                      onBlur={(e) => {
                        if (e.target.value !== part.title) {
                          void updatePart(part.id, { title: e.target.value })
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') {
                          e.currentTarget.value = part.title
                          e.currentTarget.blur()
                        }
                      }}
                    />
                    <Icon className="part-pen" name="pen" size={14} aria-hidden />
                  </span>
                  <button
                    className="link-btn"
                    type="button"
                    onClick={() => void deletePart(part.id)}
                  >
                    {t('part.remove')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <MaterialForm
          streamId={material.stream_id}
          material={material}
          onClose={() => {
            setEditing(false)
            // Форма умеет удалять материал: если его больше нет, страница пуста.
            if (!materials.some((m) => m.id === material.id))
              navigate(`/learning/${stream.slug}/materials?view=backlog`)
          }}
        />
      )}

      {naming && (
        <PartNames
          material={material}
          parts={chapters}
          word={word}
          onClose={() => setNaming(false)}
        />
      )}

      {logging && (
        <StudySheet
          stream={stream}
          material={material}
          notes={notes}
          title={t(logging === 'log' ? 'study.log' : 'note.add')}
          onClose={() => setLogging(null)}
          onSaved={(made) => setOpenNote(made.id)}
        />
      )}
    </>
  )
}
