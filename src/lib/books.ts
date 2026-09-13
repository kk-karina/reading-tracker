/**
 * Book lookup through Open Library.
 *
 * Open Library rather than Google Books: the keyless Google endpoint shares one
 * quota across everyone and answers 429 often enough to be useless. Open Library
 * needs no key and stays up — but it knows almost nothing published only in
 * Russian, so typing a book in by hand is a first-class path, not a fallback.
 */

export interface BookCandidate {
  title: string
  author: string | null
  pages: number | null
  cover_url: string | null
  external_id: string | null
  language: string | null
  year: number | null
}

const ENDPOINT = 'https://openlibrary.org/search.json'
const FIELDS = 'key,title,author_name,number_of_pages_median,cover_i,language,first_publish_year'

const LANGS: Record<string, string> = { eng: 'en', rus: 'ru', spa: 'es', fre: 'fr', ger: 'de' }

interface Doc {
  key?: unknown
  title?: unknown
  author_name?: unknown
  number_of_pages_median?: unknown
  cover_i?: unknown
  language?: unknown
  first_publish_year?: unknown
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const num = (v: unknown): number | null => (typeof v === 'number' && v > 0 ? v : null)

export function parseSearch(json: unknown): BookCandidate[] {
  const docs = (json as { docs?: unknown } | null)?.docs
  if (!Array.isArray(docs)) return []

  return docs.flatMap((raw: Doc) => {
    const title = str(raw.title)
    if (!title) return [] // nothing to pick from without a title

    const authors = Array.isArray(raw.author_name)
      ? raw.author_name.filter((a): a is string => typeof a === 'string')
      : []
    const cover = num(raw.cover_i)
    const lang = Array.isArray(raw.language) ? str(raw.language[0]) : null

    return [
      {
        title,
        author: authors.length ? authors.join(', ') : null,
        pages: num(raw.number_of_pages_median),
        cover_url: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg` : null,
        external_id: str(raw.key),
        language: lang ? (LANGS[lang] ?? lang) : null,
        year: num(raw.first_publish_year),
      },
    ]
  })
}

/** Rejects nothing on a failed lookup: the caller falls back to manual entry. */
export async function searchBooks(query: string, signal?: AbortSignal): Promise<BookCandidate[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&limit=8&fields=${FIELDS}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open Library: ${res.status}`)
  return parseSearch(await res.json())
}
