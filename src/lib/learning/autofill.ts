import type { LinkMeta } from './cover'
import type { MaterialKind } from './types'

/** То, во что автозаполнение может попасть. Строки, а не null: это состояние формы. */
export interface AutofillFields {
  title: string
  author: string
  cover: string
  kind: MaterialKind
}

export interface AutofillPatch {
  title?: string
  author?: string
  cover?: string
  kind?: MaterialKind
}

/**
 * Что из прочитанного по ссылке ложится в форму.
 *
 * Правило одно: **заполняются только пустые поля**. Набранное руками сильнее
 * всего, что вернул чужой сервис, — иначе одно нажатие звёздочки стирает
 * вечер работы, и человек перестаёт её нажимать.
 *
 * У вида правило то же, но «пусто» для переключателя выражено иначе: он не
 * бывает пустым, поэтому форма помнит, трогали ли его руками. Не трогали —
 * догадка по домену подставляется; трогали — она молчит.
 */
export function mergeLinkMeta(
  current: AutofillFields,
  meta: LinkMeta,
  kindTouched: boolean,
): AutofillPatch {
  const patch: AutofillPatch = {}
  if (!current.title.trim() && meta.title) patch.title = meta.title
  if (!current.author.trim() && meta.author) patch.author = meta.author
  if (!current.cover.trim() && meta.cover_url) patch.cover = meta.cover_url
  if (!kindTouched && meta.kind && meta.kind !== current.kind) patch.kind = meta.kind
  return patch
}

/**
 * Нашлось ли по ссылке хоть что-нибудь стоящее.
 *
 * Домен и догадка по домену не считаются: они получаются из самой ссылки без
 * единого запроса и были бы у нас в любом случае. Говорить «нашла» за то, что
 * мы и так знали, значит врать о результате.
 */
export const metaIsEmpty = (meta: LinkMeta): boolean =>
  !meta.title && !meta.author && !meta.cover_url
