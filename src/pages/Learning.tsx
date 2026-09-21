import { useLearning } from '../state/LearningContext'
import { useLocale } from '../state/LocaleContext'

export function Learning() {
  const { t } = useLocale()
  const { categories, loading } = useLearning()

  if (loading) return null

  return (
    <>
      <div className="page-head">
        <h1 className="display">{t('learning.title')}</h1>
      </div>
      {categories.length === 0 && <div className="empty">{t('learning.empty')}</div>}
    </>
  )
}
