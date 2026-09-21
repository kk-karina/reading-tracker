import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryForm } from '../components/CategoryForm'
import { Icon, type IconName } from '../components/Icon'
import { MaterialForm } from '../components/MaterialForm'
import { Jelly } from '../components/ui'
import { materialProgress } from '../lib/learning/metrics'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'

/** Подсказки при пустом разделе — быстрый старт, а не константы системы. */
const SUGGESTED: { name: string; icon: IconName }[] = [
  { name: 'Professional Growth', icon: 'compass' },
  { name: 'Driving', icon: 'car' },
  { name: 'English', icon: 'chat' },
]

export function Learning() {
  const { t } = useLocale()
  const { categories, materials, notes, loading, addCategory } = useLearning()

  const [active, setActive] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState(false)
  const [newMaterial, setNewMaterial] = useState(false)

  if (loading) return null

  const live = categories.filter((c) => !c.archived)
  // Первая категория подставляется сама: раздел не должен открываться ничем.
  const current = live.find((c) => c.id === active) ?? live[0] ?? null
  const mine = current ? materials.filter((m) => m.category_id === current.id) : []

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('learning.title')}</h1>
      </div>

      {live.length === 0 ? (
        <div className="hero-empty">
          <p className="muted">{t('learning.empty')}</p>
          <Jelly className="btn" onClick={() => setNewCategory(true)}>
            {t('learning.newCategory')}
          </Jelly>
          <p className="small faint">{t('learning.suggest')}</p>
          <div className="row-tight">
            {SUGGESTED.map((s, i) => (
              <button
                key={s.name}
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  void addCategory({
                    name: s.name,
                    icon: s.icon,
                    accent: null,
                    outline: null,
                    sort: i,
                  })
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="cat-tabs" role="tablist" aria-label={t('learning.title')}>
            {live.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === current?.id}
                className={`cat-tab${c.id === current?.id ? ' on' : ''}`}
                data-accent={c.accent ?? undefined}
                onClick={() => setActive(c.id)}
              >
                <Icon name={c.icon} size={16} />
                {c.name}
              </button>
            ))}
            <button
              type="button"
              className="cat-tab add"
              aria-label={t('learning.newCategory')}
              onClick={() => setNewCategory(true)}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>

          {current && (
            <>
              <div className="panel-head">
                <span className="label">{current.name}</span>
                <div className="row-tight">
                  <button
                    className="link-btn"
                    type="button"
                    onClick={() => setEditingCategory(current.id)}
                  >
                    {t('category.edit')}
                  </button>
                  <Jelly className="btn sm" onClick={() => setNewMaterial(true)}>
                    {t('learning.newMaterial')}
                  </Jelly>
                </div>
              </div>

              {mine.length === 0 ? (
                <div className="empty small">{t('learning.materialsEmpty')}</div>
              ) : (
                <ul className="mat-list">
                  {mine.map((m) => {
                    const p = materialProgress(m, notes)
                    return (
                      <li key={m.id}>
                        <Link to={`/learning/m/${m.id}`} className="mat-row">
                          <span className="mat-main">
                            <span className="mat-title">{m.title}</span>
                            <span className="small faint">
                              {t(`kind.${m.kind}`)}
                              {m.author ? ` · ${m.author}` : ''}
                            </span>
                          </span>
                          <span className="mat-meta">
                            <span className="chip sm">{t(`mstatus.${m.status}`)}</span>
                            <span className="small faint mono">
                              {p.total
                                ? t('material.progress', { done: p.done, total: p.total })
                                : t('note.count', { n: p.done })}
                            </span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </>
      )}

      {newCategory && <CategoryForm onClose={() => setNewCategory(false)} />}
      {editingCategory && (
        <CategoryForm
          category={live.find((c) => c.id === editingCategory)}
          onClose={() => setEditingCategory(null)}
        />
      )}
      {newMaterial && current && (
        <MaterialForm categoryId={current.id} onClose={() => setNewMaterial(false)} />
      )}
    </>
  )
}
