import { describe, expect, it } from 'vitest'
import { slugify, streamSlug } from './slug'

describe('slugify', () => {
  it('переводит латиницу в адрес', () => {
    expect(slugify('Professional Growth')).toBe('professional-growth')
  })

  it('транслитерирует кириллицу', () => {
    expect(slugify('Английский')).toBe('angliyskiy')
  })

  it('схлопывает разделители и обрезает края', () => {
    expect(slugify('  Ещё —— Один!  ')).toBe('esche-odin')
  })

  it('возвращает пустую строку, когда переводить нечего', () => {
    expect(slugify('🎸')).toBe('')
  })
})

describe('streamSlug', () => {
  it('берёт адрес из имени, когда он свободен', () => {
    expect(streamSlug('Driving', [])).toBe('driving')
  })

  it('нумерует столкновения', () => {
    expect(streamSlug('Driving', ['driving'])).toBe('driving-2')
    expect(streamSlug('Driving', ['driving', 'driving-2'])).toBe('driving-3')
  })

  it('даёт порядковый адрес имени без букв и цифр', () => {
    expect(streamSlug('🎸', ['a', 'b'])).toBe('stream-3')
  })

  it('нумерует и запасной адрес, если он уже занят', () => {
    expect(streamSlug('🎸', ['stream-1'])).toBe('stream-2')
  })
})
