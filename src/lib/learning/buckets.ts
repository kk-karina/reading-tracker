import type { Material, MaterialStatus } from './types'

/**
 * Вкладки бэклога в порядке разбора: входящее решается первым, архив смотрят
 * последним. «В работе» здесь нет намеренно — это отдельный экран, потому что
 * бэклог это очередь решений, а не список дел. В одном списке очередь
 * перестают разбирать.
 */
export const BACKLOG_TABS = ['inbox', 'someday', 'reference', 'archive'] as const
export type BacklogTab = (typeof BACKLOG_TABS)[number]

const ARCHIVE: MaterialStatus[] = ['done', 'dropped']

const ofStream = (materials: Material[], streamId: string) =>
  materials.filter((m) => m.stream_id === streamId)

/** Что изучается прямо сейчас. */
export function studying(materials: Material[], streamId: string): Material[] {
  return ofStream(materials, streamId).filter((m) => m.status === 'active')
}

export function backlog(materials: Material[], streamId: string, tab: BacklogTab): Material[] {
  const mine = ofStream(materials, streamId)
  return tab === 'archive'
    ? mine.filter((m) => ARCHIVE.includes(m.status))
    : mine.filter((m) => m.status === tab)
}

/** Числа для вкладок и для дашборда — одним проходом по одному правилу. */
export function backlogCounts(materials: Material[], streamId: string): Record<BacklogTab, number> {
  const counts = { inbox: 0, someday: 0, reference: 0, archive: 0 }
  for (const tab of BACKLOG_TABS) counts[tab] = backlog(materials, streamId, tab).length
  return counts
}
