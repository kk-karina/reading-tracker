import { describe, expect, test } from 'vitest'
import { ARC, STEP, angleOf, arcFor, depthOf, facing, fadeOf, placeOn, spineWidth } from './reel'

describe('angleOf', () => {
  test('with the stand untouched, the first book is the one facing front', () => {
    expect(angleOf(0, 0, 14)).toBe(0)
    expect(angleOf(1, 0, 14)).toBe(STEP)
  })

  test('turning by one book brings the next one round to the front', () => {
    expect(angleOf(1, STEP, 14)).toBe(0)
    expect(angleOf(0, STEP, 14)).toBe(-STEP)
  })

  test('the ring closes, so the last book stands just left of the first', () => {
    expect(angleOf(13, 0, 14)).toBe(-STEP)
  })

  test('no book is ever placed behind the stand', () => {
    const ring = 14 * STEP
    for (let i = 0; i < 14; i++) {
      for (const turned of [0, 40, 137, -60, 1000]) {
        expect(Math.abs(angleOf(i, turned, 14))).toBeLessThanOrEqual(ring / 2)
      }
    }
  })

  test('every book has its own place, none share one', () => {
    const seen = new Set(Array.from({ length: 14 }, (_, i) => angleOf(i, 57, 14)))
    expect(seen.size).toBe(14)
  })
})

describe('arcFor', () => {
  test('a long shelf is seen as far round as the stand allows', () => {
    expect(arcFor(40)).toBe(ARC)
  })

  test('a short shelf is seen only as far as its own ring reaches', () => {
    expect(arcFor(14)).toBeLessThan(ARC)
    expect(arcFor(14)).toBeGreaterThan(50)
  })

  test('the view always ends before the point where books come round again', () => {
    for (const count of [1, 3, 7, 14, 20, 60]) {
      expect(arcFor(count)).toBeLessThan((count * STEP) / 2 + 0.001)
    }
  })
})

describe('placeOn', () => {
  test('the book at the front stands dead centre, nearest to you', () => {
    expect(placeOn(0, 600)).toEqual({ x: 0, z: 0 })
  })

  test('a book to the right sits to the right, and one to the left mirrors it', () => {
    expect(placeOn(30, 600).x).toBeCloseTo(300)
    expect(placeOn(-30, 600).x).toBeCloseTo(-300)
    expect(placeOn(-30, 600).z).toBeCloseTo(placeOn(30, 600).z)
  })

  test('books to the side are further away, which is what makes them shrink', () => {
    expect(placeOn(40, 600).z).toBeLessThan(placeOn(15, 600).z)
    expect(placeOn(15, 600).z).toBeLessThan(0)
  })

  test('they crowd together towards the edge instead of marching off in a line', () => {
    const near = placeOn(20, 600).x - placeOn(10, 600).x
    const far = placeOn(80, 600).x - placeOn(70, 600).x
    expect(far).toBeLessThan(near)
  })

  test('a quarter turn puts a book out at the full width of the stand', () => {
    expect(placeOn(90, 600).x).toBeCloseTo(600)
  })
})

describe('facing', () => {
  test('the book at the front faces you squarely', () => {
    expect(facing(0)).toBe(1)
  })

  test('falls away to nothing by a quarter turn, either way', () => {
    expect(facing(90)).toBeCloseTo(0)
    expect(facing(-90)).toBeCloseTo(0)
  })

  test('never reads as turned inside out once round the back', () => {
    expect(facing(140)).toBe(0)
  })
})

describe('depthOf', () => {
  test('the front book passes in front of the ones beside it', () => {
    expect(depthOf(0)).toBeGreaterThan(depthOf(30))
    expect(depthOf(30)).toBeGreaterThan(depthOf(70))
  })

  test('stays a whole number, since it is a z-index', () => {
    expect(Number.isInteger(depthOf(23.4))).toBe(true)
  })
})

describe('fadeOf', () => {
  test('books anywhere near the front are at full strength', () => {
    expect(fadeOf(0)).toBe(1)
    expect(fadeOf(ARC * 0.5)).toBe(1)
  })

  test('has faded out entirely by the time it goes round the back', () => {
    expect(fadeOf(ARC)).toBe(0)
    expect(fadeOf(-ARC)).toBe(0)
  })

  test('fades rather than cutting off, so nothing pops', () => {
    const edge = fadeOf(ARC * 0.85)
    expect(edge).toBeGreaterThan(0)
    expect(edge).toBeLessThan(1)
  })
})

describe('spineWidth', () => {
  test('a longer book stands thicker', () => {
    expect(spineWidth(900)).toBeGreaterThan(spineWidth(200))
  })

  test('holds a floor and a ceiling, so no book is a hair or a brick', () => {
    expect(spineWidth(12)).toBe(20)
    expect(spineWidth(100000)).toBe(58)
  })

  test('a book with no page count still stands', () => {
    expect(spineWidth(null)).toBeGreaterThan(0)
    expect(spineWidth(0)).toBeGreaterThan(0)
  })
})
