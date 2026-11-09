import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ProjectCartProvider } from './context/ProjectCartContext'
import './index.css'
import './styles/worker-request.css'
import './styles/tanker.css'
import './styles/materials.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .catch((error) => console.error('TheKedar service worker registration failed:', error))
  }, { once: true })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProjectCartProvider>
          <App />
        </ProjectCartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
