import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import './config/db.js'; // boot the pool on startup (fail-soft, see db.js)
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import guideRoutes from './routes/guideRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import touristRoutes from './routes/touristRoutes.js';
import customTourRoutes from './routes/customTourRoutes.js';
import touristProfileRoutes from './routes/touristProfileRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import bidRoutes from './routes/bidRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import guideTourRoutes from './routes/guideTourRoutes.js';
import guideAvailabilityRoutes from './routes/guideAvailabilityRoutes.js';
import guideNotificationRoutes from './routes/guideNotificationRoutes.js';
import guideVerificationRoutes from './routes/guideVerificationRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { initSocket } from './utils/socket.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '1mb' }));

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /replace-with|change-me/i.test(process.env.JWT_SECRET)) {
    throw new Error('Production requires a strong JWT_SECRET of at least 32 characters.');
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error('Production requires ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.');
  }
  if (!process.env.CLIENT_ORIGIN) {
    throw new Error('Production requires CLIENT_ORIGIN with the deployed frontend origin.');
  }
  const productionOrigins = process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (productionOrigins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('Production CLIENT_ORIGIN values must use HTTPS.');
  }
  if (!process.env.DB_SERVER || !process.env.DB_NAME || (process.env.DB_USE_WINDOWS_AUTH !== 'true' && (!process.env.DB_USER || !process.env.DB_PASSWORD))) {
    throw new Error('Production requires explicit SQL Server connection settings.');
  }
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tourist', touristRoutes);
app.use('/api/custom-tours', customTourRoutes);
app.use('/api/tourist-profile', touristProfileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/guide', guideTourRoutes);
app.use('/api/guide-availability', guideAvailabilityRoutes);
app.use('/api/guide/notifications', guideNotificationRoutes);
app.use('/api/guide-verifications', guideVerificationRoutes);

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

      initSocket(srv);

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
