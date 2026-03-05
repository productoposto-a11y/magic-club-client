import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.loca.lt'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['axios', 'sonner'],
          'vendor-qr': ['qrcode.react'],
          'vendor-scanner': ['html5-qrcode'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})
