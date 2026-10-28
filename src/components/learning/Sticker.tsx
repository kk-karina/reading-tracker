import type { CSSProperties, Ref } from 'react'
import { stickerSrc } from '../../lib/learning/stickers'

export type StickerState = 'later' | 'next' | 'done'

/**
 * Стикер приза — одна анатомия на все места: таймлайн, лист, правка, праздник.
 *
 * Белая вырубка постоянной толщины есть всегда — это край самой наклейки.
 * Внутри вырубки либо картинка, либо рубашка. Отгибается только рубашка и
 * только внутри вырубки: когда края рисовали то картинка, то рубашка, у
 * стикера в одном месте была обводка, а в другом её не было.
 *
 * Отгиб держит CSS (`--k`, см. `.stk` в learning.css); жест, который его
 * двигает, — `usePeel`. Ссылка нужна жесту: он пишет `--k` прямо в элемент,
 * чтобы край шёл за пальцем без рендера на каждый кадр.
 */
export function Sticker({
  image,
  size,
  state,
  final = false,
  className,
  ref,
}: {
  image: string | null
  size: number
  state: StickerState
  /** Главный приз: перламутровая вырубка и рубашка. */
  final?: boolean
  className?: string
  ref?: Ref<HTMLSpanElement>
}) {
  return (
    <span
      ref={ref}
      className={`stk${final ? ' final' : ''}${className ? ` ${className}` : ''}`}
      data-state={state}
      style={{ '--s': `${size}px` } as CSSProperties}
      aria-hidden
    >
      <span className="stk-prize">
        <img src={stickerSrc(image)} alt="" draggable={false} />
      </span>
      {state !== 'done' && (
        <span className="stk-lid">
          <span className="stk-cover">
            <Gift final={final} />
          </span>
          <span className="stk-flapw">
            <span className="stk-flap" />
          </span>
        </span>
      )}
    </span>
  )
}

/*
 * Подарок на рубашке нарисован рукой, теми же чернилами, что у героев на
 * картинках: ни одна линия не прямая по линейке, концы круглые. У главного —
 * короткие искры вокруг, как лучи у героев.
 */
const BOX = 'M10.6 23.2C10.9 28.6 10.7 34.2 11.3 39.5C19.2 40.1 29.1 39.9 37.3 39.3C37.8 33.6 37.5 28.1 37.1 23.0'
const LID =
  'M8.5 17.2C17.1 16.5 30.1 16.4 39.7 16.9C40.0 18.9 39.9 20.9 39.6 22.9C29.9 23.4 17.6 23.5 8.7 23.0C8.4 21.1 8.3 19.1 8.5 17.2Z'
const RIBBON = 'M23.7 17.3C24.0 24.3 24.3 32.0 24.1 39.6'
const BOW =
  'M23.8 16.9C21.2 14.0 16.3 10.5 14.7 12.7C13.4 14.7 17.7 16.6 23.8 16.9M24.0 16.9C26.8 13.6 31.7 10.2 33.5 12.6C34.7 14.6 30.3 16.6 24.0 16.9'
const SPARKS = 'M5.2 9.8l3.0 2.6M43.0 9.0l-2.8 2.9M24.4 2.6v3.2M3.6 30.4h3.1M44.6 30.0h-3.0'

function Gift({ final }: { final: boolean }) {
  return (
    <svg className="stk-gift" viewBox="0 0 48 48" aria-hidden>
      <path d={BOX} />
      <path d={LID} />
      <path d={RIBBON} />
      <path d={BOW} />
      {final && <path d={SPARKS} />}
    </svg>
  )
}
