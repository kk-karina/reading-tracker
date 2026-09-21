import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Book } from './pages/Book'
import { Journal } from './pages/Journal'
import { Learning } from './pages/Learning'
import { Material } from './pages/Material'
import { Login } from './pages/Login'
import { Progress } from './pages/Progress'
import { ReadingLayout } from './pages/ReadingLayout'
import { Settings } from './pages/Settings'
import { StudyNote } from './pages/StudyNote'
import { Shelf } from './pages/Shelf'
import { AuthProvider, useAuth } from './state/AuthContext'
import { DataProvider } from './state/DataContext'
import { LearningProvider } from './state/LearningContext'
import { LocaleProvider } from './state/LocaleContext'

/** Параметр роута читается только внутри компонента, отсюда обёртка. */
function LegacyBook() {
  const { id } = useParams()
  return <Navigate to={`/reading/book/${id}`} replace />
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

            <Route path="learning" element={<Learning />} />
            <Route path="learning/m/:id" element={<Material />} />
            <Route path="learning/n/:id" element={<StudyNote />} />

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
