/**
 * Имена аватаров — про то, чем герой занят или во что одет, а не номер в
 * паке: номер ломается, стоит паку поменять порядок, а в профиле он уже
 * записан. Порядок здесь — порядок сетки в листе выбора, как в исходном паке.
 *
 * Список живёт отдельно от картинок, чтобы состояние входа знало, какие имена
 * настоящие, не таща за собой двадцать файлов.
 */
export const AVATAR_IDS = [
  'shades', 'books', 'music', 'coffee', 'cap',
  'cheeks', 'reading', 'bun', 'glasses', 'cat',
  'panama', 'hair', 'pencil', 'hoodie', 'roof',
  'headphones', 'flower', 'hug', 'ponytail', 'stack',
] as const

export type AvatarId = (typeof AVATAR_IDS)[number]

/** В профиле может лежать что угодно — в том числе имя из пака, которого уже нет. */
export function isAvatarId(v: unknown): v is AvatarId {
  return typeof v === 'string' && (AVATAR_IDS as readonly string[]).includes(v)
}

export function randomAvatar(rand: () => number = Math.random): AvatarId {
  return AVATAR_IDS[Math.floor(rand() * AVATAR_IDS.length) % AVATAR_IDS.length]
}
