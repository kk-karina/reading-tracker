import { useState } from 'react'
import { ACCENTS, type Accent, type LearningCategory } from '../lib/learning/types'
import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'
import { Icon, type IconName } from './Icon'
import { Sheet } from './Sheet'
import { Jelly } from './ui'

const PICKABLE: IconName[] = [
  'compass',
  'book',
  'bulb',
  'car',
  'chat',
  'headphones',
  'chart-bar',
  'trending-up',
]

export function CategoryForm({
  category,
  onClose,
}: {
  category?: LearningCategory
  onClose: () => void
}) {
  const { t } = useLocale()
  const { addCategory, updateCategory, deleteCategory, categories } = useLearning()

  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState<IconName>(category?.icon ?? 'compass')
  const [accent, setAccent] = useState<Accent | null>(category?.accent ?? null)
  const [outline, setOutline] = useState(category?.outline ?? '')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    const patch = { name: name.trim(), icon, accent, outline: outline.trim() || null }
    if (category) await updateCategory(category.id, patch)
    else await addCategory({ ...patch, sort: categories.length })
    setBusy(false)
    onClose()
  }

  async function remove() {
    if (!category || !confirm(t('category.confirmDelete'))) return
    await deleteCategory(category.id)
    onClose()
  }

  return (
    <Sheet title={category ? t('category.edit') : t('learning.newCategory')} onClose={onClose}>
      <label className="field">
        <span className="label">{t('category.name')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>

      <div className="field">
        <span className="label">{t('category.icon')}</span>
        <div className="icon-pick">
          {PICKABLE.map((n) => (
            <button
              key={n}
              type="button"
              className={`icon-opt${icon === n ? ' on' : ''}`}
              aria-label={n}
              aria-pressed={icon === n}
              onClick={() => setIcon(n)}
            >
              <Icon name={n} />
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">{t('category.accent')}</span>
        <div className="accent-pick">
          {ACCENTS.map((a) => (
            <button
              key={a}
              type="button"
              className={`accent-opt${accent === a ? ' on' : ''}`}
              data-accent={a}
              aria-label={a}
              aria-pressed={accent === a}
              onClick={() => setAccent(accent === a ? null : a)}
            />
          ))}
        </div>
      </div>

      <label className="field">
        <span className="label">{t('category.outline')}</span>
        <textarea
          className="textarea"
          rows={6}
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
        />
        <span className="small faint">{t('category.outlineHint')}</span>
      </label>

      <div className="row-tight">
        <Jelly className="btn" onClick={() => void save()} disabled={busy || !name.trim()}>
          {t('form.save')}
        </Jelly>
        {category && (
          <button className="link-btn danger" type="button" onClick={() => void remove()}>
            {t('category.delete')}
          </button>
        )}
      </div>
    </Sheet>
  )
}
