import { todayISO } from '../../lib/format'
import { markPart, type SessionOp } from '../../lib/learning/sessions'
import type { Material, MaterialPart } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'

/**
 * Прямая правка прогресса — точка главы — вместе с её
 * следом в журнале: занятием за сегодня.
 */
export function useDirectProgress() {
  const { sessions, notes, addSession, updateSession, deleteSession, updatePart } = useLearning()

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
  }
}
