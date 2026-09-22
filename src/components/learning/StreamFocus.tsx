import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fmtDate } from '../../lib/format'
import { studying } from '../../lib/learning/buckets'
import { materialProgress } from '../../lib/learning/metrics'
import { lastActivity } from '../../lib/learning/rhythm'
import type { Material, Stream, StudyNote } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { Jelly } from '../ui'
import { MaterialCover } from './MaterialCover'
import { StudySheet } from './StudySheet'

/** Сколько соседей показать корешками; остальные уходят в число. */
const SPINES = 4

/**
 * Нижний ярус подложки: за что сесть прямо сейчас и одно действие к этому.
 *
 * Действие ровно одно, и это «Записать». Кнопка «Продолжить» вела на страницу
 * материала — то есть повторяла ссылку, на которой стоит само название, — и
 * занимала место главного действия, ничего не делая. Главное действие здесь
 * одно: отметить, что занималась, и оставить конспект. Прогресс в этой модели
 * и есть конспекты, поэтому одна кнопка закрывает и то и другое.
 *
 * «Ещё изучаю» — обложками: ряд корешков узнаётся боковым зрением, а список
 * названий приходится читать. Они только открывают материал и ничего не
 * переключают — смена фокуса живёт на странице материала, где её видно и
 * можно отменить.
 */
export function StreamFocus({
  stream,
  materials,
  notes,
}: {
  stream: Stream
  materials: Material[]
  notes: StudyNote[]
}) {
  const { t, locale } = useLocale()
  // Части берутся из контекста, а не пропом: они нужны здесь ровно на одну
  // строку прогресса и не стоят того, чтобы менять сигнатуру для трёх экранов.
  const { parts } = useLearning()
  const [logging, setLogging] = useState(false)

  const focus = stream.focus_material_id
    ? materials.find((m) => m.id === stream.focus_material_id)
    : undefined
  const others = studying(materials, stream.id).filter((m) => m.id !== focus?.id)
  const from = { to: `/learning/${stream.slug}`, label: t('nav.dashboard') }

  if (!focus) {
    return (
      <div className="hero-focus hero-focus-empty">
        <p className="hero-focus-emptytext">{t('stream.focusEmpty')}</p>
        <Link className="btn hero-btn" to={`/learning/${stream.slug}/active`}>
          {t('nav.studying')}
        </Link>
      </div>
    )
  }

  const p = materialProgress(focus, parts)
  // Только собственные записи фокуса: иначе только что выбранный материал
  // показывает чужую последнюю запись и выглядит начатым.
  const last = lastActivity(notes.filter((n) => n.material_id === focus.id).map((n) => n.date))
  const shown = others.slice(0, SPINES)
  const rest = others.length - shown.length

  return (
    <div className="hero-focus">
      <Link
        className="hero-focus-cover"
        to={`/learning/${stream.slug}/m/${focus.id}`}
        state={{ from }}
        aria-hidden
        tabIndex={-1}
      >
        <MaterialCover material={focus} size="lg" />
      </Link>

      <div className="hero-focus-main">
        <h2 className="hero-focus-title">
          <Link to={`/learning/${stream.slug}/m/${focus.id}`} state={{ from }}>
            {focus.title}
          </Link>
        </h2>
        <p className="hero-focus-by">
          {[focus.author, t(`kind.${focus.kind}`)].filter(Boolean).join(' · ')}
        </p>

        {p.percent !== null && (
          <div className="hero-meter" aria-hidden>
            <span style={{ width: `${Math.max(p.percent, 2)}%` }} />
          </div>
        )}
        <p className="hero-focus-meta">
          {[
            p.total ? t('material.progress', { done: p.done, total: p.total }) : null,
            last ? t('stream.lastNote', { date: fmtDate(last, locale) }) : t('stream.neverNoted'),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        <Jelly className="btn hero-btn" onClick={() => setLogging(true)}>
          {t('study.logShort')}
        </Jelly>
      </div>

      {shown.length > 0 && (
        <div className="hero-also">
          <span className="hero-also-label">{t('stream.alsoStudying')}</span>
          <div className="hero-also-row">
            {shown.map((m) => (
              <Link
                key={m.id}
                to={`/learning/${stream.slug}/m/${m.id}`}
                state={{ from }}
                className="hero-also-item"
                title={m.title}
              >
                <MaterialCover material={m} size="sm" />
              </Link>
            ))}
            {rest > 0 && (
              <Link
                to={`/learning/${stream.slug}/active`}
                className="hero-also-more"
                state={{ from }}
              >
                {t('stream.moreStudying', { n: rest })}
              </Link>
            )}
          </div>
        </div>
      )}

      {logging && (
        <StudySheet
          stream={stream}
          material={focus}
          notes={notes}
          onClose={() => setLogging(false)}
        />
      )}
    </div>
  )
}
