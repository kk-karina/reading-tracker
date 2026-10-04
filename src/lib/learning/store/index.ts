import { supabase } from '../../supabase'
import { localLearning } from './local'
import { createSupabaseLearningStore } from './supabase'
import type { LearningStore } from './types'

/**
 * Настроен Supabase — обучение живёт в нём, нет — в браузере. Тот же выбор и
 * по тому же признаку, что у чтения в `src/lib/store/index.ts`: локальный
 * режим не аварийный, а нормальный способ пользоваться приложением с одного
 * устройства.
 */
export const learningStore: LearningStore = supabase
  ? createSupabaseLearningStore(supabase)
  : localLearning
export type {
  LearningStore,
  NewMaterial,
  NewMaterialPart,
  NewStream,
  NewStudyNote,
  NewStudySession,
} from './types'
