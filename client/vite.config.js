import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the Express backend during dev.
      '/api': 'http://localhost:5050',
      // Keep Socket.IO on the same origin as the app while forwarding upgrades.
      '/socket.io': {
        target: 'http://localhost:5050',
        ws: true,
      },
    },
  },
});
