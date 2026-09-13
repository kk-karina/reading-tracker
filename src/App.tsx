import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Dashboard } from './pages/Dashboard'
import { Log } from './pages/Log'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'
import { Songs } from './pages/Songs'
import { Topics } from './pages/Topics'
import { AuthProvider, useAuth } from './state/AuthContext'
import { DataProvider } from './state/DataContext'

function Gate() {
  const { ready, user } = useAuth()
  if (!ready) return null
  if (!user) return <Login />
  return (
    <DataProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="topics" element={<Topics />} />
          <Route path="songs" element={<Songs />} />
          <Route path="log" element={<Log />} />
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
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </HashRouter>
  )
}
