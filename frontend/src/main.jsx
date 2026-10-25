import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { cacheKnowledgeBase } from './services/offline/offlineCache.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register the service worker so the app shell can be cached for
// offline use. Kept minimal at this phase — see public/sw.js.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('Service worker registration failed:', err))
  })
}

// Populate the IndexedDB offline cache with the knowledge base on
// app load, so the data is available on later offline visits. The
// app shell still renders immediately (this is small — 12 JSON
// entries — and completes in milliseconds either way) but the
// promise is now tracked rather than fired-and-forgotten, so a
// caching failure is visible instead of silent.
cacheKnowledgeBase()
  .then((succeeded) => {
    if (!succeeded) {
      // eslint-disable-next-line no-console
      console.warn('AgriMobi: knowledge base offline cache did not populate. Offline mode will fall back to the bundled JSON, which still works, but IndexedDB persistence is degraded.')
    }
  })
