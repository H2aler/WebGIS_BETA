import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    port: 5173,
    open: true,
    host: true,
    proxy: {
      '/Upgrade_WebGIS/arcgis-wayback': {
        target: 'https://wayback.maptiles.arcgis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/Upgrade_WebGIS\/arcgis-wayback/, '')
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // UTIC Resources (JS, CSS, etc.)
      '/js': { target: 'http://localhost:3001', changeOrigin: true },
      '/map': { target: 'http://localhost:3001', changeOrigin: true },
      '/images': { target: 'http://localhost:3001', changeOrigin: true },
      '/css': { target: 'http://localhost:3001', changeOrigin: true },
      '/jsp': { target: 'http://localhost:3001', changeOrigin: true },
      '/common': { target: 'http://localhost:3001', changeOrigin: true },
      '/img': { target: 'http://localhost:3001', changeOrigin: true },
      '/include': { target: 'http://localhost:3001', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['ol']
  }
});