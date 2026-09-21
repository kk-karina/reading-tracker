import { Outlet } from 'react-router-dom'
import { SubNav } from '../components/SubNav'
import { useT } from '../state/LocaleContext'

/**
 * Второй уровень чтения. Заголовка страницы здесь нет: подраздел называет
 * полоса, и дублировать её в `h1` значило бы сказать одно дважды.
 */
export function ReadingLayout() {
  const t = useT()
  return (
    <>
      <SubNav
        id="reading"
        label={t('nav.reading')}
        items={[
          { to: '/reading', label: t('nav.dashboard'), end: true },
          { to: '/reading/shelf', label: t('nav.shelf') },
          { to: '/reading/journal', label: t('nav.journal') },
        ]}
      />
      <Outlet />
    </>
  )
}
