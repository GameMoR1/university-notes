import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

import Layout from '@/components/ui/Layout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import NotesPage from '@/pages/NotesPage'
import NoteDetailPage from '@/pages/NoteDetailPage'
import NoteEditPage from '@/pages/NoteEditPage'
import GraphPage from '@/pages/GraphPage'
import AdminPage from '@/pages/AdminPage'
import ProfilePage from '@/pages/ProfilePage'

function PrivateRoute({ children }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn())
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!user.role?.can_manage_users) return <Navigate to="/notes" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e1e24',
            color: '#f1f0f5',
            border: '1px solid #2a2a35',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0d0d0f' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0d0d0f' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/notes" replace />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="notes/new" element={<PrivateRoute><NoteEditPage /></PrivateRoute>} />
          <Route path="notes/:id" element={<NoteDetailPage />} />
          <Route path="notes/:id/edit" element={<PrivateRoute><NoteEditPage /></PrivateRoute>} />
          <Route path="graph" element={<GraphPage />} />
          <Route path="profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/notes" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
