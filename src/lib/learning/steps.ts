import type { StreamStep } from './types'

/**
 * Лесенка шагов к цели потока — правила, которым подчиняется и экран, и
 * правка. Хранилищу они не нужны: оно кладёт строки как есть, а что значит
 * «текущий» и «главный», решается здесь, по порядку.
 *
 * Главный инвариант — закрытые шаги идут подряд с начала. Закрыть можно
 * только текущий, снять закрытие — только у последнего закрытого, и
 * переставлять можно только то, что впереди. Тогда «текущий» — всегда первый
 * незакрытый, и ему не нужен свой флаг.
 */

/** Шаги потока по порядку. Одинаковый `sort` разводит время заведения. */
export function stepsOf(steps: readonly StreamStep[], streamId: string): StreamStep[] {
  return steps
    .filter((x) => x.stream_id === streamId)
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at))
}

/** Сколько шагов закрыто — они же стоят первыми. */
export const doneCount = (list: readonly StreamStep[]) => {
  let n = 0
  while (n < list.length && list[n].done_on) n++
  return n
}

/** Текущий шаг — первый незакрытый; все закрыты — `null`. */
export const currentStep = (list: readonly StreamStep[]): StreamStep | null =>
  list[doneCount(list)] ?? null

/** Главный приз — место, а не флаг: последний шаг по порядку. */
export const isFinal = (list: readonly StreamStep[], id: string) =>
  list.length > 0 && list[list.length - 1].id === id

/** Закрыть можно только текущий: иначе закрытые перестанут идти подряд. */
export const canComplete = (list: readonly StreamStep[], id: string) => currentStep(list)?.id === id

/** Снять закрытие — только у последнего закрытого, по той же причине. */
export const canUndo = (list: readonly StreamStep[], id: string) => {
  const n = doneCount(list)
  return n > 0 && list[n - 1].id === id
}

/** Пройденные не двигаются, и выше них ничего не поднять. */
export const canMove = (list: readonly StreamStep[], from: number, to: number) => {
  const n = doneCount(list)
  return from >= n && to >= n && from < list.length && to < list.length
}

/**
 * Перестановка: новый порядок и `sort` только у тех, кто сдвинулся.
 * Нельзя — пусто, и вызывающему нечего писать.
 */
export function reorder(
  list: readonly StreamStep[],
  from: number,
  to: number,
): { id: string; sort: number }[] {
  if (from === to || !canMove(list, from, to)) return []
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next.flatMap((x, i) => (x.sort === i ? [] : [{ id: x.id, sort: i }]))
}

/** Новый шаг встаёт в конец. */
export const nextSort = (list: readonly StreamStep[]) =>
  list.length ? Math.max(...list.map((x) => x.sort)) + 1 : 0

/**
 * Возглас для праздника — по номеру, без повтора подряд. У последнего шага
 * свой, отдельный (`null` здесь — знак вызывающему взять его).
 */
export function pickCheer(count: number, last: number, rnd: number, final: boolean): number | null {
  if (final) return null
  if (count <= 1) return 0
  const i = Math.floor(rnd * (count - 1))
  // Числа от 0 до count−2 раскладываются по всем, кроме прошлого: вероятности
  // ровные, и повтор невозможен без цикла «бросай, пока не выпадет другое».
  return last >= 0 && i >= last ? i + 1 : i
}
