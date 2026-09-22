import { useState, type CSSProperties } from 'react'
import { toneOf } from '../../lib/covers'
import { sourceOf } from '../../lib/learning/cover'
import type { Material } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Icon, type IconName } from '../Icon'

type Size = 'sm' | 'md' | 'lg'

/** Значок вида — единственное, что отличает курс от статьи, когда обложки нет. */
const KIND_ICON: Record<Material['kind'], IconName> = {
  book: 'book',
  article: 'pen',
  course: 'compass',
  video: 'chart-bar',
}

/**
 * Обложка материала.
 *
 * Один прямоугольник 3:4 на все виды — не потому, что ролик такой формы, а
 * потому что ряд из книги, статьи и подкаста с тремя разными пропорциями
 * читается как сбой вёрстки. Картинка вписывается кадрированием.
 *
 * Пришедшая по ссылке картинка лежит сверху; под ней всегда нарисованная
 * обложка — цвет по названию, значок вида, домен внизу. Она же остаётся,
 * когда чужой файл исчез: ссылка на обложку — самая быстро протухающая вещь
 * в этой модели, и дыры на её месте быть не должно.
 */
export function MaterialCover({
  material,
  size = 'md',
  className = '',
}: {
  material: Material
  size?: Size
  className?: string
}) {
  const { t } = useLocale()
  const [broken, setBroken] = useState(false)
  const tone = toneOf(material.title)
  const src = material.cover_url
  const host = material.url ? sourceOf(material.url) : null

  return (
    <div
      className={`mcover mcover-${size}${className ? ` ${className}` : ''}`}
      style={{ '--cover-bg': tone.bg, '--cover-ink': tone.ink } as CSSProperties}
      data-kind={material.kind}
    >
      <div className="mcover-art" aria-hidden>
        <Icon name={KIND_ICON[material.kind]} size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />
        <span className="mcover-title">{material.title}</span>
        <span className="mcover-foot">{host ?? t(`kind.${material.kind}`)}</span>
      </div>
      {src && !broken && (
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
      )}
      <span className="mcover-sheen" aria-hidden />
    </div>
  )
}
