import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import type { EmptyArtName } from '../../components/EmptyArt'
import { MaterialForm } from '../../components/MaterialForm'
import { MaterialRow } from '../../components/learning/MaterialRow'
import { StudySheet } from '../../components/learning/StudySheet'
import { Chip, Empty, Jelly, Segmented } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import type { DictKey } from '../../lib/i18n/dict'
import {
  MATERIAL_VIEWS,
  materialCounts,
  materialsOf,
  type MaterialView,
} from '../../lib/learning/buckets'
import { barWidth, materialProgress } from '../../lib/learning/metrics'
import { lastTouched } from '../../lib/learning/sessions'
import { KINDS, type Material, type MaterialKind } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'
import { useProgressText } from '../../components/learning/Progress'
import { fmtMinutes } from '../../lib/format'

/**
 * Всё, что есть в потоке, одним разделом.
 *
 * До этого «Изучаю» и «Бэклог» были двумя адресами в полосе подразделов, хотя
 * разделяло их не содержание, а одно поле статуса. Человек ходил между двумя
 * экранами, чтобы посмотреть на один и тот же список с двух сторон, и каждый
 * переход стирал контекст: где я вообще нахожусь.
 *
 * Теперь раздел один, а состояние — фильтр в полосе под шапкой. Полоса та же,
 * что на Полке и в Дневнике: срезы слева, действие страницы справа. Своя
 * рейка сбоку читалась бы лучше ровно один раз — пока не дойдёшь до неё с
 * Полки и не обнаружишь, что фильтры тут живут в другом месте и нажимаются
 * иначе. Одна полоса на все разделы учится один раз.
 */

/**
 * Пустой срез — не промах фильтра, а состояние потока: «ничего не изучаю»
 * и «бэклог разобран» говорят о человеке, а не о том, что не попал в
 * рейку. Поэтому у каждого свой рисунок, и подобран он по смыслу строки:
 * навалился на стопку — бери из неё; читает спокойно — делать нечего;
 * мечтает о шапочке — пройденное впереди.
 */
const EMPTY: Record<MaterialView, { text: DictKey; art: EmptyArtName }> = {
  active: { text: 'studying.empty', art: 'pile' },
  backlog: { text: 'materials.emptyBacklog', art: 'reading' },
  done: { text: 'materials.emptyDone', art: 'laptop' },
}

const isView = (v: string | null): v is MaterialView =>
  v !== null && (MATERIAL_VIEWS as readonly string[]).includes(v)

type KindFilter = MaterialKind | 'all'

export function Materials() {
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials: all, notes, sessions, parts, updateMaterial } = useLearning()
  const progressText = useProgressText()
  const [adding, setAdding] = useState(false)
  /** Материал, по которому сейчас записывают занятие. Лист тот же, что на герое. */
  const [logging, setLogging] = useState<Material | null>(null)

  /**
   * Срез живёт в адресе, а не в состоянии компонента: иначе «назад» после
   * трёх переключений уносит со страницы целиком, а ссылка на нужный срез
   * никому не отправляется.
   */
  const [params, setParams] = useSearchParams()
  const raw = params.get('view')
  const view: MaterialView = isView(raw) ? raw : 'active'

  /* Вторая рейка — по виду, как второй срез на Полке: только виды, которые в
     потоке есть, и только когда их хотя бы два — выбирать из одного нечего.
     Вид из адреса, которого в потоке уже нет, читается как «все». */
  const present = KINDS.filter((k) => all.some((m) => m.stream_id === stream.id && m.kind === k))
  const rawKind = params.get('kind')
  const kind: KindFilter = present.some((k) => k === rawKind) ? (rawKind as MaterialKind) : 'all'
  const materials = kind === 'all' ? all : all.filter((m) => m.kind === kind)

  const counts = materialCounts(materials, stream.id)
  const query = (v: MaterialView, k: KindFilter): Record<string, string> =>
    k === 'all' ? { view: v } : { view: v, kind: k }
  const from = {
    to: `/learning/${stream.slug}/materials?${new URLSearchParams(query(view, kind))}`,
    label: t('nav.materials'),
  }

  const go = (next: MaterialView) => setParams(query(next, kind), { replace: false })
  const pick = (next: KindFilter) => setParams(query(view, next), { replace: false })

  // Фокус стоит первым: на «На изучении» это ответ на вопрос экрана, а не
  // одна из карточек.
  const rows = materialsOf(materials, stream.id, view).sort((a, b) =>
    a.id === stream.focus_material_id ? -1 : b.id === stream.focus_material_id ? 1 : a.sort - b.sort,
  )

  // Пусто во всём потоке, а не в выбранном виде: вид из пустого потока не выбрать.
  const nothingAtAll = present.length === 0

  return (
    <>
      {/* Полоса страницы: чем сузить — слева, что можно завести — справа.
          Пока в потоке нет ничего вовсе, рейка показывала бы три нуля, а
          «Новый материал» висел бы над пустотой: оба переезжают вниз. */}
      {!nothingAtAll && (
        <div className="filter-bar">
          <div className="row-tight">
            <Segmented
              name={t('materials.filters')}
              value={view}
              options={MATERIAL_VIEWS.map((v) => ({
                value: v,
                label: `${t(`mview.${v}`)} ${counts[v]}`,
              }))}
              onChange={(v) => go(v)}
              className="sm"
            />
            {present.length > 1 && (
              <Segmented
                name={t('materials.kinds')}
                value={kind}
                options={[
                  { value: 'all' as KindFilter, label: t('mkind.all') },
                  ...present.map((k) => ({ value: k as KindFilter, label: t(`mkind.${k}`) })),
                ]}
                onChange={pick}
                className="sm scroll"
              />
            )}
          </div>
          <div className="row-tight">
            <Jelly className="btn" onClick={() => setAdding(true)}>
              {t('learning.newMaterial')}
            </Jelly>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        /* Пустой поток и пустой срез — разные вещи: первому нужно объяснить,
           что такое материал, и дать его завести; второму хватает строки и
           рисунка. Между срезами рисунок подменяется на месте, без нового
           въезда, — рейка переключается часто, и каждый раз встречать её
           приветствием было бы тиком. */
        nothingAtAll ? (
          <Empty
            art="box"
            hint={t('materials.emptyAllBody')}
            action={
              <Jelly className="btn ghost sm" onClick={() => setAdding(true)}>
                {t('learning.newMaterial')}
              </Jelly>
            }
          >
            {t('materials.emptyAll')}
          </Empty>
        ) : (
          <Empty art={EMPTY[view].art}>{t(EMPTY[view].text)}</Empty>
        )
      ) : (
        /* Одна карточка на все три среза. Различает их не вид карточки, а то,
           что каждый срез к ней добавляет: «изучаю» — прогресс с плюсом,
           бэклог — «взять», пройденное — отметку статуса. */
        <ul className="mat-list">
          {rows.map((m) => {
            const p = materialProgress(m, parts, sessions)
            const last = lastTouched(m.id, sessions, notes)
            const isFocus = view === 'active' && m.id === stream.focus_material_id
            const width = barWidth(p.percent)
            return (
              <MaterialRow
                key={m.id}
                material={m}
                slug={stream.slug}
                from={from}
                className={isFocus ? 'focus' : ''}
                badge={isFocus ? <Chip sm on>{t('studying.focusBadge')}</Chip> : undefined}
              >
                {view === 'active' ? (
                  <>
                    {/* Полоса и плюс одной строкой — тот же ряд, что на герое
                        потока и на странице материала. Прибавить занятие значит
                        сдвинуть именно эту полосу, и жест стоит там же, где
                        результат. */}
                    <div className="prog-row">
                      {width !== null && (
                        <div className="meter" aria-hidden>
                          <span style={{ width: `${width}%` }} />
                        </div>
                      )}
                      <Jelly
                        className="log-dot"
                        onClick={() => setLogging(m)}
                        title={t('study.log')}
                        aria-label={t('study.log')}
                      >
                        <Icon name="plus" size={15} />
                      </Jelly>
                    </div>
                    <span className="small faint">
                      {/* Практика говорит накопленным — временем или разами,
                          с нуля, раз её взяли в работу. */}
                      {m.kind === 'practice'
                        ? (progressText(p) ??
                          (p.unit === 'time' ? t('count.times', { n: 0 }) : fmtMinutes(0, locale)))
                        : p.total
                          ? t('material.progress', { done: p.done, total: p.total })
                          : t('note.count', { n: p.done })}
                      {last ? ` · ${t('stream.lastNote', { date: fmtDate(last, locale) })}` : ''}
                    </span>
                  </>
                ) : view === 'done' ? (
                  /* Отметка статуса — надпись, а не действие: по наведению не
                     появляется и не исчезает. */
                  <span className="study-card-acts">
                    <Chip sm>{t(`mstatus.${m.status}`)}</Chip>
                  </span>
                ) : (
                  <span className="study-card-acts hover-acts">
                    <Jelly
                      className="link-btn"
                      onClick={() => void updateMaterial(m.id, { status: 'active' })}
                    >
                      {t('backlog.take')}
                    </Jelly>
                  </span>
                )}
              </MaterialRow>
            )
          })}
        </ul>
      )}

      {logging && (
        <StudySheet stream={stream} material={logging} onClose={() => setLogging(null)} />
      )}
      {adding && <MaterialForm streamId={stream.id} onClose={() => setAdding(false)} />}
    </>
  )
}
