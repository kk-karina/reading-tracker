import { useLocale } from '../../state/LocaleContext'

/**
 * Шаг по страницам: откуда и докуда.
 *
 * Обычно набирают одно число — «до», — поэтому оно крупное и с курсором с
 * самого начала. «От» подставлено из прочитанного и стоит рядом тихо: правят
 * его редко, но править можно прямо тут, без отдельного поля с подписью.
 *
 * Полоса показывает шаг до сохранения: что было — сплошным, что прибавится —
 * штриховкой. Число перед глазами в момент решения, а не после него.
 */
export function PagesStep({
  from,
  to,
  total,
  onFrom,
  onTo,
  backwards,
}: {
  from: string
  to: string
  /** Сколько страниц всего. Без него полосы нет: долю не от чего считать. */
  total: number | null
  onFrom: (v: string) => void
  onTo: (v: string) => void
  /** «До» меньше «от»: сохранить такое нельзя, и лист говорит это здесь же. */
  backwards: boolean
}) {
  const { t } = useLocale()
  const a = Number(from) || 0
  const b = to.trim() ? Number(to) : null
  const read = b === null ? null : b - a

  const share = (n: number) => (total ? Math.min(1, Math.max(0, n / total)) : 0)
  const was = share(a)
  const will = b === null || backwards ? was : share(b)

  return (
    <div className="step">
      <div className="step-pages">
        <input
          className="step-num step-from"
          inputMode="numeric"
          aria-label={t('session.from')}
          title={t('session.from')}
          value={from}
          onChange={(e) => onFrom(e.target.value.replace(/\D/g, ''))}
        />
        <span className="step-arrow" aria-hidden>
          →
        </span>
        <input
          className="step-num step-to"
          inputMode="numeric"
          aria-label={t('session.to')}
          aria-invalid={backwards || undefined}
          placeholder={String(a)}
          value={to}
          data-autofocus
          onChange={(e) => onTo(e.target.value.replace(/\D/g, ''))}
        />
        {read !== null && read > 0 && (
          <span className="step-delta mono">{t('step.pagesPlus', { n: read })}</span>
        )}
      </div>

      {total ? (
        <div className="step-meter-row">
          <div className="step-meter" aria-hidden>
            <span className="step-meter-will" style={{ transform: `scaleX(${will})` }} />
            <span className="step-meter-was" style={{ transform: `scaleX(${was})` }} />
          </div>
          <span className="small faint mono">
            {Math.round(was * 100)}%
            {will > was && ` → ${Math.round(will * 100)}%`}
          </span>
        </div>
      ) : null}

      {backwards && (
        <p className="small step-error" role="alert">
          {t('session.toMustGrow')}
        </p>
      )}
    </div>
  )
}
