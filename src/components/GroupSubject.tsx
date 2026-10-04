import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Шапка группы «по книгам» / «по материалам»: обложка, справа название и
 * автор под ним.
 *
 * Та же подпись, что у мысли на дашборде (`BookCredit`), только на ступень
 * крупнее: здесь это заголовок группы, и узнают её по обложке быстрее, чем по
 * названию. В строках журнала книга остаётся маячком — там она не главное.
 */
export function GroupSubject({
  cover,
  title,
  author,
  to,
}: {
  cover?: ReactNode
  title: string
  author?: string | null
  to?: string
}) {
  const body = (
    <>
      {cover}
      <span className="group-subject-text">
        <span className="group-subject-title">{title}</span>
        {author && <span className="group-subject-author">{author}</span>}
      </span>
    </>
  )
  return to ? (
    <Link className="group-subject" to={to}>
      {body}
    </Link>
  ) : (
    <span className="group-subject">{body}</span>
  )
}
