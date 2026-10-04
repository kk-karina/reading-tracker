import { useState, type CSSProperties } from 'react'
import { toneOf } from '../../lib/covers'
import { sourceName, sourceOf } from '../../lib/compose/linkMeta'
import type { Material } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { KIND_ICON } from './kindIcon'

type Size = 'sm' | 'md' | 'lg' | 'xl'

/**
 * Пропорция кадра — свойство вида, а не константа компонента.
 *
 * Книга стоит, всё остальное лежит: по ссылке на статью или курс приходит
 * баннер Open Graph 1200×630, а у ролика — превью 16:9.
 */
const KIND_AR: Record<Material['kind'], string> = {
  book: '3 / 4',
  article: '16 / 9',
  course: '16 / 9',
  video: '16 / 9',
}

/** Значок растёт вместе с обложкой: на странице материала она размером с книгу. */
const ICON_SIZE: Record<Size, number> = { sm: 14, md: 18, lg: 22, xl: 30 }

/**
 * Обложка материала.
 *
 * Пропорция — по виду. Общий прямоугольник 3:4 стоял здесь ради ровного ряда,
 * но ряду нужен ровный левый край текста, а не общий кадр: в списке обложка
 * стоит справа, и её ширина больше никого не двигает. В книжном кадре от
 * баннера статьи оставалась центральная треть, по которой материал не узнать.
 *
 * Пришедшая по ссылке картинка лежит сверху; под ней всегда нарисованная
 * обложка — цвет по названию, значок вида, источник внизу. Она же остаётся,
 * когда чужой файл исчез: ссылка на обложку — самая быстро протухающая вещь
 * в этой модели, и дыры на её месте быть не должно.
 */
export function MaterialCover({
  material,
  size = 'md',
  className = '',
}: {
  /** Только то, что рисуется: форма показывает обложку черновика, которого ещё нет в базе. */
  material: Pick<Material, 'title' | 'kind' | 'url' | 'cover_url'>
  size?: Size
  className?: string
}) {
  const { t } = useLocale()
  const [broken, setBroken] = useState(false)
  const tone = toneOf(material.title)
  const src = material.cover_url
  // В миниатюре под подпись остаётся около сорока пикселей: «medium.com» в них
  // не влезает, «medium» влезает и узнаётся не хуже. Видна она только когда
  // картинки нет — тогда узнают именно по источнику.
  const host = material.url ? (size === 'sm' ? sourceName : sourceOf)(material.url) : null

  return (
    <div
      className={`mcover mcover-${size}${className ? ` ${className}` : ''}`}
      style={
        {
          '--cover-bg': tone.bg,
          '--cover-ink': tone.ink,
          '--cover-ar': KIND_AR[material.kind],
        } as CSSProperties
      }
      data-kind={material.kind}
    >
      <div className="mcover-art" aria-hidden>
        <Icon name={KIND_ICON[material.kind]} size={ICON_SIZE[size]} />
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
