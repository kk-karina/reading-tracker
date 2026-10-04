import { Link, useLocation } from 'react-router-dom'
import { noteLinkState } from '../learning/noteLink'
import { renderMarkdown } from '../../lib/learning/markdown'
import type { MaterialPart } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { NoteEditor } from '../NoteEditor'
import type { NoteDraft } from './drafts'

export function NoteFields({
  draft,
  patch,
  parts,
  label,
  slug,
  fresh,
}: {
  draft: NoteDraft
  /** Только что добавлена или первая в листе конспекта: курсор в неё. */
  fresh?: boolean
  patch: (p: Partial<NoteDraft>) => void
  /** Из каких частей выбирать. Пусто — выбора нет, у материала глав нет. */
  parts: MaterialPart[]
  label: (part: MaterialPart) => string
  slug: string
}) {
  const { t } = useLocale()
  const location = useLocation()

  if (draft.saved) {
    const part = parts.find((p) => p.id === draft.saved?.part_id)
    return (
      <>
        <span className="label slip-head">{part ? label(part) : t('draft.noPart')}</span>
        <div className="sheet-rule slip-rule" aria-hidden />
        <div
          className="sheet-body slip-body"
          // Безопасно: renderMarkdown экранирует ввод до первого нашего тега.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.saved.body) }}
        />
        <Link
          className="link-btn small draft-open"
          to={`/learning/${slug}/n/${draft.saved.id}`}
          // Поверх текущего экрана: лист занятия под ним остаётся открытым.
          state={noteLinkState(location, [draft.saved.id])}
        >
          {t('draft.open')}
        </Link>
      </>
    )
  }

  // Выбранная часть могла уйти из списка — отметку в занятии сняли. Тогда
  // конспект честно показывает «без главы», а не невидимый выбор.
  const value = parts.some((p) => p.id === draft.partId) ? draft.partId : ''

  return (
    <>
      {parts.length > 0 && (
        <select
          className="select sm draft-part slip-head-pick"
          aria-label={t('draft.part')}
          value={value}
          onChange={(e) => patch({ partId: e.target.value })}
        >
          <option value="">{t('draft.noPart')}</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {label(p)}
            </option>
          ))}
        </select>
      )}
      <div className="sheet-rule slip-rule" aria-hidden />
      <NoteEditor body={draft.body} onBody={(body) => patch({ body })} autoFocus={fresh} />
    </>
  )
}
