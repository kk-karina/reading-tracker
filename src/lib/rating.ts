/**
 * Пять лиц для «как прошло». Индекс — оценка минус один. Имена — про то, что
 * на лице, а не номер: картинки лежат в `src/assets/moods/` под этими именами
 * (см. `docs/illustrations/README.md`), подписи — в словаре, `face.1`…`face.5`.
 */
export const MOODS = ['sleepy', 'puzzled', 'cozy', 'bright', 'love'] as const
export type MoodId = (typeof MOODS)[number]

export const moodOf = (r: number | null | undefined): MoodId | null =>
  r && r >= 1 && r <= 5 ? MOODS[r - 1] : null
