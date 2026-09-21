import { Link } from 'react-router-dom'
import { Jelly } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import { backlogCounts, studying } from '../../lib/learning/buckets'
import { materialProgress } from '../../lib/learning/metrics'
import { lastActivity } from '../../lib/learning/rhythm'
import { useLearning } from '../../state/LearningContext'
import { useLocale } from '../../state/LocaleContext'
import { useStream } from './StreamLayout'

/**
 * Работа в процессе. Карточки, а не строки: здесь выбирают, за что сесть, и
 * для этого нужен прогресс, а не плотность.
 */
export function Studying() {
  const { t, locale } = useLocale()
  const stream = useStream()
  const { materials, notes, updateMaterial, updateStream } = useLearning()

  const counts = backlogCounts(materials, stream.id)
  const empty = counts.inbox + counts.someday + counts.reference === 0
  const from = { to: `/learning/${stream.slug}/active`, label: t('nav.studying') }

  // Фокус стоит первым: это ответ на вопрос экрана, а не одна из карточек.
  const mine = studying(materials, stream.id).sort((a, b) =>
    a.id === stream.focus_material_id ? -1 : b.id === stream.focus_material_id ? 1 : a.sort - b.sort,
  )

  if (mine.length === 0) {
    return (
      <div className="hero-empty">
        <p className="muted">{t(empty ? 'studying.emptyBacklog' : 'studying.empty')}</p>
        <Link className="btn" to={`/learning/${stream.slug}/backlog`}>
          {t('studying.openBacklog')}
        </Link>
      </div>
    )
  }

  return (
    <ul className="study-list">
      {mine.map((m) => {
        const p = materialProgress(m, notes)
        const last = lastActivity(notes.filter((n) => n.material_id === m.id).map((n) => n.date))
        const isFocus = m.id === stream.focus_material_id
        return (
          <li key={m.id} className={`study-card${isFocus ? ' focus' : ''}`}>
            <span className="study-card-head">
              <span className="study-card-title">{m.title}</span>
              <span className="chip sm">{t(`kind.${m.kind}`)}</span>
            </span>
            {p.percent !== null && (
              <div className="meter" aria-hidden>
                <span style={{ width: `${p.percent}%` }} />
              </div>
            )}
            <span className="small faint">
              {p.total
                ? t('material.progress', { done: p.done, total: p.total })
                : t('note.count', { n: p.done })}
              {last ? ` · ${t('stream.lastNote', { date: fmtDate(last, locale) })}` : ''}
            </span>
            <span className="study-card-acts">
              <Link className="btn sm" to={`/learning/${stream.slug}/m/${m.id}`} state={{ from }}>
                {t('studying.continue')}
              </Link>
              {!isFocus && (
                <button
                  className="link-btn"
                  type="button"
                  onClick={() => void updateStream(stream.id, { focus_material_id: m.id })}
                >
                  {t('studying.makeFocus')}
                </button>
              )}
              <button
                className="link-btn"
                type="button"
                onClick={() => void updateMaterial(m.id, { status: 'inbox' })}
              >
                {t('studying.toBacklog')}
              </button>
              <Jelly
                className="link-btn"
                onClick={() => void updateMaterial(m.id, { status: 'done' })}
              >
                {t('studying.finish')}
              </Jelly>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
