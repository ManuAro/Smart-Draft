import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { SubjectView } from './pages/SubjectView'
import CanvasView from './pages/CanvasView'
import { EmailGate } from './pages/EmailGate'
import { EmailAuthProvider, useEmailAuth } from './contexts/EmailAuthContext'

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { hasSubmittedEmail } = useEmailAuth()

  if (!hasSubmittedEmail) {
    return <Navigate to="/welcome" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { hasSubmittedEmail, setUserEmail } = useEmailAuth()

  return (
    <Routes>
      <Route
        path="/welcome"
        element={
          hasSubmittedEmail ? (
            <Navigate to="/" replace />
          ) : (
            <EmailGate onSubmit={setUserEmail} />
          )
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/folder/:id"
        element={
          <ProtectedRoute>
            <SubjectView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/canvas/:folderId"
        element={
          <ProtectedRoute>
            <CanvasView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/canvas/:folderId/:fileId"
        element={
          <ProtectedRoute>
            <CanvasView />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <EmailAuthProvider>
        <AppRoutes />
      </EmailAuthProvider>
    </BrowserRouter>
  )
}

export default App
