import { describe, expect, it } from 'vitest'
import { continueList, listEdits, listOf } from './lists'

describe('listOf', () => {
  it('узнаёт оба вида и длину знака', () => {
    expect(listOf('- пункт')).toEqual({ kind: 'ul', n: 0, len: 2 })
    expect(listOf('12. пункт')).toEqual({ kind: 'ol', n: 12, len: 4 })
  })

  it('без пробела после знака — не список', () => {
    expect(listOf('-пункт')).toBeNull()
    expect(listOf('1.5 литра')).toBeNull()
  })
})

describe('listEdits', () => {
  it('ставит точки голым строкам', () => {
    expect(listEdits(['раз', 'два'], 'ul')).toEqual([
      { cut: 0, put: '- ' },
      { cut: 0, put: '- ' },
    ])
  })

  it('нумерует по порядку и продолжает счёт сверху', () => {
    expect(listEdits(['раз', 'два'], 'ol', 3)).toEqual([
      { cut: 0, put: '3. ' },
      { cut: 0, put: '4. ' },
    ])
  })

  it('снимает список, если он уже у всех', () => {
    expect(listEdits(['- раз', '- два'], 'ul')).toEqual([
      { cut: 2, put: '' },
      { cut: 2, put: '' },
    ])
  })

  it('меняет один вид на другой, а не снимает', () => {
    expect(listEdits(['- раз', '- два'], 'ol')).toEqual([
      { cut: 2, put: '1. ' },
      { cut: 2, put: '2. ' },
    ])
  })

  it('смешанное выделение доводит до списка', () => {
    expect(listEdits(['- раз', 'два'], 'ul')).toEqual([
      { cut: 2, put: '- ' },
      { cut: 0, put: '- ' },
    ])
  })

  it('пустые строки внутри выделения знака не получают и номер не съедают', () => {
    expect(listEdits(['раз', '', 'два'], 'ol')).toEqual([
      { cut: 0, put: '1. ' },
      { cut: 0, put: '' },
      { cut: 0, put: '2. ' },
    ])
  })

  it('одна пустая строка под курсором становится первым пунктом', () => {
    expect(listEdits([''], 'ul')).toEqual([{ cut: 0, put: '- ' }])
  })
})

describe('continueList', () => {
  it('продолжает тем же знаком и следующим номером', () => {
    expect(continueList('- пункт')).toEqual({ next: '- ' })
    expect(continueList('2. пункт')).toEqual({ next: '3. ' })
  })

  it('пустой пункт кончает список', () => {
    expect(continueList('- ')).toEqual({ end: 2 })
    expect(continueList('3.  ')).toEqual({ end: 3 })
  })

  it('обычная строка — обычный Enter', () => {
    expect(continueList('просто текст')).toBeNull()
  })
})
