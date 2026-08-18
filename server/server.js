import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import './config/db.js'; // boot the pool on startup (fail-soft, see db.js)
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import guideRoutes from './routes/guideRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiter for auth routes (max 10 requests per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { ok: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Placeholder API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guides', guideRoutes);

app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'Tourist Guide Hiring Platform API', status: 'running' });
});

// 404 + error handler
app.use((_req, res) => res.status(404).json({ ok: false, message: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ ok: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] API listening on http://localhost:${PORT}`);
});
