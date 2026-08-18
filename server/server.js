import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import './config/db.js'; // boot the pool on startup (fail-soft, see db.js)
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import guideRoutes from './routes/guideRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Placeholder API routes
app.use('/api/auth', authRoutes);
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
