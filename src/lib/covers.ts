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
  { bg: '#2b3a44', ink: '#eceff1' }, // slate
  { bg: '#3a4f5c', ink: '#eaeef1' }, // steel
  { bg: '#4a4f58', ink: '#edeef0' }, // graphite
  { bg: '#54453f', ink: '#f1ecea' }, // espresso
  { bg: '#3f4a5e', ink: '#ebedf2' }, // indigo slate
  { bg: '#5a4a52', ink: '#f1ecee' }, // burgundy grey
  { bg: '#3d534f', ink: '#eaefed' }, // deep sage
  { bg: '#4a4258', ink: '#eeecf2' }, // muted aubergine
]

/** Same title, same colour, every time and on every device. */
export function toneOf(seed: string): Tone {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}
