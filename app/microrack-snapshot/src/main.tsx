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

// The host lets browsers keep the page for minutes after a new version is published; on open,
// fetch the page fresh (which also refreshes the kept copy) and switch if it runs a newer app
async function loadNewestVersion() {
  const running = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src
  if (!running) return
  const response = await fetch(location.pathname + location.search, { cache: 'reload' })
  if (!response.ok) return
  const page = new DOMParser().parseFromString(await response.text(), 'text/html')
  const src = page.querySelector('script[type="module"][src]')?.getAttribute('src')
  if (!src) return
  const newest = new URL(src, location.href).href
  // Switch once per version, so a host still handing out the old page cannot cause a reload loop
  if (newest !== running && sessionStorage.getItem('micropatch.loadedVersion') !== newest) {
    sessionStorage.setItem('micropatch.loadedVersion', newest)
    location.reload()
  }
}
if (import.meta.env.PROD) loadNewestVersion().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
