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
      // Optional: Use polling if filesystem events don't work reliably
      usePolling: false, // Set to 'true' in Docker/WSL2 if needed
    }
  },
  // Optional: Improve build performance
  build: {
    chunkSizeWarningLimit: 1600, // Adjust based on your project size
  }
});
