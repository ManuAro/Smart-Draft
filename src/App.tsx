import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { SubjectView } from './pages/SubjectView'
import CanvasView from './pages/CanvasView'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/folder/:id" element={<SubjectView />} />
        <Route path="/canvas/:folderId" element={<CanvasView />} />
        <Route path="/canvas/:folderId/:fileId" element={<CanvasView />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
