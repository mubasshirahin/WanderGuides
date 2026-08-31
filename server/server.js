import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import './config/db.js'; // boot the pool on startup (fail-soft, see db.js)
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import guideRoutes from './routes/guideRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Placeholder API routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'Tourist Guide Hiring Platform API', status: 'running' });
});

// 404 + error handler
app.use((_req, res) => res.status(404).json({ ok: false, message: 'Route not found' }));

// Centralized error handler
app.use(errorHandler);

// Start server with retry logic to avoid crash on EADDRINUSE
function listenOn(port) {
  return new Promise((resolve, reject) => {
    const srv = app.listen(port, () => resolve(srv));
    srv.on('error', (err) => reject(err));
  });
}

async function startServer(preferredPort, maxRetries = 5) {
  let port = Number(preferredPort) || 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const srv = await listenOn(port);
      const bound = srv.address();
      const actualPort = bound && bound.port ? bound.port : port;
      console.log(`[server] API listening on http://localhost:${actualPort}`);

      srv.on('error', (err) => {
        console.error('[server] Server error', err);
      });

      return srv;
    } catch (err) {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`[server] Port ${port} in use, trying next port.`);
        port = port === 0 ? 0 : port + 1;
        continue;
      }
      console.error('[server] Failed to start', err);
      process.exit(1);
    }
  }

  // If all retries failed, try ephemeral port 0
  try {
    const srv = await listenOn(0);
    const bound = srv.address();
    const actualPort = bound && bound.port ? bound.port : 0;
    console.log(`[server] API listening on ephemeral port http://localhost:${actualPort}`);
    return srv;
  } catch (err) {
    console.error('[server] Unable to bind any port', err);
    process.exit(1);
  }
}

startServer(PORT).catch((err) => {
  console.error('[server] startServer failed', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught Exception:', err);
  process.exit(1);
});
