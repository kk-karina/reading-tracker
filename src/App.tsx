import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Book } from './pages/Book'
import { Journal } from './pages/Journal'
import { Backlog } from './pages/learning/Backlog'
import { Material } from './pages/learning/Material'
import { Notes } from './pages/learning/Notes'
import { StreamDashboard } from './pages/learning/StreamDashboard'
import { StreamLayout } from './pages/learning/StreamLayout'
import { Streams } from './pages/learning/Streams'
import { StudyNote } from './pages/learning/StudyNote'
import { Studying } from './pages/learning/Studying'
import { Login } from './pages/Login'
import { Progress } from './pages/Progress'
import { ReadingLayout } from './pages/ReadingLayout'
import { Settings } from './pages/Settings'
import { Shelf } from './pages/Shelf'
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

function Gate() {
  const { ready, user } = useAuth()
  if (!ready) return null
  if (!user) return <Login />
  return (
    <DataProvider>
      <LearningProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Navigate to="/reading" replace />} />

            <Route path="reading" element={<ReadingLayout />}>
              <Route index element={<Progress />} />
              <Route path="shelf" element={<Shelf />} />
              <Route path="journal" element={<Journal />} />
            </Route>
            {/* Третий уровень вне layout: вместо полосы подразделов у него крошка. */}
            <Route path="reading/book/:id" element={<Book />} />

            <Route path="learning" element={<Streams />} />
            <Route path="learning/:slug" element={<StreamLayout />}>
              <Route index element={<StreamDashboard />} />
              <Route path="active" element={<Studying />} />
              <Route path="backlog" element={<Backlog />} />
              <Route path="notes" element={<Notes />} />
            </Route>
            {/* Третий и четвёртый уровни вне layout: у них крошка вместо полосы,
                но поток им всё равно нужен, поэтому оболочка оборачивает их тоже. */}
            <Route path="learning/:slug" element={<StreamLayout bare />}>
              <Route path="m/:id" element={<Material />} />
              <Route path="n/:id" element={<StudyNote />} />
            </Route>

            <Route path="learning/m/:id" element={<LegacyMaterial />} />
            <Route path="learning/n/:id" element={<LegacyNote />} />

            <Route path="settings" element={<Settings />} />

            {/* Адреса до перестройки. Роуты хэшевые и уже разошлись по закладкам. */}
            <Route path="shelf" element={<Navigate to="/reading/shelf" replace />} />
            <Route path="journal" element={<Navigate to="/reading/journal" replace />} />
            <Route path="book/:id" element={<LegacyBook />} />

            <Route path="*" element={<Navigate to="/reading" replace />} />
          </Route>
        </Routes>
      </LearningProvider>
    </DataProvider>
  )
}

export default function App() {
  return (
    <HashRouter>
      {/* Locale wraps auth so the login screen is translated too. */}
      <LocaleProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </LocaleProvider>
    </HashRouter>
  )
}
