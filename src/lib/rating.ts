// Five faces for "how did it go". Index = rating - 1. Labels live in the dictionary.
export const FACES = ['😖', '😕', '😐', '🙂', '😄'] as const

export const face = (r: number | null | undefined) => (r && r >= 1 && r <= 5 ? FACES[r - 1] : null)
