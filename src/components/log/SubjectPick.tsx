import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'
import { Icon } from '../Icon'

/**
 * Шапка листа записи: про что эта запись.
 *
 * Обложка с названием, а не поле «Книга» со списком: лист выглядит как то,
 * что получится, — строка дневника тоже начинается с обложки. Когда лист
 * открыт со страницы самой книги или материала, выбирать нечего, и шапка
 * просто называет предмет. Когда открыт из дневника или с дашборда, по
 * названию раскрывается список с обложками — тем же видом, каким предмет
 * узнаётся везде в приложении, а не голыми строками `<select>`.
 *
 * Список стоит поверх листа и не сдвигает полей под собой: выбор — короткий
 * взгляд, и форма под ним не должна прыгать.
 */
export function SubjectPick<T extends { id: string }>({
  value,
  options,
  onPick,
  cover,
  title,
  author,
  label,
}: {
  value: T
  /** Из чего выбирать. Пусто или один — выбора нет, шапка только называет. */
  options: T[]
  onPick: (id: string) => void
  cover: (item: T, size: 'sm' | 'md') => ReactNode
  title: (item: T) => string
  author: (item: T) => string | null
  /** Чем это зовётся: «Книга», «Источник». Для диктора и подсказки. */
  label: string
}) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const list = useId()
  const choosing = options.length > 1

  const by = author(value)
  const text = (
    <span className="sheet-subject-text">
      <span className="display sheet-title">{title(value)}</span>
      {by && <span className="small muted subject-by">{by}</span>}
    </span>
  )

  return (
    <div
      className="sheet-subject subject-pick"
      // Фокус ушёл из шапки целиком — список больше не нужен. По `relatedTarget`,
      // а не по щелчку снаружи: так же закрывается и табом.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
      onKeyDown={(e) => {
        // Esc сначала закрывает список, а не весь лист: ближняя вещь первой.
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
        }
      }}
    >
      {cover(value, 'md')}
      {choosing ? (
        <button
          type="button"
          className="subject-toggle"
          aria-expanded={open}
          aria-controls={list}
          aria-label={`${label}: ${title(value)}`}
          onClick={() => setOpen(!open)}
        >
          {text}
          <Icon name="chevron-down" size={18} className="icon subject-chevron" />
        </button>
      ) : (
        text
      )}

      <AnimatePresence>
        {open && (
          <motion.ul
            id={list}
            className="subject-list"
            aria-label={label}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-4px) scale(0.98)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {options.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`subject-option${item.id === value.id ? ' on' : ''}`}
                  aria-current={item.id === value.id || undefined}
                  onClick={() => {
                    onPick(item.id)
                    setOpen(false)
                  }}
                >
                  {cover(item, 'sm')}
                  <span className="subject-option-text">
                    <span className="subject-option-title">{title(item)}</span>
                    {author(item) && <span className="small faint">{author(item)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
