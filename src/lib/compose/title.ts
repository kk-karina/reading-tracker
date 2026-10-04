/**
 * Заголовок страницы магазина → название книги и автор.
 *
 * `og:title` у магазинов — это реклама, а не название: «Мастер и Маргарита,
 * Михаил Булгаков – скачать книгу fb2, epub, pdf на ЛитРес». Без чистки ✦ на
 * книжной ссылке заполняет поле мусором, который потом стирают руками, — и
 * перестают нажимать звёздочку.
 *
 * Правило осторожное: режется только то, в чём узнаётся магазин или глагол
 * витрины, а автор достаётся только у книжных магазинов и только если похож на
 * имя. Незнакомое не трогается — длинное название лучше обрезанного.
 */

export interface CleanTitle {
  title: string
  author: string | null
}

/** Слова витрины: сегмент, где они есть, — не часть названия. */
const SHOP_WORDS =
  /(купить|читать|скачать|отзыв|литрес|litres|ozon|озон|goodreads|amazon|читай-город|chitai-gorod|mybook|bookmate|лабиринт|labirint|fb2|epub|интернет-магазин)/i

/** У этих сайтов в заголовке рядом с названием стоит автор. */
const BOOK_SHOPS =
  /(^|\.)(litres\.ru|ozon\.ru|chitai-gorod\.ru|mybook\.ru|bookmate\.ru|labirint\.ru|goodreads\.com|amazon\.[a-z.]+)$/i

/** Глагол витрины в начале: «Читать онлайн «…»», «Купить книгу «…»». */
const LEAD = /^(читать онлайн|читать|купить книгу|купить|скачать книгу|скачать)\s+/i

/** Два-четыре слова с заглавной: «Михаил Булгаков», «Ursula K. Le Guin». */
const NAME = /^[\p{Lu}][\p{L}.'’-]*(\s+[\p{Lu}][\p{L}.'’-]*){1,3}$/u

const ISBN = /^\d{9,13}[\dX]?$/i

const unquote = (s: string) => s.replace(/^[«"“„']+|[»"”']+$/g, '').trim()

function amazon(raw: string): CleanTitle | null {
  const parts = raw
    .split(/:\s+/)
    .map((p) => p.trim())
    .filter((p) => p && !ISBN.test(p) && !/^amazon\b/i.test(p) && !/^(books|книги|kindle store)$/i.test(p))
  if (parts.length < 2 || !NAME.test(parts[parts.length - 1])) return null
  return { title: parts.slice(0, -1).join(': '), author: parts[parts.length - 1] }
}

export function cleanTitle(raw: string, host: string | null): CleanTitle {
  const text = raw.trim()
  const shop = !!host && BOOK_SHOPS.test(host)

  if (shop && /amazon\./i.test(host ?? '')) {
    const got = amazon(text)
    if (got) return got
  }

  // Хвосты отрезаются с конца, пока в сегменте узнаётся витрина. Режется по
  // месту разделителя, а не склейкой сегментов: у оставшегося заголовка
  // разделители должны остаться своими. Первый сегмент не режется никогда —
  // даже «Читать онлайн «…»» несёт название.
  const seps = [...text.matchAll(/\s+[|–—-]\s+/g)]
  let end = text.length
  let kept = seps.length
  while (kept > 0) {
    const sep = seps[kept - 1]
    const tail = text.slice(sep.index + sep[0].length, end)
    if (!SHOP_WORDS.test(tail)) break
    end = sep.index
    kept--
  }

  let title = text.slice(0, end).replace(LEAD, '').trim()
  let author: string | null = null

  if (shop) {
    const by = title.match(/^(.+?)\s+by\s+(.+)$/)
    // «Название — Автор | витрина»: витрину уже сняли, последним осталось имя.
    const dash = title.match(/^(.+)\s+[|–—-]\s+([^|–—]+)$/)
    const comma = title.match(/^(.+),\s*([^,]+)$/)
    const pick = [by, dash, comma].find((m) => m && NAME.test(m[2].trim()))
    if (pick) {
      title = pick[1]
      author = pick[2].trim()
    }
  }

  return { title: unquote(title.trim()), author }
}
