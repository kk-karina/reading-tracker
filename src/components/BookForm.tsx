import { useRef, useState } from 'react'
import { searchBooks, type BookCandidate } from '../lib/books'
import { todayISO } from '../lib/format'
import { statusPatch } from '../lib/reading'
import type { Book } from '../lib/types'
import { useData } from '../state/DataContext'
import { useT } from '../state/LocaleContext'
import { Sheet } from './Sheet'
import { FormStack, Jelly } from './ui'

/**
 * Adding and editing share one form. Search sits on top as an accelerator, not as
 * the way in: Open Library does not know most Russian editions, so the fields
 * below have to be comfortable to fill by hand.
 */
export function BookForm({ book, onClose }: { book?: Book; onClose: () => void }) {
  const t = useT()
  const { addBook, updateBook } = useData()

  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [pages, setPages] = useState(book?.pages ? String(book.pages) : '')
  const [cover, setCover] = useState(book?.cover_url ?? '')
  const [genre, setGenre] = useState(book?.genre ?? '')
  const [language, setLanguage] = useState(book?.language ?? '')
  /**
   * Единственный вопрос про статус, на который прочитанное не отвечает само:
   * книгу могли прочитать до того, как она сюда попала. «Хочу» и «читаю»
   * выводятся из сессий (см. `statusOf`), и спрашивать о них нечего.
   */
  const [read, setRead] = useState(book?.status === 'finished')
  const externalId = useRef<string | null>(book?.external_id ?? null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookCandidate[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runSearch() {
    setBusy(true)
    setNote(null)
    setResults(null)
    try {
      const found = await searchBooks(query || title)
      setResults(found)
      if (found.length === 0) setNote(t('search.none'))
    } catch {
      setNote(t('search.failed'))
    } finally {
      setBusy(false)
    }
  }

  function take(c: BookCandidate) {
    setTitle(c.title)
    if (c.author) setAuthor(c.author)
    if (c.pages) setPages(String(c.pages))
    if (c.cover_url) setCover(c.cover_url)
    if (c.language) setLanguage(c.language)
    externalId.current = c.external_id
    setResults(null)
  }

  async function save() {
    if (!title.trim()) {
      setError(t('form.titleRequired'))
      return
    }
    const fields = {
      title: title.trim(),
      author: author.trim() || null,
      pages: pages.trim() ? Number(pages) : null,
      cover_url: cover.trim() || null,
      external_id: externalId.current,
      genre: genre.trim() || null,
      language: language.trim() || null,
      // Книга, заведённая сразу на прочитанную полку, всё ещё нуждается в дате;
      // снятая отметка уносит дату с собой. «Хочу» здесь — не утверждение, а
      // отсутствие отметки: что это на самом деле, решит подсчёт сессий.
      ...statusPatch(
        { started_at: book?.started_at ?? null, finished_at: book?.finished_at ?? null },
        read ? 'finished' : 'want',
        todayISO(),
      ),
    }
    if (book) await updateBook(book.id, fields)
    else await addBook({ ...fields, sort: 0 })
    onClose()
  }

  return (
    <Sheet title={book ? t('book.edit') : t('shelf.add')} onClose={onClose}>
      <FormStack>
        <section className="search-box">
          <label className="field">
            <span className="label">{t('search.label')}</span>
            <div className="row-tight">
              <input
                className="input"
                value={query}
                placeholder={title}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    runSearch()
                  }
                }}
              />
              <button className="btn ghost sm" onClick={runSearch} disabled={busy}>
                {busy ? t('search.busy') : t('search.action')}
              </button>
            </div>
          </label>
          <p className="small faint" style={{ margin: '6px 0 0' }}>
            {t('search.hint')}
          </p>
          {note && <p className="small muted">{note}</p>}
          {results && results.length > 0 && (
            <ul className="results">
              {results.map((c) => (
                <li key={`${c.external_id}-${c.title}`}>
                  <button type="button" onClick={() => take(c)}>
                    <span className="r-title">{c.title}</span>
                    <span className="small muted">
                      {[c.author, c.year, c.pages && `${c.pages} p.`].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <label className="field">
          <span className="label">{t('form.title')}</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span className="label">{t('form.author')}</span>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="label">{t('form.pages')}</span>
            <input
              className="input"
              type="number"
              min="1"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">{t('form.genre')}</span>
            <input className="input" value={genre} onChange={(e) => setGenre(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">{t('form.language')}</span>
            <input
              className="input"
              value={language}
              placeholder="ru / en"
              onChange={(e) => setLanguage(e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="label">{t('form.cover')}</span>
          <input className="input" value={cover} onChange={(e) => setCover(e.target.value)} />
          <span className="small faint">{t('form.coverHint')}</span>
        </label>

        <label className="toggle">
          <input type="checkbox" checked={read} onChange={() => setRead(!read)} />
          <span>{t('form.alreadyRead')}</span>
        </label>

        {error && <div className="error">{error}</div>}
        <Jelly className="btn" onClick={save} style={{ alignSelf: 'flex-start' }}>
          {t('form.save')}
        </Jelly>
      </FormStack>
    </Sheet>
  )
}
