import { query, getPool } from '../config/db.js';

/** CREATE — INSERT a new guide */
export async function createGuide(req, res) {
  try {
    const { fullName, email, phone, city, bio, specialties, languages, ratePerDay } = req.body || {};

    // Basic validation
    if (!fullName || !email || !city || ratePerDay === undefined) {
      return res.status(400).json({ ok: false, message: 'fullName, email, city, and ratePerDay are required' });
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

    const rows = await query(sql, params);
    res.status(201).json({ ok: true, guide: rows[0] });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ ok: false, message: 'Email already exists' });
    }
    console.error('[createGuide]', err);
    res.status(500).json({ ok: false, message: 'Failed to create guide', error: err.message });
  }
}

/** READ — LIST all guides (with optional filters) */
export async function listGuides(req, res) {
  try {
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
  } catch (err) {
    console.error('[listGuides]', err);
    res.status(500).json({ ok: false, message: 'Failed to list guides', error: err.message });
  }
}

/** READ ONE — GET guide by ID */
export async function getGuide(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid ID' });

    const sql = `
      SELECT Id, FullName, Email, Phone, City, Bio, Specialties, Languages,
             RatePerDay, Rating, IsActive, CreatedAt, UpdatedAt
      FROM Guides WHERE Id = @id
    `;
    const rows = await query(sql, { id });
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Guide not found' });

    res.json({ ok: true, guide: rows[0] });
  } catch (err) {
    console.error('[getGuide]', err);
    res.status(500).json({ ok: false, message: 'Failed to get guide', error: err.message });
  }
}

/** UPDATE — PATCH a guide by ID */
export async function updateGuide(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid ID' });

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

    if (!fields.length) return res.status(400).json({ ok: false, message: 'No fields to update' });

    fields.push('UpdatedAt = SYSUTCDATETIME()');

    const sql = `
      UPDATE Guides SET ${fields.join(', ')}
      OUTPUT INSERTED.Id, INSERTED.FullName, INSERTED.Email, INSERTED.Phone, INSERTED.City,
             INSERTED.Bio, INSERTED.Specialties, INSERTED.Languages, INSERTED.RatePerDay,
             INSERTED.Rating, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
      WHERE Id = @id
    `;

    const rows = await query(sql, params);
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Guide not found' });

    res.json({ ok: true, guide: rows[0] });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ ok: false, message: 'Email already exists' });
    }
    console.error('[updateGuide]', err);
    res.status(500).json({ ok: false, message: 'Failed to update guide', error: err.message });
  }
}

/** DELETE — DELETE a guide by ID */
export async function deleteGuide(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid ID' });

    const sql = `DELETE FROM Guides WHERE Id = @id`;
    const result = await getPool().then(p => p.request().input('id', id).query(sql));

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ ok: false, message: 'Guide not found' });
    }

    res.json({ ok: true, message: 'Guide deleted' });
  } catch (err) {
    console.error('[deleteGuide]', err);
    res.status(500).json({ ok: false, message: 'Failed to delete guide', error: err.message });
  }
}