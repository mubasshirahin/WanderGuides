import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/** GET /api/bookings — placeholder. Join Bookings with Users/Guides here. */
export const getAllBookings = async (req, res) => {
  // const rows = await query('SELECT * FROM Bookings');
  res.json({ ok: true, bookings: [] });
};

/** POST /api/bookings — placeholder. Validate availability + insert here. */
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
