import type { DictKey } from '../lib/i18n/dict'
import { useT } from '../state/LocaleContext'

/** Placeholder for a page that arrives in a later phase. */
export function Soon({ title, body }: { title: DictKey; body: DictKey }) {
  const t = useT()
  return (
    <>
      <div className="page-head">
        <h1 className="display">{t(title)}</h1>
      </div>
      <div className="panel">
        <div className="label" style={{ marginBottom: 10 }}>
          {t('soon.title')}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {t(body)}
        </p>
      </div>
    </>
  )
}
