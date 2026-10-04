import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fmtDate } from '../../lib/format'
import { focusOf, sourceOrder, studying } from '../../lib/learning/buckets'
import { barWidth, materialProgress } from '../../lib/learning/metrics'
import { lastTouched } from '../../lib/learning/sessions'
import type { Material, Stream, StudyNote } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { Jelly, Tip } from '../ui'
import { MaterialCover } from './MaterialCover'
import { useProgressText } from './Progress'

/** Сколько соседей показать корешками; остальные уходят в число. */
const SPINES = 4

/** Сколько материалов предложить на выбор, когда фокуса нет. Дальше — число. */
const PICKS = 4

/**
 * Обложка фокуса и обложка в выборе — один предмет: выбранная уезжает с места
 * в ряду на место фокуса, а не исчезает, чтобы появиться в другом углу.
 * Это и есть ответ на нажатие — другого подтверждения у выбора нет.
 */
const coverId = (id: string) => `focus-cover-${id}`
const COVER_MOVE = { type: 'spring', duration: 0.45, bounce: 0.15 } as const

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
  onAdd,
}: {
  stream: Stream
  materials: Material[]
  notes: StudyNote[]
  onLog: () => void
  /** Завести материал. Нужен, когда сажать в фокус пока нечего. */
  onAdd: () => void
}) {
  const { t, locale } = useLocale()
  // Части берутся из контекста, а не пропом: они нужны здесь ровно на одну
  // строку прогресса и не стоят того, чтобы менять сигнатуру для трёх экранов.
  const { parts, sessions, updateMaterial, updateStream } = useLearning()
  const progressText = useProgressText()

  const focus = focusOf(materials, stream.focus_material_id)
  const others = studying(materials, stream.id).filter((m) => m.id !== focus?.id)
  const from = { to: `/learning/${stream.slug}`, label: t('nav.dashboard') }

  // Кандидаты в фокус — всё, что не пройдено, от горячего к остывшему: то, за
  // что уже садилась, стоит раньше того, что ждёт в бэклоге.
  const open = focus ? [] : sourceOrder(materials, stream.id, null).filter((m) => m.status !== 'done')
  const hasAny = materials.some((m) => m.stream_id === stream.id)

  /** Тот же порядок, что у переключателя на странице материала: сначала
      статус, потом указатель — иначе правка статуса стёрла бы только что
      поставленный фокус. */
  const pick = async (m: Material) => {
    if (m.status !== 'active') await updateMaterial(m.id, { status: 'active' })
    await updateStream(stream.id, { focus_material_id: m.id })
  }

  // Выбирать из одного — не выбор, а лишний клик. Единственный материал
  // садится в фокус сам, в том числе только что заведённый первым. Запоминаем,
  // кого уже посадили: иначе ответ стора, пришедший позже следующей
  // отрисовки, вызвал бы вторую запись того же самого.
  const sole = open.length === 1 ? open[0] : null
  const seated = useRef<string | null>(null)
  useEffect(() => {
    if (!sole || seated.current === sole.id) return
    seated.current = sole.id
    void pick(sole)
    // `pick` пересоздаётся на каждой отрисовке и поводом для записи не является.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sole?.id])

  if (!focus) {
    // Один кандидат уже садится в фокус — показывать его в ряду «выбери»
    // на один кадр значило бы мигнуть выбором, которого нет.
    if (sole) return <div className="hero-focus hero-focus-empty" aria-busy />

    if (open.length === 0) {
      return (
        <div className="hero-focus hero-focus-empty">
          <p className="hero-focus-emptytext">
            {t(hasAny ? 'stream.focusAllDone' : 'stream.focusNone')}
          </p>
          <Jelly className="btn hero-btn" onClick={onAdd}>
            {t(hasAny ? 'learning.newMaterial' : 'stream.focusFirst')}
          </Jelly>
        </div>
      )
    }

    const choices = open.slice(0, PICKS)
    const more = open.length - choices.length
    return (
      <div className="hero-focus hero-focus-empty">
        <p className="hero-focus-emptytext">{t('stream.focusEmpty')}</p>
        <div className="hero-pick">
          {choices.map((m) => (
            <button
              key={m.id}
              type="button"
              className="hero-pick-item"
              title={t('material.makeFocus')}
              onClick={() => void pick(m)}
            >
              <motion.span className="hero-pick-cover" layoutId={coverId(m.id)} transition={COVER_MOVE}>
                <MaterialCover material={m} size="md" />
              </motion.span>
              <span className="hero-pick-title">{m.title}</span>
              {/* Прогресс виден и до выбора фокуса: «120 из 300» у того, за
                  что уже садилась, — лучшая подсказка, что выбрать. */}
              <span className="hero-pick-by">
                {[t(`kind.${m.kind}`), progressText(materialProgress(m, parts)) ?? (m.status === 'active' ? t('mview.active') : null)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          ))}
          {more > 0 && (
            <Link className="hero-also-more" to={`/learning/${stream.slug}/materials`} state={{ from }}>
              {t('stream.moreStudying', { n: more })}
            </Link>
          )}
        </div>
      </div>
    )
  }

  const p = materialProgress(focus, parts)
  const width = barWidth(p.percent)
  // Только собственные записи фокуса: иначе только что выбранный материал
  // показывает чужую последнюю запись и выглядит начатым.
  const last = lastTouched(focus.id, sessions, notes)
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
        <motion.span className="hero-focus-art" layoutId={coverId(focus.id)} transition={COVER_MOVE}>
          <MaterialCover material={focus} size="lg" />
        </motion.span>
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
            progressText(p),
            // «Ещё не садилась» рядом с «80 страниц» спорило бы само с собой:
            // прогресс, поставленный до журнала, даты не оставил.
            last
              ? t('stream.lastNote', { date: fmtDate(last, locale) })
              : p.done > 0
                ? null
                : t('stream.neverNoted'),
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
