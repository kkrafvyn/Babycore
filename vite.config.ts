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
  },
})
