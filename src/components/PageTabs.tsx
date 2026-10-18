import { motion } from 'motion/react'
import { Icon } from './Icon'
import { inkSlide, Jelly, Tip } from './ui'

export interface PageTab<T extends string> {
  id: T
  label: string
  /** Сколько внутри. Ноль и `null` не показываются. */
  count?: number | null
  /** Почему вкладка заперта. Есть причина — заперта. */
  locked?: string
  /** Дверь к новому прямо у вкладки: имя листа и как его открыть. */
  add?: { label: string; onClick: () => void }
}

/**
 * Вкладки внутри страницы книги и материала.
 *
 * Плюс стоит у каждой вкладки-списка, а не кнопкой над её содержимым. Над
 * содержимым кнопка делила строку с навигацией и вылетала из неё, как только
 * навигация росла; у вкладки ей тесно не бывает. И у неактивной вкладки плюс
 * тоже виден: записать занятие можно, читая конспект, не переключаясь
 * сначала на «Занятия» ради кнопки.
 *
 * Плюс неактивной вкладки ещё и переключает на неё: то, что сейчас появится,
 * должно появиться перед глазами, а не за соседней вкладкой.
 *
 * Роли `tab` здесь нет: в `tablist` по правилам ARIA не кладут ничего, кроме
 * вкладок, а плюс — кнопка рядом. Выбранную объявляет `aria-pressed`, как
 * у чипов.
 */
export function PageTabs<T extends string>({
  id,
  label,
  items,
  value,
  onChange,
}: {
  /** Имя полосы для `layoutId`: две полосы на экране не должны делить чернила. */
  id: string
  label: string
  items: PageTab<T>[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {items.map((i) => {
        const on = value === i.id
        return (
          <div key={i.id} className={`tab-cell${i.add ? ' has-add' : ''}`}>
            <button
              type="button"
              aria-pressed={on}
              disabled={i.locked !== undefined}
              title={i.locked}
              className={`tab${on ? ' on' : ''}`}
              onClick={() => onChange(i.id)}
            >
              {/* Имя несёт своё имя ещё и атрибутом: по нему `.tab-label`
                  держит ширину жирного начертания всегда — см. `index.css`. */}
              <span className="tab-label" data-label={i.label}>
                {i.label}
              </span>
              {i.count != null && i.count > 0 && <span className="tab-n">{i.count}</span>}
              {on && <motion.span layoutId={`${id}-tab`} className="tab-line" transition={inkSlide} />}
            </button>
            {i.add && (
              <Tip text={i.add.label}>
                <Jelly
                  className="log-dot"
                  aria-label={i.add.label}
                  onClick={() => {
                    onChange(i.id)
                    i.add?.onClick()
                  }}
                >
                  <Icon name="plus" size={13} />
                </Jelly>
              </Tip>
            )}
          </div>
        )
      })}
    </div>
  )
}
