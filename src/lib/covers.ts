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
  { bg: '#4b1d63', ink: '#f4ecf8' }, // aubergine
  { bg: '#8e1e5c', ink: '#fdeaf3' }, // fuchsia wine
  { bg: '#2b2d6b', ink: '#e9ecfb' }, // indigo
  { bg: '#1f5566', ink: '#e6f3f6' }, // satin blue
  { bg: '#6b2f7a', ink: '#f8ecfa' }, // orchid
  { bg: '#a33a6e', ink: '#fdeef4' }, // rose
  { bg: '#2e2a3d', ink: '#eeecf3' }, // slate plum
  { bg: '#3f4a8c', ink: '#eaedf9' }, // periwinkle
]

/** Same title, same colour, every time and on every device. */
export function toneOf(seed: string): Tone {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}
