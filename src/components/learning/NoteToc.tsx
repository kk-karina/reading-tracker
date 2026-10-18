import { motion } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'
import type { NoteGroup } from '../../lib/learning/notes'
import type { MaterialPart, StudyNote } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { inkSlide } from '../ui'

/**
 * Оглавление конспектов материала: по строке на главу.
 *
 * Заменило ряд чипов над листом. Чип заводился на каждый лист и звался главой
 * или датой, отчего ряд рос с каждым конспектом, а кнопку «Добавить»
 * выдавливало со строки.
 *
 * В колонке только главы, у которых есть листы, — и ни дат, ни счётчиков:
 * раз глава здесь, значит, к ней написано. Сколько листов в главе, говорит
 * сам лист («1 из 2 в главе»), а сквозь все листы подряд ведёт листалка в
 * шапке листа и пачка, `NoteStack`. Число в строке рядом с номером главы
 * читалось вторым номером, а значок вместо числа — загадкой.
 *
 * Глава, чей лист открыт, отмечена лимонной заливкой переключателя, и она
 * переезжает к новой главе, а не загорается заново: видно, откуда и куда
 * сдвинулся.
 */
export function NoteToc({
  groups,
  current,
  label,
  onPick,
  layout,
}: {
  groups: NoteGroup<StudyNote>[]
  /** Открытый лист — по нему находится глава. */
  current: string
  label: (part: MaterialPart, index: number) => string
  /** Открыть главу — то есть её первый лист. */
  onPick: (group: NoteGroup<StudyNote>) => void
  /** Имя для `layoutId` заливки: у колонки и у листа на телефоне свои. */
  layout: string
}) {
  const { t } = useLocale()
  const box = useRef<HTMLElement>(null)
  const on = groups.find((g) => g.notes.some((n) => n.id === current))?.key

  /* Колонка прокручивается сама по себе, когда глав много. Сквозная листалка
     уводит выбор вниз — колонка едет следом ровно настолько, чтобы его было
     видно, страницу при этом не трогая: `scrollIntoView` двигал бы и её. */
  useLayoutEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('[aria-current="true"]')
    const b = box.current
    if (!el || !b || b.scrollHeight <= b.clientHeight) return
    const top = el.offsetTop - 12
    const bottom = el.offsetTop + el.offsetHeight + 12
    if (top < b.scrollTop) b.scrollTop = top
    else if (bottom > b.scrollTop + b.clientHeight) b.scrollTop = bottom - b.clientHeight
  }, [on])

  return (
    <nav className="note-toc" aria-label={t('note.toc')} ref={box}>
      <ul>
        {groups.map((g) => {
          const name = g.part ? label(g.part, g.index) : (g.name ?? t('note.noPart'))
          // Номер — только когда у главы есть имя: безымянная и так зовётся
          // «Главой 3». Столбец номера остаётся и пустым, чтобы имена шли
          // одной линией.
          const n = g.part?.title.trim() ? g.index + 1 : null
          const here = g.key === on
          return (
            <li key={g.key}>
              <button
                type="button"
                className={`note-toc-row${g.key === 'none' ? ' loose' : ''}`}
                aria-current={here || undefined}
                title={name}
                onClick={() => onPick(g)}
              >
                {here && (
                  <motion.span
                    layoutId={`${layout}-mark`}
                    className="note-toc-mark"
                    transition={inkSlide}
                  />
                )}
                <span className="note-toc-n">{n}</span>
                <span className="note-toc-name">{name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
