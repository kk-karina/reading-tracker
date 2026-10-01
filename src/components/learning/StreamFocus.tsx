import { Link } from 'react-router-dom'
import { fmtDate } from '../../lib/format'
import { focusOf, studying } from '../../lib/learning/buckets'
import { barWidth, materialProgress } from '../../lib/learning/metrics'
import { lastActivity } from '../../lib/learning/rhythm'
import type { Material, Stream, StudyNote } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { Jelly, Tip } from '../ui'
import { MaterialCover } from './MaterialCover'

/** Сколько соседей показать корешками; остальные уходят в число. */
const SPINES = 4

/**
 * Нижний ярус подложки: за что сесть прямо сейчас.
 *
 * Громкого действия здесь нет. Кнопка «Продолжить» вела на страницу материала —
 * то есть повторяла ссылку, на которой стоит само название, — а кнопка занятия
 * уехала наверх, к цели: записывают не карточку, а день, и повод для этого
 * написан там. Осталась точка с плюсом у самого прогресса: тот же лист, но
 * вызванный оттуда, где на прогресс смотрят. Громкости у неё нет и не должно
 * быть — иначе на экране два одинаково главных действия вместо одного.
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
  onLog,
}: {
  stream: Stream
  materials: Material[]
  notes: StudyNote[]
  onLog: () => void
}) {
  const { t, locale } = useLocale()
  // Части берутся из контекста, а не пропом: они нужны здесь ровно на одну
  // строку прогресса и не стоят того, чтобы менять сигнатуру для трёх экранов.
  const { parts } = useLearning()

  const focus = focusOf(materials, stream.focus_material_id)
  const others = studying(materials, stream.id).filter((m) => m.id !== focus?.id)
  const from = { to: `/learning/${stream.slug}`, label: t('nav.dashboard') }

  if (!focus) {
    return (
      <div className="hero-focus hero-focus-empty">
        <p className="hero-focus-emptytext">{t('stream.focusEmpty')}</p>
        <Link className="btn hero-btn" to={`/learning/${stream.slug}/materials?view=active`}>
          {t('nav.materials')}
        </Link>
      </div>
    )
  }

  const p = materialProgress(focus, parts)
  const width = barWidth(p.percent)
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
      </div>

      {/* Прогресс отдельной колонкой, а не четвёртой строкой под автором.
          Это разные вопросы — «что это» и «сколько пройдено», — и места по
          горизонтали хватает, чтобы задать их рядом, а не столбиком. */}
      <div className="hero-focus-prog">
        <div className="prog-row">
          {width !== null && (
            <div className="hero-meter" aria-hidden>
              <span style={{ width: `${width}%` }} />
            </div>
          )}
          {/* Плюс стоит вплотную к полосе: прибавить занятие — это сдвинуть
              именно её, и жест должен быть в том же месте, что и результат. */}
          <Tip text={t('study.log')}>
            <Jelly
              className="log-dot"
              onClick={onLog}
              aria-label={t('study.log')}
            >
              <Icon name="plus" size={15} />
            </Jelly>
          </Tip>
        </div>
        <p className="hero-focus-meta">
          {[
            p.total ? t('material.progress', { done: p.done, total: p.total }) : null,
            last ? t('stream.lastNote', { date: fmtDate(last, locale) }) : t('stream.neverNoted'),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
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
                to={`/learning/${stream.slug}/materials?view=active`}
                className="hero-also-more"
                state={{ from }}
              >
                {t('stream.moreStudying', { n: rest })}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
