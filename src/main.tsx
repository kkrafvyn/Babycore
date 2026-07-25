import React from 'react'
import ReactDOM from 'react-dom/client'
import { ensureCryptoRandomUUID } from './lib/utils'
import './styles/index.css'

const CHUNK_RELOAD_SESSION_KEY = 'cradlyn:chunk-reload'

const reloadAfterStaleChunk = (): void => {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return
  }

  if (sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY)) {
    return
  }

  sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, '1')
  window.location.reload()
}

const isStaleChunkLoadError = (value: unknown): boolean => {
  const message = value instanceof Error ? value.message : String(value ?? '')
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  )
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadAfterStaleChunk()
})

window.addEventListener('unhandledrejection', (event) => {
  if (isStaleChunkLoadError(event.reason)) {
    event.preventDefault()
    reloadAfterStaleChunk()
  }
})

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    }).catch(() => {})
  } else {
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (error) {
        console.warn('Failed to register service worker:', error)
      }
    })
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

const bootstrap = async () => {
  ensureCryptoRandomUUID()

  try {
    const { default: App } = await import('./App')

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (error) {
    if (isStaleChunkLoadError(error)) {
      reloadAfterStaleChunk()
      return
    }

    throw error
  }
}

void bootstrap()
