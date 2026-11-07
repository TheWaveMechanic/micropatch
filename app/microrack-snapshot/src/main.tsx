import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// A page opened before a new version was published asks for parts of the app that no longer
// exist; load the new version instead (the current patch is kept in the browser)
window.addEventListener('vite:preloadError', event => {
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
