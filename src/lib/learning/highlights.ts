import { fromISO, todayISO } from '../format'
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

/**
 * Номер недели как счётчик, не как дата.
 *
 * Считается от понедельника и в UTC. От эпохи напрямую считать нельзя: 1 января
 * 1970 — четверг, и граница недели уехала бы на четверг. Локальная полночь тоже
 * не годится — переход на летнее время даёт дробные сутки.
 */
function weekIndex(today: string): number {
  const d = fromISO(today)
  const sinceMonday = (d.getDay() + 6) % 7
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday) / 86_400_000)
}

/**
 * Одно выделение на неделю.
 *
 * Выбор считается из номера недели, а не случайно и не из хранилища: внутри
 * недели он не прыгает при каждой перерисовке, а в понедельник меняется сам.
 */
export function thoughtOfWeek(list: Highlight[], today: string = todayISO()): Highlight | null {
  if (list.length === 0) return null
  // Остаток может быть отрицательным для дат до эпохи — приводим в диапазон.
  const i = ((weekIndex(today) % list.length) + list.length) % list.length
  return list[i]
}
