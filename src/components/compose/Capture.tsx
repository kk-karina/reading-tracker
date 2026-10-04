import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { searchBooks, type BookCandidate } from '../../lib/books'
import { looksLikeUrl } from '../../lib/compose/input'
import type { OwnHit } from '../../lib/compose/own'
import { toneOf } from '../../lib/covers'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { Jelly } from '../ui'

/**
 * Шаг первый: одна строка.
 *
 * Ссылка или название — человек не выбирает, что из двух он принёс, это
 * понятно по самой строке. Ссылку читает ✦, название ищется в Open Library:
 * книга — самый частый материал и на полке, и в потоке. Оба пути — по Enter
 * или по звёздочке, никогда сами по себе.
 */
export function Capture({
  onLink,
  onPick,
  onManual,
  own,
  onOwn,
}: {
  onLink: (url: string) => void
  onPick: (c: BookCandidate) => void
  /** Свои книги по набранному — с полки и из потоков. Ищутся по мере ввода. */
  own: (query: string) => OwnHit[]
  onOwn: (hit: OwnHit) => void
  /** Карточка без поиска; строка, если она есть, становится названием. */
  onManual: (title: string) => void
}) {
  const { t } = useLocale()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<BookCandidate[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<'search.none' | 'search.failed' | null>(null)
  const trip = useRef<AbortController | null>(null)

  useEffect(() => () => trip.current?.abort(), [])

  const typed = q.trim()
  const isLink = looksLikeUrl(typed)
  // Своё ищется сразу, без Enter: это поиск по своим же данным, наружу
  // ничего не уходит, и показать «это у тебя уже есть» стоит до того, как
  // человек пошёл искать в чужом каталоге.
  const mine = isLink ? [] : own(typed)

  async function go() {
    if (!typed) return
    if (isLink) {
      onLink(typed)
      return
    }
    trip.current?.abort()
    const ctl = new AbortController()
    trip.current = ctl
    setBusy(true)
    setNote(null)
    setResults(null)
    try {
      const found = await searchBooks(typed, ctl.signal)
      if (ctl.signal.aborted) return
      setResults(found)
      if (found.length === 0) setNote('search.none')
    } catch {
      if (!ctl.signal.aborted) setNote('search.failed')
    } finally {
      if (!ctl.signal.aborted) setBusy(false)
    }
  }

  // Подсказка отвечает на то, что лежит в строке сейчас: куда уйдёт ссылка —
  // честно до нажатия, а не после.
  const hint = isLink ? t('material.fetchHint') : typed ? t('search.hint') : t('compose.captureHint')

  return (
    <div className="compose-capture">
      <motion.div layoutId="compose-line" className="compose-line" transition={{ duration: 0.28, ease: [0.77, 0, 0.175, 1] }}>
        <input
          className="input compose-q"
          value={q}
          placeholder={t('compose.capture')}
          aria-label={t('compose.capture')}
          data-autofocus
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value)
            setNote(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
              e.preventDefault()
              void go()
            }
          }}
        />
        <Jelly
          type="button"
          className={`btn compose-wand${busy ? ' busy' : ''}`}
          onClick={() => void go()}
          disabled={!typed}
          aria-label={isLink ? t('material.fetch') : t('compose.search')}
          title={isLink ? t('material.fetch') : t('compose.search')}
          aria-busy={busy}
        >
          <Icon name="sparkles" size={18} />
        </Jelly>
      </motion.div>

      <p className="compose-hint small faint">
        <span>{note ? t(note) : hint}</span>
        <button type="button" className="link-btn" onClick={() => onManual('')}>
          {t('compose.manual')}
        </button>
      </p>

      {mine.length > 0 && (
        <section className="compose-group">
          <h3 className="label">{t('compose.own')}</h3>
          <ul className="results compose-hits" aria-label={t('compose.own')}>
            {mine.map((h, i) => (
              <motion.li
                key={`${h.where}-${h.id}`}
                initial={{ opacity: 0, transform: 'translateY(6px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1], delay: i * 0.035 }}
              >
                <button type="button" onClick={() => onOwn(h)}>
                  <span className="compose-hit-cover" style={{ background: toneOf(h.title).bg }} aria-hidden>
                    {h.cover && <img src={h.cover} alt="" loading="lazy" />}
                  </span>
                  <span className="compose-hit-text">
                    <span className="r-title">{h.title}</span>
                    <span className="small muted">
                      {[
                        h.author,
                        h.where === 'shelf' ? t('compose.ownShelf') : t('compose.ownStream', { stream: h.stream ?? '' }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        </section>
      )}

      {results && (
        <section className="compose-group">
          {mine.length > 0 && <h3 className="label">{t('compose.found')}</h3>}
          <ul className="results compose-hits" aria-label={t('compose.found')}>
            {results.map((c, i) => (
              <motion.li
                key={`${c.external_id}-${c.title}`}
                initial={{ opacity: 0, transform: 'translateY(6px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1], delay: Math.min(i, 8) * 0.035 }}
              >
                <button type="button" onClick={() => onPick(c)}>
                  <span className="compose-hit-cover" style={{ background: toneOf(c.title).bg }} aria-hidden>
                    {c.cover_url && <img src={c.cover_url} alt="" loading="lazy" />}
                  </span>
                  <span className="compose-hit-text">
                    <span className="r-title">{c.title}</span>
                    <span className="small muted">
                      {[c.author, c.year, c.pages && t('compose.pagesShort', { n: c.pages })]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              </motion.li>
            ))}
            <li>
              <button type="button" className="compose-hit-raw" onClick={() => onManual(typed)}>
                <span className="r-title">{t('compose.asIs', { title: typed })}</span>
              </button>
            </li>
          </ul>
        </section>
      )}
    </div>
  )
}
