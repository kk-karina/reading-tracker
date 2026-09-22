import { describe, expect, test } from 'vitest'
import { toneFromPixels } from './coverTone'

/** Paint a strip of pixels: each entry is [r, g, b] repeated `times`. */
function pixels(...runs: [[number, number, number], number][]): Uint8ClampedArray {
  const out: number[] = []
  for (const [[r, g, b], times] of runs) {
    for (let i = 0; i < times; i++) out.push(r, g, b, 255)
  }
  return new Uint8ClampedArray(out)
}

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

describe('toneFromPixels', () => {
  test('a cover of one colour is bound in that colour', () => {
    const tone = toneFromPixels(pixels([[40, 90, 150], 200]))
    const [r, g, b] = rgb(tone!.bg)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(g)
  })

  test('takes the colour the cover is about, not the average of it', () => {
    // A white jacket with a red title. The average is pink; the answer is red.
    const tone = toneFromPixels(pixels([[255, 255, 255], 400], [[190, 30, 30], 90]))
    const [r, g, b] = rgb(tone!.bg)
    expect(r).toBeGreaterThan(g + 20)
    expect(r).toBeGreaterThan(b + 20)
  })

  test('a saturated colour outweighs a larger flat one', () => {
    const tone = toneFromPixels(pixels([[128, 128, 128], 150], [[20, 150, 60], 100]))
    const [r, g, b] = rgb(tone!.bg)
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
  })

  test('binds every book deep, however bright the jacket', () => {
    const tone = toneFromPixels(pixels([[255, 240, 60], 200]))
    const [r, g, b] = rgb(tone!.bg)
    expect((Math.max(r, g, b) + Math.min(r, g, b)) / 510).toBeLessThan(0.5)
  })

  test('lettering on cloth is always light, since cloth is always deep', () => {
    expect(toneFromPixels(pixels([[255, 240, 60], 200]))!.ink).toBe('#f0eeec')
  })

  test('a blank scan has nothing to say, and says so', () => {
    expect(toneFromPixels(pixels([[255, 255, 255], 100]))).toBeNull()
    expect(toneFromPixels(new Uint8ClampedArray())).toBeNull()
  })

  test('fully transparent pixels are not a colour', () => {
    expect(toneFromPixels(new Uint8ClampedArray([200, 40, 40, 0, 200, 40, 40, 0]))).toBeNull()
  })
})
