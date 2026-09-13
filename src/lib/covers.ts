/**
 * Drawn covers for the books no catalogue knows — which, for Russian editions,
 * is most of them. Deep book-cloth tones rather than generated hues: eight
 * curated colours always look deliberate, an arbitrary hue often does not.
 */
export interface Tone {
  bg: string
  ink: string
}

const TONES: Tone[] = [
  { bg: '#1f3a34', ink: '#f1eee4' }, // deep green
  { bg: '#5c1f1f', ink: '#f6ece2' }, // oxblood
  { bg: '#1d2f4a', ink: '#edf1f7' }, // navy
  { bg: '#6b4a12', ink: '#fbf3e2' }, // tobacco
  { bg: '#3e2350', ink: '#f2ecf7' }, // plum
  { bg: '#12464b', ink: '#e8f3f3' }, // teal
  { bg: '#2b2b2e', ink: '#efeeed' }, // charcoal
  { bg: '#7a3418', ink: '#fbeee4' }, // terracotta
]

/** Same title, same colour, every time and on every device. */
export function toneOf(seed: string): Tone {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}
