import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fmtDate } from '../../lib/format'
import { pickCheer } from '../../lib/learning/steps'
import type { StreamStep } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { Jelly } from '../ui'
import { Sticker } from './Sticker'

const CHEERS = 10
/** Прошлый возглас — на всё приложение: два шага подряд в разных потоках тоже не должны кричать одно. */
let lastCheer = -1

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * Праздник — шаг сделан, вот приз.
 *
 * Сначала то, что сделала, потом награда: возглас, «✓ шаг», и купон, на
 * который шлёпается стикер. Строки «что дальше» здесь нет — следующий шаг
 * входит в кадр на экране, когда окно закрыто.
 *
 * Окно ложится и поверх листа шагов, поэтому клавиши ловит раньше всех (на
 * захвате у `window`): иначе Esc закрыл бы заодно и лист под ним, а Tab
 * увёл бы фокус в его поля.
 *
 * `replay` — показать уже открытый приз ещё раз: без хлопушек и без
 * возгласа, с датой. Здесь же — `onUndo`: стикер, отклеенный из любопытства,
 * обнаруживают как раз тогда, когда открывают его снова.
 */
export function Celebration({
  step,
  final,
  replay,
  onClose,
  onUndo,
}: {
  step: StreamStep
  final: boolean
  replay: boolean
  onClose: () => void
  /** Вернуть шаг в незакрытые. Есть только у последнего закрытого. */
  onUndo?: () => void
}) {
  const { t, locale } = useLocale()
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const art = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [cheer] = useState(() => {
    if (replay) return t('cheer.replay')
    const i = pickCheer(CHEERS, lastCheer, Math.random(), final)
    if (i === null) return t('cheer.final')
    lastCheer = i
    return t(`cheer.${i}` as 'cheer.0')
  })

  // Клавиши читают свежий `onClose`, но не перезапускают эффект: он ставит
  // фокус и запирает прокрутку, и перезапуск на каждом рендере родителя
  // (отметка шага его и вызывает) дёргал бы фокус.
  const close = useEffectEvent(() => onClose())
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
        return
      }
      if (e.key !== 'Tab' || !box.current) return
      e.stopPropagation()
      const stops = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (stops.length <= 1) {
        e.preventDefault()
        stops[0]?.focus()
        return
      }
      const edge = e.shiftKey ? stops[0] : stops[stops.length - 1]
      if (document.activeElement === edge) {
        e.preventDefault()
        ;(e.shiftKey ? stops[stops.length - 1] : stops[0]).focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = scroll
      opener?.focus?.({ preventScroll: true })
    }
  }, [])

  // Штрихи и хлопушки — на ударе стикера о купон, один раз.
  useEffect(() => {
    if (replay || reduce) return
    const at = setTimeout(() => {
      if (art.current) rays(art.current)
      if (canvas.current) cannons(canvas.current)
    }, 250)
    return () => clearTimeout(at)
  }, [replay, reduce])

  const did = replay && step.done_on ? `${step.title} · ${fmtDate(step.done_on, locale)}` : step.title

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="bam-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        <canvas ref={canvas} className="bam-confetti" aria-hidden />
        <motion.div
          ref={box}
          className="bam"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bam-title"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px) scale(0.96)' }}
          animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bam-seq">
            <h2 id="bam-title" className="bam-title">
              {cheer}
            </h2>
            <p className="bam-did">
              <Icon name="circle-check" size={17} />
              {did}
            </p>
            <div className={`coupon vertical${final ? ' pearl' : ''}${replay || reduce ? '' : ' thump'}`}>
              <div className="coupon-art" ref={art}>
                <Sticker image={step.image} size={150} state="done" final={final} className={replay || reduce ? '' : 'slap'} />
              </div>
              <div className="coupon-body">
                <p className="bam-prize">{step.prize || t('steps.mainPrize')}</p>
                {step.wish && <p className="bam-wish">{step.wish}</p>}
              </div>
            </div>
            <div className="bam-actions">
              <Jelly className="btn" data-autofocus onClick={onClose}>
                {t('cheer.ok')}
              </Jelly>
              {onUndo && (
                <button type="button" className="link-btn bam-undo" onClick={onUndo}>
                  {t('cheer.oops')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

/** Чернильные штрихи от края стикера — как лучи у героев на картинках. */
function rays(host: HTMLElement) {
  const n = 12
  for (let i = 0; i < n; i++) {
    const r = document.createElement('span')
    r.className = 'bam-ray'
    host.appendChild(r)
    const a = (360 / n) * i + (i % 2 ? 8 : -4)
    r.animate(
      [
        { transform: `rotate(${a}deg) translateY(-76px) scaleY(0.2)`, opacity: 0 },
        { transform: `rotate(${a}deg) translateY(-96px) scaleY(${i % 2 ? 0.7 : 1})`, opacity: 1, offset: 0.35 },
        { transform: `rotate(${a}deg) translateY(-112px) scaleY(0.4)`, opacity: 0 },
      ],
      { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
    ).finished.then(() => r.remove(), () => r.remove())
  }
}

/**
 * Две хлопушки из нижних углов экрана: конфетти летит вверх и к середине,
 * тормозит и падает, переворачиваясь. На холсте, а не элементами: сто сорок
 * узлов с анимацией каждый — это работа раскладке, а не праздник.
 */
function cannons(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const W = window.innerWidth
  const H = window.innerHeight
  c.width = W * dpr
  c.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  // Лимон и маркеры палитры — те же, что у выделений в конспектах.
  const css = getComputedStyle(document.documentElement)
  const colors = ['--brand', '--brand-2', '--mark-pink', '--mark-sky', '--mark-mint', '--brand'].map(
    (v) => css.getPropertyValue(v).trim() || '#e9f86b',
  )
  colors.push('#ffffff')
  const ps = [-1, 1].flatMap((side) =>
    Array.from({ length: 70 }, () => {
      const ang = ((-90 - side * (14 + Math.random() * 22)) * Math.PI) / 180
      const sp = H * 0.022 + Math.random() * H * 0.014
      return {
        x: side < 0 ? W * 0.06 : W * 0.94,
        y: H + 10,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 8,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3,
        ph: Math.random() * 6.28,
        vp: 0.08 + Math.random() * 0.12,
        col: colors[Math.floor(Math.random() * colors.length)],
        round: Math.random() < 0.22,
      }
    }),
  )
  let last = performance.now()
  const t0 = last
  const tick = (now: number) => {
    if (!c.isConnected) return
    const dt = Math.min(2, (now - last) / 16.67)
    last = now
    ctx.clearRect(0, 0, W, H)
    let alive = 0
    for (const p of ps) {
      p.vy += 0.34 * dt
      p.vx *= Math.pow(0.985, dt)
      p.vy *= Math.pow(0.99, dt)
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      p.ph += p.vp * dt
      if (p.y < H + 40) alive++
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.scale(1, Math.cos(p.ph))
      ctx.fillStyle = p.col
      if (p.round) {
        ctx.beginPath()
        ctx.arc(0, 0, p.w / 2, 0, 6.28)
        ctx.fill()
      } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (alive && now - t0 < 4000) requestAnimationFrame(tick)
    else ctx.clearRect(0, 0, W, H)
  }
  requestAnimationFrame(tick)
}
