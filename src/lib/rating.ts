// Five faces for "how did it go". Index = rating - 1.
export const FACES = ['😖', '😕', '😐', '🙂', '😄'] as const
export const FACE_LABELS = ['rough', 'meh', 'okay', 'good', 'great'] as const

export const face = (r: number | null | undefined) => (r && r >= 1 && r <= 5 ? FACES[r - 1] : null)
