import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: true,
    host: true,
    proxy: {
      '/Upgrade_WebGIS/arcgis-wayback': {
        target: 'https://wayback.maptiles.arcgis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/Upgrade_WebGIS\/arcgis-wayback/, '')
      }
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