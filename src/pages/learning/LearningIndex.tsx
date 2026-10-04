import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { StreamForm } from '../../components/StreamForm'
import { funnyGoal } from '../../lib/learning/goals'
import { ACCENTS } from '../../lib/learning/types'
import { Empty, Jelly } from '../../components/ui'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'

/** Подсказки при пустом разделе — быстрый старт, а не константы системы. */
const SUGGESTED = ['Professional Growth', 'Driving', 'English']

/**
 * У обучения нет витрины потоков.
 *
 * Витрина была уровнем навигации ради самой навигации: заходишь в раздел,
 * выбираешь из трёх плиток, и только потом начинается работа. Переключатель
 * на имени потока делает тот же переход и не отнимает под него экран, поэтому
 * `/learning` ведёт сразу на дашборд первого потока.
 *
 * Собственный экран остаётся ровно для случая, когда открывать нечего.
 */
export function LearningIndex() {
  const { t, locale } = useLocale()
  const { streams, loading, addStream, updateStream } = useLearning()
  const [adding, setAdding] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  if (loading) return null

  // Порядок — тот же, в котором потоки заведены: «первый» должен значить
  // одно и то же от захода к заходу.
  const first = streams.find((s) => !s.archived)
  if (first) return <Navigate to={`/learning/${first.slug}`} replace />

  const archived = streams.filter((s) => s.archived)

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('hub.title')}</h1>
      </div>
      {/* Готовые потоки стоят ниже кнопки и отдельной подписью: это не второй
          способ завести поток, а подсказка, что туда вообще вписывают. */}
      <Empty
        art="signpost"
        hint={t('hub.emptyBody')}
        action={
          <Jelly className="btn ghost sm" onClick={() => setAdding(true)}>
            {t('hub.newStream')}
          </Jelly>
        }
      >
        {t('hub.empty')}
      </Empty>

      <div className="hub-suggest">
        <p className="small faint">{t('hub.suggest')}</p>
        <div className="row-tight">
          {SUGGESTED.map((name, i) => (
            <button
              key={name}
              type="button"
              className="btn ghost sm"
              onClick={async () => {
                // Цвет раздаётся по порядку, как и в форме: поток без него
                // пришёл бы в полосу переключения без метки. Цель — так же,
                // как в форме: придуманная по имени, чтобы готовый поток
                // открывался не с вопросом «зачем».
                const made = await addStream({ name, accent: ACCENTS[i % ACCENTS.length], outline: null, sort: i })
                if (made) await updateStream(made.id, { goal: funnyGoal(name, locale) })
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Заархивировать все потоки — это состояние, а не пустота: путь обратно
          к ним обязан оставаться и отсюда. */}
      {archived.length > 0 && (
        <>
          <button className="link-btn" type="button" onClick={() => setShowArchive((v) => !v)}>
            {t('hub.archived', { n: archived.length })}
          </button>
          {showArchive && (
            <ul className="stream-list">
              {archived.map((s) => (
                <li key={s.id}>
                  <Link to={`/learning/${s.slug}`} data-accent={s.accent ?? undefined}>
                    <i className="stream-dot" data-accent={s.accent ?? undefined} aria-hidden />
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {adding && <StreamForm onClose={() => setAdding(false)} />}
    </>
  )
}
