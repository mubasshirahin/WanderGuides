import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/** GET /api/auth/health — DB health probe. */
export const health = async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true, message: 'Database connected' });
};

/** POST /api/auth/register — placeholder. Wire up hashing + JWT here. */
export const register = async (req, res) => {
  const { fullName, email, password, role, phone, avatarUrl, bio } = req.body || {};

  if (!fullName || !email || !password || !role) {
    throw new AppError('fullName, email, password and role are required', 400);
  }

  if (String(password).length < 6) {
    throw new AppError('password must be at least 6 characters', 400);
  }

  try {
    // Check duplicate email
    const existing = await query('SELECT Id FROM Users WHERE Email = @email', { email });
    if (existing.length) {
      throw new AppError('Email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, AvatarUrl, Bio, IsActive)
      OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.Phone, INSERTED.AvatarUrl, INSERTED.Bio, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      VALUES (@fullName, @email, @passwordHash, @role, @phone, @avatarUrl, @bio, 1)
    `;

    const params = {
      fullName,
      email,
      passwordHash,
      role,
      phone: phone || null,
      avatarUrl: avatarUrl || null,
      bio: bio || null,
    };

    const rows = await query(sql, params);
    const user = rows[0];

    res.status(201).json({ ok: true, user });
  } catch (err) {
    if (err && (err.number === 2627 || err.number === 2601)) {
      throw new AppError('Email already exists', 409);
    }
    if (err instanceof AppError) throw err;
    console.error('[register]', err);
    throw new AppError('Failed to register user', 500);
  }
};

/** POST /api/auth/login — placeholder. Verify credentials + issue JWT here. */
export const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw new AppError('email and password are required', 400);
  }

  const rows = await query(
    `SELECT Id, FullName, Email, PasswordHash, Role, Phone, AvatarUrl, Bio, IsActive, CreatedAt, UpdatedAt
     FROM Users WHERE Email = @email`,
    { email }
  );

  if (!rows.length) {
    throw new AppError('Invalid credentials', 401);
  }

  const user = rows[0];
  const match = await bcrypt.compare(password, user.PasswordHash || '');
  if (!match) throw new AppError('Invalid credentials', 401);

  const payload = { id: user.Id, email: user.Email, role: user.Role };
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });

  // Do not leak password hash
  delete user.PasswordHash;

  res.json({ ok: true, token, user });
};

/** GET /api/auth/me — return profile for authenticated user */
export const me = async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  const rows = await query(
    `SELECT Id, FullName, Email, Role, Phone, AvatarUrl, Bio, IsActive, CreatedAt, UpdatedAt
     FROM Users WHERE Id = @id`,
    { id: userId }
  );

  if (!rows.length) throw new AppError('User not found', 404);

  res.json({ ok: true, user: rows[0] });
};
