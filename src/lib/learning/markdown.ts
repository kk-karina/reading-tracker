/**
 * Маленький markdown ровно на то, из чего состоит конспект.
 *
 * Своё, а не библиотека, по той же причине, по которой своя локализация:
 * нужна десятая часть возможностей, а зависимость пришлось бы обновлять и
 * проверять годами.
 *
 * Порядок здесь — часть безопасности. Сначала экранируется весь HTML, и
 * только потом появляются наши теги. Обратный порядок означал бы, что
 * написанный в конспекте script доезжает до страницы.
 */

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPE[c])

/** Ссылка принимается, только если это http, https или почта. */
function safeHref(url: string): string | null {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed
  return null
}

/** Метка из области частного использования: в тексте конспекта её быть не может. */
const HOLD = ''
const HOLD_BACK = new RegExp(`${HOLD}(\\d+)${HOLD}`, 'g')

/**
 * Строчная разметка. Код вынимается первым и возвращается в конце, иначе
 * звёздочки внутри обратных кавычек стали бы жирным шрифтом.
 */
function inline(text: string): string {
  const code: string[] = []
  let out = text.replace(/`([^`]+)`/g, (_, body: string) => {
    code.push(`<code>${body}</code>`)
    return `${HOLD}${code.length - 1}${HOLD}`
  })

  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
    const href = safeHref(url)
    return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>` : label
  })

  out = out.replace(/==(.+?)==/g, '<mark>$1</mark>')
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')

  return out.replace(HOLD_BACK, (_, i: string) => code[Number(i)])
}

export function renderMarkdown(src: string): string {
  const lines = escapeHtml(src).split('\n')
  const out: string[] = []

  let para: string[] = []
  let quote: string[] = []
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
    para = []
  }
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`)
    quote = []
  }
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.join('')}</${list.tag}>`)
    list = null
  }
  const flushAll = () => {
    flushPara()
    flushQuote()
    flushList()
  }

  for (const raw of lines) {
    const line = raw.trim()

    if (!line) {
      flushAll()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushAll()
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`)
      continue
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flushAll()
      out.push('<hr>')
      continue
    }

    // Знак цитаты уже экранирован в &gt; — ищем именно его.
    const quoted = line.match(/^&gt;\s?(.*)$/)
    if (quoted) {
      flushPara()
      flushList()
      quote.push(quoted[1].trim())
      continue
    }

    const bullet = line.match(/^-\s+(.*)$/)
    if (bullet) {
      flushPara()
      flushQuote()
      if (!list || list.tag !== 'ul') {
        flushList()
        list = { tag: 'ul', items: [] }
      }
      list.items.push(`<li>${inline(bullet[1].trim())}</li>`)
      continue
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/)
    if (numbered) {
      flushPara()
      flushQuote()
      if (!list || list.tag !== 'ol') {
        flushList()
        list = { tag: 'ol', items: [] }
      }
      list.items.push(`<li>${inline(numbered[1].trim())}</li>`)
      continue
    }

    flushQuote()
    flushList()
    para.push(line)
  }

  flushAll()
  return out.join('')
}
