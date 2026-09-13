import type { LogEntry, Snapshot, Song, Topic } from '../types'

export type NewTopic = Pick<Topic, 'category' | 'title' | 'sort'>
export type NewSong = Pick<Song, 'artist' | 'title' | 'status' | 'link' | 'slot' | 'sort'>
export type NewLog = Pick<LogEntry, 'date' | 'category' | 'topic_id' | 'minutes' | 'note'>

export interface DataStore {
  load(): Promise<Snapshot>

  addTopics(items: NewTopic[]): Promise<Topic[]>
  updateTopic(id: string, patch: Partial<NewTopic>): Promise<void>
  deleteTopic(id: string): Promise<void>

  addSong(item: NewSong): Promise<Song>
  updateSong(id: string, patch: Partial<NewSong>): Promise<void>
  deleteSong(id: string): Promise<void>

  addLog(item: NewLog): Promise<LogEntry>
  updateLog(id: string, patch: Partial<NewLog>): Promise<void>
  deleteLog(id: string): Promise<void>

  /** Local mode only: replace everything with an imported snapshot. */
  replaceAll?(snap: Snapshot): Promise<void>
}
