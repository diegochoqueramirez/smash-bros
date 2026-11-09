import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    // En Docker sobre macOS los eventos de archivos no siempre llegan: usamos polling.
    watch: { usePolling: true },
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500, // Phaser pesa ~1.2 MB
  },
});
