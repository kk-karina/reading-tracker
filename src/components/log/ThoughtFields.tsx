import { useT } from '../../state/LocaleContext'
import { TAGS, type ThoughtDraft } from './drafts'

/**
 * Карточка мысли изнутри: тег, текст, страница.
 *
 * Тег выбирают первым — он меняет подсказку в поле и цвет самой карточки, так
 * что мысль с первых слов выглядит той, какой ляжет в хранилище.
 *
 * Выбор тега — не общий переключатель `Segmented`, а ряд штампов той же
 * гарнитуры, что штамп на готовой карточке (`.thought-tag`): выбранный стоит
 * в рамке ровно так, как ляжет на бумагу, остальные — тихие подписи рядом.
 * Серая рейка переключателя была чужой плоскостью поверх бумаги и спорила с
 * цветом, который тег карточке и даёт.
 *
 * Под рядом — настоящие радиокнопки: стрелки, Tab и диктор работают как у
 * любой группы выбора, рисуется только подпись.
 */
export function ThoughtFields({
  draft,
  patch,
  fresh,
  index,
}: {
  draft: ThoughtDraft
  patch: (p: Partial<ThoughtDraft>) => void
  fresh: boolean
  index: number
}) {
  const t = useT()
  return (
    <>
      <div className="tag-stamps" role="radiogroup" aria-label={`${t('book.notes')} ${index + 1}`}>
        {TAGS.map((tag) => (
          <label key={tag} className="tag-stamp">
            <input
              type="radio"
              name={`tag-${draft.key}`}
              value={tag}
              checked={draft.tag === tag}
              onChange={() => patch({ tag })}
            />
            <span className="label">{t(`tag.${tag}`)}</span>
          </label>
        ))}
      </div>
      <textarea
        className="draft-body"
        rows={3}
        autoFocus={fresh}
        placeholder={t(`tagHint.${draft.tag}`)}
        value={draft.body}
        onChange={(e) => patch({ body: e.target.value })}
      />
      <label className="draft-page small faint mono">
        {t('step.pageShort')}
        <input
          inputMode="numeric"
          aria-label={t('step.pageOf')}
          placeholder="—"
          value={draft.page}
          onChange={(e) => patch({ page: e.target.value.replace(/\D/g, '') })}
        />
      </label>
    </>
  )
}
