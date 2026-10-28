import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { fmtDate } from '../../lib/format'
import { canUndo, doneCount, nextSort, reorder } from '../../lib/learning/steps'
import { STICKER_SETS, setOf, stickerSrc, type StickerSet } from '../../lib/learning/stickers'
import type { Stream, StreamStep } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { Sheet } from '../Sheet'
import { Segmented, listItem } from '../ui'
import { Sticker } from './Sticker'
import { usePeel } from './usePeel'

/**
 * Шаги и призы — листом поверх дашборда потока.
 *
 * Два режима одного листа, как у глав: список и правка. В списке главное —
 * задача: пройденные стоят своими стикерами прямо на рейке, текущий раскрыт
 * купоном, который отклеивают, будущие — просто строки, их призы — сюрприз.
 * В правке строки правятся на месте и пишутся на уходе из поля; призы видны
 * только здесь.
 *
 * Поток без шагов открывает лист сразу в правке — как главы без частей
 * открываются на вставке: показывать пустой список нечего.
 */
export function StepsSheet({
  stream,
  steps,
  editFirst,
  intro,
  onClose,
  onComplete,
  onReplay,
}: {
  stream: Stream
  steps: StreamStep[]
  editFirst: boolean
  intro: number
  onClose: () => void
  onComplete: (step: StreamStep) => void
  onReplay: (step: StreamStep) => void
}) {
  const { t } = useLocale()
  const [editing, setEditing] = useState(editFirst || steps.length === 0)
  const done = doneCount(steps)

  const head = (
    <div className="steps-head">
      <h2 className="display sheet-title">{t('steps.open')}</h2>
      <p className="steps-sub">
        {editing
          ? t('steps.editHint')
          : done === steps.length
            ? t('steps.allPassed')
            : t('steps.progress', { done, total: steps.length })}
      </p>
    </div>
  )

  return (
    <Sheet title={t('steps.open')} head={head} onClose={onClose}>
      {editing ? (
        <EditSteps stream={stream} steps={steps} />
      ) : (
        <StepList steps={steps} intro={intro} onComplete={onComplete} onReplay={onReplay} />
      )}
      <div className="parts-foot steps-foot">
        <button type="button" className="link-btn back-link draft-add" onClick={() => setEditing(!editing)}>
          {!editing && <Icon name="pen" size={15} />}
          {editing ? t('steps.done') : t('steps.edit')}
        </button>
      </div>
    </Sheet>
  )
}

/* ---------- список ---------- */

function StepList({
  steps,
  intro,
  onComplete,
  onReplay,
}: {
  steps: StreamStep[]
  intro: number
  onComplete: (step: StreamStep) => void
  onReplay: (step: StreamStep) => void
}) {
  const { t, locale } = useLocale()
  const done = doneCount(steps)
  const last = steps.length - 1
  const current = steps[done] ?? null
  const peel = usePeel({
    onTap: () => void peel.nudge(),
    onPeeled: () => current && onComplete(current),
  })

  // Один раз при открытии уголок сам приподнимается: «его можно взять».
  useEffect(() => {
    const at = setTimeout(() => void peel.nudge(), 900)
    return () => clearTimeout(at)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ol className="sl">
      {steps.map((s, i) => {
        const title = s.title || t('steps.newStep')
        if (i < done) {
          return (
            <li key={s.id} className="sl-row" data-st="done">
              <button
                type="button"
                className="sl-stk"
                aria-label={t('steps.prizeOf', { name: s.prize || title })}
                title={s.prize || undefined}
                onClick={() => onReplay(s)}
              >
                <Sticker image={s.image} size={48} state="done" final={i === last} />
              </button>
              <div className="sl-text">
                <div className="sl-t">
                  {title}
                  {s.done_on && <span className="sl-date">{fmtDate(s.done_on, locale)}</span>}
                </div>
                {s.prize && <div className="sl-prize">{s.prize}</div>}
              </div>
            </li>
          )
        }
        if (i === done) {
          const final = i === last
          return (
            <li key={s.id} className="sl-row" data-st="next">
              <span className="sl-mark">{i + 1}</span>
              <div className="sl-text">
                <div className="sl-t">{title}</div>
                <div className="sl-m">{t('steps.nth', { n: i + 1, total: steps.length })}</div>
                <div key={intro} className={`coupon${final ? ' pearl' : ''}${intro ? ' fresh' : ''}`}>
                  <div className="coupon-art">
                    <button
                      type="button"
                      className="peel"
                      aria-label={t('steps.peelLabel', { name: title })}
                      {...peel.bind}
                    >
                      <Sticker ref={peel.stk} image={s.image} size={112} state="next" final={final} />
                      <span className="peel-hint" aria-hidden>
                        {t('steps.pull')}
                        <svg viewBox="0 0 34 30">
                          <path d="M30 4C30 14 22 24 6 26" />
                          <path d="M12 21l-6 5 7 3" />
                        </svg>
                      </span>
                    </button>
                  </div>
                  <div className="coupon-body">
                    <p className="coupon-title">{final ? t('steps.mainPrize') : t('steps.hereIsPrize')}</p>
                    <p className="coupon-text">{t('steps.couponText')}</p>
                    <button type="button" className="link-btn coupon-alt" onClick={() => void peel.peelOff()}>
                      {t('steps.markPlain')}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          )
        }
        return (
          <li key={s.id} className="sl-row" data-st="later">
            <span className="sl-mark">{i + 1}</span>
            <div className="sl-text">
              <div className="sl-t">{title}</div>
              {i === last && <span className="pbadge">{t('steps.mainPrize')}</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------- правка ---------- */

/**
 * Перенос строки — за ручку, а не за саму строку: в строке поля, и нажатие в
 * них — правка, а не перенос. Строка едет за пальцем, соседи расступаются на
 * её высоту; выше пройденных её не поднять.
 */
interface Drag {
  from: number
  to: number
  dy: number
  h: number
  y0: number
  mids: number[]
}

function EditSteps({ stream, steps }: { stream: Stream; steps: StreamStep[] }) {
  const { t } = useLocale()
  const { addStep, updateStep } = useLearning()
  const reduce = useReducedMotion()
  const list = useRef<HTMLOListElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [draft, setDraft] = useState(steps.length === 0)
  const [fresh, setFresh] = useState<string | null>(null)
  const [picking, setPicking] = useState<string | null>(null)
  const done = doneCount(steps)

  const move = (from: number, to: number) => {
    for (const { id, sort } of reorder(steps, from, to)) void updateStep(id, { sort })
  }

  const grab = (i: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !list.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const rows = [...list.current.querySelectorAll<HTMLElement>(':scope > .se-row')]
    setDrag({
      from: i,
      to: i,
      dy: 0,
      h: rows[i].offsetHeight,
      y0: e.clientY,
      mids: rows.map((r) => r.offsetTop + r.offsetHeight / 2),
    })
  }
  const pull = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return
    const dy = e.clientY - drag.y0
    const c = drag.mids[drag.from] + dy
    const below = drag.mids.filter((m, j) => j !== drag.from && m < c).length
    setDrag({ ...drag, dy, to: Math.max(done, Math.min(steps.length - 1, below)) })
  }
  const drop = () => {
    if (!drag) return
    move(drag.from, drag.to)
    setDrag(null)
  }
  const shift = (j: number) => {
    if (!drag || j === drag.from) return 0
    if (drag.from < drag.to && j > drag.from && j <= drag.to) return -drag.h
    if (drag.to < drag.from && j >= drag.to && j < drag.from) return drag.h
    return 0
  }

  const create = async (title: string) => {
    setDraft(false)
    if (!title.trim()) return
    const made = await addStep({
      stream_id: stream.id,
      title: title.trim(),
      prize: '',
      wish: '',
      image: null,
      sort: nextSort(steps),
    })
    if (made) setFresh(made.id)
  }

  return (
    <>
      <ol ref={list} className="se">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => (
            <motion.li
              key={s.id}
              className={`se-row${drag?.from === i ? ' dragging' : ''}`}
              layout="position"
              {...listItem}
              // Перенос — тем же сдвигом, что и вход строки: строка под пальцем
              // едет без задержки, соседи — пружиной; после броска `layout`
              // довозит всех на новые места.
              animate={{ ...listItem.animate, y: drag?.from === i ? drag.dy : shift(i) }}
              transition={drag?.from === i || reduce ? { duration: 0 } : listItem.transition}
            >
              {i < done ? (
                <span className="se-grip" aria-hidden />
              ) : (
                <button
                  type="button"
                  className="se-grip"
                  aria-label={t('steps.move', { n: i + 1 })}
                  onPointerDown={grab(i)}
                  onPointerMove={pull}
                  onPointerUp={drop}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(e) => {
                    const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null
                    if (to === null) return
                    e.preventDefault()
                    move(i, to)
                  }}
                >
                  <Icon name="move" size={16} />
                </button>
              )}
              <span className="sl-mark" data-done={i < done ? '' : undefined}>
                {i < done ? (
                  <svg className="se-check" viewBox="0 0 24 24" aria-hidden>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <EditRow
                step={s}
                final={i === steps.length - 1}
                focus={s.id === fresh}
                picking={picking === s.id}
                onPick={() => setPicking(picking === s.id ? null : s.id)}
                undo={canUndo(steps, s.id)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
        {draft && (
          <li className="se-row se-draft">
            <span className="se-grip" aria-hidden />
            <span className="sl-mark">{steps.length + 1}</span>
            <input
              className="se-in se-title"
              placeholder={t('steps.titlePh')}
              aria-label={t('steps.titlePh')}
              autoFocus
              onBlur={(e) => void create(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setDraft(false)
                }
              }}
            />
          </li>
        )}
      </ol>
      <button type="button" className="link-btn draft-add se-add" onClick={() => setDraft(true)}>
        <Icon name="plus" size={15} />
        {t('steps.add')}
      </button>
    </>
  )
}

function EditRow({
  step,
  final,
  focus,
  picking,
  onPick,
  undo,
}: {
  step: StreamStep
  final: boolean
  focus: boolean
  picking: boolean
  onPick: () => void
  undo: boolean
}) {
  const { t } = useLocale()
  const { updateStep, deleteStep } = useLearning()
  const [set, setSet] = useState<StickerSet>(setOf(step.image))

  // Поле пишется, когда из него уходишь, — как имя главы. Esc возвращает
  // прежнее: набранное ещё никуда не записано.
  const field = (key: 'title' | 'prize' | 'wish') => ({
    defaultValue: step[key],
    onBlur: (e: { target: HTMLInputElement }) => {
      if (e.target.value.trim() !== step[key]) void updateStep(step.id, { [key]: e.target.value.trim() })
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') e.currentTarget.blur()
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.currentTarget.value = step[key]
        e.currentTarget.blur()
      }
    },
  })

  return (
    <>
      <div className="se-main">
        <input className="se-in se-title" placeholder={t('steps.titlePh')} aria-label={t('steps.titlePh')} {...field('title')} />
        <div className={`se-prize${final ? ' pearl' : ''}`}>
          <button
            type="button"
            className="se-pic"
            aria-label={t('steps.picture')}
            aria-expanded={picking}
            onClick={onPick}
          >
            {step.image ? (
              <Sticker image={step.image} size={52} state="done" final={final} />
            ) : (
              <span className="se-empty">
                <Icon name="plus" size={18} />
              </span>
            )}
          </button>
          <div className="se-fields">
            <input
              className="se-in se-pname"
              placeholder={final ? t('steps.mainPrize') : t('steps.prizePh')}
              aria-label={t('steps.prizePh')}
              autoFocus={focus}
              {...field('prize')}
            />
            <input className="se-in se-wish" placeholder={t('steps.wishPh')} aria-label={t('steps.wishPh')} {...field('wish')} />
          </div>
        </div>
        {final && <p className="se-note">{t('steps.finalNote')}</p>}
        {/* Под купоном, а не рядом с крестиком: в строке ссылка отнимала у
            купона ширину, и билетики в соседних строках выходили разной длины. */}
        {undo && (
          <button type="button" className="link-btn se-undo" onClick={() => void updateStep(step.id, { done_on: null })}>
            {t('steps.undo')}
          </button>
        )}
        {picking && (
          <div className="se-picker">
            <Segmented
              className="sm"
              name={`set-${step.id}`}
              value={set}
              onChange={setSet}
              options={[
                { value: 'heroes', label: t('steps.setHeroes') },
                { value: 'things', label: t('steps.setThings') },
              ]}
            />
            <div className="se-lib">
              {STICKER_SETS[set].map((id, n) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={id === step.image}
                  aria-label={t('steps.pictureN', { n: n + 1 })}
                  onClick={() => {
                    void updateStep(step.id, { image: id })
                    onPick()
                  }}
                >
                  <img src={stickerSrc(id)} alt="" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <span className="se-acts">
        <button
          type="button"
          className="icon-btn parts-remove se-remove"
          aria-label={t('steps.remove')}
          title={t('steps.remove')}
          onClick={() => void deleteStep(step.id)}
        >
          <Icon name="close-md" size={15} />
        </button>
      </span>
    </>
  )
}
