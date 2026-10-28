/**
 * Картинки призов — зашитый набор, а не загрузка: их рисовала Карина под
 * стиль приложения, и чужая фотография в лимонном круге выглядела бы
 * заплаткой. Пополнить набор — положить файл в `src/assets/stickers` с
 * именем-id; список соберётся сам.
 *
 * `h` — герои на жёлтом круге, `o` — вещи на бумаге. Порядок — как на листах
 * Карины.
 */
const files = import.meta.glob<string>('../../assets/stickers/*.webp', {
  eager: true,
  import: 'default',
})

const SRC: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.webp'.length), url]),
)

const ids = Object.keys(SRC).sort()
export const STICKER_SETS = {
  heroes: ids.filter((id) => id.startsWith('h')),
  things: ids.filter((id) => id.startsWith('o')),
} as const
export type StickerSet = keyof typeof STICKER_SETS

/** Шаг без картинки всё равно открывается призом: подарком из набора вещей. */
export const DEFAULT_STICKER = 'o03'

/** Адрес картинки; неизвестный id (набор поменялся) — картинка по умолчанию. */
export const stickerSrc = (id: string | null) => SRC[id ?? ''] ?? SRC[DEFAULT_STICKER]

export const setOf = (id: string | null): StickerSet => (id?.startsWith('o') ? 'things' : 'heroes')
