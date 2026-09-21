import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Book } from './pages/Book'
import { Journal } from './pages/Journal'
import { Learning } from './pages/Learning'
import { Login } from './pages/Login'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { Shelf } from './pages/Shelf'
import { AuthProvider, useAuth } from './state/AuthContext'
import { DataProvider } from './state/DataContext'
import { LearningProvider } from './state/LearningContext'
import { LocaleProvider } from './state/LocaleContext'

function Gate() {
  const { ready, user } = useAuth()
  if (!ready) return null
  if (!user) return <Login />
  return (
    <DataProvider>
      <LearningProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Progress />} />
            <Route path="shelf" element={<Shelf />} />
            <Route path="book/:id" element={<Book />} />
            <Route path="journal" element={<Journal />} />
            <Route path="learning" element={<Learning />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
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
