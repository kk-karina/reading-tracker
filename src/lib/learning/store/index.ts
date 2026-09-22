import { localLearning } from './local'
import type { LearningStore } from './types'

/** Одна реализация сегодня. Точка, где появится supabaseLearning, не трогая экраны. */
export const learningStore: LearningStore = localLearning
export type {
  LearningStore,
  NewMaterial,
  NewMaterialPart,
  NewStream,
  NewStudyNote,
} from './types'
