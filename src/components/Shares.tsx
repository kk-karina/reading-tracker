import { useState } from 'react'
import { sharesBy } from '../lib/reading'
import type { Book } from '../lib/types'
import { useT } from '../state/LocaleContext'
import { Segmented } from './ui'

/**
 * One horizontal part-to-whole bar. Not a pie and not a rose: with two or three
 * languages a circle is a stat tile drawn round, and petals bury close values.
 *
 * The palette is the validated categorical set. Its contrast check warns on the
 * two lightest hues, and its worst pair sits in the CVD floor band — both are
 * relieved the same way, by naming every segment in the legend beside its colour
 * and by the 2px gaps between fills, so identity is never carried by colour alone.
 */
// This exact order is what the validator passed; reordering changes which pairs
// sit next to each other and so changes the result.
const HUES = [
  'var(--magenta)',
  'var(--teal)',
  'var(--violet)',
  'var(--orange)',
  'var(--cyan)',
  'var(--blue)',
]

type Field = 'genre' | 'language'

const LANGUAGE_KEYS = { ru: 'lang.ru', en: 'lang.en' } as const

export function Shares({ books }: { books: Book[] }) {
  const t = useT()
  const [field, setField] = useState<Field>('genre')
  const shares = sharesBy(books, field)
  const total = shares.reduce((sum, s) => sum + s.count, 0)

  const name = (key: string | null) => {
    if (key === null) return t('shares.other')
    if (field === 'language' && key in LANGUAGE_KEYS) return t(LANGUAGE_KEYS[key as 'ru' | 'en'])
    return key
  }

  return (
    <>
      <div className="panel-head">
        <div className="label">{t('shares.title')}</div>
        <Segmented
          name={t('shares.title')}
          value={field}
          options={[
            { value: 'genre', label: t('form.genre') },
            { value: 'language', label: t('form.language') },
          ]}
          onChange={setField}
          className="sm"
        />
      </div>

      {total === 0 ? (
        <div className="empty small">{t('shares.empty')}</div>
      ) : (
        <>
          <div className="shares-bar">
            {shares.map((s, i) => (
              <span
                key={s.key ?? '_rest'}
                style={{ width: `${(s.count / total) * 100}%`, background: HUES[i % HUES.length] }}
              />
            ))}
          </div>
          <ul className="shares-legend">
            {shares.map((s, i) => (
              <li key={s.key ?? '_rest'}>
                <span className="cat-dot" style={{ background: HUES[i % HUES.length] }} />
                <span>{name(s.key)}</span>
                <span className="mono small muted">{s.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
