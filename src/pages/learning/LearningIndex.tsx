import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Icon, type IconName } from '../../components/Icon'
import { StreamForm } from '../../components/StreamForm'
import { Jelly } from '../../components/ui'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'

/** Подсказки при пустом разделе — быстрый старт, а не константы системы. */
const SUGGESTED: { name: string; icon: IconName }[] = [
  { name: 'Professional Growth', icon: 'compass' },
  { name: 'Driving', icon: 'car' },
  { name: 'English', icon: 'chat' },
]

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
  const { t } = useLocale()
  const { streams, loading, addStream } = useLearning()
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
      <div className="hero-empty">
        <p className="muted">{t('hub.empty')}</p>
        <Jelly className="btn" onClick={() => setAdding(true)}>
          {t('hub.newStream')}
        </Jelly>
        <p className="small faint">{t('hub.suggest')}</p>
        <div className="row-tight">
          {SUGGESTED.map((s, i) => (
            <button
              key={s.name}
              type="button"
              className="btn ghost sm"
              onClick={() =>
                void addStream({ name: s.name, icon: s.icon, accent: null, outline: null, sort: i })
              }
            >
              {s.name}
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
                    <Icon name={s.icon} size={16} />
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
