import { useState } from 'react'
import { Rhythm } from '../../components/Charts'
import { BacklogPanel } from '../../components/learning/BacklogPanel'
import { RecentStudyNotes } from '../../components/learning/RecentStudyNotes'
import { StreamFocus } from '../../components/learning/StreamFocus'
import { StreamGoal } from '../../components/learning/StreamGoal'
import { StreamStats } from '../../components/learning/StreamStats'
import { ThoughtOfWeek } from '../../components/learning/ThoughtOfWeek'
import { Zone } from '../../components/learning/Zone'
import { MaterialForm } from '../../components/MaterialForm'
import { StreamForm } from '../../components/StreamForm'
import { notesOfStream } from '../../lib/learning/notes'
import { activeWeeks, notesByDate } from '../../lib/learning/rhythm'
import { Jelly } from '../../components/ui'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

/**
 * Дашборд потока — три зоны и ничего между ними.
 *
 * Было: семь блоков подряд в одном ранге, причём верхние три висели прямо на
 * фоне страницы, а нижние четыре стояли одинаковыми панелями, — то есть экран
 * менял правила ровно посередине и ни разу не говорил, где кончается одна
 * мысль и начинается другая.
 *
 * Стало три вопроса, в порядке, в котором их задают себе, садясь учиться:
 *
 *   1. Ради чего и за что сесть — одна подложка, на ней цель и фокус. Это
 *      единственный объект экрана, у которого есть действие.
 *   2. Как идёт — показания и ритм в одной панели: числа стоят рядом с
 *      графиком, который их объясняет.
 *   3. Что осталось — мысль недели и последние конспекты; и отдельно очередь.
 *
 * Строк-ссылок в подразделы здесь нет намеренно. Они вели ровно туда же, куда
 * полоса подразделов прямо над ними; теперь ссылка живёт в шапке зоны.
 */

/** Три конспекта за день — уже много; на этом кружок ритма набирает полный вес. */
const NOTES_FOR_FULL_DOT = 3

export function StreamDashboard() {
  const { t } = useLocale()
  const stream = useStream()
  const { materials, notes } = useLearning()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)

  const mine = notesOfStream(materials, notes, stream.id)
  const dates = mine.map((n) => n.date)

  return (
    <>
      {/* Акцент потока живёт здесь заливкой, а не пипеткой по тонким линиям:
          подложка Professional Growth и подложка Driving отличаются, и это
          единственное место, где цвет потока вообще что-то делает. */}
      <section className="stream-hero" data-accent={stream.accent ?? undefined}>
        <StreamGoal stream={stream} />
        <StreamFocus stream={stream} materials={materials} notes={notes} />
      </section>

      <Zone title={t('stream.zoneRhythm')}>
        <div className="panel rhythm-panel">
          {/* Страйк берёт все конспекты, а не только этого потока: училась
              вчера другому — день не пропал. */}
          <StreamStats streamNotes={mine} allNotes={notes} />
          <div className="rhythm-plot">
            <Rhythm
              byDate={notesByDate(dates)}
              label={t('chart.studyRhythm')}
              unit={(n) => t('note.count', { n })}
              full={NOTES_FOR_FULL_DOT}
            />
            <p className="rhythm-cap">{t('stream.activeWeeks', { n: activeWeeks(dates) })}</p>
          </div>
        </div>
      </Zone>

      <Zone
        title={t('stream.zoneThinking')}
        link={{ to: `/learning/${stream.slug}/notes`, label: t('stream.notesAll') }}
      >
        <ThoughtOfWeek stream={stream} materials={materials} notes={mine} />
        <RecentStudyNotes stream={stream} materials={materials} notes={mine} />
      </Zone>

      {/* Добавить можно отсюда: очередь пополняют чаще, чем разбирают, и
          ради одной ссылки уходить на отдельный экран незачем. */}
      <Zone
        title={t('stream.zoneQueue')}
        link={{ to: `/learning/${stream.slug}/backlog`, label: t('nav.backlog') }}
        action={
          <Jelly className="btn sm" onClick={() => setAdding(true)}>
            {t('learning.newMaterial')}
          </Jelly>
        }
      >
        <BacklogPanel stream={stream} materials={materials} />
      </Zone>

      <div className="dash-foot">
        <button className="link-btn" type="button" onClick={() => setEditing(true)}>
          {t('stream.edit')}
        </button>
      </div>

      {editing && <StreamForm stream={stream} onClose={() => setEditing(false)} />}
      {adding && <MaterialForm streamId={stream.id} onClose={() => setAdding(false)} />}
    </>
  )
}
