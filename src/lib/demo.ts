import { CATEGORIES } from './categories'
import { daysAgoISO } from './format'
import type { CategoryId, Snapshot, Song, Topic } from './types'

// Sample data for looking around in local mode. Not anyone's real preferences.
const SAMPLE_SONGS: Array<Pick<Song, 'artist' | 'title' | 'status' | 'slot'>> = [
  { artist: 'Sample', title: 'Easy riff in E', status: 'learned', slot: null },
  { artist: 'Sample', title: 'Verse groove, eighths', status: 'learned', slot: null },
  { artist: 'Sample', title: 'Chorus with rests', status: 'learning', slot: 'easy' },
  { artist: 'Sample', title: 'Slap fragment', status: 'learning', slot: 'growth' },
  { artist: 'Sample', title: 'Twelve-bar walking line', status: 'backlog', slot: 'dream' },
  { artist: 'Sample', title: 'Sixteenth-note funk part', status: 'backlog', slot: null },
  { artist: 'Sample', title: 'Ballad with slides', status: 'backlog', slot: null },
]

// Deterministic pseudo-random so the demo looks the same every time.
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export function buildDemo(topics: Topic[]): Snapshot {
  const rand = rng(7)
  const now = new Date().toISOString()
  const weights: Record<CategoryId, number> = {
    technique: 0.3,
    fun: 0.28,
    groove: 0.16,
    theory: 0.12,
    ear: 0.09,
    creativity: 0.05,
  }
  const pickCat = (): CategoryId => {
    let r = rand()
    for (const c of CATEGORIES) {
      r -= weights[c.id]
      if (r <= 0) return c.id
    }
    return 'technique'
  }

  const log: Snapshot['log'] = []
  for (let d = 34; d >= 0; d--) {
    if (rand() < 0.35) continue // rest days
    const blocks = 1 + Math.floor(rand() * 3)
    for (let b = 0; b < blocks; b++) {
      const category = pickCat()
      const pool = topics.filter((t) => t.category === category)
      const topic = pool.length && rand() < 0.8 ? pool[Math.floor(rand() * Math.min(pool.length, 5))] : null
      log.push({
        id: crypto.randomUUID(),
        date: daysAgoISO(d),
        category,
        topic_id: topic?.id ?? null,
        minutes: [5, 8, 10, 10, 12, 15, 20, 25][Math.floor(rand() * 8)],
        note: rand() < 0.3 ? 'Kept it slow. Clean attacks before speed.' : null,
        rating: rand() < 0.7 ? 2 + Math.floor(rand() * 4) : null,
        created_at: now,
      })
    }
  }

  const songs: Song[] = SAMPLE_SONGS.map((s, i) => ({
    ...s,
    id: crypto.randomUUID(),
    link: null,
    sort: i,
    created_at: now,
    updated_at: now,
  }))

  return { topics, songs, log }
}
