/**
 * Обложка из файла.
 *
 * Картинка уезжает в `cover_url` как `data:`-адрес, то есть ложится в тот же
 * снимок localStorage, где лежат конспекты, — а он там одной строкой JSON при
 * лимите около пяти мегабайт на origin. Фотография с телефона в base64 съест
 * его целиком, и упадёт запись всего снимка, а не одной обложки. Поэтому
 * ужимать здесь не оптимизация, а условие работоспособности.
 */

/** Кадр обложки — те же 3:4, что рисует MaterialCover. */
export const COVER_W = 400
export const COVER_H = 533

/** Больше этого файл не читается вовсе: незачем греть память ради отказа. */
export const MAX_INPUT_BYTES = 10 * 1024 * 1024
/** Больше этого не кладётся в снимок. */
export const MAX_OUTPUT_BYTES = 200 * 1024

/** Качества пробуются по очереди, пока результат не влезет. */
const QUALITIES = [0.8, 0.6, 0.45]

export type CoverError = 'type' | 'tooBig' | 'broken'

export class CoverRejected extends Error {
  readonly reason: CoverError
  constructor(reason: CoverError) {
    super(reason)
    this.name = 'CoverRejected'
    this.reason = reason
  }
}

export interface Crop {
  sx: number
  sy: number
  sw: number
  sh: number
}

/**
 * Какой кусок исходника попадёт в кадр 3:4.
 *
 * Кадрирование по центру, а не вписывание с полями: поле сбоку у одной
 * обложки в ряду читается как сбой вёрстки, а срезанный край — нет.
 */
export function coverCrop(width: number, height: number): Crop {
  const want = COVER_W / COVER_H
  const have = width / height

  if (have > want) {
    // Шире кадра: режем по бокам.
    const sw = height * want
    return { sx: (width - sw) / 2, sy: 0, sw, sh: height }
  }
  // Уже кадра или ровно в кадр: режем сверху и снизу.
  const sh = width / want
  return { sx: 0, sy: (height - sh) / 2, sw: width, sh }
}

/** Насколько тяжела картинка, записанная как `data:`-адрес. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

/**
 * Файл → обложка. Бросает `CoverRejected` с внятной причиной, а не возвращает
 * пустоту: человек должен узнать, почему его картинка не взялась.
 */
export async function fileToCover(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new CoverRejected('type')
  if (file.size > MAX_INPUT_BYTES) throw new CoverRejected('tooBig')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new CoverRejected('broken')
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = COVER_W
    canvas.height = COVER_H
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new CoverRejected('broken')

    const { sx, sy, sw, sh } = coverCrop(bitmap.width, bitmap.height)
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, COVER_W, COVER_H)

    for (const q of QUALITIES) {
      const url = canvas.toDataURL('image/jpeg', q)
      if (dataUrlBytes(url) <= MAX_OUTPUT_BYTES) return url
    }
    throw new CoverRejected('tooBig')
  } finally {
    // Битмап держит память вне кучи JS: без явного закрытия она ждёт сборщика.
    bitmap.close()
  }
}
