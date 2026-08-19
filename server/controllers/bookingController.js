import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

const ALLOWED_STATUSES = new Set(['pending', 'confirmed', 'completed', 'cancelled']);

/** GET /api/bookings - list bookings for the authenticated tourist or guide. */
export const getAllBookings = async (req, res) => {
  const userId = req.user && req.user.id;
  const role = req.user && req.user.role;

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  if (role !== 'tourist' && role !== 'guide') {
    throw new AppError('Forbidden', 403);
  }

  const { status } = req.query || {};
  let normalizedStatus = null;

  if (status !== undefined) {
    normalizedStatus = String(status).trim().toLowerCase();
    if (!ALLOWED_STATUSES.has(normalizedStatus)) {
      throw new AppError('Invalid status filter', 400);
    }
  }

  const whereClause = role === 'guide' ? 'b.GuideId = @userId' : 'b.TouristUserId = @userId';
  const sql = `
    SELECT
      b.Id,
      b.TouristUserId,
      b.GuideId,
      b.StartDate,
      b.EndDate,
      b.Status,
      b.TotalAmount,
      b.Notes,
      b.CreatedAt,
      tourist.FullName AS TouristName,
      tourist.Email AS TouristEmail,
      guide.FullName AS GuideName,
      guide.Email AS GuideEmail,
      guide.Phone AS GuidePhone,
      guide.AvatarUrl AS GuideAvatarUrl,
      guide.Bio AS GuideBio
    FROM Bookings b
    INNER JOIN Users tourist ON tourist.Id = b.TouristUserId
    INNER JOIN Users guide ON guide.Id = b.GuideId
    WHERE ${whereClause}
      AND (@status IS NULL OR b.Status = @status)
    ORDER BY b.CreatedAt DESC, b.Id DESC
  `;

  const bookings = await query(sql, {
    userId,
    status: normalizedStatus,
  });

  res.json({ ok: true, bookings });
};

/** POST /api/bookings - placeholder. Validate availability + insert here. */
export const createBooking = async (req, res) => {
  const { guideId, startDate, endDate, notes } = req.body || {};

  // tourist id should come from authenticated token
  const touristId = req.user && req.user.id;
  if (!touristId) throw new AppError('Unauthorized', 401);

  if (!guideId || !startDate || !endDate) {
    throw new AppError('guideId, startDate and endDate are required', 400);
  }

  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  if (Number.isNaN(sDate.getTime()) || Number.isNaN(eDate.getTime())) {
    throw new AppError('Invalid date format', 400);
  }

  if (eDate < sDate) throw new AppError('endDate must be on or after startDate', 400);

  // Verify guide exists and get rate
  const guideRows = await query('SELECT Id, RatePerDay FROM Guides WHERE Id = @id', { id: guideId });
  if (!guideRows.length) throw new AppError('Guide not found', 404);
  const ratePerDay = Number(guideRows[0].RatePerDay) || 0;

  // Check overlapping bookings (pending or confirmed)
  const overlapSql = `
    SELECT Id FROM Bookings
    WHERE GuideId = @guideId
      AND Status IN ('pending','confirmed')
      AND NOT (EndDate < @startDate OR StartDate > @endDate)
  `;
  const overlapping = await query(overlapSql, { guideId, startDate, endDate });
  if (overlapping.length) throw new AppError('Guide is already booked for the selected dates', 409);

  // Calculate total amount (inclusive days)
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((eDate - sDate) / msPerDay) + 1;
  const totalAmount = Number((ratePerDay * days).toFixed(2));

  const insertSql = `
    INSERT INTO Bookings (TouristUserId, GuideId, StartDate, EndDate, Status, TotalAmount, Notes)
    OUTPUT INSERTED.Id, INSERTED.TouristUserId, INSERTED.GuideId, INSERTED.StartDate, INSERTED.EndDate, INSERTED.Status, INSERTED.TotalAmount, INSERTED.Notes, INSERTED.CreatedAt
    VALUES (@touristId, @guideId, @startDate, @endDate, 'pending', @totalAmount, @notes)
  `;

  const params = {
    touristId,
    guideId,
    startDate,
    endDate,
    totalAmount,
    notes: notes || null,
  };

  try {
    const rows = await query(insertSql, params);
    res.status(201).json({ ok: true, booking: rows[0] });
  } catch (err) {
    console.error('[createBooking]', err);
    throw new AppError('Failed to create booking', 500);
  }
};
