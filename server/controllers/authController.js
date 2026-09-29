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

/** POST /api/auth/register — create a new tourist/guide account. */
export const register = async (req, res) => {
  const { fullName, email, password, role, phone } = req.body || {};

  if (!fullName || !email || !password || !role) {
    throw new AppError('fullName, email, password and role are required', 400);
  }

  if (!['tourist', 'guide'].includes(role)) {
    throw new AppError('role must be tourist or guide', 400);
  }

  if (String(password).length < 6) {
    throw new AppError('password must be at least 6 characters', 400);
  }

  if (email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase()) {
    throw new AppError('This email is reserved for admin use', 403);
  }

  try {
    // Check if email exists with a DIFFERENT role
    const existing = await query('SELECT Id, Role FROM Users WHERE Email = @email', { email });
    if (existing.length) {
      const existingRole = existing[0].Role;
      if (existingRole !== role) {
        const roleLabel = existingRole === 'tourist' ? 'Tourist' : 'Guide';
        throw new AppError(`This email is already registered as a ${roleLabel}. Please sign in as ${roleLabel} instead.`, 409);
      }
      throw new AppError('Email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, Provider, IsActive)
      OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.Phone, INSERTED.AvatarUrl, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      VALUES (@fullName, @email, @passwordHash, @role, @phone, 'local', 1)
    `;

    const rows = await query(sql, {
      fullName,
      email,
      passwordHash,
      role,
      phone: phone || null,
    });
    const user = rows[0];

    // Auto-create Guides profile for guide users
    if (role === 'guide') {
      await query(
        `INSERT INTO Guides (UserID, FullName, Email, Phone, IsActive)
         VALUES (@userId, @fullName, @email, @phone, 1)`,
        { userId: user.Id, fullName, email, phone: phone || null }
      );
    }

    const payload = { id: user.Id, email: user.Email, role: user.Role };
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    res.status(201).json({ ok: true, token, user });
  } catch (err) {
    if (err && (err.number === 2627 || err.number === 2601)) {
      throw new AppError('Email already exists', 409);
    }
    if (err instanceof AppError) throw err;
    console.error('[register]', err);
    throw new AppError('Failed to register user', 500);
  }
};

/** POST /api/auth/login — verify credentials + issue JWT. */
export const login = async (req, res) => {
  const { email, password, role } = req.body || {};

  if (!email || !password) {
    throw new AppError('email and password are required', 400);
  }

  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';

  // Admin login — role param ignored, always returns admin
  if (email.toLowerCase() === adminEmail) {
    if (password !== adminPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    let rows = await query(
      `SELECT Id, FullName, Email, Role, Phone, AvatarUrl, Bio, IsActive, CreatedAt, UpdatedAt
       FROM Users WHERE Email = @email AND Role = 'admin'`,
      { email: adminEmail }
    );

    let user;
    if (rows.length > 0) {
      user = rows[0];
    } else {
      const insertRows = await query(
        `INSERT INTO Users (FullName, Email, PasswordHash, Role, Provider, IsActive)
         OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.Phone,
                INSERTED.AvatarUrl, INSERTED.Bio, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
         VALUES ('Admin', @email, @passwordHash, 'admin', 'local', 1)`,
        { email: adminEmail, passwordHash: await bcrypt.hash(password, 10) }
      );
      user = insertRows[0];
    }

    const payload = { id: user.Id, email: user.Email, role: user.Role };
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });
    return res.json({ ok: true, token, user });
  }

  // Regular user — find by email
  const rows = await query(
    `SELECT Id, FullName, Email, PasswordHash, Role, Phone, AvatarUrl, Bio, IsActive, CreatedAt, UpdatedAt
     FROM Users WHERE Email = @email`,
    { email }
  );

  if (!rows.length) {
    throw new AppError('Invalid credentials', 401);
  }

  const user = rows[0];

  // Role conflict check
  if (role && user.Role !== role) {
    const roleLabel = role === 'tourist' ? 'Guide' : 'Tourist';
    throw new AppError(`This email is registered as a ${roleLabel}. Please sign in as ${roleLabel} instead.`, 403);
  }

  const match = await bcrypt.compare(password, user.PasswordHash || '');
  if (!match) throw new AppError('Invalid credentials', 401);

  const payload = { id: user.Id, email: user.Email, role: user.Role };
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });

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

/** POST /api/auth/google — sign in with Google access token */
export const googleAuth = async (req, res) => {
  const { credential, role } = req.body || {};

  if (!credential) {
    throw new AppError('Google credential is required', 400);
  }

  if (!role || !['tourist', 'guide'].includes(role)) {
    throw new AppError('role must be tourist or guide', 400);
  }

  // Fetch user info from Google using the access token
  let googlePayload;
  try {
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${credential}` },
    });
    if (!googleRes.ok) throw new Error('Failed to fetch Google user info');
    googlePayload = await googleRes.json();
  } catch (err) {
    console.error('[googleAuth] Failed to fetch Google userinfo:', err.message);
    throw new AppError('Invalid Google credential', 401);
  }

  const { sub: googleId, email, name, picture } = googlePayload;

  if (!email) {
    throw new AppError('Google account must have an email', 400);
  }

  if (email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase()) {
    throw new AppError('Admin accounts cannot use Google sign-in', 403);
  }

  try {
    // Check by google provider ID first
    let rows = await query(
      `SELECT Id, FullName, Email, Role, Phone, AvatarUrl, Bio, IsActive, CreatedAt, UpdatedAt
       FROM Users WHERE Provider = 'google' AND ProviderId = @providerId`,
      { providerId: googleId }
    );

    let user;

    if (rows.length > 0) {
      // Google account already exists — check role
      user = rows[0];
      if (user.Role !== role) {
        const roleLabel = role === 'tourist' ? 'Guide' : 'Tourist';
        throw new AppError(`This Google account is registered as a ${roleLabel}. Please sign in as ${roleLabel} instead.`, 403);
      }
    } else {
      // No google provider match — check if email exists
      rows = await query(
        `SELECT Id, FullName, Email, Role, Phone, AvatarUrl, Bio, IsActive
         FROM Users WHERE Email = @email`,
        { email }
      );

      if (rows.length > 0) {
        // Email exists — check role
        const existing = rows[0];
        if (existing.Role !== role) {
          const roleLabel = role === 'tourist' ? 'Guide' : 'Tourist';
          throw new AppError(`This email is registered as a ${roleLabel}. Please sign in as ${roleLabel} instead.`, 403);
        }
        // Same role — link Google provider
        await query(
          `UPDATE Users SET Provider = 'google', ProviderId = @providerId, AvatarUrl = @avatarUrl
           WHERE Id = @id`,
          { providerId: googleId, avatarUrl: picture || existing.AvatarUrl, id: existing.Id }
        );
        user = { ...existing, AvatarUrl: picture || existing.AvatarUrl };
      } else {
        // Brand new user — create
        const insertRows = await query(
          `INSERT INTO Users (FullName, Email, Role, Provider, ProviderId, AvatarUrl, IsActive)
           OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.Phone,
                  INSERTED.AvatarUrl, INSERTED.Bio, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
           VALUES (@fullName, @email, @role, 'google', @providerId, @avatarUrl, 1)`,
          {
            fullName: name || email.split('@')[0],
            email,
            role,
            providerId: googleId,
            avatarUrl: picture || null,
          }
        );
        user = insertRows[0];

        // Auto-create Guides profile for guide users
        if (role === 'guide') {
          await query(
            `INSERT INTO Guides (UserID, FullName, Email, IsActive)
             VALUES (@userId, @fullName, @email, 1)`,
            { userId: user.Id, fullName: user.FullName, email }
          );
        }
      }
    }

    const jwtPayload = { id: user.Id, email: user.Email, role: user.Role };
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign(jwtPayload, secret, { expiresIn: '7d' });

    res.json({ ok: true, token, user });
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('[googleAuth]', err);
    throw new AppError('Google authentication failed', 500);
  }
};
