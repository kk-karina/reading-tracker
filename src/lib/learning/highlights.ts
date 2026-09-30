import { plainText } from './markdown'
import type { StudyNote } from './types'

/**
 * Выделенное маркером — уже сделанный выбор.
 *
 * «Мысль недели» не требует ни нового поля, ни отдельного действия: `==...==`
 * в конспекте это и есть пометка «здесь главное». Отдельный флажок заставлял
 * бы выбирать второй раз то, что уже выбрано.
 */
export interface Highlight {
  text: string
  noteId: string
  materialId: string
}

/** Тот же синтаксис, что понимает `renderMarkdown`, и так же не через строку. */
const MARK = /==([^\n=]+?)==/g

export function extractHighlights(notes: StudyNote[]): Highlight[] {
  const out: Highlight[] = []
  for (const n of notes) {
    for (const m of n.body.matchAll(MARK)) {
      const text = m[1].trim()
      // Пустое выделение — опечатка, а не мысль.
      if (text) out.push({ text, noteId: n.id, materialId: n.material_id })
    }
  }
  return out
}

/** Строка, которой конспект показывается снаружи. */
export interface Excerpt {
  text: string
  /**
   * Отчёркнута маркером, а не взята с начала. Дашборд рисует такую лимоном:
   * заливка тогда не украшение, а ответ — крупно стоит ровно то, что было
   * отмечено рукой, и ничего больше.
   */
  marked: boolean
}

/**
 * Контур, а не мысль: заголовки любого уровня, горизонтальные линии и пустая
 * цитата. Контур конспекта у потока один на все занятия — «Main takeaway» в
 * каждом третьем конспекте не говорит ни о котором из них.
 */
const OUTLINE = /^\s*(#{1,6}\s|[-*_]{3,}\s*$|>\s*$)/

/**
 * Чем конспект показывается на дашборде.
 *
 * Сначала маркер: `==...==` — это уже сделанный выбор, и спрашивать второй
 * раз нечего. Маркера нет — берётся первая содержательная строка тела: она
 * стоит первой не случайно, с неё конспект и начали писать. Разметка с неё
 * снимается, потому что показывается она строкой, а не листом.
 *
 * Конспект из одного контура ничего не отдаёт вовсе: строка «My correction»
 * на дашборде хуже, чем её отсутствие.
 */
export function excerptOf(note: StudyNote): Excerpt | null {
  const mark = extractHighlights([note])[0]
  if (mark) return { text: mark.text, marked: true }

  for (const line of note.body.split('\n')) {
    if (OUTLINE.test(line)) continue
    const text = plainText(line)
    if (text) return { text, marked: false }
  }
  return null
}
