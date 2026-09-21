import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MaterialForm } from '../../components/MaterialForm'
import { Jelly } from '../../components/ui'
import type { DictKey } from '../../lib/i18n/dict'
import { BACKLOG_TABS, backlog, backlogCounts, type BacklogTab } from '../../lib/learning/buckets'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

const EMPTY: Record<BacklogTab, DictKey> = {
  inbox: 'backlog.emptyInbox',
  someday: 'backlog.emptySomeday',
  reference: 'backlog.emptyReference',
  archive: 'backlog.emptyArchive',
}

const isTab = (v: string | null): v is BacklogTab =>
  v !== null && (BACKLOG_TABS as readonly string[]).includes(v)

export function Backlog() {
  const { t } = useLocale()
  const stream = useStream()
  const { materials, updateMaterial } = useLearning()
  const [adding, setAdding] = useState(false)

  /**
   * Вкладка живёт в адресе, а не в состоянии компонента: иначе «назад» после
   * трёх переключений уносит со страницы целиком. Фильтр Полки остаётся
   * локальным — там это вопрос, заданный странице сейчас, а здесь место,
   * куда возвращаются.
   */
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: BacklogTab = isTab(raw) ? raw : 'inbox'

  const counts = backlogCounts(materials, stream.id)
  const rows = backlog(materials, stream.id, tab)
  const from = { to: `/learning/${stream.slug}/backlog?tab=${tab}`, label: t('nav.backlog') }

  return (
    <>
      <div className="hub-bar">
        {/* Вкладки с нулём не прячутся: пустые «Входящие» надо видеть, а не выводить. */}
        <div className="backlog-tabs" role="tablist" aria-label={t('nav.backlog')}>
          {BACKLOG_TABS.map((b) => (
            <button
              key={b}
              type="button"
              role="tab"
              id={`backlog-tab-${b}`}
              aria-selected={b === tab}
              aria-controls="backlog-panel"
              className={`backlog-tab${b === tab ? ' on' : ''}`}
              onClick={() => setParams({ tab: b }, { replace: false })}
            >
              {b === 'archive' ? t('backlog.tabArchive') : t(`mstatus.${b}`)}
              <span className="small faint"> {counts[b]}</span>
            </button>
          ))}
        </div>
        <Jelly className="btn sm" onClick={() => setAdding(true)}>
          {t('learning.newMaterial')}
        </Jelly>
      </div>

      <div id="backlog-panel" role="tabpanel" aria-labelledby={`backlog-tab-${tab}`}>
        {rows.length === 0 ? (
          <div className="empty small">{t(EMPTY[tab])}</div>
        ) : (
          <ul className="mat-list">
            {rows.map((m) => (
              <li key={m.id}>
                <div className="mat-row static">
                  <Link className="mat-main" to={`/learning/${stream.slug}/m/${m.id}`} state={{ from }}>
                    <span className="mat-title">{m.title}</span>
                    <span className="small faint">
                      {t(`kind.${m.kind}`)}
                      {m.author ? ` · ${m.author}` : ''}
                    </span>
                  </Link>
                  <span className="mat-meta">
                    {tab === 'archive' ? (
                      <span className="chip sm">{t(`mstatus.${m.status}`)}</span>
                    ) : (
                      <button
                        className="link-btn"
                        type="button"
                        onClick={() => void updateMaterial(m.id, { status: 'active' })}
                      >
                        {t('backlog.take')}
                      </button>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {adding && <MaterialForm streamId={stream.id} onClose={() => setAdding(false)} />}
    </>
  )
}
