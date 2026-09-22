import type { Tone } from './covers'

/**
 * The colour of a book's cloth, read off its cover.
 *
 * A spine painted an unrelated colour gives the shelf away as a drawing. Real
 * binding takes its colour from the book, so this reads the cover image and
 * finds the colour the cover is actually *about* — which is not its average.
 * Averaging a cover gives mud: a white jacket with a red title averages to pink.
 * What is wanted is the colour a person would name if asked, so the pixels are
 * sorted into coarse bins and the heaviest bin wins, with saturated colours
 * weighing more than flat ones and the paper and the print left out entirely.
 */

/** Lighter than this is paper, darker is print. Neither is the book's colour. */
const PAPER = 0.93
const PRINT = 0.07

/** A saturated colour speaks for a cover more than a grey one of the same size. */
const VOICE = 2.2

/** Bins are 16 levels per channel: fine enough to tell colours apart, coarse
    enough that a gradient counts as one colour rather than a thousand. */
const BIN = 4

/** Book cloth is deep. A spine the colour of a bright jacket looks like plastic. */
const CLOTH = { light: [0.2, 0.44], sat: [0.08, 0.5] }

const clamp = (n: number, low: number, high: number) => (n < low ? low : n > high ? high : n)

interface Bin {
  r: number
  g: number
  b: number
  weight: number
}

/**
 * The cloth colour of a cover, from its pixels as RGBA, or null when the image
 * has nothing to say — an all-white scan, or a canvas we were not allowed to
 * read.
 */
export function toneFromPixels(data: Uint8ClampedArray): Tone | null {
  const bins = new Map<number, Bin>()
  let best: Bin | null = null

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (data[i + 3] < 200) continue

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const light = (max + min) / 510
    if (light > PAPER || light < PRINT) continue

    const sat = max === 0 ? 0 : (max - min) / max
    const weight = 1 + VOICE * sat
    const key = ((r >> BIN) << 10) | ((g >> BIN) << 5) | (b >> BIN)

    let bin = bins.get(key)
    if (!bin) {
      bin = { r: 0, g: 0, b: 0, weight: 0 }
      bins.set(key, bin)
    }
    bin.r += r * weight
    bin.g += g * weight
    bin.b += b * weight
    bin.weight += weight
    if (!best || bin.weight > best.weight) best = bin
  }

  if (!best) return null
  return cloth(best.r / best.weight, best.g / best.weight, best.b / best.weight)
}

/** Take a colour and bind a book in it. */
function cloth(r: number, g: number, b: number): Tone {
  const [h, s, l] = toHsl(r / 255, g / 255, b / 255)
  const bg = toHex(h, clamp(s, CLOTH.sat[0], CLOTH.sat[1]), clamp(l, CLOTH.light[0], CLOTH.light[1]))
  // Cloth is always deep, so the lettering on it is always light.
  return { bg, ink: '#f0eeec' }
}

function toHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6
  return [h, s, l]
}

function toHex(h: number, s: number, l: number): string {
  const c = (n: number) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${c(0)}${c(8)}${c(4)}`
}

/** How small the cover is redrawn before it is read: enough to judge, cheap to scan. */
const SAMPLE = { w: 24, h: 36 }

const known = new Map<string, Tone | null>()
const pending = new Map<string, Promise<Tone | null>>()

/**
 * Read a cover's cloth colour, once per cover per session.
 *
 * The image is fetched a second time, with permission to read its pixels, which
 * the browser will not grant to the one already on the page. Covers that refuse
 * that permission, or fail to load at all, answer null and keep the drawn
 * colour they already had.
 */
export function readCoverTone(url: string): Promise<Tone | null> {
  const cached = known.get(url)
  if (cached !== undefined) return Promise.resolve(cached)

  const already = pending.get(url)
  if (already) return already

  const job = new Promise<Tone | null>((done) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = SAMPLE.w
      canvas.height = SAMPLE.h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return done(null)
      try {
        ctx.drawImage(img, 0, 0, SAMPLE.w, SAMPLE.h)
        done(toneFromPixels(ctx.getImageData(0, 0, SAMPLE.w, SAMPLE.h).data))
      } catch {
        // The cover came from somewhere that will not let us look at it.
        done(null)
      }
    }
    img.onerror = () => done(null)
    img.src = url
  }).then((tone) => {
    known.set(url, tone)
    pending.delete(url)
    return tone
  })

  pending.set(url, job)
  return job
}
