import { query, getPool } from '../config/db.js';
import AppError from '../utils/AppError.js';

/** CREATE — INSERT a new guide */
export async function createGuide(req, res) {
  const { fullName, email, phone, city, bio, specialties, languages, ratePerDay } = req.body || {};

  // Basic validation
  if (!fullName || !email || !city || ratePerDay === undefined) {
    throw new AppError('fullName, email, city, and ratePerDay are required', 400);
  }

  const sql = `
    INSERT INTO Guides (FullName, Email, Phone, City, Bio, Specialties, Languages, RatePerDay, IsActive)
    OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Phone, INSERTED.City,
           INSERTED.Bio, INSERTED.Specialties, INSERTED.Languages, INSERTED.RatePerDay,
           INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
    VALUES (@fullName, @email, @phone, @city, @bio, @specialties, @languages, @ratePerDay, 1)
  `;

  const params = {
    fullName,
    email,
    phone: phone || null,
    city,
    bio: bio || null,
    specialties: specialties || null,
    languages: languages || null,
    ratePerDay: Number(ratePerDay)
  };

  try {
    const rows = await query(sql, params);
    res.status(201).json({ ok: true, guide: rows[0] });
  } catch (err) {
    if (err && (err.number === 2627 || err.number === 2601)) {
      throw new AppError('Email already exists', 409);
    }
    console.error('[createGuide]', err);
    throw new AppError('Failed to create guide', 500);
  }
}

/** READ — LIST all guides (with optional filters) */
export async function listGuides(req, res) {
  const { city, minRate, maxRate, isActive } = req.query;
  let sql = `
    SELECT Id, FullName, Email, Phone, City, Bio, Specialties, Languages,
           RatePerDay, Rating, IsActive, CreatedAt, UpdatedAt
    FROM Guides
    WHERE 1=1
  `;
  const params = {};

  if (city) {
    sql += ' AND City = @city';
    params.city = city;
  }
  if (minRate) {
    sql += ' AND RatePerDay >= @minRate';
    params.minRate = Number(minRate);
  }
  if (maxRate) {
    sql += ' AND RatePerDay <= @maxRate';
    params.maxRate = Number(maxRate);
  }
  if (isActive !== undefined) {
    sql += ' AND IsActive = @isActive';
    params.isActive = isActive === 'true' ? 1 : 0;
  }

  sql += ' ORDER BY CreatedAt DESC';

  const rows = await query(sql, params);
  res.json({ ok: true, guides: rows });
}

/** READ ONE — GET guide by ID */
export async function getGuide(req, res) {
  const id = Number(req.params.id);
  if (!id) throw new AppError('Invalid ID', 400);

  const sql = `
    SELECT Id, FullName, Email, Phone, City, Bio, Specialties, Languages,
           RatePerDay, Rating, IsActive, CreatedAt, UpdatedAt
    FROM Guides WHERE Id = @id
  `;
  const rows = await query(sql, { id });
  if (!rows.length) throw new AppError('Guide not found', 404);

  res.json({ ok: true, guide: rows[0] });
}

/** UPDATE — PATCH a guide by ID */
export async function updateGuide(req, res) {
  const id = Number(req.params.id);
  if (!id) throw new AppError('Invalid ID', 400);

  const { fullName, email, phone, city, bio, specialties, languages, ratePerDay, isActive } = req.body || {};

  // Build dynamic UPDATE
  const fields = [];
  const params = { id };

  if (fullName !== undefined) { fields.push('FullName = @fullName'); params.fullName = fullName; }
  if (email !== undefined) { fields.push('Email = @email'); params.email = email; }
  if (phone !== undefined) { fields.push('Phone = @phone'); params.phone = phone || null; }
  if (city !== undefined) { fields.push('City = @city'); params.city = city; }
  if (bio !== undefined) { fields.push('Bio = @bio'); params.bio = bio || null; }
  if (specialties !== undefined) { fields.push('Specialties = @specialties'); params.specialties = specialties || null; }
  if (languages !== undefined) { fields.push('Languages = @languages'); params.languages = languages || null; }
  if (ratePerDay !== undefined) { fields.push('RatePerDay = @ratePerDay'); params.ratePerDay = Number(ratePerDay); }
  if (isActive !== undefined) { fields.push('IsActive = @isActive'); params.isActive = isActive ? 1 : 0; }

  if (!fields.length) throw new AppError('No fields to update', 400);

  fields.push('UpdatedAt = SYSUTCDATETIME()');

  const sql = `
    UPDATE Guides SET ${fields.join(', ')}
    OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Phone, INSERTED.City,
           INSERTED.Bio, INSERTED.Specialties, INSERTED.Languages, INSERTED.RatePerDay,
           INSERTED.Rating, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
    WHERE Id = @id
  `;

  try {
    const rows = await query(sql, params);
    if (!rows.length) throw new AppError('Guide not found', 404);

    res.json({ ok: true, guide: rows[0] });
  } catch (err) {
    if (err && (err.number === 2627 || err.number === 2601)) {
      throw new AppError('Email already exists', 409);
    }
    console.error('[updateGuide]', err);
    throw new AppError('Failed to update guide', 500);
  }
}

/** DELETE — DELETE a guide by ID */
export async function deleteGuide(req, res) {
  const id = Number(req.params.id);
  if (!id) throw new AppError('Invalid ID', 400);

  const sql = `DELETE FROM Guides WHERE Id = @id`;
  const result = await getPool().then(p => p.request().input('id', id).query(sql));

  if (result.rowsAffected[0] === 0) {
    throw new AppError('Guide not found', 404);
  }

  res.json({ ok: true, message: 'Guide deleted' });
}