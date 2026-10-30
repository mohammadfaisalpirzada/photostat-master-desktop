import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',               // relative paths so file:// works inside Electron
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000 },
  server: { port: 5173 }
})
