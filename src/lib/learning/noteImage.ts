/**
 * Картинка в конспекте.
 *
 * В markdown она стоит своей строкой — `![](data:image/…)`, — как её записал
 * бы любой редактор, и читается глазами в чужом. Своя строка, а не место в
 * тексте: и поле, и готовый лист кладут строку блоком, и картинка между двумя
 * словами всё равно встала бы под ними.
 *
 * Адрес — только `data:` с картинкой внутри. Это не упрощение, а граница
 * безопасности: адрес уходит в `src` как есть, и чужой адрес из вставленного
 * текста сделал бы конспект окном наружу — счётчиком просмотров, например.
 * Алфавит base64 заодно не содержит ни кавычек, ни скобок, и вылезти из
 * атрибута такому адресу нечем.
 */

import { CoverRejected, dataUrlBytes, MAX_INPUT_BYTES } from '../compose/imageCover'

const SRC = 'data:image/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}'

/** Годится ли адрес в `src` картинки конспекта. */
export const NOTE_IMAGE_SRC = new RegExp(`^${SRC}$`)

/** Строка конспекта, которая целиком — картинка. Подпись — внутри скобок. */
export const NOTE_IMAGE_LINE = new RegExp(`^!\\[([^\\]\\n]*)\\]\\((${SRC})\\)$`)

/** Картинка где угодно в тексте — чтобы снять её, где нужен один текст. */
export const NOTE_IMAGE_ANY = new RegExp(`!\\[[^\\]\\n]*\\]\\(${SRC}\\)`, 'g')

export const noteImageMd = (src: string) => `![](${src})`

/**
 * Ширина, до которой картинка ужимается. Колонка листа — около 700 точек, и
 * вдвое больше хватает на ретину; шире ничего не прибавит, кроме веса.
 * Длинный скриншот режется не по ширине, а по высоте — отдельным порогом.
 */
const MAX_W = 1400
const MAX_H = 2800

/**
 * Больше этого одна картинка не весит. Конспект целиком лежит одной строкой —
 * и в Supabase, и в снимке localStorage, где на всё около пяти мегабайт, —
 * поэтому порог ниже, чем у фотографии, и выше, чем у обложки: на скриншоте
 * слайда должен читаться мелкий текст.
 */
export const MAX_NOTE_IMAGE_BYTES = 350 * 1024

/** Качества по очереди, затем — тот же круг на кадре помельче. */
const QUALITIES = [0.85, 0.72, 0.6]
const SHRINK = 0.75
const SHRINK_STEPS = 3

/**
 * Файл из буфера → `data:`-адрес. Ошибки — те же, что у обложки, и с теми же
 * словами: «не картинка», «слишком тяжёлая», «не читается» — одно и то же,
 * откуда бы картинка ни пришла.
 *
 * WebP, где браузер его умеет: скриншот с текстом в нём вдвое легче JPEG при
 * той же чёткости. Safari отдаёт вместо него PNG — это узнаётся по префиксу, и
 * тогда идёт JPEG на белом: прозрачное в JPEG иначе стало бы чёрным.
 */
export async function fileToNoteImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new CoverRejected('type')
  if (file.size > MAX_INPUT_BYTES) throw new CoverRejected('tooBig')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new CoverRejected('broken')
  }

  try {
    let scale = Math.min(1, MAX_W / bitmap.width, MAX_H / bitmap.height)
    for (let step = 0; step < SHRINK_STEPS; step++, scale *= SHRINK) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new CoverRejected('broken')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      for (const q of QUALITIES) {
        let url = canvas.toDataURL('image/webp', q)
        if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', q)
        if (dataUrlBytes(url) <= MAX_NOTE_IMAGE_BYTES) return url
      }
    }
    throw new CoverRejected('tooBig')
  } finally {
    // Битмап держит память вне кучи JS: без явного закрытия она ждёт сборщика.
    bitmap.close()
  }
}
