import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 9999,
    strictPort: false,
    open: false,
    cors: true,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 9999
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 9998,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})
