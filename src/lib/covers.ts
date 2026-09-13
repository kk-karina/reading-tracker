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
  { bg: '#2f5d78', ink: '#eaf2f7' }, // sea blue
  { bg: '#6b4f6b', ink: '#f5ecf3' }, // dusty plum
  { bg: '#2f5f6b', ink: '#e8f2f3' }, // deep teal
  { bg: '#7b5a70', ink: '#f8eef3' }, // mauve
  { bg: '#4a5580', ink: '#ecEEF8' }, // periwinkle
  { bg: '#8a6478', ink: '#faeff3' }, // dusty rose
  { bg: '#3b6b73', ink: '#e9f3f4' }, // sea green
  { bg: '#574f72', ink: '#efedf6' }, // muted violet
]

/** Same title, same colour, every time and on every device. */
export function toneOf(seed: string): Tone {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}
