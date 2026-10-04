import { todayISO } from '../../lib/format'
import { markPart, setPage, type SessionOp } from '../../lib/learning/sessions'
import type { Material, MaterialPart } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'

/**
 * Прямая правка прогресса — точка главы, номер страницы — вместе с её
 * следом в журнале: занятием за сегодня.
 *
 * Шаг считается до правки материала: «откуда» — это где материал стоял, а
 * не куда его только что передвинули.
 */
export function useDirectProgress() {
  const { sessions, notes, addSession, updateSession, deleteSession, updatePart, updateMaterial } =
    useLearning()

  const apply = async (op: SessionOp | null) => {
    if (!op) return
    if (op.kind === 'add') await addSession(op.session)
    else if (op.kind === 'update') await updateSession(op.id, op.patch)
    else await deleteSession(op.id)
  }

  return {
    togglePart: async (material: Material, part: MaterialPart) => {
      const done = !part.done
      const op = markPart(sessions, notes, material, part.id, done, todayISO())
      await updatePart(part.id, { done })
      await apply(op)
    },
    setPage: async (material: Material, page: number | null) => {
      const op = page === null ? null : setPage(sessions, notes, material, page, todayISO())
      await updateMaterial(material.id, { page_current: page })
      await apply(op)
    },
  }
}
