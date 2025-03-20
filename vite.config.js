import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
        manualChunks: undefined
      }
    },
    sourcemap: true,
    manifest: true,
    cssCodeSplit: true
  },
  server: {
    port: 5173,
  },
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
