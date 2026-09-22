import { describe, expect, it } from 'vitest'
import { COVER_H, COVER_W, coverCrop, dataUrlBytes } from './imageCover'

/** Только арифметика: canvas и createImageBitmap в jsdom не живут. */
describe('coverCrop', () => {
  const ratio = COVER_W / COVER_H

  it('картинку ровно в пропорции берёт целиком', () => {
    expect(coverCrop(800, 1066)).toEqual({ sx: 0, sy: 0, sw: 800, sh: 1066 })
  })

  it('широкую режет по бокам, по центру', () => {
    const got = coverCrop(1600, 900)
    expect(got.sh).toBe(900)
    expect(got.sy).toBe(0)
    expect(got.sw).toBeCloseTo(900 * ratio, 6)
    expect(got.sx).toBeCloseTo((1600 - 900 * ratio) / 2, 6)
  })

  it('высокую режет сверху и снизу, по центру', () => {
    const got = coverCrop(600, 1600)
    expect(got.sw).toBe(600)
    expect(got.sx).toBe(0)
    expect(got.sh).toBeCloseTo(600 / ratio, 6)
    expect(got.sy).toBeCloseTo((1600 - 600 / ratio) / 2, 6)
  })

  it('что бы ни пришло, вырезанное имеет пропорции кадра', () => {
    for (const [w, h] of [
      [1600, 900],
      [600, 1600],
      [1000, 1000],
      [3000, 4000],
      [120, 90],
    ]) {
      const { sw, sh } = coverCrop(w, h)
      expect(sw / sh).toBeCloseTo(ratio, 6)
    }
  })

  it('вырезанное никогда не больше исходника', () => {
    for (const [w, h] of [
      [1600, 900],
      [600, 1600],
      [1000, 1000],
    ]) {
      const { sx, sy, sw, sh } = coverCrop(w, h)
      expect(sx).toBeGreaterThanOrEqual(0)
      expect(sy).toBeGreaterThanOrEqual(0)
      expect(sx + sw).toBeLessThanOrEqual(w + 1e-9)
      expect(sy + sh).toBeLessThanOrEqual(h + 1e-9)
    }
  })
})

describe('dataUrlBytes', () => {
  it('считает вес без заголовка адреса', () => {
    // "AAAA" — четыре символа base64, ровно три байта.
    expect(dataUrlBytes('data:image/jpeg;base64,AAAA')).toBe(3)
  })

  it('учитывает добивку', () => {
    expect(dataUrlBytes('data:image/jpeg;base64,AAA=')).toBe(2)
    expect(dataUrlBytes('data:image/jpeg;base64,AA==')).toBe(1)
  })

  it('на пустом не уходит в минус', () => {
    expect(dataUrlBytes('data:image/jpeg;base64,')).toBe(0)
  })
})
