import { query } from '../config/db.js';

/** GET /api/auth/health — DB health probe. */
export const health = async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, message: 'Database connected' });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Database unavailable', error: err.message });
  }
};

/** POST /api/auth/register — placeholder. Wire up hashing + JWT here. */
export const register = async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({ ok: false, message: 'name, email, password and role are required' });
  }

  // TODO: hash password, insert into Users, issue JWT.
  res.status(501).json({ ok: false, message: 'Register not implemented yet', received: { name, email, role } });
};

/** POST /api/auth/login — placeholder. Verify credentials + issue JWT here. */
export const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, message: 'email and password are required' });
  }

  // TODO: look up user, compare hash, sign JWT.
  res.status(501).json({ ok: false, message: 'Login not implemented yet' });
};
