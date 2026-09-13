export type CategoryId =
  | 'technique'
  | 'theory'
  | 'groove'
  | 'ear'
  | 'creativity'
  | 'fun'

export interface Topic {
  id: string
  category: CategoryId
  title: string
  sort: number
  created_at: string
}

export type SongStatus = 'backlog' | 'learning' | 'learned'
export type SongSlot = 'easy' | 'growth' | 'dream' | null

export interface Song {
  id: string
  artist: string
  title: string
  status: SongStatus
  link: string | null
  slot: SongSlot
  sort: number
  created_at: string
  updated_at: string
}

export interface LogEntry {
  id: string
  date: string // YYYY-MM-DD
  category: CategoryId
  topic_id: string | null
  minutes: number
  note: string | null
  rating: number | null // 1–5, how the session felt; optional
  created_at: string
}

export interface Snapshot {
  topics: Topic[]
  songs: Song[]
  log: LogEntry[]
}
