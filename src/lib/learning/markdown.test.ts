import { describe, expect, it } from 'vitest'
import { plainText, renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('экранирует HTML до всего остального', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
  })

  it('экранирует амперсанд и кавычки', () => {
    expect(renderMarkdown('A & B "c"')).toBe('<p>A &amp; B &quot;c&quot;</p>')
  })

  it('делает заголовки трёх уровней', () => {
    expect(renderMarkdown('# Раз')).toBe('<h1>Раз</h1>')
    expect(renderMarkdown('## Два')).toBe('<h2>Два</h2>')
    expect(renderMarkdown('### Три')).toBe('<h3>Три</h3>')
  })

  it('не считает решётку без пробела заголовком', () => {
    expect(renderMarkdown('#хештег')).toBe('<p>#хештег</p>')
  })

  it('делает жирный и курсив', () => {
    expect(renderMarkdown('**жирно** и *косо*')).toBe(
      '<p><strong>жирно</strong> и <em>косо</em></p>',
    )
  })

  it('делает выделение маркером', () => {
    expect(renderMarkdown('обычный ==главное== обычный')).toBe(
      '<p>обычный <mark>главное</mark> обычный</p>',
    )
  })

  it('не путает выделение с жирным', () => {
    expect(renderMarkdown('==**оба**==')).toBe('<p><mark><strong>оба</strong></mark></p>')
  })

  it('делает код', () => {
    expect(renderMarkdown('вот `код` тут')).toBe('<p>вот <code>код</code> тут</p>')
  })

  it('внутри кода разметка не работает', () => {
    expect(renderMarkdown('`**не жирно**`')).toBe('<p><code>**не жирно**</code></p>')
  })

  it('делает маркированный список', () => {
    expect(renderMarkdown('- раз\n- два')).toBe('<ul><li>раз</li><li>два</li></ul>')
  })

  it('делает нумерованный список', () => {
    expect(renderMarkdown('1. раз\n2. два')).toBe('<ol><li>раз</li><li>два</li></ol>')
  })

  it('делает цитату', () => {
    expect(renderMarkdown('> мысль')).toBe('<blockquote><p>мысль</p></blockquote>')
  })

  it('склеивает соседние строки цитаты', () => {
    expect(renderMarkdown('> раз\n> два')).toBe('<blockquote><p>раз два</p></blockquote>')
  })

  it('делает горизонтальную линию', () => {
    expect(renderMarkdown('---')).toBe('<hr>')
  })

  it('делает ссылку', () => {
    expect(renderMarkdown('[текст](https://a.b)')).toBe(
      '<p><a href="https://a.b" target="_blank" rel="noopener noreferrer">текст</a></p>',
    )
  })

  it('не пускает javascript: в ссылку — остаётся голый текст', () => {
    expect(renderMarkdown('[клик](javascript:void)')).toBe('<p>клик</p>')
  })

  it('не пускает data: и относительный путь', () => {
    expect(renderMarkdown('[a](data:text/html,x)')).toBe('<p>a</p>')
    expect(renderMarkdown('[b](/local/file)')).toBe('<p>b</p>')
  })

  // Незакрытая скобка внутри адреса обрывает его — так же ведёт себя обычный
  // markdown. Важно здесь другое: тег ссылки не появляется.
  it('со скобкой внутри адреса тоже не делает ссылку', () => {
    expect(renderMarkdown('[клик](javascript:alert(1))')).toBe('<p>клик)</p>')
  })

  it('разбивает абзацы по пустой строке', () => {
    expect(renderMarkdown('раз\n\nдва')).toBe('<p>раз</p><p>два</p>')
  })

  it('склеивает строки одного абзаца', () => {
    expect(renderMarkdown('раз\nдва')).toBe('<p>раз два</p>')
  })

  it('на пустом входе отдаёт пустую строку', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown('   \n\n  ')).toBe('')
  })

  it('собирает конспект целиком', () => {
    const src = [
      '## Главное',
      'Дизайнер принимает своё восприятие за ==точку зрения пользователя==.',
      '',
      '> Экспертиза создаёт приор.',
      '',
      '- первое',
      '- второе',
    ].join('\n')
    expect(renderMarkdown(src)).toBe(
      '<h2>Главное</h2>' +
        '<p>Дизайнер принимает своё восприятие за <mark>точку зрения пользователя</mark>.</p>' +
        '<blockquote><p>Экспертиза создаёт приор.</p></blockquote>' +
        '<ul><li>первое</li><li>второе</li></ul>',
    )
  })
})

describe('plainText', () => {
  it('снимает выделение, жирный и курсив', () => {
    expect(plainText('==раз== **два** *три*')).toBe('раз два три')
  })

  it('оставляет от ссылки только подпись', () => {
    expect(plainText('см. [доки](https://example.com)')).toBe('см. доки')
  })

  it('снимает заголовки, цитаты и маркеры списка', () => {
    expect(plainText('## Глава\n- пункт\n> цитата')).toBe('Глава пункт цитата')
  })

  it('схлопывает переносы и лишние пробелы в одну строку', () => {
    expect(plainText('первая\n\n  вторая  ')).toBe('первая вторая')
  })

  it('не трогает амперсанд и угловые скобки', () => {
    expect(plainText('a & b < c')).toBe('a & b < c')
  })
})

describe('волна', () => {
  it('подчёркивает волной то, что обёрнуто в двойное подчёркивание', () => {
    expect(renderMarkdown('__важное__')).toBe('<p><u>важное</u></p>')
  })

  it('не путает волну с жирным', () => {
    expect(renderMarkdown('**жирное** и __волна__')).toBe(
      '<p><strong>жирное</strong> и <u>волна</u></p>',
    )
  })

  it('одиночное подчёркивание внутри слова разметкой не считает', () => {
    expect(renderMarkdown('snake_case_name')).toBe('<p>snake_case_name</p>')
  })

  it('волна живёт внутри маркера', () => {
    expect(renderMarkdown('==тут __важное__ слово==')).toBe(
      '<p><mark>тут <u>важное</u> слово</mark></p>',
    )
  })

  it('plainText снимает знаки волны', () => {
    expect(plainText('тут __важное__ слово')).toBe('тут важное слово')
  })
})
