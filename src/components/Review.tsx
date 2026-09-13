import { useState } from 'react'
import { fmtDate } from '../lib/format'
import { FACES } from '../lib/rating'
import type { Book } from '../lib/types'
import { useData } from '../state/DataContext'
import { useLocale } from '../state/LocaleContext'
import { Jelly } from './ui'

/**
 * The last thing written about a book, and the only one that judges it.
 *
 * Sessions and thoughts are notes from inside the reading; a review is written
 * from outside it, which is why it stays shut until the book is finished. The
 * rating lives on the book for the same reason: one book, one verdict.
 */
export function Review({ book }: { book: Book }) {
  const { t, locale } = useLocale()
  const { updateBook } = useData()

  const [rating, setRating] = useState<number | null>(book.rating)
  const [text, setText] = useState(book.review ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty = rating !== book.rating || text.trim() !== (book.review ?? '')

  async function save() {
    setBusy(true)
    await updateBook(book.id, { rating, review: text.trim() || null })
    setBusy(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="review">
      <p className="muted review-lead">{t('review.lead')}</p>

      <div className="field">
        <span className="label">{t('review.how')}</span>
        <div className="faces">
          {FACES.map((f, i) => (
            <button
              key={f}
              type="button"
              className={`face-btn${rating === i + 1 ? ' on' : ''}`}
              aria-label={t(`face.${(i + 1) as 1 | 2 | 3 | 4 | 5}`)}
              title={t(`face.${(i + 1) as 1 | 2 | 3 | 4 | 5}`)}
              onClick={() => setRating(rating === i + 1 ? null : i + 1)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="label">{t('review.text')}</span>
        <textarea
          className="textarea review-text"
          rows={9}
          placeholder={t('review.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      <div className="row-tight">
        <Jelly className="btn" onClick={save} disabled={busy || (!dirty && !saved)}>
          {saved && !dirty ? t('review.saved') : t('form.save')}
        </Jelly>
        {book.finished_at && (
          <span className="small faint">
            {t('review.finishedOn', { date: fmtDate(book.finished_at, locale) })}
          </span>
        )}
      </div>
    </div>
  )
}
