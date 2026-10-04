import { hasParts, partsOf } from './parts'
import type { Material, MaterialPart, MaterialStatus, StudyNote } from './types'

/**
 * Статус материала — из того, что по нему сделано.
 *
 * Раньше его ставили руками переключателем на странице материала. Переключатель
 * спрашивал ровно то, на что страница уже отвечала сама: над ним стоят точки,
 * полоса и «5 из 12». Два ответа на один вопрос неизбежно расходятся — курс
 * закрыт весь, а в списке он всё ещё «в работе», потому что отметить лекции
 * было чем, а переключить статус забыли, — и расходятся молча.
 *
 * Правило одно на все виды: явная отметка «пройдено» сильнее всего, дальше
 * считается сделанное, и только пустое остаётся в очереди.
 *
 * Отметка нужна там, где считать нечего: у статьи и ролика прогресса нет
 * вовсе, у книги может быть неизвестно число страниц. Ставится она в листе
 * занятия галочкой «Прочитано», а не отдельным контролом на странице, — там,
 * где про это и так спрашивают.
 */
export function statusOf(
  material: Material,
  parts: MaterialPart[],
  /** Конспекты и занятия: «за материал садились» говорит любое из двух. */
  notes: Pick<StudyNote, 'material_id'>[],
): MaterialStatus {
  // Отметка сильнее подсчёта: книгу без числа страниц и статью иначе не
  // закрыть, а закрытое подсчётом она не отменяет — закрытое и так закрыто.
  if (material.status === 'done') return 'done'

  const written = notes.some((n) => n.material_id === material.id)

  if (hasParts(material)) {
    const mine = partsOf(parts, material.id)
    const done = mine.filter((p) => p.done).length
    if (mine.length > 0 && done === mine.length) return 'done'
    return done > 0 || written ? 'active' : 'backlog'
  }

  if (material.kind === 'book') {
    const total = material.pages_total ?? 0
    const page = material.page_current ?? 0
    if (total > 0 && page >= total) return 'done'
    return page > 0 || written ? 'active' : 'backlog'
  }

  // Статья и ролик: считать нечего, остаётся написанное по ним.
  return written ? 'active' : 'backlog'
}

/**
 * Снимок, в котором у каждого материала статус уже посчитан.
 *
 * Считается один раз на весь экран, а не в каждом списке по дороге: фильтры
 * материалов, порядок источников и панель очереди спрашивают `m.status`, и
 * подменять его на месте пришлось бы в каждом из них — то есть завести ровно
 * то расхождение, ради устранения которого статус и перестали ставить руками.
 */
export const withStatus = (
  materials: Material[],
  parts: MaterialPart[],
  notes: Pick<StudyNote, 'material_id'>[],
): Material[] => materials.map((m) => ({ ...m, status: statusOf(m, parts, notes) }))
