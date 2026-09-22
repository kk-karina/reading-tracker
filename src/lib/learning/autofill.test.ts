import { describe, expect, it } from 'vitest'
import { mergeLinkMeta, metaIsEmpty, type AutofillFields } from './autofill'
import type { LinkMeta } from './cover'

const fields = (over: Partial<AutofillFields> = {}): AutofillFields => ({
  title: '',
  author: '',
  cover: '',
  kind: 'article',
  ...over,
})

const meta = (over: Partial<LinkMeta> = {}): LinkMeta => ({
  title: null,
  author: null,
  cover_url: null,
  kind: null,
  source: null,
  ...over,
})

describe('mergeLinkMeta', () => {
  it('заполняет пустые поля', () => {
    const got = mergeLinkMeta(
      fields(),
      meta({ title: 'Atomic Habits', author: "O'Reilly", cover_url: 'https://c/1.jpg' }),
      false,
    )
    expect(got).toEqual({ title: 'Atomic Habits', author: "O'Reilly", cover: 'https://c/1.jpg' })
  })

  it('не трогает то, что уже введено руками', () => {
    const got = mergeLinkMeta(
      fields({ title: 'Своё название', author: 'Свой автор', cover: 'https://своя/1.jpg' }),
      meta({ title: 'Чужое', author: 'Чужой', cover_url: 'https://чужая/2.jpg' }),
      false,
    )
    expect(got).toEqual({})
  })

  it('считает пустым поле из одних пробелов', () => {
    expect(mergeLinkMeta(fields({ title: '   ' }), meta({ title: 'Найдено' }), false)).toEqual({
      title: 'Найдено',
    })
  })

  it('заполняет по отдельности: пустое берёт, занятое оставляет', () => {
    const got = mergeLinkMeta(
      fields({ title: 'Своё' }),
      meta({ title: 'Чужое', author: 'Нашёлся' }),
      false,
    )
    expect(got).toEqual({ author: 'Нашёлся' })
  })

  it('подставляет вид, пока переключатель не трогали', () => {
    expect(mergeLinkMeta(fields(), meta({ kind: 'video' }), false)).toEqual({ kind: 'video' })
  })

  it('молчит о виде, если переключатель трогали руками', () => {
    expect(mergeLinkMeta(fields({ kind: 'book' }), meta({ kind: 'video' }), true)).toEqual({})
  })

  it('не шлёт вид, совпадающий с текущим', () => {
    expect(mergeLinkMeta(fields({ kind: 'video' }), meta({ kind: 'video' }), false)).toEqual({})
  })

  it('пустой ответ ничего не меняет', () => {
    expect(mergeLinkMeta(fields({ title: 'Своё' }), meta(), false)).toEqual({})
  })
})

describe('metaIsEmpty', () => {
  it('домен и догадка о виде за находку не считаются', () => {
    expect(metaIsEmpty(meta({ source: 'youtube.com', kind: 'video' }))).toBe(true)
  })

  it('одной обложки уже достаточно', () => {
    expect(metaIsEmpty(meta({ cover_url: 'https://c/1.jpg' }))).toBe(false)
  })

  it('одного заголовка уже достаточно', () => {
    expect(metaIsEmpty(meta({ title: 'Нашлось' }))).toBe(false)
  })
})
