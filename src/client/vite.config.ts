import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'),
      'i18next': path.resolve(__dirname, 'node_modules/i18next'),
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
      'lottie-react': path.resolve(__dirname, 'node_modules/lottie-react'),
    },
  },
  server: {
    port: 3000,
    fs: {
      allow: [path.resolve(__dirname, '..')]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: Number(process.env.PORT) || 8080,
    host: '0.0.0.0',
    allowedHosts: ['reels.brendr.io', 'fit-production-0aea.up.railway.app', 'fit.brendr.io'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
