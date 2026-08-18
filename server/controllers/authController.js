import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/** GET /api/auth/health — DB health probe. */
export const health = async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true, message: 'Database connected' });
};

/** POST /api/auth/register — placeholder. Wire up hashing + JWT here. */
export const register = async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password || !role) {
    throw new AppError('name, email, password and role are required', 400);
  }

  // TODO: hash password, insert into Users, issue JWT.
  res.status(501).json({ ok: false, message: 'Register not implemented yet', received: { name, email, role } });
};

/** POST /api/auth/login — placeholder. Verify credentials + issue JWT here. */
export const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw new AppError('email and password are required', 400);
  }

  // TODO: look up user, compare hash, sign JWT.
  res.status(501).json({ ok: false, message: 'Login not implemented yet' });
};
