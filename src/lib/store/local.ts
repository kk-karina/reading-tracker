import type { LogEntry, Snapshot, Song, Topic } from '../types'
import type { DataStore, NewLog, NewSong, NewTopic } from './types'

const KEY = 'slapthatbass.v1'
const OLD_KEY = 'lowend.v1'

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY)
    if (raw) return JSON.parse(raw) as Snapshot
  } catch {
    /* corrupted or blocked storage: start empty */
  }
  return { topics: [], songs: [], log: [] }
}

function write(snap: Snapshot) {
  localStorage.setItem(KEY, JSON.stringify(snap))
}

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

export const localStore: DataStore = {
  async load() {
    return read()
  },

  async addTopics(items: NewTopic[]) {
    const snap = read()
    const created: Topic[] = items.map((t) => ({ ...t, id: uid(), created_at: now() }))
    snap.topics.push(...created)
    write(snap)
    return created
  },
  async updateTopic(id, patch) {
    const snap = read()
    snap.topics = snap.topics.map((t) => (t.id === id ? { ...t, ...patch } : t))
    write(snap)
  },
  async deleteTopic(id) {
    const snap = read()
    snap.topics = snap.topics.filter((t) => t.id !== id)
    snap.log = snap.log.map((l) => (l.topic_id === id ? { ...l, topic_id: null } : l))
    write(snap)
  },

  async addSong(item: NewSong) {
    const snap = read()
    const s: Song = { ...item, id: uid(), created_at: now(), updated_at: now() }
    snap.songs.push(s)
    write(snap)
    return s
  },
  async updateSong(id, patch) {
    const snap = read()
    snap.songs = snap.songs.map((s) =>
      s.id === id ? { ...s, ...patch, updated_at: now() } : s,
    )
    write(snap)
  },
  async deleteSong(id) {
    const snap = read()
    snap.songs = snap.songs.filter((s) => s.id !== id)
    write(snap)
  },

  async addLog(item: NewLog) {
    const snap = read()
    const l: LogEntry = { ...item, id: uid(), created_at: now() }
    snap.log.push(l)
    write(snap)
    return l
  },
  async updateLog(id, patch) {
    const snap = read()
    snap.log = snap.log.map((l) => (l.id === id ? { ...l, ...patch } : l))
    write(snap)
  },
  async deleteLog(id) {
    const snap = read()
    snap.log = snap.log.filter((l) => l.id !== id)
    write(snap)
  },

  async replaceAll(snap) {
    write(snap)
  },
}
