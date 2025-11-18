import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api/content': {
        target: 'https://contentgeneration.eastus2.inference.ml.azure.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/content/, '')
      },
      '/api': {
        target: 'https://modulegenerator.eastus2.inference.ml.azure.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
