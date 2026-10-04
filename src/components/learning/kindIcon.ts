import type { MaterialKind } from '../../lib/learning/types'
import type { IconName } from '../Icon'

/**
 * Значок вида — один на всё приложение.
 *
 * Он стоит в переключателе формы, на нарисованной обложке и в ряду списка, и
 * человек учится ему в одном месте, а узнаёт в другом. Поэтому значок не
 * выбирается по месту, а берётся отсюда.
 */
export const KIND_ICON: Record<MaterialKind, IconName> = {
  book: 'book',
  article: 'file-document',
  course: 'monitor-play',
  video: 'play-circle',
}
