import type { ReactNode } from 'react'
import { fmtMinutes } from '../../lib/format'
import { partLabel, partWord, partsOf } from '../../lib/learning/parts'
import type { Material, MaterialPart, StudySession } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Icon } from '../Icon'
import { PagesStrip, PartsStrip } from '../log/ProgressStrip'

export interface StudyLine {
  /** Шаг крупно: «+30», «+2», значок «целиком». */
  step: ReactNode
  unit?: string
  /** Подробность шага: «60 → 90», «Лекция 6, Лекция 7». */
  detail: string
  /** Насколько шаг сдвинул материал: полоса или ряд точек. Нет меры — нет. */
  meter?: ReactNode
}

/**
 * Занятие строкой журнала: шаг, единица, подробность.
 *
 * Хуком, а не функцией: имя безымянной части зависит от языка и от её места
 * в списке материала. Одна запись на вкладку «Занятия» потока и на вкладку
 * «Занятия» материала — иначе одно занятие читалось бы в двух местах
 * по-разному.
 *
 * Занятие без шага — посидела, но ничего не закрыла, — меряется временем:
 * это и есть всё, что о нём известно.
 */
export function useStudyLine() {
  const { t, locale } = useLocale()
  return (session: StudySession, material: Material | undefined, parts: MaterialPart[]): StudyLine => {
    if (session.page_from !== null && session.page_to !== null) {
      const total = material?.pages_total
      return {
        step: `+${Math.max(0, session.page_to - session.page_from)}`,
        unit: t('unit.pages'),
        detail: `${session.page_from} → ${session.page_to}`,
        meter: total ? (
          <PagesStrip from={session.page_from} to={session.page_to} total={total} />
        ) : undefined,
      }
    }
    if (session.part_ids.length > 0 || session.started_ids.length > 0) {
      const n = session.part_ids.length
      const word = partWord(material?.kind ?? 'book')
      const mine = material ? partsOf(parts, material.id) : []
      const name = (id: string) => {
        const i = mine.findIndex((p) => p.id === id)
        return i < 0
          ? null
          : partLabel(mine[i], i, (k) => t(word === 'lecture' ? 'part.lecture' : 'part.chapter', { n: k }))
      }
      // Пройденные целиком, затем начатые — со словом: «Лекция 6 наполовину».
      const half = t('part.halfMark')
      const names = [
        ...session.part_ids.map(name),
        ...session.started_ids.map((id) => {
          const named = name(id)
          return named && `${named} ${half}`
        }),
      ]
        .filter(Boolean)
        .join(', ')
      const now = new Set(session.part_ids)
      return {
        // Шаг — пройденное целиком; в счёт «N из M» половинка не идёт. Если
        // целых нет, шаг всё равно был — половинкой.
        step: n > 0 ? `+${n}` : '½',
        unit:
          n > 0
            ? t(word === 'lecture' ? 'unit.lectures' : 'unit.chapters', { n })
            : t(word === 'lecture' ? 'unit.halfLecture' : 'unit.halfChapter'),
        detail: names,
        meter:
          mine.length > 0 ? (
            <PartsStrip
              parts={mine}
              now={now}
              half={new Set(session.started_ids)}
              done={new Set(mine.filter((p) => p.done && !now.has(p.id)).map((p) => p.id))}
            />
          ) : undefined,
      }
    }
    if (session.completed) {
      return { step: <Icon name="circle-check" size={18} />, unit: t('sjournal.whole'), detail: '' }
    }
    return {
      step: session.minutes ? fmtMinutes(session.minutes, locale) : '—',
      detail: '',
    }
  }
}
