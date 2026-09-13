import type { IconName } from '../components/Icon'
import type { CategoryId } from './types'

export interface Category {
  id: CategoryId
  name: string
  short: string
  scope: string
  color: string // vivid: marks, tints
  deep: string // deep: text and fills under white text (≥ 4.5:1 on white)
  icon: IconName
}

// The six categories from the brief. Order is fixed and used for the rose chart.
// Colors are a validated categorical set (see dataviz checks); the brand green stays for UI chrome.
export const CATEGORIES: Category[] = [
  {
    id: 'technique',
    color: '#00a884',
    deep: '#007a5e',
    icon: 'settings',
    name: 'Technique',
    short: 'Technique',
    scope: 'Fingerstyle, muting, string crossing, articulation, speed and slap.',
  },
  {
    id: 'theory',
    color: '#6c4cff',
    deep: '#4f35d6',
    icon: 'book',
    name: 'Theory & Fretboard',
    short: 'Theory',
    scope: 'Notes, intervals, chord tones, scales and harmonic movement on the bass.',
  },
  {
    id: 'groove',
    color: '#0aa6d6',
    deep: '#0076a3',
    icon: 'wavy',
    name: 'Time & Groove',
    short: 'Groove',
    scope: 'Pulse, subdivisions, note lengths, rests, accents, syncopation and swing.',
  },
  {
    id: 'ear',
    color: '#2f6bff',
    deep: '#1f4fd6',
    icon: 'headphones',
    name: 'Ear & Transcription',
    short: 'Ear',
    scope: 'Learn real bass parts by listening, singing and finding them on the instrument.',
  },
  {
    id: 'creativity',
    color: '#f4552b',
    deep: '#c93a12',
    icon: 'bulb',
    name: 'Creativity',
    short: 'Creativity',
    scope: 'Create grooves, variations, fills and walking bass lines.',
  },
  {
    id: 'fun',
    color: '#ff1dce',
    deep: '#b21a98',
    icon: 'cupcake',
    name: 'Fun & Repertoire',
    short: 'Fun',
    scope: 'Favourite riffs and songs, with tabs or tutorials allowed.',
  },
]

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>
