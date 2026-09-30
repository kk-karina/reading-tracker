import { useState } from 'react'
import { Link, Navigate, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { StreamForm } from '../../components/StreamForm'
import { SubNav } from '../../components/SubNav'
import type { Stream } from '../../lib/learning/types'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'

interface StreamCtx {
  stream: Stream
}

/** Поток резолвится один раз в оболочке; подстраницы просто берут его отсюда. */
export function useStream(): Stream {
  return useOutletContext<StreamCtx>().stream
}

/**
 * `bare` обслуживает третий и четвёртый уровни (материал, конспект): поток
 * им нужен, а полоса потоков и полоса подразделов — уже нет, у этих страниц
 * своя `Crumbs`.
 */
export function StreamLayout({ bare = false }: { bare?: boolean }) {
  const { slug } = useParams()
  const { t } = useLocale()
  const { streams, loading } = useLearning()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [showArchive, setShowArchive] = useState(false)

  if (loading) return null

  const stream = streams.find((s) => s.slug === slug)
  // Промахнуться можно только устаревшей ссылкой, и первый поток отвечает на
  // это лучше, чем экран со словом «не найдено».
  if (!stream) return <Navigate to="/learning" replace />

  if (bare) return <Outlet context={{ stream } satisfies StreamCtx} />

  const archived = streams.filter((s) => s.archived)
  // Порядок сортировки и ничего больше. Ряд, который перестраивается под
  // активный, заставляет искать соседей заново после каждого переключения.
  const tabs = [
    ...streams.filter((s) => !s.archived),
    ...archived.filter((s) => showArchive || s.id === stream.id),
  ]

  return (
    <>
      {/*
        Три уровня громкости вместо двух спорящих: раздел пилюлей в верхней
        полосе, поток здесь, подраздел ниже чернильной полосой. Активный поток
        крупнее соседей ровно настолько, чтобы читаться заголовком зоны, —
        отдельного экрана-витрины под выбор не нужно.
      */}
      <nav className="stream-tabs" aria-label={t('hub.title')}>
        {tabs.map((s) => {
          const on = s.id === stream.id
          return (
            <Link
              key={s.id}
              to={`/learning/${s.slug}`}
              className="stream-tab"
              // Размер живёт на самой ссылке, а не на вложенном заголовке:
              // узел таба переживает переключение, и рост разыгрывается
              // переходом, а не скачком.
              data-on={on || undefined}
              data-archived={s.archived || undefined}
              aria-current={on ? 'page' : undefined}
            >
              <Icon name={s.icon} size={15} />
              {on ? <h1 className="stream-tab-name">{s.name}</h1> : s.name}
            </Link>
          )
        })}

        {/* Архив живёт тут же: витрины, где он лежал раньше, больше нет. */}
        {archived.length > 0 && (
          <button
            className="stream-tab-side"
            type="button"
            aria-expanded={showArchive}
            onClick={() => setShowArchive((v) => !v)}
          >
            {t('hub.archiveShort', { n: archived.length })}
          </button>
        )}

        <button
          className="stream-tab-side"
          type="button"
          aria-label={t('hub.newStream')}
          title={t('hub.newStream')}
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" size={15} />
        </button>
      </nav>

      <SubNav
        id="stream"
        label={stream.name}
        items={[
          { to: `/learning/${stream.slug}`, label: t('nav.dashboard'), end: true },
          { to: `/learning/${stream.slug}/materials`, label: t('nav.materials') },
          { to: `/learning/${stream.slug}/notes`, label: t('nav.notes') },
        ]}
      />

      <Outlet context={{ stream } satisfies StreamCtx} />

      {/* Новый поток заводится прямо отсюда, и открыть его надо сразу: иначе
          создание из чужого потока проходит вообще без видимого следа. */}
      {adding && (
        <StreamForm
          onClose={() => setAdding(false)}
          onCreated={(made) => navigate(`/learning/${made.slug}`)}
        />
      )}
    </>
  )
}
