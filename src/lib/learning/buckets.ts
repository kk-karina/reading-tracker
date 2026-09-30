import type { Material, MaterialStatus } from './types'

const ARCHIVE: MaterialStatus[] = ['done', 'dropped']

/**
 * Три состояния материала, как их называет человек, а не база.
 *
 * Экраны «Изучаю» и «Бэклог» были разными адресами, хотя вопрос у них один:
 * «что у меня есть». Разными они делали не содержание, а статус, — а статус
 * это фильтр, а не раздел. Теперь раздел один, и вот его фильтры.
 *
 * Порядок — от горячего к остывшему: за что села, что ждёт, что позади.
 */
export const MATERIAL_VIEWS = ['active', 'backlog', 'done'] as const
export type MaterialView = (typeof MATERIAL_VIEWS)[number]

const VIEW_STATUS: Record<MaterialView, MaterialStatus[]> = {
  active: ['active'],
  backlog: ['backlog'],
  done: ARCHIVE,
}

const ofStream = (materials: Material[], streamId: string) =>
  materials.filter((m) => m.stream_id === streamId)

/**
 * Материал в фокусе — тот, за который села. Ссылка может протухнуть: фокус
 * хранится id и переживает удаление материала, поэтому результат необязателен.
 */
export function focusOf(
  materials: Material[],
  focusId: string | null,
): Material | undefined {
  return focusId ? materials.find((m) => m.id === focusId) : undefined
}

/** Что изучается прямо сейчас. */
export function studying(materials: Material[], streamId: string): Material[] {
  return ofStream(materials, streamId).filter((m) => m.status === 'active')
}

/** Материалы одного фильтра. */
export function materialsOf(
  materials: Material[],
  streamId: string,
  view: MaterialView,
): Material[] {
  const want = VIEW_STATUS[view]
  return ofStream(materials, streamId).filter((m) => want.includes(m.status))
}

/** Числа для рейки фильтров. */
export function materialCounts(
  materials: Material[],
  streamId: string,
): Record<MaterialView, number> {
  const mine = ofStream(materials, streamId)
  const count = (want: MaterialStatus[]) => mine.filter((m) => want.includes(m.status)).length
  return {
    active: count(VIEW_STATUS.active),
    backlog: count(VIEW_STATUS.backlog),
    done: count(VIEW_STATUS.done),
  }
}

/** Насколько материал горячий. Порядок групп в списке источников. */
const HEAT: Record<MaterialStatus, number> = {
  active: 0,
  backlog: 1,
  done: 2,
  dropped: 2,
}

/**
 * Материалы потока в том порядке, в каком их предлагают как источник конспекта.
 *
 * От горячего к остывшему: фокус, работа, очередь, архив. Это не тот же порядок,
 * что на экране материалов, — там материалы отбирают фильтром, а здесь их
 * выбирают одним списком, и первым должно стоять то, за чем сидели последний раз.
 * Архив не отрезается: дописать конспект к пройденной книге — обычное дело.
 *
 * Фокус приходит отдельным доводом, а не читается из потока: указатель может
 * протухнуть или показывать на чужой поток, и тогда список просто начинается
 * с работы.
 */
export function sourceOrder(
  materials: Material[],
  streamId: string,
  focusId: string | null,
): Material[] {
  const heat = (m: Material) => (m.id === focusId ? -1 : HEAT[m.status])
  return ofStream(materials, streamId).sort((a, b) => heat(a) - heat(b) || a.sort - b.sort)
}
