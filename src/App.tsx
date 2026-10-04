import { MotionConfig } from 'motion/react'
import { HashRouter, matchPath, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { NoteOverlay } from './components/learning/NoteOverlay'
import type { NoteLinkState } from './components/learning/noteLink'
import { Shell } from './components/Shell'
import { Book } from './pages/Book'
import { LearningIndex } from './pages/learning/LearningIndex'
import { Material } from './pages/learning/Material'
import { Materials } from './pages/learning/Materials'
import { Notes } from './pages/learning/Notes'
import { StudySessions } from './pages/learning/Sessions'
import { StreamDashboard } from './pages/learning/StreamDashboard'
import { StreamLayout } from './pages/learning/StreamLayout'
import { Login } from './pages/Login'
import { Progress } from './pages/Progress'
import { ReadingLayout } from './pages/ReadingLayout'
import { Settings } from './pages/Settings'
import { Sessions } from './pages/Sessions'
import { Shelf } from './pages/Shelf'
import { Thoughts } from './pages/Thoughts'
import { AuthProvider, useAuth } from './state/AuthContext'
import { DataProvider } from './state/DataContext'
import { LearningProvider, useLearning } from './state/LearningContext'
import { LocaleProvider } from './state/LocaleContext'

/** Параметр роута читается только внутри компонента, отсюда обёртка. */
function LegacyBook() {
  const { id } = useParams()
  return <Navigate to={`/reading/book/${id}`} replace />
}

/** Адрес до перестройки: материал знал свой id, но не знал своего потока. */
function LegacyMaterial() {
  const { id } = useParams()
  const { streams, materials, loading } = useLearning()
  if (loading) return null
  const m = materials.find((x) => x.id === id)
  const s = m && streams.find((x) => x.id === m.stream_id)
  return <Navigate to={s && m ? `/learning/${s.slug}/m/${m.id}` : '/learning'} replace />
}

/** Тот же случай для конспекта: старый адрес знал id, но не поток. */
function LegacyNote() {
  const { id } = useParams()
  const { streams, materials, notes, loading } = useLearning()
  if (loading) return null
  const n = notes.find((x) => x.id === id)
  const m = n && materials.find((x) => x.id === n.material_id)
  const s = m && streams.find((x) => x.id === m.stream_id)
  return <Navigate to={s && n ? `/learning/${s.slug}/n/${n.id}` : '/learning'} replace />
}

/** Бывшие подразделы потока: оба теперь срез одного раздела. */
function LegacyView({ view }: { view: 'active' | 'backlog' }) {
  const { slug } = useParams()
  return <Navigate to={`/learning/${slug}/materials?view=${view}`} replace />
}

function LegacyJournal() {
  const { slug } = useParams()
  return <Navigate to={`/learning/${slug}/sessions`} replace />
}

function Gate() {
  const { ready, user } = useAuth()
  if (!ready) return null
  if (!user) return <Login />
  return (
    <DataProvider>
      <LearningProvider>
        <Screens />
      </LearningProvider>
    </DataProvider>
  )
}

/**
 * Экраны и лист конспекта поверх них.
 *
 * Конспект не страница, а лист поверх экрана, с которого его открыли: тот
 * экран остаётся смонтированным под ним — с фильтром, группировкой и
 * прокруткой, — а маршрутизатор рисует его по адресу «фона» из состояния
 * ссылки. Открытый прямой ссылкой, лист ложится поверх «Конспектов» потока.
 */
function Screens() {
  const location = useLocation()
  const note = matchPath('/learning/:slug/n/:id', location.pathname)
  const background =
    (location.state as NoteLinkState | null)?.background ??
    (note ? { ...location, pathname: `/learning/${note.params.slug}/notes`, state: null } : null)

  return (
    <>
        <Routes location={background ?? location}>
          <Route element={<Shell />}>
            <Route index element={<Navigate to="/reading" replace />} />

            <Route path="reading" element={<ReadingLayout />}>
              <Route index element={<Progress />} />
              <Route path="shelf" element={<Shelf />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="thoughts" element={<Thoughts />} />
              {/* Дневник, где сессии и мысли шли одной лентой, разошёлся на
                  две вкладки; закладки на него ведут в журнал сессий. */}
              <Route path="journal" element={<Navigate to="/reading/sessions" replace />} />
            </Route>
            {/* Третий уровень вне layout: вместо полосы подразделов у него крошка. */}
            <Route path="reading/book/:id" element={<Book />} />

            {/* У раздела нет витрины: адрес ведёт на дашборд первого потока,
                собственный экран показывается, только когда потоков нет. */}
            <Route path="learning" element={<LearningIndex />} />
            <Route path="learning/:slug" element={<StreamLayout />}>
              <Route index element={<StreamDashboard />} />
              <Route path="materials" element={<Materials />} />
              <Route path="sessions" element={<StudySessions />} />
              <Route path="notes" element={<Notes />} />
              {/* Здесь коротко жил Дневник, где занятия и конспекты шли одной
                  лентой. Его адрес ведёт в журнал занятий. */}
              <Route path="journal" element={<LegacyJournal />} />
            </Route>
            {/* Третий и четвёртый уровни вне layout: у них крошка вместо полосы,
                но поток им всё равно нужен, поэтому оболочка оборачивает их тоже. */}
            <Route path="learning/:slug" element={<StreamLayout bare />}>
              <Route path="m/:id" element={<Material />} />
            </Route>

            {/* «Изучаю» и «Бэклог» стали срезами «Материалов». Адреса
                разошлись по закладкам и по ссылкам внутри самих конспектов,
                поэтому оба ведут в свой срез, а не в никуда. */}
            <Route
              path="learning/:slug/active"
              element={<LegacyView view="active" />}
            />
            <Route
              path="learning/:slug/backlog"
              element={<LegacyView view="backlog" />}
            />

            <Route path="learning/m/:id" element={<LegacyMaterial />} />
            <Route path="learning/n/:id" element={<LegacyNote />} />

            <Route path="settings" element={<Settings />} />

            {/* Адреса до перестройки. Роуты хэшевые и уже разошлись по закладкам. */}
            <Route path="shelf" element={<Navigate to="/reading/shelf" replace />} />
            <Route path="journal" element={<Navigate to="/reading/sessions" replace />} />
            <Route path="book/:id" element={<LegacyBook />} />

            <Route path="*" element={<Navigate to="/reading" replace />} />
          </Route>
        </Routes>
        {note?.params.slug && note.params.id && (
          <NoteOverlay slug={note.params.slug} id={note.params.id} />
        )}
    </>
  )
}


export default function App() {
  return (
    // `reducedMotion="user"` — одно место на все анимации `motion`, вместо
    // `useReducedMotion` в каждом компоненте. Глобальное правило в CSS гасит
    // только переходы и ключевые кадры; скользящие чернила вкладок и счётчики
    // считаются в JS и мимо него проходили.
    <MotionConfig reducedMotion="user">
      <HashRouter>
        {/* Locale wraps auth so the login screen is translated too. */}
        <LocaleProvider>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </LocaleProvider>
      </HashRouter>
    </MotionConfig>
  )
}
