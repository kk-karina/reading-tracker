import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Crumbs } from '../../components/Crumbs'
import { Meter, useProgressText } from '../../components/learning/Progress'
import { MaterialForm } from '../../components/MaterialForm'
import { Chip, Jelly } from '../../components/ui'
import { fmtDate, todayISO } from '../../lib/format'
import { materialProgress, noteCount } from '../../lib/learning/metrics'
import { hasParts, partLabel, partWord, partsOf } from '../../lib/learning/parts'
import type { MaterialPart } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

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
    addNote,
    addPart,
    updatePart,
    deletePart,
    updateStream,
    updateMaterial,
  } = useLearning()
  const [editing, setEditing] = useState(false)

  if (loading) return null

  // Материал ищется внутри своего потока: id из чужого потока не должен
  // открываться под этим адресом.
  const material = materials.find((m) => m.id === id && m.stream_id === stream.id)
  if (!material) return <Navigate to={`/learning/${stream.slug}`} replace />

  const mine = notes
    .filter((n) => n.material_id === material.id)
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
  const chapters = partsOf(parts, material.id)
  const p = materialProgress(material, parts)
  const word = partWord(material.kind)
  const isFlag = material.kind === 'article' || material.kind === 'video'
  const done = material.status === 'done'

  /** Форма перед листом была бы лишним шагом: конспект заводится сразу
      с контуром потока и открывается.

      Стрелочная, а не объявление: объявление поднимается, и сужение типа
      `material` от проверки выше на него не распространяется. */
  const create = async () => {
    const made = await addNote({
      material_id: material.id,
      part: null,
      title: null,
      body: stream.outline ?? '',
      tags: [],
      date: todayISO(),
      sort: mine.length,
    })
    if (made) navigate(`/learning/${stream.slug}/n/${made.id}`)
  }

  /** Сделать материал фокусом потока значит сесть за него: статус ставится
      первым же шагом. Порядок обязателен — `updateMaterial` сам снимает
      фокус у материала, покидающего `active`, и если поставить фокус раньше,
      этот же вызов немедленно стёр бы указатель, который мы только что задали. */
  const makeFocus = async () => {
    await updateMaterial(material.id, { status: 'active' })
    void updateStream(stream.id, { focus_material_id: material.id })
  }

  /** Тумблер статьи и видео. Снятая отметка возвращает в работу: снять её
      можно только с того, что уже открывали, а это и значит «в работе». */
  const toggleDone = () => void updateMaterial(material.id, { status: done ? 'active' : 'done' })

  const setPage = (value: string) => {
    const n = Number(value.replace(/\D/g, ''))
    const capped = material.pages_total ? Math.min(n, material.pages_total) : n
    void updateMaterial(material.id, { page_current: capped > 0 ? capped : null })
  }

  const addChapter = () =>
    void addPart({ material_id: material.id, title: '', done: false, sort: chapters.length })

  const label = (part: MaterialPart, i: number) =>
    partLabel(part, i, (n) => t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n }))

  return (
    <>
      <Crumbs fallback={{ to: `/learning/${stream.slug}`, label: stream.name }} />

      <div className="page-head">
        <h1 className="display">{material.title}</h1>
      </div>

      <div className="mat-facts">
        <Chip>{t(`kind.${material.kind}`)}</Chip>
        <Chip>{t(`mstatus.${material.status}`)}</Chip>
        {material.author && <span className="small muted">{material.author}</span>}
        {material.url && (
          <a className="link-btn" href={material.url} target="_blank" rel="noopener noreferrer">
            {t('material.url')}
          </a>
        )}
        <button className="link-btn" type="button" onClick={() => setEditing(true)}>
          {t('material.edit')}
        </button>
        {material.id === stream.focus_material_id ? (
          <Chip on>{t('material.isFocus')}</Chip>
        ) : (
          <button className="link-btn" type="button" onClick={() => void makeFocus()}>
            {t('material.makeFocus')}
          </button>
        )}
      </div>

      {/* Прогресс и написанное — две разные величины, и стоят они раздельно.
          Раньше это было одно число, и потому статью нельзя было закрыть. */}
      <div className="mat-progress">
        {isFlag ? (
          <label className="toggle">
            <input type="checkbox" checked={done} onChange={toggleDone} />
            <span>{t(material.kind === 'video' ? 'material.watched' : 'material.read')}</span>
          </label>
        ) : (
          <>
            <Meter percent={p.percent} />
            <span className="small faint mono">{progressText(p)}</span>
          </>
        )}

        {material.kind === 'book' && material.scale === 'pages' && (
          <label className="field mat-page">
            <span className="label">{t('material.page')}</span>
            <input
              className="input"
              inputMode="numeric"
              defaultValue={material.page_current ?? ''}
              onBlur={(e) => setPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
          </label>
        )}

        <span className="small faint">{t('note.count', { n: noteCount(material.id, notes) })}</span>
      </div>

      {hasParts(material) && (
        <>
          <div className="panel-head" style={{ marginTop: 28 }}>
            <span className="label">{t(word === 'lecture' ? 'part.lectures' : 'part.chapters')}</span>
            <button className="link-btn" type="button" onClick={addChapter}>
              {t('part.add')}
            </button>
          </div>

          {chapters.length === 0 ? (
            <div className="empty small">{t('material.partsHint')}</div>
          ) : (
            <ul className="part-list">
              {chapters.map((part, i) => (
                <li key={part.id} className={`part-row${part.done ? ' done' : ''}`}>
                  <label className="part-check">
                    <input
                      type="checkbox"
                      checked={part.done}
                      onChange={() => void updatePart(part.id, { done: !part.done })}
                    />
                    <span className="visually-hidden">{label(part, i)}</span>
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
        </>
      )}

      <div className="panel-head" style={{ marginTop: 28 }}>
        <span className="label">{t('note.count', { n: mine.length })}</span>
        <Jelly className="btn sm" onClick={() => void create()}>
          {t('note.new')}
        </Jelly>
      </div>

      {mine.length === 0 ? (
        <div className="empty small">{t('material.notesEmpty')}</div>
      ) : (
        <ul className="note-stack">
          {mine.map((n) => (
            <li key={n.id}>
              <Link
                to={`/learning/${stream.slug}/n/${n.id}`}
                className="note-row"
                state={{ from: { to: `/learning/${stream.slug}/m/${material.id}`, label: material.title } }}
              >
                <span className="note-row-main">
                  <span className="note-row-title">{n.part ?? n.title ?? t('note.new')}</span>
                  <span className="small faint">
                    {fmtDate(n.date, locale)}
                    {n.tags.length > 0 && ` · ${n.tags.map((g) => t(`tag.${g}`)).join(', ')}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <MaterialForm
          streamId={material.stream_id}
          material={material}
          onClose={() => {
            setEditing(false)
            // Форма умеет удалять материал: если его больше нет, страница пуста.
            if (!materials.some((m) => m.id === material.id)) navigate(`/learning/${stream.slug}/backlog`)
          }}
        />
      )}
    </>
  )
}
