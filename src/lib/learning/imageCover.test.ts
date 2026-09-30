import { describe, expect, it } from 'vitest'
import { coverCrop, coverFrame, dataUrlBytes } from './imageCover'
import type { MaterialKind } from './types'

/** Только арифметика: canvas и createImageBitmap в jsdom не живут. */
describe('coverFrame', () => {
  it('книга стоит, всё остальное лежит', () => {
    const book = coverFrame('book')
    expect(book.w / book.h).toBeCloseTo(3 / 4, 3)
    for (const kind of ['article', 'course', 'video'] as MaterialKind[]) {
      const frame = coverFrame(kind)
      expect(frame.w / frame.h).toBeCloseTo(16 / 9, 3)
    }
  })

  /* Площадь, а не ширина: тогда у книги и у статьи одинаковая разрешающая
     способность при одинаковом весе. Точного 16:9 в целых пикселях рядом с
     книжной площадью нет, поэтому сходятся с точностью округления. */
  it('кадры равной площади: вес в кадре у книги и у статьи одинаковый', () => {
    const book = coverFrame('book')
    const wide = coverFrame('article')
    expect((wide.w * wide.h) / (book.w * book.h)).toBeCloseTo(1, 1)
  })
})

describe('coverCrop', () => {
  const ratio = (kind: MaterialKind) => coverFrame(kind).w / coverFrame(kind).h

  it('картинку ровно в пропорции берёт целиком', () => {
    expect(coverCrop(800, 1066, 'book')).toEqual({ sx: 0, sy: 0, sw: 800, sh: 1066 })
    expect(coverCrop(1600, 900, 'article')).toEqual({ sx: 0, sy: 0, sw: 1600, sh: 900 })
  })

  it('широкую для книги режет по бокам, по центру', () => {
    const got = coverCrop(1600, 900, 'book')
    expect(got.sh).toBe(900)
    expect(got.sy).toBe(0)
    expect(got.sw).toBeCloseTo(900 * ratio('book'), 6)
    expect(got.sx).toBeCloseTo((1600 - 900 * ratio('book')) / 2, 6)
  })

  it('высокую режет сверху и снизу, по центру', () => {
    const got = coverCrop(600, 1600, 'book')
    expect(got.sw).toBe(600)
    expect(got.sx).toBe(0)
    expect(got.sh).toBeCloseTo(600 / ratio('book'), 6)
    expect(got.sy).toBeCloseTo((1600 - 600 / ratio('book')) / 2, 6)
  })

  /* Тот случай, ради которого кадр стал зависеть от вида: баннер Open Graph
     1200×630 есть почти у каждой статьи, и в книжном кадре от него оставалась
     центральная треть — по ней материал не узнать. */
  it('баннер 1200×630 в кадре статьи теряет только кромку, в книжном — две трети', () => {
    const wide = coverCrop(1200, 630, 'article')
    expect(wide.sw / 1200).toBeGreaterThan(0.9)

    const tall = coverCrop(1200, 630, 'book')
    expect(tall.sw / 1200).toBeLessThan(0.45)
  })

  it('что бы ни пришло, вырезанное имеет пропорции своего кадра', () => {
    for (const kind of ['book', 'article', 'course', 'video'] as MaterialKind[]) {
      for (const [w, h] of [
        [1600, 900],
        [600, 1600],
        [1000, 1000],
        [3000, 4000],
        [120, 90],
      ]) {
        const { sw, sh } = coverCrop(w, h, kind)
        expect(sw / sh).toBeCloseTo(ratio(kind), 6)
      }
    }
  })

  it('вырезанное никогда не больше исходника', () => {
    for (const kind of ['book', 'article'] as MaterialKind[]) {
      for (const [w, h] of [
        [1600, 900],
        [600, 1600],
        [1000, 1000],
      ]) {
        const { sx, sy, sw, sh } = coverCrop(w, h, kind)
        expect(sx).toBeGreaterThanOrEqual(0)
        expect(sy).toBeGreaterThanOrEqual(0)
        expect(sx + sw).toBeLessThanOrEqual(w + 1e-9)
        expect(sy + sh).toBeLessThanOrEqual(h + 1e-9)
      }
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
