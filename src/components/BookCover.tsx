import { useState, type CSSProperties } from 'react'
import { toneOf } from '../lib/covers'
import type { Book } from '../lib/types'

type Size = 'xs' | 'sm' | 'md' | 'lg'

/**
 * A book standing up: cloth colour, a spine down the left edge, light from the
 * top-left, and a shadow that lifts it off the shelf. A fetched image sits on
 * top; when there is none — or the link has rotted — the drawn cover shows
 * through, which is the normal case for Russian editions.
 *
 * At `xs` the drawn title is dropped and only the cloth and the spine remain:
 * a thumbnail beside a line of text is there to be recognised, not read.
 */
export function BookCover({ book, size = 'md' }: { book: Book; size?: Size }) {
  const [broken, setBroken] = useState(false)
  const tone = toneOf(book.title)
  const showImage = !!book.cover_url && !broken

  return (
    <div
      className={`cover cover-${size}`}
      style={{ '--cover-bg': tone.bg, '--cover-ink': tone.ink } as CSSProperties}
    >
      {showImage ? (
        <img src={book.cover_url ?? ''} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <div className="cover-art">
          <span className="cover-title">{book.title}</span>
          {book.author && <span className="cover-author">{book.author}</span>}
        </div>
      )}
      <span className="cover-spine" aria-hidden />
      <span className="cover-sheen" aria-hidden />
    </div>
  )
}
