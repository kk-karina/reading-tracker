import { weekNotes } from '../../lib/learning/metrics'
import { studyStreak } from '../../lib/learning/rhythm'
import { activityDates } from '../../lib/learning/sessions'
import type { StudyNote, StudySession } from '../../lib/learning/types'
import { useLocale } from '../../state/LocaleContext'
import { Counter } from '../ui'

/**
 * Два показания ритма — внутри панели ритма, а не отдельным рядом над ней.
 *
 * Раньше это была трёхколоночная сетка с двумя заполненными колонками: треть
 * ширины экрана уходила в дыру, а числа стояли отдельно от графика, который
 * их объясняет. Теперь это шапка одной панели: показания слева, график под
 * ними, и «4 за 7 дней» читается вместе с тем, как эти четыре дня легли.
 *
 * Страйк считается по всему обучению, а не по потоку, и подпись обязана это
 * говорить: без неё число врёт про поток, на котором стоит.
 */
export function StreamStats({
  streamNotes,
  allNotes,
  allSessions,
}: {
  streamNotes: StudyNote[]
  allNotes: StudyNote[]
  allSessions: StudySession[]
}) {
  const { t } = useLocale()
  const week = weekNotes(streamNotes)
  // День, в который только отметила главы, — тоже день: занятие без текста
  // страйк не рвёт.
  const streak = studyStreak(activityDates(allSessions, allNotes))

  return (
    <div className="readings">
      <div className="reading">
        <div className="reading-num">
          <Counter value={week.count} />
          {/* Единица стоит в подписи, а не после числа: «3 · 3 дня» читается
              как одно число дважды. */}
          <span className="reading-suffix">{t('stream.inDays', { n: week.days })}</span>
        </div>
        <div className="reading-cap">{t('stream.weekNotes')}</div>
      </div>

      <div className="reading">
        <div className="reading-num">
          <Counter value={streak} />
          <span className="reading-suffix">{t('progress.dayUnit', { n: streak })}</span>
        </div>
        <div className="reading-cap">
          {t('progress.streak')}
          <span className="reading-scope"> · {t('stream.streakScope')}</span>
        </div>
      </div>
    </div>
  )
}
