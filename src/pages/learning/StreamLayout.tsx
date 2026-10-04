import { useState } from 'react'
import { Navigate, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { StreamForm } from '../../components/StreamForm'
import { SubNav } from '../../components/SubNav'
import { TitleTabs } from '../../components/TitleTabs'
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
      <TitleTabs
        label={t('hub.title')}
        items={tabs.map((s) => ({
          to: `/learning/${s.slug}`,
          label: s.name,
          lead: <i className="stream-dot" data-accent={s.accent ?? undefined} aria-hidden />,
          dim: s.archived,
        }))}
      >
        {/* Архив живёт тут же: витрины, где он лежал раньше, больше нет. */}
        {archived.length > 0 && (
          <button
            className="title-tab-side"
            type="button"
            aria-expanded={showArchive}
            onClick={() => setShowArchive((v) => !v)}
          >
            {t('hub.archiveShort', { n: archived.length })}
          </button>
        )}

        <button
          className="title-tab-side"
          type="button"
          aria-label={t('hub.newStream')}
          title={t('hub.newStream')}
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" size={15} />
        </button>
      </TitleTabs>

      <SubNav
        id="stream"
        label={stream.name}
        items={[
          { to: `/learning/${stream.slug}`, label: t('nav.dashboard'), end: true },
          { to: `/learning/${stream.slug}/materials`, label: t('nav.materials') },
          { to: `/learning/${stream.slug}/sessions`, label: t('nav.studySessions') },
          { to: `/learning/${stream.slug}/notes`, label: t('nav.notes') },
        ]}
      />

      {/* Содержимое подменяется в кадре, без перехода, и это не недоделка.
          Любое гашение целой страницы — это проход через пустоту: уходящее
          доходит до нуля, размонтируется, страница схлопывается до двух полос
          и разворачивается обратно под проявляющимся новым. Как ни расставляй
          уход и приход — по очереди или внахлёст, — глаз видит мигание, а не
          переход.

          Перекрыть пустоту можно было бы, продержав старое поверх нового, но
          высоты у подразделов разные, и наложение даёт собственный прыжок.
          Поэтому здесь ничего не анимируется: о переключении говорят чернила
          под подразделом и заголовок потока, а содержимое просто становится
          другим — мгновенно и без вспышки. */}
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
