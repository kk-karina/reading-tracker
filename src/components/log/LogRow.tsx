import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../state/LocaleContext'
import { Icon } from '../Icon'

/**
 * Строка журнала: одна сессия или одно занятие.
 *
 * Событие стоит на линейке, без подложки, — правило подложек. Два блока, а
 * не шесть колонок: слева шаг, крупно и моноширинным, — он ведёт; справа от
 * него контекст — маленькая обложка ростом в две строки, рядом название, под
 * ним подробность шага и время мелко, а у правого края полоса «было → стало»
 * книги. Полоса — колонкой постоянной ширины, чтобы полосы всех строк стояли
 * столбиком и сравнивались взглядом, как шаги. Раньше это были колонки во всю ширину: «0 → 88» стояло
 * отдельно от «+88», которое говорит то же самое, между ними зияла дыра, а
 * название книги резалось в узкой колонке справа. Теперь всё, что о шаге, —
 * рядом с шагом, и название книги занимает всю оставшуюся ширину.
 *
 * Когда строки сгруппированы по книге, маячка нет — его место наверху
 * занимает подробность шага.
 *
 * Написанное за сессией в строке не показывается — только значок пера с
 * числом. Нажатие раскрывает его под строкой: мысли живут в своей вкладке,
 * а здесь их видно, только когда о них спросили.
 */
export function LogRow({
  step,
  unit,
  detail,
  subject,
  meter,
  when,
  written,
  open,
  onToggle,
  onEdit,
  children,
}: {
  /** Число шага или знак «целиком». */
  step: ReactNode
  unit?: string
  /** Подробность шага: «120 → 164», «Лекция 6, Лекция 7». */
  detail?: ReactNode
  /** Книга или материал: обложка и название. Нет — строки сгруппированы по нему. */
  subject?: { cover: ReactNode; title: string; to?: string }
  /** Насколько шаг сдвинул книгу: `PagesStrip` или `PartsStrip`. */
  meter?: ReactNode
  /** Время, минуты, как прошло — по частям, пустые выпадут. */
  when?: ReactNode[]
  written: number
  open: boolean
  onToggle: () => void
  onEdit: () => void
  children?: ReactNode
}) {
  const t = useT()
  const reduce = useReducedMotion()

  const filled = (list: ReactNode[]) =>
    list.filter((p) => p !== null && p !== undefined && p !== false && p !== '')
  const title = subject ? (
    subject.to ? (
      <Link className="log-title" to={subject.to}>
        {subject.title}
      </Link>
    ) : (
      <span className="log-title">{subject.title}</span>
    )
  ) : null
  const top = title || detail || null
  const sub = filled(subject ? [detail, ...(when ?? [])] : (when ?? []))

  return (
    <div className={`log-row${open ? ' open' : ''}`}>
      <div className="log-line">
        <span className="log-step">
          <span className="log-num">{step}</span>
          {unit && <span className="log-unit">{unit}</span>}
        </span>

        <div className={`log-ctx${subject ? '' : ' bare'}`}>
          {subject && (
            <span className="log-cover" aria-hidden>
              {subject.cover}
            </span>
          )}
          {top && <div className="log-top">{top}</div>}
          {meter && <div className="log-meter">{meter}</div>}
          {sub.length > 0 && (
            <div className="log-sub">
              {sub.map((p, i) => (
                <span key={i} className="log-sub-part">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        <span className="log-side">
          {written > 0 && (
            <button
              type="button"
              className="log-pen"
              aria-expanded={open}
              aria-label={t(open ? 'log.notesClose' : 'log.notesOpen', { n: written })}
              title={t(open ? 'log.notesClose' : 'log.notesOpen', { n: written })}
              onClick={onToggle}
            >
              <Icon name="pen" size={13} />
              {written}
            </button>
          )}
          <button type="button" className="link-btn log-edit" onClick={onEdit}>
            {t('book.edit')}
          </button>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="log-things"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="log-things-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
