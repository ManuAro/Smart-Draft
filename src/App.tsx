import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SubjectView } from './pages/SubjectView'
import { CanvasView } from './pages/CanvasView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/subject/probability" replace />} />
        <Route path="/subject/:id" element={<SubjectView />} />
        <Route path="/canvas/:subjectId" element={<CanvasView />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
