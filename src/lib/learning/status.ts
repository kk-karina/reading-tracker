import { hasParts, partsOf } from './parts'
import type { Material, MaterialPart, MaterialStatus, StudyNote } from './types'

/**
 * Статус материала.
 *
 * «Завершено» ставится только явно — кнопкой на странице материала или
 * галочкой «Прочитано» в листе занятия. Раньше пройденный подсчётом курс
 * закрывался сам, и это не давало вернуть его в работу: снятый статус тут же
 * возвращался подсчётом обратно. А у практики «всё пройдено» нет вовсе —
 * закончить её можно только решением.
 *
 * «В работе» по-прежнему выводится: материал взят явно («Взять в работу»,
 * выбор фокусом — это хранимый `active`) или по нему уже что-то сделано.
 * Пустое остаётся в бэклоге.
 */
export function statusOf(
  material: Material,
  parts: MaterialPart[],
  /** Конспекты и занятия: «за материал садились» говорит любое из двух. */
  touched: Pick<StudyNote, 'material_id'>[],
): MaterialStatus {
  if (material.status === 'done') return 'done'
  if (material.status === 'active') return 'active'
  return moved(material, parts, touched) ? 'active' : 'backlog'
}

/** Сделано ли по материалу хоть что-то: занятие, конспект, глава, страница. */
function moved(
  material: Material,
  parts: MaterialPart[],
  touched: Pick<StudyNote, 'material_id'>[],
): boolean {
  if (touched.some((n) => n.material_id === material.id)) return true
  if (hasParts(material)) return partsOf(parts, material.id).some((p) => p.done)
  return (material.page_current ?? 0) > 0
}

/**
 * Пройден ли материал подсчётом: все главы отмечены, страница дошла до
 * последней, у практики — набрана цель.
 *
 * Сам по себе статуса не меняет — только подсказывает кнопке «Завершить»,
 * что пора (см. страницу материала). `practiced` — накопленное практикой в
 * единицах её шкалы: её прогресс живёт в занятиях, а не на материале.
 */
export function finishedByCount(
  material: Material,
  parts: MaterialPart[],
  practiced: number,
): boolean {
  if (material.kind === 'practice') return material.target !== null && material.target > 0 && practiced >= material.target
  if (hasParts(material)) {
    const mine = partsOf(parts, material.id)
    return mine.length > 0 && mine.every((p) => p.done)
  }
  if (material.kind === 'book') {
    const total = material.pages_total ?? 0
    return total > 0 && (material.page_current ?? 0) >= total
  }
  return false
}

/**
 * Снимок, в котором у каждого материала статус уже посчитан.
 *
 * Считается один раз на весь экран, а не в каждом списке по дороге: фильтры
 * материалов, порядок источников и панель очереди спрашивают `m.status`, и
 * подменять его на месте пришлось бы в каждом из них — то есть завести
 * расхождение между списками.
 */
export const withStatus = (
  materials: Material[],
  parts: MaterialPart[],
  touched: Pick<StudyNote, 'material_id'>[],
): Material[] => materials.map((m) => ({ ...m, status: statusOf(m, parts, touched) }))

/**
 * Разовая поправка хранимых статусов под правило выше.
 *
 * До него «Завершено» выводилось из подсчёта, а хранимый `active` из времён
 * ручного статуса подсчёт игнорировал. Без поправки пройденные курсы
 * переехали бы в «В работе», а давно брошенные — из бэклога в работу. Здесь
 * хранимое приводится к тому, что было на экране до смены правила. Та же
 * поправка — в `supabase/migrations/011_practice.sql`.
 *
 * Только разовая: повторный прогон закрыл бы заново то, что вернули в работу
 * кнопкой.
 */
export function settleStatuses(
  materials: Material[],
  parts: MaterialPart[],
  touched: Pick<StudyNote, 'material_id'>[],
): Material[] {
  return materials.map((m) => {
    if (m.status === 'done') return m
    if (finishedByCount(m, parts, 0)) return { ...m, status: 'done' }
    if (m.status === 'active' && !moved(m, parts, touched)) return { ...m, status: 'backlog' }
    return m
  })
}
