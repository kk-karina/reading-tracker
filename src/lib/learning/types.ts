import type { IconName } from '../../components/Icon'
import type { NoteTag } from '../types'

/**
 * Акценты выбираются из набора, а не пипеткой: произвольный цвет ломает
 * правило ядра — тонкое рисуется чернилами, акцент живёт в крупных заливках.
 */
export const ACCENTS = ['lemon', 'sage', 'clay', 'slate', 'plum', 'sky', 'sand', 'rose'] as const
export type Accent = (typeof ACCENTS)[number]

export type MaterialKind = 'book' | 'article' | 'course' | 'video' | 'podcast' | 'other'
export type MaterialStatus = 'inbox' | 'active' | 'done' | 'reference' | 'dropped'

/** Категория — таб раздела. Позже вырастет в поток, добавив поля, а не таблицу. */
export interface LearningCategory {
  id: string
  name: string
  icon: IconName
  accent: Accent | null
  /** Markdown-скелет нового конспекта этой категории. Подставляется, не навязывается. */
  outline: string | null
  sort: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Material {
  id: string
  category_id: string
  title: string
  kind: MaterialKind
  author: string | null
  url: string | null
  status: MaterialStatus
  /** Сколько всего глав или частей. У статьи пусто. */
  parts_total: number | null
  sort: number
  created_at: string
  updated_at: string
}

/** Конспект. На главу, а не на материал: так это и пишется на самом деле. */
export interface StudyNote {
  id: string
  material_id: string
  part: string | null // «Глава 1. Nobody Thinks Like You»
  title: string | null
  body: string // markdown, включая ==выделение==
  /** У мысли о книге тег ровно один; конспект длинный и несёт сразу несколько. */
  tags: NoteTag[]
  date: string // YYYY-MM-DD
  sort: number
  created_at: string
  updated_at: string
}

export interface LearningSnapshot {
  categories: LearningCategory[]
  materials: Material[]
  notes: StudyNote[]
}

/** Фабрика, не константа: у общего экземпляра массивы мутировали бы на месте. */
export const emptyLearning = (): LearningSnapshot => ({
  categories: [],
  materials: [],
  notes: [],
})
