import { describe, expect, it } from 'vitest'
import { excerptOf, extractHighlights } from './highlights'
import type { StudyNote } from './types'

const note = (over: Partial<StudyNote> = {}): StudyNote => ({
  id: 'n1',
  material_id: 'm1',
  part_id: null,
  part: null,
  title: null,
  body: '',
  tags: [],
  date: '2026-09-21',
  sort: 0,
  created_at: '',
  updated_at: '',
  ...over,
})

describe('extractHighlights', () => {
  it('возвращает пусто, когда выделений нет', () => {
    expect(extractHighlights([note({ body: 'обычный текст' })])).toEqual([])
  })

  it('достаёт выделение вместе со ссылкой на конспект и материал', () => {
    const got = extractHighlights([
      note({ id: 'n7', material_id: 'm3', body: 'до ==главная мысль== после' }),
    ])
    expect(got).toEqual([{ text: 'главная мысль', noteId: 'n7', materialId: 'm3' }])
  })

  it('достаёт несколько выделений из одного конспекта в порядке текста', () => {
    const got = extractHighlights([note({ body: '==первое== и ==второе==' })])
    expect(got.map((h) => h.text)).toEqual(['первое', 'второе'])
  })

  it('пропускает пустое выделение', () => {
    expect(extractHighlights([note({ body: 'а ==== б' })])).toEqual([])
  })

  it('обрезает пробелы по краям выделения', () => {
    expect(extractHighlights([note({ body: '==  с пробелами  ==' })])[0].text).toBe('с пробелами')
  })

  it('не переносит выделение через строку', () => {
    expect(extractHighlights([note({ body: '==начало\nконец==' })])).toEqual([])
  })
})

describe('excerptOf', () => {
  it('берёт первое выделение и помечает его отмеченным', () => {
    const got = excerptOf(note({ body: 'вступление\n\n==главная мысль== и ==вторая==' }))
    expect(got).toEqual({ text: 'главная мысль', marked: true })
  })

  it('берёт выделение, даже если оно стоит в заголовке', () => {
    expect(excerptOf(note({ body: '## ==главное==\n\nтело' }))).toEqual({
      text: 'главное',
      marked: true,
    })
  })

  it('без выделения берёт первую содержательную строку и отмеченной её не зовёт', () => {
    const got = excerptOf(note({ body: '## Main takeaway\n\nДизайнер путает себя с пользователем.' }))
    expect(got).toEqual({ text: 'Дизайнер путает себя с пользователем.', marked: false })
  })

  it('пропускает заголовки любого уровня, пустые строки и горизонтальные линии', () => {
    const got = excerptOf(note({ body: '# Раз\n\n### Два\n\n---\n\nПервая мысль.' }))
    expect(got?.text).toBe('Первая мысль.')
  })

  it('снимает разметку со строки, которую взял', () => {
    const got = excerptOf(note({ body: '- **пункт** с [ссылкой](https://a.b) и `кодом`' }))
    expect(got?.text).toBe('пункт с ссылкой и кодом')
  })

  it('возвращает null, когда кроме контура в конспекте ничего нет', () => {
    expect(excerptOf(note({ body: '## Main takeaway\n\n## My correction\n' }))).toBeNull()
  })

  it('возвращает null у пустого конспекта', () => {
    expect(excerptOf(note({ body: '   \n\n  ' }))).toBeNull()
  })
})
