import { Outlet } from 'react-router-dom'
import { TitleTabs } from '../components/TitleTabs'
import { useT } from '../state/LocaleContext'

/**
 * Второй уровень чтения — та же полоса-заголовок, что у потоков в обучении.
 * Своего `h1` у подстраниц нет: активный таб и есть заголовок, и повторять
 * его над содержимым значило бы сказать одно дважды.
 */
export function ReadingLayout() {
  const t = useT()
  return (
    <>
      <TitleTabs
        label={t('nav.reading')}
        items={[
          { to: '/reading', label: t('nav.dashboard'), end: true },
          { to: '/reading/shelf', label: t('nav.shelf') },
          { to: '/reading/sessions', label: t('nav.sessions') },
          { to: '/reading/thoughts', label: t('nav.thoughts') },
        ]}
      />
      <Outlet />
    </>
  )
}
