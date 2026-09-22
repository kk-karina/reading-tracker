import { fromISO, todayISO } from '../format'
import { hasParts, partsOf } from './parts'
import type { Material, MaterialPart, StudyNote } from './types'

/** Чем меряется прогресс — от этого зависит подпись под полосой. */
export type ProgressUnit = 'page' | 'part' | 'flag'

export interface MaterialProgress {
  done: number
  total: number | null
  percent: number | null
  unit: ProgressUnit
}

/**
 * Сколько пройдено — по правилу того вида, к которому материал относится.
 *
 * Раньше правило было одно на всех: пройдено то, по чему написан конспект.
 * Оно стояло на верной мысли, что потребление и обучение это не одно и то же,
 * но следствием было то, что цельную статью нельзя закрыть вообще — глав у неё
 * нет, а значит нет и способа отметить её прочитанной. Теперь отметка явная, а
 * «сколько написано» живёт отдельной величиной и отдельной строкой на экране.
 *
 * `total === null` значит «мерить нечем»: страниц не знаем, частей ещё нет.
 * Тогда и полосы не рисуют — врать шириной хуже, чем не показывать.
 */
export function materialProgress(material: Material, parts: MaterialPart[]): MaterialProgress {
  if (material.kind === 'article' || material.kind === 'video') {
    const done = material.status === 'done' ? 1 : 0
    return { done, total: 1, percent: done * 100, unit: 'flag' }
  }

  if (hasParts(material)) {
    const mine = partsOf(parts, material.id)
    const done = mine.filter((p) => p.done).length
    const total = mine.length > 0 ? mine.length : null
    return { done, total, percent: ratio(done, total), unit: 'part' }
  }

  // Книга по страницам. Ноль страниц всего — это «не знаю», а не «книга пуста».
  const total = material.pages_total && material.pages_total > 0 ? material.pages_total : null
  const done = Math.max(0, Math.min(material.page_current ?? 0, total ?? Number.MAX_SAFE_INTEGER))
  return { done, total, percent: ratio(done, total), unit: 'page' }
}

const ratio = (done: number, total: number | null): number | null =>
  total === null || total <= 0 ? null : Math.max(0, Math.min(100, Math.round((done / total) * 100)))

/** Сколько по материалу написано конспектов. Величина своя, не прогресс. */
export const noteCount = (materialId: string, notes: StudyNote[]): number =>
  notes.filter((n) => n.material_id === materialId).length

export interface WeekNotes {
  count: number
  /** В скольких разных днях недели что-то написано. Ритм важнее объёма. */
  days: number
}

/** Последние семь дней, считая сегодняшний. Окно скользящее, а не календарное. */
export function weekNotes(notes: StudyNote[], today: string = todayISO()): WeekNotes {
  const now = fromISO(today).getTime()
  const days = new Set<string>()
  let count = 0
  for (const n of notes) {
    const back = Math.round((now - fromISO(n.date).getTime()) / 86_400_000)
    if (back < 0 || back > 6) continue
    count++
    days.add(n.date)
  }
  return { count, days: days.size }
}
