import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Crumbs } from '../../components/Crumbs'
import { Icon } from '../../components/Icon'
import { MaterialCover } from '../../components/learning/MaterialCover'
import { NoteSheet } from '../../components/learning/NoteSheet'
import { useProgressText } from '../../components/learning/Progress'
import { StudySheet } from '../../components/learning/StudySheet'
import { MaterialForm } from '../../components/MaterialForm'
import { Jelly, Segmented } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { sourceOf } from '../../lib/learning/cover'
import { barWidth, lastNoteDate, materialProgress, remainingOf } from '../../lib/learning/metrics'
import { noteHeading } from '../../lib/learning/notes'
import { hasParts, partLabel, partWord, partsOf } from '../../lib/learning/parts'
import type { MaterialPart, MaterialStatus } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

const STATUSES: MaterialStatus[] = ['backlog', 'active', 'done', 'dropped']

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
  const isFocus = material.id === stream.focus_material_id
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

  const addChapter = () =>
    void addPart({ material_id: material.id, title: '', done: false, sort: chapters.length })

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
      <Crumbs fallback={{ to: `/learning/${stream.slug}`, label: stream.name }} />

      {/* Обложка после текста и в разметке, и на экране: у материала лежачий
          кадр, и он справа — этим страница материала с первого взгляда
          отличается от страницы книги, где обложка стоячая и слева. */}
      <div className="book-head">
        <div className="book-info">
          <h1 className="display book-title">{material.title}</h1>
          {material.author && <p className="muted book-author">{material.author}</p>}

          {/* Плюс стоит вплотную к полосе: тот же жест, что у фокуса на
              дашборде, и в том же месте относительно своего результата. */}
          <div className="prog-row">
            <div className="meter big" aria-hidden>
              <span style={{ width: `${barWidth(p.percent) ?? 0}%` }} />
            </div>
            <Jelly
              className="log-dot"
              onClick={() => setLogging('log')}
              title={t('study.log')}
              aria-label={t('study.log')}
            >
              <Icon name="plus" size={15} />
            </Jelly>
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

      {/* Два ряда: чем материал сейчас является, и что с ним можно сделать. */}
      <div className="control-rows">
        <div className="control-row">
          <span className="label">{t('material.status')}</span>
          <Segmented
            name={t('material.status')}
            value={material.status}
            options={STATUSES.map((s) => ({ value: s, label: t(`mstatus.${s}`) }))}
            onChange={(status) => void updateMaterial(material.id, { status })}
          />
        </div>

        {material.kind === 'book' && material.scale === 'pages' && (
          <div className="control-row">
            <span className="label">{t('material.page')}</span>
            <input
              className="input mat-page-input"
              inputMode="numeric"
              aria-label={t('material.page')}
              defaultValue={material.page_current ?? ''}
              onBlur={(e) => setPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
          </div>
        )}

        <div className="control-row">
          <span className="label">{t('book.actions')}</span>
          <div className="row-tight">
            <button
              className={`btn ghost sm${isFocus ? ' on' : ''}`}
              onClick={() => void toggleFocus()}
            >
              {isFocus ? t('material.isFocus') : t('material.makeFocus')}
            </button>
            <button className="btn ghost sm" onClick={() => setEditing(true)}>
              {t('material.edit')}
            </button>
            <button className="btn ghost sm" onClick={() => void remove()}>
              {t('material.delete')}
            </button>
          </div>
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
            <button className="link-btn" type="button" onClick={addChapter}>
              {t('part.add')}
            </button>
          </div>

          {chapters.length === 0 ? (
            <div className="empty small">{t('material.partsHint')}</div>
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
                      зовётся своим номером и перенумеровывается сама. */}
                  <input
                    className="part-name"
                    defaultValue={part.title}
                    placeholder={label(part, i)}
                    aria-label={t('part.rename')}
                    onBlur={(e) => {
                      if (e.target.value !== part.title) {
                        void updatePart(part.id, { title: e.target.value })
                      }
                    }}
                  />
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
