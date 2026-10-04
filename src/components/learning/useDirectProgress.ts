import { todayISO } from '../../lib/format'
import { nextPartState, type PartState } from '../../lib/learning/parts'
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
    /** Шаг цикла от того, как точка выглядит сейчас: `state` — из `partState`. */
    togglePart: async (material: Material, part: MaterialPart, state: PartState) => {
      const today = todayISO()
      const to = nextPartState(state)
      // Начата сегодня и сегодня же пройдена — одно «пройдена»: флаг начатой
      // уходит вместе с отметкой в занятии, иначе откат занятия оставил бы
      // часть начатой. Начатая в другой день остаётся начатой под отметкой.
      const startedToday = sessions.some(
        (s) => s.material_id === material.id && s.date === today && s.started_ids.includes(part.id),
      )
      const patch: Partial<MaterialPart> =
        to === 'started'
          ? { started: true }
          : to === 'done'
            ? { done: true, ...(startedToday ? { started: false } : {}) }
            : { done: false, started: false }
      const op = markPart(sessions, notes, material, part.id, to, today)
      await updatePart(part.id, patch)
      await apply(op)
    },
  }
}
