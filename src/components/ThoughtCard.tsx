import type { ReactNode } from 'react'
import type { Note } from '../lib/types'
import { useT } from '../state/LocaleContext'
import { NoteMeta } from './NoteMeta'

/**
 * Мысль на бумаге — одна и та же везде, где она показана: в галерее книги, в
 * дневнике под сессией, в листе записи.
 *
 * Правило подложек: вещь — на бумаге, событие — на линейке. Мысль — вещь,
 * её можно перечитать и поправить; сессия — запись о том, что было, и стоит
 * строкой без фона. Раньше мысль в дневнике стояла такой же строкой, как
 * сессия, а на странице книги — карточкой, и одно и то же читалось двумя
 * разными предметами.
 *
 * `flat` — тихая бумага для лент: без спирали, чтобы длинный список не рябил.
 */
export function ThoughtCard({
  note,
  flat,
  meta,
  credit,
  onEdit,
}: {
  note: Pick<Note, 'tag' | 'body' | 'page'>
  flat?: boolean
  /** Когда и о чём — после страницы, мелко: см. `NoteMeta`. */
  meta?: ReactNode[]
  /** Книга подписью под чертой — обложка, название, автор. Там, где мысли
      разных книг стоят рядом, а дней над ними нет: на дашборде. */
  credit?: ReactNode
  /** Правка из хранилища: в углу карточки, видна под курсором. */
  onEdit?: () => void
}) {
  const t = useT()
  return (
    <article className={`thought-card${flat ? ' flat' : ''}`} data-tag={note.tag}>
      <span className="label thought-tag">{t(`tag.${note.tag}`)}</span>
      {onEdit && (
        <button type="button" className="link-btn thought-edit" onClick={onEdit}>
          {t('book.edit')}
        </button>
      )}
      <p className="thought-body">{note.body}</p>
      <NoteMeta
        parts={[note.page !== null && t('session.noteOnPage', { n: note.page }), ...(meta ?? [])]}
      />
      {credit}
    </article>
  )
}
