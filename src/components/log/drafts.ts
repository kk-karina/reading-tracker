import { isBlankNote } from '../../lib/learning/notes'
import type { StudyNote } from '../../lib/learning/types'
import type { Note, NoteTag } from '../../lib/types'
import type { Draft } from './DraftStack'

/*
 * Черновики листов записи — отдельно от карточек, которые их рисуют: листы
 * заводят и сравнивают черновики, не зная, как те выглядят.
 */

export const TAGS: NoteTag[] = ['quote', 'idea', 'question', 'disagree', 'feeling']

/** Мысль о книге в листе. Страница строкой: поле пустым бывает, числом — нет. */
export interface ThoughtDraft extends Draft {
  tag: NoteTag
  body: string
  page: string
}

let seq = 0
/** Ключ новой карточки. Не `Date.now()`: две за одну миллисекунду совпали бы. */
export const draftKey = () => `d${++seq}`

export const thoughtDraft = (page: string): ThoughtDraft => ({
  key: draftKey(),
  tag: 'idea',
  body: '',
  page,
})

export const thoughtDrafts = (notes: Note[]): ThoughtDraft[] =>
  notes.map((n) => ({
    key: n.id,
    id: n.id,
    tag: n.tag,
    body: n.body,
    page: n.page === null ? '' : String(n.page),
  }))

/** Что набрано в черновике — то, что лист сравнивает с сохранённым. */
export const thoughtBlank = (d: ThoughtDraft) => !d.body.trim()

/**
 * Конспект в листе. `partId` пустой — «без главы».
 *
 * Сохранённый конспект в листе занятия не правится: длинный текст правят на
 * его странице, где он лежит целиком. Здесь он стоит свёрнутым — заголовок,
 * выдержка, «Открыть», — чтобы было видно, что занятие уже несёт.
 */
export interface NoteDraft extends Draft {
  body: string
  partId: string
  saved?: StudyNote
}

export const noteDraft = (body: string, partId = ''): NoteDraft => ({
  key: draftKey(),
  body,
  partId,
})

export const savedDrafts = (notes: StudyNote[]): NoteDraft[] =>
  notes.map((n) => ({ key: n.id, id: n.id, body: n.body, partId: n.part_id ?? '', saved: n }))

/** Контур потока, оставленный нетронутым, — тоже ничего не написано. */
export const noteBlank = (outline: string | null) => (d: NoteDraft) =>
  !d.saved && isBlankNote(d.body, outline)
