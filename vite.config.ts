import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const resolveFromRoot = (relativePath: string) =>
  decodeURIComponent(new URL(relativePath, import.meta.url).pathname.replace(/^\/([A-Za-z]:\/)/, '$1'))

const srcAlias = resolveFromRoot('./src')
const framerMotionEntry = resolveFromRoot('./node_modules/framer-motion/dist/es/index.mjs')
const lucideReactEntry = resolveFromRoot('./node_modules/lucide-react/dist/esm/lucide-react.mjs')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': srcAlias,
      'framer-motion': framerMotionEntry,
      'lucide-react': lucideReactEntry,
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react'
          if (id.includes('/@supabase/')) return 'vendor-supabase'
          if (id.includes('/framer-motion/') || id.includes('/motion/')) return 'vendor-motion'
          if (id.includes('/three/') || id.includes('/@react-three/')) return 'vendor-3d'
          if (id.includes('/recharts/')) return 'vendor-charts'
          return undefined
        },
      },
    },
  } as any,
})
