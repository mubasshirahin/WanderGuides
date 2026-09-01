import { query, getPool } from '../config/db.js';
import AppError from '../utils/AppError.js';

/** Escape LIKE wildcards so user input cannot shape the pattern. */
function escapeLike(value) {
  return String(value).replace(/[%_[\]]/g, (ch) => `[${ch}]`);
}

/**
 * GET /api/guides/explore
 * Public list of active guides with search, filters, and pagination.
 * Price filters apply to the effective daily rate (COALESCE DailyRate, RatePerDay).
 */
export async function exploreGuides(req, res) {
  const {
    location,
    keyword,
    minPrice,
    maxPrice,
    minRating,
    page = 1,
    pageSize = 12,
  } = req.query;

  const offset = (page - 1) * pageSize;

  const where = [
    'g.IsActive = 1',
    '(@location IS NULL OR g.City LIKE @location)',
    '(@keyword IS NULL OR (g.FullName LIKE @keyword OR g.Specialties LIKE @keyword OR g.Bio LIKE @keyword OR g.Languages LIKE @keyword))',
    '(@minPrice IS NULL OR COALESCE(g.DailyRate, g.RatePerDay) >= @minPrice)',
    '(@maxPrice IS NULL OR COALESCE(g.DailyRate, g.RatePerDay) <= @maxPrice)',
    '(@minRating IS NULL OR g.Rating >= @minRating)',
  ].join(' AND ');

  const base = `
    FROM Guides g
    LEFT JOIN Users u ON u.Id = g.UserID
    WHERE ${where}
  `;

  const selectSql = `
    SELECT
      g.Id, g.UserID, g.FullName, g.City, g.Bio, g.Specialties, g.Languages,
      g.HourlyRate, COALESCE(g.DailyRate, g.RatePerDay) AS DailyRate,
      g.Rating, g.TotalReviews, u.AvatarUrl
    ${base}
    ORDER BY g.Rating DESC, g.TotalReviews DESC, g.Id DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `;
  const countSql = `SELECT COUNT(*) AS total ${base}`;

  const params = {
    location: location ? `%${escapeLike(location)}%` : null,
    keyword: keyword ? `%${escapeLike(keyword)}%` : null,
    minPrice: minPrice === undefined ? null : Number(minPrice),
    maxPrice: maxPrice === undefined ? null : Number(maxPrice),
    minRating: minRating === undefined ? null : Number(minRating),
    offset,
    pageSize,
  };

  const [guides, countRow] = await Promise.all([query(selectSql, params), query(countSql, params)]);
  const total = Number(countRow[0]?.total || 0);

  res.json({ ok: true, guides, page, pageSize, total });
}

/**
 * GET /api/guides/:id
 * Detailed profile including linked user avatar and all reviews with tourist info.
 */
export async function getGuideEx(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Invalid ID', 400);

  const sql = `
    SELECT
      g.Id, g.UserID, g.FullName, g.Email, g.Phone, g.City, g.Bio,
      g.Specialties, g.Languages, g.HourlyRate,
      COALESCE(g.DailyRate, g.RatePerDay) AS DailyRate,
      g.Rating, g.TotalReviews, g.IsActive, u.AvatarUrl
    FROM Guides g
    LEFT JOIN Users u ON u.Id = g.UserID
    WHERE g.Id = @id AND g.IsActive = 1
  `;
  const rows = await query(sql, { id });
  if (!rows.length) throw new AppError('Guide not found', 404);

  const guideUserID = rows[0].UserID;

  let reviewsSql, reviewsParams;
  const live = await query(
    `SELECT COUNT(*) AS c FROM sys.columns WHERE object_id = OBJECT_ID('Reviews') AND name = 'RevieweeId'`,
    {}
  );
  if (live[0].c > 0) {
    // Live DB: Reviews uses ReviewerId/RevieweeId/ReviewerRole.
    reviewsSql = `
      SELECT
        r.Id, r.Rating, r.Comment, r.CreatedAt,
        tourist.FullName AS TouristName, tourist.AvatarUrl AS TouristAvatarUrl
      FROM Reviews r
      INNER JOIN Users tourist ON tourist.Id = r.ReviewerId
      WHERE r.RevieweeId = @guideUserID AND r.ReviewerRole = 'tourist'
      ORDER BY r.CreatedAt DESC`;
    reviewsParams = { guideUserID };
  } else {
    // schema.sql design: Reviews uses TouristUserId/GuideId.
    reviewsSql = `
      SELECT
        r.Id, r.Rating, r.Comment, r.CreatedAt,
        tourist.FullName AS TouristName, tourist.AvatarUrl AS TouristAvatarUrl
      FROM Reviews r
      INNER JOIN Users tourist ON tourist.Id = r.TouristUserId
      WHERE r.GuideId = @guideId OR (@guideUserID IS NOT NULL AND r.GuideId = @guideUserID)
      ORDER BY r.CreatedAt DESC`;
    reviewsParams = { guideId: rows[0].Id, guideUserID };
  }
  const reviews = await query(reviewsSql, reviewsParams);

  res.json({ ok: true, guide: { ...rows[0], reviews } });
}

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
export function createListGuides(queryFn = query) {
  return async function listGuides(req, res) {
    const { q, minRating, maxPrice, sort = 'rating', page = 1, limit = 10 } = req.query;
    const currentPage = Number(page);
    const currentLimit = Number(limit);
    const offset = (currentPage - 1) * currentLimit;
    const orderBy = {
      price_asc: 'COALESCE(g.DailyRate, g.RatePerDay) ASC, g.Id DESC',
      price_desc: 'COALESCE(g.DailyRate, g.RatePerDay) DESC, g.Id DESC',
      rating: 'g.Rating DESC, g.TotalReviews DESC, g.Id DESC',
    }[sort] || 'g.Rating DESC, g.TotalReviews DESC, g.Id DESC';

    const baseSql = `
      FROM Guides g
      LEFT JOIN Users u ON u.Id = g.UserID
      WHERE g.IsActive = 1
        AND (@q IS NULL OR (g.FullName LIKE @q OR g.City LIKE @q OR g.Bio LIKE @q))
        AND (@minRating IS NULL OR g.Rating >= @minRating)
        AND (@maxPrice IS NULL OR COALESCE(g.DailyRate, g.RatePerDay) <= @maxPrice)
    `;

    const sql = `
      SELECT g.Id, g.UserID, g.FullName, g.Email, g.Phone, g.City, g.Bio,
             g.Specialties, g.Languages, g.HourlyRate,
             COALESCE(g.DailyRate, g.RatePerDay) AS DailyRate,
             g.Rating, g.TotalReviews, g.IsActive, g.CreatedAt, g.UpdatedAt,
             u.AvatarUrl
      ${baseSql}
      ORDER BY ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const params = {
      q: q ? `%${escapeLike(q)}%` : null,
      minRating: minRating === undefined ? null : Number(minRating),
      maxPrice: maxPrice === undefined ? null : Number(maxPrice),
      offset,
      limit: currentLimit,
    };

    const countSql = `SELECT COUNT(*) AS total ${baseSql}`;
    const [data, countRows] = await Promise.all([
      queryFn(sql, params),
      queryFn(countSql, params),
    ]);
    const total = Number(countRows[0]?.total || 0);

    res.json({
      data,
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit),
    });
  };
}

export const listGuides = createListGuides();

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

/**
 * PUT /api/guides/profile
 * Guide updates their own listing (bio, location, rates, specialties, languages).
 * Upserts the Guides row if it does not exist for this user yet.
 */
export async function updateGuideProfile(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  const { bio, city, specialties, languages, hourlyRate, dailyRate } = req.body || {};

  const params = {
    userId,
    bio,
    city: city ?? null,
    specialties: specialties ?? null,
    languages: languages ?? null,
    hourlyRate: hourlyRate === undefined ? null : Number(hourlyRate),
    dailyRate: dailyRate === undefined ? null : Number(dailyRate),
  };

  const existing = await query('SELECT Id FROM Guides WHERE UserID = @userId', { userId });

  if (!existing.length) {
    // No Guides row yet — create one from the linked user.
    const userRows = await query(
      'SELECT Id, FullName, Email, Phone, Bio AS UserBio FROM Users WHERE Id = @userId',
      { userId }
    );
    if (!userRows.length) throw new AppError('User not found', 404);
    const u = userRows[0];

    const added = await query(
      `INSERT INTO Guides (UserID, FullName, Email, Phone, City, Bio, Specialties, Languages, HourlyRate, DailyRate, RatePerDay, IsActive)
       OUTPUT INSERTED.Id
       VALUES (@userId, @fullName, @email, @phone, @city, @bio, @specialties, @languages, @hourlyRate, @dailyRate, @dailyRate, 1)`,
      {
        userId,
        fullName: u.FullName,
        email: u.Email,
        phone: u.Phone || null,
        city: city ?? null,
        bio: bio ?? u.UserBio ?? null,
        specialties: specialties ?? null,
        languages: languages ?? null,
        hourlyRate: params.hourlyRate,
        dailyRate: params.dailyRate,
      }
    );
    if (!added.length) throw new AppError('Failed to create guide listing', 500);
  } else {
    await query(
      `UPDATE Guides
       SET Bio = COALESCE(@bio, Bio),
           City = COALESCE(@city, City),
           Specialties = COALESCE(@specialties, Specialties),
           Languages = COALESCE(@languages, Languages),
           HourlyRate = COALESCE(@hourlyRate, HourlyRate),
           DailyRate = COALESCE(@dailyRate, DailyRate),
           RatePerDay = COALESCE(@dailyRate, RatePerDay, RatePerDay),
           UpdatedAt = SYSUTCDATETIME()
       WHERE UserID = @userId`,
      params
    );
  }

  res.json({ ok: true, message: 'Profile updated' });
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

/**
 * GET /api/guides/top-rated
 * Returns top-rated guides using GROUP BY + HAVING aggregate filter.
 * HAVING clause filters groups after aggregation (unlike WHERE which filters rows).
 */
export async function getTopRatedGuides(req, res) {
  const minReviews = Number(req.query.minReviews) || 1;

  const rows = await query(
    `SELECT
       g.City,
       COUNT(*) AS guideCount,
       AVG(COALESCE(g.DailyRate, g.RatePerDay)) AS avgDailyRate,
       MIN(COALESCE(g.DailyRate, g.RatePerDay)) AS minDailyRate,
       MAX(COALESCE(g.DailyRate, g.RatePerDay)) AS maxDailyRate,
       AVG(g.Rating) AS avgRating
     FROM Guides g
     WHERE g.IsActive = 1
     GROUP BY g.City
     HAVING COUNT(*) >= @minReviews
     ORDER BY avgRating DESC`,
    { minReviews }
  );

  res.json({ ok: true, cities: rows });
}
