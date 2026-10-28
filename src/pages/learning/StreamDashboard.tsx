import { useState } from 'react'
import { Rhythm } from '../../components/Charts'
import { BacklogPanel } from '../../components/learning/BacklogPanel'
import { Celebration } from '../../components/learning/Celebration'
import { StepsBlock } from '../../components/learning/StepsBlock'
import { StepsSheet } from '../../components/learning/StepsSheet'
import { RecentStudyNotes } from '../../components/learning/RecentStudyNotes'
import { StreamFocus } from '../../components/learning/StreamFocus'
import { StreamGoal } from '../../components/learning/StreamGoal'
import { StreamStats } from '../../components/learning/StreamStats'
import { StreamTime } from '../../components/learning/StreamTime'
import { NoteAddSheet } from '../../components/learning/NoteAddSheet'
import { StudySheet } from '../../components/learning/StudySheet'
import { Zone } from '../../components/Zone'
import { MaterialForm } from '../../components/MaterialForm'
import { StreamForm } from '../../components/StreamForm'
import { todayISO } from '../../lib/format'
import { focusOf } from '../../lib/learning/buckets'
import { isFinal, stepsOf } from '../../lib/learning/steps'
import type { StreamStep } from '../../lib/learning/types'
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
 *      единственный объект экрана, у которого есть действие, и стоит оно
 *      наверху, рядом с целью: занимаются ради неё.
 *   2. Как идёт — показания и ритм в одной панели: числа стоят рядом с
 *      графиком, который их объясняет. Имени у зоны нет: панель называет
 *      себя сама.
 *   3. Что осталось — лента последних конспектов, каждый своим отрывком;
 *      она же и вход в раздел. И отдельно бэклог.
 *
 * Строк-ссылок в подразделы здесь нет намеренно. Они вели ровно туда же, куда
 * полоса подразделов прямо над ними; теперь ссылка живёт в шапке зоны.
 */

export function StreamDashboard() {
  const { t } = useLocale()
  const stream = useStream()
  const { materials, parts, notes, sessions, steps, updateStep } = useLearning()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  /**
   * Лист один на экран, а дверей к нему три, и они про разное. Кнопка у цели и
   * точка у полосы прогресса записывают занятие по материалу в фокусе: за ним и
   * сидели, спрашивать источник не о чем. Плюс у заголовка «Что осталось»
   * добавляет конспект — там источник выбирают, и потому это вторичное
   * действие: главное на этом экране по-прежнему одно.
   */
  const [logging, setLogging] = useState<'log' | 'note' | null>(null)
  /** Лист шагов: `edit` — сразу во втором режиме (пустой поток, «Добавить шаги»). */
  const [stepsOpen, setStepsOpen] = useState<{ edit: boolean } | null>(null)
  const [cheer, setCheer] = useState<{ step: StreamStep; replay: boolean } | null>(null)
  /**
   * Растёт, когда закрылся праздник по новому шагу: блок и лист вводят в кадр
   * следующий шаг. Не по самой отметке — та пишется сразу, пока окно ещё
   * открыто, и вступление прошло бы под ним незамеченным.
   */
  const [intro, setIntro] = useState(0)
  const ladder = stepsOf(steps, stream.id)

  const complete = (step: StreamStep) => {
    const done_on = todayISO()
    void updateStep(step.id, { done_on })
    setCheer({ step: { ...step, done_on }, replay: false })
  }
  const replay = (step: StreamStep) => setCheer({ step, replay: true })

  const mine = notesOfStream(materials, notes, stream.id)
  // Ритм — по всему, что было: занятие без конспекта тоже живой день. Вес
  // кружка — сколько записей в нём, занятий и конспектов вместе.
  const streamSessions = notesOfStream(materials, sessions, stream.id)
  const entries = [...streamSessions, ...mine].map((r) => r.date)
  const focus = focusOf(materials, stream.focus_material_id)

  return (
    <>
      {/* Шаги к цели — своим блоком над подложкой: подложка и её кнопка
          занятия — про фокус, шаги — про дорогу к north star. */}
      <StepsBlock
        steps={ladder}
        intro={intro}
        onOpen={(edit = false) => setStepsOpen({ edit })}
        onReplay={replay}
        onComplete={complete}
      />

      {/* Акцент потока живёт здесь заливкой, а не пипеткой по тонким линиям:
          подложка Professional Growth и подложка Driving отличаются, и это
          единственное место, где цвет потока вообще что-то делает. */}
      <section className="stream-hero" data-accent={stream.accent ?? undefined}>
        {/* Причина и действие — одной строкой. Кнопка стоит не у карточки
            материала, а у цели: занимаются ради неё, и хвастаются ей же. */}
        <div className="hero-top">
          <StreamGoal stream={stream} />
          {focus && (
            <Jelly className="btn hero-btn" onClick={() => setLogging('log')}>
              {t('study.log')}
            </Jelly>
          )}
        </div>
        <StreamFocus
          stream={stream}
          materials={materials}
          notes={notes}
          onLog={() => setLogging('log')}
          onAdd={() => setAdding(true)}
        />
      </section>

      {/* Без заголовка: «Как идёт» над графиком ритма ничего не добавляло —
          панель с числами и точками отвечает на этот вопрос собой. Ритм
          отвечает «садилась ли», время рядом — «сколько»; две колонки, а не
          стопка: на всю ширину оба графика раздуваются. */}
      <Zone>
        <div className="dash-cols">
          <div className="panel rhythm-panel">
            {/* Страйк берёт все конспекты, а не только этого потока: училась
                вчера другому — день не пропал. */}
            <StreamStats streamNotes={mine} allNotes={notes} allSessions={sessions} />
            <Rhythm
              byDate={notesByDate(entries)}
              label={t('chart.studyRhythm')}
              unit={(n) => t('study.entries', { n })}
              cap={<p className="rhythm-cap">{t('stream.activeWeeks', { n: activeWeeks(entries) })}</p>}
            />
          </div>
          <StreamTime sessions={streamSessions} />
        </div>
      </Zone>

      {/* Конспект заводится и отсюда: лента последних — то место, где видно,
          что давно ничего не писала, и уходить ради этого на материал незачем.
          Источник выбирается в самом листе. */}
      <Zone
        title={t('stream.zoneThinking')}
        link={{ to: `/learning/${stream.slug}/notes`, label: t('stream.notesAll') }}
        add={{ label: t('note.add'), onClick: () => setLogging('note') }}
      >
        <RecentStudyNotes stream={stream} materials={materials} parts={parts} notes={mine} />
      </Zone>

      {/* Добавить можно отсюда: бэклог пополняют чаще, чем разбирают, и
          ради одной ссылки уходить на отдельный экран незачем. Плюсом, как и
          конспект зоной выше: обе шапки предлагают дописать в то, что показывают,
          и обе делают это одинаково — иначе жест пришлось бы учить дважды. */}
      <Zone
        title={t('stream.zoneBacklog')}
        link={{ to: `/learning/${stream.slug}/materials?view=backlog`, label: t('stream.backlogAll') }}
        add={{ label: t('learning.newMaterial'), onClick: () => setAdding(true) }}
      >
        <BacklogPanel stream={stream} materials={materials} />
      </Zone>

      <div className="dash-foot">
        <button className="link-btn" type="button" onClick={() => setEditing(true)}>
          {t('stream.edit')}
        </button>
      </div>

      {logging === 'log' && (
        <StudySheet stream={stream} material={focus} onClose={() => setLogging(null)} />
      )}
      {logging === 'note' && <NoteAddSheet stream={stream} onClose={() => setLogging(null)} />}
      {editing && <StreamForm stream={stream} onClose={() => setEditing(false)} />}
      {stepsOpen && (
        <StepsSheet
          stream={stream}
          steps={ladder}
          editFirst={stepsOpen.edit}
          intro={intro}
          onClose={() => setStepsOpen(null)}
          onComplete={complete}
          onReplay={replay}
        />
      )}
      {cheer && (
        <Celebration
          key={cheer.step.id + (cheer.replay ? ':again' : '')}
          step={cheer.step}
          final={isFinal(ladder, cheer.step.id)}
          replay={cheer.replay}
          onClose={() => {
            if (!cheer.replay) setIntro((n) => n + 1)
            setCheer(null)
          }}
        />
      )}
      {adding && <MaterialForm streamId={stream.id} onClose={() => setAdding(false)} />}
    </>
  )
}
