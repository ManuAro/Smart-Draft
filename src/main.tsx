import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { FileSystemProvider } from './contexts/FileSystemContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <FileSystemProvider>
        <App />
      </FileSystemProvider>
    </ErrorBoundary>
  </StrictMode>,
)
