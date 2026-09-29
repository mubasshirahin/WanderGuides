import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Keep the browser origin consistent with the OAuth client's localhost
    // authorization. Google treats 127.0.0.1 and localhost as different origins.
    host: 'localhost',
    port: 5173,
    // Keep the OAuth origin stable; Vite's default fallback to 5174 is not
    // accepted unless that exact origin is also registered in Google Cloud.
    strictPort: true,
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
