import { describe, expect, it } from 'vitest'
import { htmlToMd, mdToHtml, type HtmlNode } from './noteHtml'

const txt = (value: string): HtmlNode => ({ nodeName: '#text', nodeValue: value })

const el = (
  tag: string,
  kids: HtmlNode[] = [],
  attrs: Record<string, string> = {},
): HtmlNode => ({
  nodeName: tag.toUpperCase(),
  childNodes: kids,
  getAttribute: (name: string) => attrs[name] ?? null,
})

/** Корень поля: то, что в браузере будет самим `contentEditable`. */
const root = (kids: HtmlNode[]): HtmlNode => el('div', kids)

describe('mdToHtml', () => {
  it('экранирует HTML до того, как появятся наши теги', () => {
    expect(mdToHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('рисует четыре формата теми же тегами, что ставит браузер', () => {
    expect(mdToHtml('**жирный**')).toBe('<b>жирный</b>')
    expect(mdToHtml('*курсив*')).toBe('<i>курсив</i>')
    expect(mdToHtml('__волна__')).toBe('<u>волна</u>')
    expect(mdToHtml('==маркер==')).toBe('<mark>маркер</mark>')
  })

  it('переносы строк становятся переносами поля', () => {
    expect(mdToHtml('раз\nдва')).toBe('раз<br>два')
  })

  it('блочную разметку оставляет текстом — поле правит строки, а не документ', () => {
    expect(mdToHtml('# Заголовок')).toBe('# Заголовок')
    expect(mdToHtml('- пункт')).toBe('- пункт')
  })

  it('одиночная звёздочка между словами разметкой не становится', () => {
    expect(mdToHtml('2 * 2')).toBe('2 * 2')
  })
})

describe('htmlToMd', () => {
  it('голый текст остаётся собой', () => {
    expect(htmlToMd(root([txt('просто текст')]))).toBe('просто текст')
  })

  it('знает оба написания жирного и курсива', () => {
    expect(htmlToMd(root([el('b', [txt('раз')])]))).toBe('**раз**')
    expect(htmlToMd(root([el('strong', [txt('раз')])]))).toBe('**раз**')
    expect(htmlToMd(root([el('i', [txt('два')])]))).toBe('*два*')
    expect(htmlToMd(root([el('em', [txt('два')])]))).toBe('*два*')
  })

  it('подчёркивание превращается в волну', () => {
    expect(htmlToMd(root([el('u', [txt('важное')])]))).toBe('__важное__')
  })

  it('маркер понимает и тегом, и заливкой, которой его делает браузер', () => {
    expect(htmlToMd(root([el('mark', [txt('главное')])]))).toBe('==главное==')
    expect(
      htmlToMd(root([el('span', [txt('главное')], { style: 'background-color: rgb(255, 245, 157)' })])),
    ).toBe('==главное==')
  })

  it('span без заливки оформления не несёт', () => {
    expect(htmlToMd(root([el('span', [txt('обычное')], { style: 'color: red' })]))).toBe('обычное')
  })

  it('форматы вкладываются друг в друга', () => {
    expect(htmlToMd(root([el('b', [txt('жирное с '), el('mark', [txt('главным')])])]))).toBe(
      '**жирное с ==главным==**',
    )
  })

  it('пустая обёртка знаков не оставляет', () => {
    expect(htmlToMd(root([el('b'), txt('текст')]))).toBe('текст')
  })

  it('br — перенос строки', () => {
    expect(htmlToMd(root([txt('раз'), el('br'), txt('два')]))).toBe('раз\nдва')
  })

  it('соседние блоки становятся соседними строками', () => {
    expect(htmlToMd(root([el('div', [txt('раз')]), el('div', [txt('два')])]))).toBe('раз\nдва')
  })

  it('текст перед первым блоком не теряет своей строки', () => {
    expect(htmlToMd(root([txt('раз'), el('div', [txt('два')])]))).toBe('раз\nдва')
  })

  it('пустой блок даёт пустую строку, а не две', () => {
    const tree = root([el('div', [txt('раз')]), el('div', [el('br')]), el('div', [txt('два')])])
    expect(htmlToMd(tree)).toBe('раз\n\nдва')
  })

  it('чужой тег из буфера отдаёт текст и теряет оформление', () => {
    const pasted = el('a', [txt('ссылка')], { href: 'https://example.com' })
    expect(htmlToMd(root([pasted]))).toBe('ссылка')
  })

  it('чужая разметка не уезжает в хранилище тегами', () => {
    const pasted = el('h1', [txt('чужой заголовок')])
    expect(htmlToMd(root([pasted]))).toBe('чужой заголовок')
  })
})

describe('круг md → поле → md', () => {
  /** Дерево, которое браузер держит для этой строки. Собрано руками: DOM в тестах нет. */
  const cases: { md: string; tree: HtmlNode }[] = [
    { md: 'просто текст', tree: root([txt('просто текст')]) },
    { md: '**жирный**', tree: root([el('b', [txt('жирный')])]) },
    { md: '*курсив*', tree: root([el('i', [txt('курсив')])]) },
    { md: '__волна__', tree: root([el('u', [txt('волна')])]) },
    { md: '==маркер==', tree: root([el('mark', [txt('маркер')])]) },
    {
      md: '**жирное с ==главным== внутри**',
      tree: root([
        el('b', [txt('жирное с '), el('mark', [txt('главным')]), txt(' внутри')]),
      ]),
    },
    {
      md: 'раз\nдва',
      tree: root([el('div', [txt('раз')]), el('div', [txt('два')])]),
    },
    { md: '2 * 2', tree: root([txt('2 * 2')]) },
    { md: 'snake_case_name', tree: root([txt('snake_case_name')]) },
  ]

  for (const { md, tree } of cases) {
    it(`${md.replace(/\n/g, '⏎')}`, () => {
      expect(htmlToMd(tree)).toBe(md)
      // Вторая половина круга: разметка поля описывает то же самое дерево.
      expect(mdToHtml(htmlToMd(tree))).toBe(mdToHtml(md))
    })
  }
})
