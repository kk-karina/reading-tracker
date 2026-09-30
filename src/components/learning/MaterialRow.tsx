import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { sourceOf } from '../../lib/learning/cover'
import type { Material } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { MaterialCover } from './MaterialCover'

/** Куда вернуться из материала — то же, что все ссылки раздела кладут в state. */
export interface From {
  to: string
  label: string
}

/**
 * Карточка материала.
 *
 * Одна на все списки: очередь на дашборде, бэклог, пройденное и «изучаю».
 * Раньше один и тот же материал был подписанной обложкой на дашборде,
 * бесплотной строкой в бэклоге и карточкой без обложки в «изучаю» — три
 * непохожих предмета вместо одного, и узнавать его приходилось заново в
 * каждом разделе.
 *
 * Обложка стоит справа и уходит за край карточки. Слева её ширина двигала бы
 * начало текста у каждого вида по-своему: у книги кадр стоячий, у статьи и
 * курса лежачий. Справа ширина свободна, поэтому баннер виден целиком, а не
 * центральной третью, как было в общем кадре 3:4.
 *
 * Всё, что список добавляет от себя — прогресс, действия, отметка статуса, —
 * приходит детьми и встаёт под подписью. Сама карточка про них не знает, и
 * поэтому у неё нет версии «для бэклога» и версии «для изучаю».
 *
 * Нажимается вся карточка, а не одно название. Ссылка по-прежнему одна —
 * заголовок, — но её область растянута на карточку псевдоэлементом: кнопку в
 * ссылку вложить нельзя, а второй ссылкой поверх всего пришлось бы объяснять
 * экранному диктору, чем она отличается от первой. Контролы поверх неё стоят
 * на `z-index` и потому остаются нажимаемыми.
 *
 * `badge` — отметка, которой список помечает одну карточку из всех: сейчас это
 * фокус потока. Стоит в строке названия, а не отдельным рядом, потому что
 * отвечает на тот же вопрос, что и название: что это.
 */
export function MaterialRow({
  material,
  slug,
  from,
  className = '',
  badge,
  children,
}: {
  material: Material
  slug: string
  from: From
  className?: string
  /** Отметка в строке названия: чем эта карточка отличается от соседних. */
  badge?: ReactNode
  children?: ReactNode
}) {
  const { t } = useLocale()
  const host = material.url ? sourceOf(material.url) : null

  return (
    <li className={`mat-card${className ? ` ${className}` : ''}`}>
      {/* Ссылка одна — название, — но нажимается вся карточка: её область
          растянута в CSS. Потому внутрь неё ничего нажимаемого не кладут. */}
      <Link className="mat-card-main" to={`/learning/${slug}/m/${material.id}`} state={{ from }}>
        {/* Отметка внутри ссылки, а не рядом: она надпись, а не кнопка, и на
            строке названия ей место по смыслу. Диктор прочтёт её вместе с
            названием — «Фокус» там же и нужен. */}
        <span className="mat-card-titlerow">
          <span className="mat-card-title">{material.title}</span>
          {badge}
        </span>
        <span className="mat-card-sub">
          {[t(`kind.${material.kind}`), material.author, host].filter(Boolean).join(' · ')}
        </span>
      </Link>
      {children}
      {/* После текста и в разметке: читают здесь название, обложкой узнают. */}
      <MaterialCover material={material} size="md" className="mat-card-cover" />
    </li>
  )
}
