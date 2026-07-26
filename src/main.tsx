import React from 'react'
import ReactDOM from 'react-dom/client'
import { ensureCryptoRandomUUID } from './lib/utils'
import {
  isStaleChunkLoadError,
  registerStaleChunkRecovery,
  reloadAfterStaleChunk,
  watchForNewDeployments,
} from './lib/chunk-reload'
import './styles/index.css'

registerStaleChunkRecovery()

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
  watchForNewDeployments()

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
