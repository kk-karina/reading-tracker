import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Book } from './pages/Book'
import { Journal } from './pages/Journal'
import { Login } from './pages/Login'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { Shelf } from './pages/Shelf'
import { AuthProvider, useAuth } from './state/AuthContext'
import { DataProvider } from './state/DataContext'
import { LocaleProvider } from './state/LocaleContext'

function Gate() {
  const { ready, user } = useAuth()
  if (!ready) return null
  if (!user) return <Login />
  return (
    <DataProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Progress />} />
          <Route path="shelf" element={<Shelf />} />
          <Route path="book/:id" element={<Book />} />
          <Route path="journal" element={<Journal />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
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
