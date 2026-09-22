import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { toneOf, type Tone } from '../lib/covers'
import { readCoverTone } from '../lib/coverTone'
import { progressOf } from '../lib/reading'
import { PITCH, STEP, angleOf, arcFor, depthOf, facing, fadeOf, placeOn, spineWidth } from '../lib/reel'
import type { Book, Session } from '../lib/types'
import { useT } from '../state/LocaleContext'
import { BookCover } from './BookCover'

/** Past this the pointer was turning the stand, not aiming at a book. */
const DRAG_SLOP = 6

/** How big the stand is, as a share of the window, and the limits either way. */
const RADIUS = { of: 0.5, least: 340, most: 820 }

/**
 * How many whole turns of the stand the scroller holds.
 *
 * The stand turns without end, but a scroller does not: it has a near edge and
 * a far one. So it holds three turns and the stand is kept in the middle one —
 * when it wanders out, the scroll position is moved a whole turn back. A whole
 * turn looks exactly like where it started, so nothing is seen to happen, and
 * there is always most of a turn of room left before the next one is needed.
 */
const TURNS = 5

/** Snap points, kept as a pool and moved along rather than one per book. */
const STOPS = 41

/**
 * The shelf as a turntable.
 *
 * The books stand in a ring on a round stand, spines outward. Whichever has
 * come round to the front faces you squarely; the ones beside it are angled
 * away, a little at first and then more, until they pass out of sight round the
 * back. Scrolling turns the stand, and the browser's own snapping settles it so
 * a book always ends up facing front. Hovering takes one down: it lifts off the
 * stand, comes forward and turns over in your hand to show its cover.
 *
 * Where each book stands is a plain function of how far the stand has turned,
 * so the motion is even and there is nothing to settle between frames. The row
 * scrolls natively, which gives a trackpad, a touchscreen and the keyboard
 * their usual behaviour for free; a mouse gets grab-and-drag on top.
 */
export function CoverReel({ books, sessions }: { books: Book[]; sessions: Session[] }) {
  const t = useT()
  const view = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const reel = view.current
    const strip = track.current
    if (!reel || !strip) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const items = Array.from(strip.querySelectorAll<HTMLElement>('.reel-item'))
    const stops = Array.from(strip.querySelectorAll<HTMLElement>('.reel-stop'))
    let frame = 0
    let placed = false
    let stopsAt = NaN
    let stopsFor = NaN

    const lay = () => {
      frame = 0
      const span = reel.clientWidth
      if (!span || items.length === 0) return
      const radius = Math.min(Math.max(span * RADIUS.of, RADIUS.least), RADIUS.most)

      // Nothing turns when motion is unwanted, so there is no stand either:
      // the books lie out in a plain row that still scrolls.
      if (still.matches) {
        const slab = items[0].offsetWidth
        const pitch = slab + 24
        strip.style.width = `${items.length * pitch}px`
        for (const stop of stops) stop.style.left = '0px'
        for (let i = 0; i < items.length; i++) {
          items[i].style.visibility = ''
          items[i].style.opacity = '1'
          items[i].style.transform = `translate3d(${i * pitch}px, 0, 0)`
        }
        return
      }

      const turn = items.length * PITCH
      strip.style.width = `${turn * TURNS + span}px`

      if (!placed) {
        placed = true
        reel.scrollLeft = turn
      } else if (reel.scrollLeft < turn * 0.5) {
        reel.scrollLeft += turn
        return
      } else if (reel.scrollLeft > turn * (TURNS - 0.5)) {
        reel.scrollLeft -= turn
        return
      }

      // The stops are a lattice a book apart, not a fixed list, so a pool of
      // them can be walked along as the stand turns instead of standing one
      // beside every book on the shelf.
      const under = Math.round(reel.scrollLeft / PITCH)
      if (under !== stopsAt || span !== stopsFor) {
        stopsAt = under
        stopsFor = span
        for (let k = 0; k < stops.length; k++) {
          stops[k].style.left = `${(under + k - (stops.length >> 1)) * PITCH + span / 2}px`
        }
      }

      const arc = arcFor(items.length)
      const turned = (reel.scrollLeft / PITCH) * STEP

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const angle = angleOf(i, turned, items.length)

        // Books round the back of the stand are not drawn at all: on a long
        // shelf that is most of them, and a hidden book costs nothing.
        if (Math.abs(angle) > arc) {
          item.style.visibility = 'hidden'
          continue
        }
        item.style.visibility = ''

        const { x, z } = placeOn(angle, radius)
        // The track scrolls under the stand, so a place in the window has to be
        // written back into the track's own coordinates.
        item.style.transform =
          `translate3d(${(span / 2 + x + reel.scrollLeft).toFixed(1)}px, 0, ${z.toFixed(1)}px)`
        item.style.setProperty('--turn', angle.toFixed(2))
        item.style.setProperty('--face', facing(angle).toFixed(3))
        item.style.setProperty('--depth', String(depthOf(angle)))
        item.style.opacity = fadeOf(angle, arc).toFixed(3)
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(lay)
    }

    // A vertical wheel over the stand should turn the stand — but only while it
    // still has somewhere to go, so the page is never held hostage.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      const edge = reel.scrollWidth - reel.clientWidth
      if ((e.deltaY < 0 && reel.scrollLeft <= 0) || (e.deltaY > 0 && reel.scrollLeft >= edge - 1)) return
      e.preventDefault()
      reel.scrollLeft += e.deltaY
    }

    let held = 0
    let travelled = 0

    // Snapping has to be off while a hand is on the stand, or every pixel of
    // the drag would be yanked back to the nearest book. Turning it on again on
    // release is what makes the stand settle.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return
      held = e.pointerId
      travelled = 0
      reel.classList.add('dragging')
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!held) return
      travelled += Math.abs(e.movementX)
      if (travelled > DRAG_SLOP) reel.setPointerCapture(held)
      reel.scrollLeft -= e.movementX
    }

    const onPointerUp = () => {
      held = 0
      reel.classList.remove('dragging')
    }

    // A drag that happened to end on a book must not also open it.
    const onClick = (e: MouseEvent) => {
      if (travelled > DRAG_SLOP) {
        e.preventDefault()
        e.stopPropagation()
      }
      travelled = 0
    }

    lay()
    reel.addEventListener('scroll', schedule, { passive: true })
    reel.addEventListener('wheel', onWheel, { passive: false })
    reel.addEventListener('pointerdown', onPointerDown)
    reel.addEventListener('pointermove', onPointerMove)
    reel.addEventListener('pointerup', onPointerUp)
    reel.addEventListener('pointercancel', onPointerUp)
    reel.addEventListener('click', onClick, true)
    still.addEventListener('change', schedule)
    const resize = new ResizeObserver(schedule)
    resize.observe(reel)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      reel.removeEventListener('scroll', schedule)
      reel.removeEventListener('wheel', onWheel)
      reel.removeEventListener('pointerdown', onPointerDown)
      reel.removeEventListener('pointermove', onPointerMove)
      reel.removeEventListener('pointerup', onPointerUp)
      reel.removeEventListener('pointercancel', onPointerUp)
      reel.removeEventListener('click', onClick, true)
      still.removeEventListener('change', schedule)
      resize.disconnect()
    }
  }, [books])

  function step(direction: 1 | -1) {
    view.current?.scrollBy({ left: direction * PITCH, behavior: 'smooth' })
  }

  return (
    <div className="reel-wrap">
      <div className="reel" ref={view}>
        <div className="reel-track" ref={track}>
          {books.map((book) => (
            <ReelBook key={book.id} book={book} sessions={sessions} />
          ))}
          {/* The scroll positions where a book faces front. The browser settles
              the stand on the nearest of them when a gesture ends. */}
          {Array.from({ length: STOPS }, (_, k) => (
            <span key={`stop-${k}`} className="reel-stop" aria-hidden />
          ))}
        </div>
      </div>
      <div className="reel-steps">
        <button type="button" className="reel-step" onClick={() => step(-1)} aria-label={t('reel.back')}>
          <span aria-hidden>‹</span>
        </button>
        <button type="button" className="reel-step" onClick={() => step(1)} aria-label={t('reel.forward')}>
          <span aria-hidden>›</span>
        </button>
      </div>
    </div>
  )
}

/**
 * The cloth a book is bound in: read off its own cover once that has come down
 * the wire, and the drawn colour until then — or for good, if the cover is a
 * picture nobody will let us look at.
 */
function useCloth(book: Book): Tone {
  // Kept with the cover it was read from, so a book whose cover changes falls
  // back to its drawn colour rather than wearing the old one for a frame.
  const [read, setRead] = useState<{ cover: string; tone: Tone | null } | null>(null)

  useEffect(() => {
    const cover = book.cover_url
    if (!cover) return
    let live = true
    readCoverTone(cover).then((tone) => {
      if (live) setRead({ cover, tone })
    })
    return () => {
      live = false
    }
  }, [book.cover_url])

  const worn = read?.cover === book.cover_url ? read.tone : null
  return worn ?? toneOf(book.title)
}

function ReelBook({ book, sessions }: { book: Book; sessions: Session[] }) {
  const { page, percent } = progressOf(book.id, sessions, book.pages)
  const tone = useCloth(book)

  return (
    <Link
      to={`/book/${book.id}`}
      className="reel-item"
      style={
        {
          '--reel-thick': `${spineWidth(book.pages)}px`,
          '--cover-bg': tone.bg,
          '--cover-ink': tone.ink,
        } as CSSProperties
      }
    >
      <div className="reel-slab">
        {/* A book is a solid: the spine faces out, and the two boards run back
            from its edges. Which board you catch depends on which side of the
            stand the book has come round to. */}
        <div className="reel-book">
          <div className="reel-spine">
            <span className="reel-spine-title">{book.title}</span>
            {book.status === 'reading' && (
              <span className="reel-meter" aria-hidden>
                <span style={{ width: `${percent ?? (page > 0 ? 8 : 0)}%` }} />
              </span>
            )}
            {book.is_focus && <span className="focus-dot" aria-hidden />}
          </div>
          <div className="reel-face front">
            <BookCover book={book} size="lg" />
          </div>
          <div className="reel-face back" aria-hidden />
        </div>
      </div>
    </Link>
  )
}
