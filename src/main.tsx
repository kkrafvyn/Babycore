import React from 'react'
import ReactDOM from 'react-dom/client'
import { ensureCryptoRandomUUID } from './lib/utils'
import './styles/index.css'

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    }).catch(() => {})
  } else {
    window.addEventListener('load', async () => {
      try {
        let hasReloadedForServiceWorkerUpdate = false
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (hasReloadedForServiceWorkerUpdate) return
          hasReloadedForServiceWorkerUpdate = true
          window.location.reload()
        })

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              installingWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      } catch (error) {
        console.warn('Failed to register service worker:', error)
      }
    })
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

const bootstrap = async () => {
  ensureCryptoRandomUUID()

  const { default: App } = await import('./App')

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void bootstrap()
