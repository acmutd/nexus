import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    watch: {
      // Ignore node_modules and other heavy directories
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**'
      ],
      usePolling: false, // Set to 'true' in Docker/WSL2 if needed
    },
    proxy: {
      '/api/scrape': {
        target: 'http://localhost:9000/2015-03-31/functions/function/invocations',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/scrape/, ''),
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1600,
  }
});
