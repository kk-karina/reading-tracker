/**
 * The shelf as a turntable.
 *
 * The books stand in a ring on a round stand, spines outward, and the stand
 * turns. Whichever book has come round to the front faces you squarely, spine
 * on; the ones to its left are angled to the right and the ones to its right
 * angled to the left, further and further until they pass out of sight round
 * the back. Scrolling turns the stand.
 *
 * Every book's place is a plain function of how far the stand has turned, which
 * is what keeps the motion even: there is no layout to settle, no widths
 * feeding back into angles, nothing to disagree with itself between frames.
 *
 * Only the arithmetic lives here. The component writes these numbers into CSS
 * custom properties on every frame, which is cheaper than re-rendering React
 * while a finger is still on the trackpad.
 */

/**
 * Degrees of the stand between one book and the next.
 *
 * Small on purpose. A book is deep — a whole cover's worth — so a few degrees
 * already swing a wide board into view; turn them much further and the shelf
 * stops reading as books standing spine-out and starts reading as boards lying
 * at an angle.
 */
export const STEP = 9

/** Past this a book has gone round the back, and is not drawn at all. */
export const ARC = 78

/**
 * How far round the stand you can actually see, for a shelf of this many books.
 *
 * The ring is only as big as the books on it — fourteen books at nine degrees
 * apart make a ring of a hundred and twenty-six, not a full circle. A book
 * leaving one side comes back on the other at the halfway point, so the view
 * has to end just before that, or you would watch books jump across the gap.
 */
export function arcFor(count: number): number {
  return Math.min(ARC, ((Math.max(count, 1) * STEP) / 2) * 0.96)
}

/** Pixels of scrolling that bring the next book round to the front. */
export const PITCH = 116

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)
const rad = (deg: number) => (deg * Math.PI) / 180

/**
 * Where a book stands around the ring, given how far the stand has turned.
 *
 * The ring closes: a book that has gone off one side comes back on the other,
 * which is what keeps the window full however far you turn. It also means the
 * shelf has no ragged end — turn far enough and the books you started with come
 * round again, the way they would on a real stand.
 */
export function angleOf(index: number, turned: number, count: number): number {
  const ring = Math.max(count, 1) * STEP
  const here = (((index * STEP - turned) % ring) + ring) % ring
  return here > ring / 2 ? here - ring : here
}

/**
 * Where a book stands, relative to the front of the stand.
 *
 * `angle` is its place around the ring in degrees — 0 at the front, negative to
 * the left — and `radius` how big the stand is. Books to the sides are not only
 * further across but further away, which is what makes them shrink and crowd
 * together towards the edges instead of marching off in a straight line.
 */
export function placeOn(angle: number, radius: number): { x: number; z: number } {
  return {
    x: radius * Math.sin(rad(angle)),
    z: radius * (Math.cos(rad(angle)) - 1),
  }
}

/** How squarely a book faces you: 1 at the front, falling away to the sides. */
export function facing(angle: number): number {
  return clamp01(Math.cos(rad(angle)))
}

/** Stacking order, so the books at the front pass in front of the rest. */
export function depthOf(angle: number): number {
  return Math.round(facing(angle) * 100)
}

/** Books dim as they go round the back rather than vanishing at a hard edge. */
export function fadeOf(angle: number, arc = ARC): number {
  const from = arc * 0.7
  if (Math.abs(angle) <= from) return 1
  return clamp01((arc - Math.abs(angle)) / (arc - from))
}

/**
 * How thick a book stands, in pixels.
 *
 * Taken from the page count, because a shelf where every book is the same width
 * is a row of tabs, not a shelf. Books with no page count get a middling spine
 * rather than a missing one.
 */
export function spineWidth(pages: number | null): number {
  if (!pages || pages <= 0) return 30
  return Math.round(Math.min(Math.max(pages / 9, 20), 58))
}
