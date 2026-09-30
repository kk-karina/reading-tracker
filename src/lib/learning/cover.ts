import type { MaterialKind } from './types'

/**
 * Что удалось узнать о материале по одной ссылке.
 *
 * Всё поля необязательные и независимые: у ролика находится картинка и имя
 * канала, у статьи — заголовок и издание, у книги на сайте издательства —
 * иногда только заголовок. Форма подставляет то, что пришло, и не трогает
 * то, что пользователь уже вписал руками.
 */
export interface LinkMeta {
  title: string | null
  author: string | null
  cover_url: string | null
  kind: MaterialKind | null
  /** Домен без www — показывается под названием вместо голой ссылки. */
  source: string | null
}

const EMPTY: LinkMeta = { title: null, author: null, cover_url: null, kind: null, source: null }

export function parseUrl(raw: string): URL | null {
  const s = raw.trim()
  if (!s) return null
  try {
    // Без схемы ссылку всё равно вставляют чаще, чем со схемой.
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    return null
  }
}

/** Домен без www. Показывается человеку, поэтому punycode не разворачивается. */
export function sourceOf(raw: string): string | null {
  const url = parseUrl(raw)
  return url ? url.hostname.replace(/^www\./, '') : null
}

/** У «bbc.co.uk» предпоследняя метка — «co», а имя источника всё-таки «bbc». */
const COMPOUND_ZONE = /\.(co|com|org|net|ac|gov|edu)\.[a-z]{2,3}$/i

/**
 * Имя источника без зоны.
 *
 * На плитке материала в списке под текст остаётся около сорока пикселей:
 * «medium.com» в них не влезает, «medium» влезает и узнаётся не хуже — зона к
 * узнаванию ничего не добавляет. Поддомены тоже уходят, поэтому
 * «podcasts.apple.com» становится «apple»: в списке важно, чей это материал, а
 * не какой раздел сайта его отдал.
 */
export function sourceName(raw: string): string | null {
  const host = sourceOf(raw)
  if (!host) return null
  const parts = host.split('.')
  const zone = COMPOUND_ZONE.test(host) ? 2 : 1
  return parts[parts.length - 1 - zone] ?? host
}

/**
 * Вид материала по домену.
 *
 * Догадка, а не истина: она только подставляет переключатель в форме, и
 * ошибиться здесь стоит одного клика. Поэтому список короткий и покрывает то,
 * что кладут в бэклог чаще всего, а всё незнакомое остаётся статьёй.
 */
const BY_HOST: [RegExp, MaterialKind][] = [
  [/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/i, 'video'],
  // Подкаст и ролик меряются одним тумблером «слушала/смотрела», поэтому
  // отдельного вида под них больше нет, а догадка по домену осталась верной.
  [/(^|\.)(podcasts\.apple\.com|overcast\.fm|castbox\.fm)$/i, 'video'],
  [/(^|\.)(open\.spotify\.com)$/i, 'video'],
  [/(^|\.)(coursera\.org|udemy\.com|edx\.org|designbetter\.co|frontendmasters\.com)$/i, 'course'],
  [/(^|\.)(openlibrary\.org|goodreads\.com|amazon\.[a-z.]+|litres\.ru|mann-ivanov-ferber\.ru)$/i, 'book'],
  [/(^|\.)(oreilly\.com|manning\.com|basecamp\.com|refactoringui\.com)$/i, 'book'],
]

export function kindFromUrl(raw: string): MaterialKind | null {
  const url = parseUrl(raw)
  if (!url) return null
  for (const [re, kind] of BY_HOST) if (re.test(url.hostname)) return kind
  return 'article'
}

/**
 * Идентификатор ролика YouTube из любой из трёх форм ссылки.
 *
 * Отдельной веткой, потому что у превью YouTube есть прямой адрес: обложка
 * достаётся из ссылки арифметикой, без единого запроса наружу. Это самый
 * частый нетекстовый материал, и он не должен зависеть от чужого сервиса.
 */
export function youtubeId(raw: string): string | null {
  const url = parseUrl(raw)
  if (!url) return null
  const host = url.hostname.replace(/^www\./, '')
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null
  if (host !== 'youtube.com' && host !== 'm.youtube.com') return null
  if (url.pathname === '/watch') return url.searchParams.get('v')
  const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)
  return m ? m[1] : null
}

/** `hqdefault` есть у каждого ролика; `maxresdefault` — далеко не у каждого. */
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

/** Обложка Open Library по идентификатору издания — тот же адрес, что у книг полки. */
export const openLibraryCover = (id: number) => `https://covers.openlibrary.org/b/id/${id}-L.jpg`

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Разбор ответа microlink. Отдельной функцией — её можно проверить тестом,
 * не ходя в сеть.
 */
export function parseMicrolink(json: unknown, url: string): LinkMeta {
  const data = (json as { data?: Record<string, unknown> } | null)?.data
  if (!data) return { ...EMPTY, source: sourceOf(url), kind: kindFromUrl(url) }

  const image = data.image as { url?: unknown } | null | undefined
  const logo = data.logo as { url?: unknown } | null | undefined

  return {
    title: str(data.title),
    // `author` у большинства сайтов пустой, а `publisher` есть почти всегда:
    // «O'Reilly» под названием полезнее, чем пустая строка.
    author: str(data.author) ?? str(data.publisher),
    cover_url: str(image?.url) ?? str(logo?.url),
    kind: kindFromUrl(url),
    source: sourceOf(url),
  }
}

/**
 * Что известно о ссылке без единого запроса наружу.
 *
 * Вызывается первой: у ролика YouTube этого уже достаточно, и ссылка никуда
 * не уходит. Для остальных даёт домен и вид, чтобы форма не выглядела пустой,
 * пока идёт запрос, и чтобы было чем жить, если запрос не удался.
 */
export function localMeta(url: string): LinkMeta {
  const yt = youtubeId(url)
  return {
    title: null,
    author: null,
    cover_url: yt ? youtubeThumb(yt) : null,
    kind: kindFromUrl(url),
    source: sourceOf(url),
  }
}

const MICROLINK = 'https://api.microlink.io/'

/**
 * Полные данные по ссылке.
 *
 * YouTube разбирается на месте. Всё остальное идёт через microlink —
 * публичный читатель Open Graph без ключа: браузер не может сам прочитать
 * чужую страницу, CORS не пустит, а приложение живёт статикой на Pages, и
 * своего бэкенда, куда положить этот запрос, у него нет.
 *
 * Цена названа вслух: адрес материала уходит стороннему сервису. Поэтому
 * запрос делается только по явному действию в форме, никогда сам по себе,
 * и любая неудача возвращает `localMeta` вместо ошибки — ручной ввод здесь
 * полноправный путь, а не запасной.
 */
export async function fetchLinkMeta(url: string, signal?: AbortSignal): Promise<LinkMeta> {
  const parsed = parseUrl(url)
  if (!parsed) return EMPTY

  const yt = youtubeId(url)
  if (yt) {
    const local = localMeta(url)
    // У ролика заголовок и канал достаются oEmbed — это открытый адрес
    // самого YouTube с CORS, посредник для него не нужен.
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(parsed.toString())}`,
        { signal },
      )
      if (!res.ok) return local
      const json = (await res.json()) as { title?: unknown; author_name?: unknown }
      return { ...local, title: str(json.title), author: str(json.author_name) }
    } catch {
      return local
    }
  }

  try {
    const res = await fetch(`${MICROLINK}?url=${encodeURIComponent(parsed.toString())}`, { signal })
    if (!res.ok) return localMeta(url)
    return parseMicrolink(await res.json(), parsed.toString())
  } catch {
    return localMeta(url)
  }
}
