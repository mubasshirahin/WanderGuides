import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * GET /api/tourist/dashboard
 * Returns aggregated stats, next upcoming tour, and all bookings for the tourist.
 */
export async function getDashboard(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  // 1. Aggregated stats
  const statsRows = await query(
    `SELECT
       COUNT(*) AS totalBookings,
       SUM(CASE WHEN Status IN ('pending','confirmed') THEN 1 ELSE 0 END) AS upcomingTours,
       SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) AS completedTours,
       SUM(CASE WHEN Status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledTours,
       ISNULL(SUM(CASE WHEN Status != 'cancelled' THEN TotalAmount ELSE 0 END), 0) AS totalSpent
     FROM Bookings
     WHERE TouristUserId = @userId`,
    { userId }
  );

  const stats = statsRows[0] || {
    totalBookings: 0,
    upcomingTours: 0,
    completedTours: 0,
    cancelledTours: 0,
    totalSpent: 0,
  };

  // 2. Next upcoming tour (earliest pending/confirmed booking)
  const nextTourRows = await query(
    `SELECT TOP 1
       b.Id, b.StartDate, b.EndDate, b.Status, b.TotalAmount, b.Notes, b.CreatedAt,
       u.FullName AS GuideName, u.AvatarUrl AS GuideAvatar, u.Phone AS GuidePhone,
       g.City AS GuideCity, g.Specialties AS GuideSpecialties, g.Rating AS GuideRating
     FROM Bookings b
     INNER JOIN Users u ON u.Id = b.GuideId
     LEFT JOIN Guides g ON g.Email = u.Email
     WHERE b.TouristUserId = @userId
       AND b.Status IN ('pending','confirmed')
       AND b.EndDate >= CAST(GETDATE() AS DATE)
     ORDER BY b.StartDate ASC`,
    { userId }
  );

  const nextTour = nextTourRows.length ? nextTourRows[0] : null;

  // 3. All bookings (for tabbed list)
  const bookingsRows = await query(
    `SELECT
       b.Id, b.StartDate, b.EndDate, b.Status, b.TotalAmount, b.Notes, b.CreatedAt,
       u.FullName AS GuideName, u.AvatarUrl AS GuideAvatar,
       g.City AS GuideCity, g.Rating AS GuideRating, g.Specialties AS GuideSpecialties
     FROM Bookings b
     INNER JOIN Users u ON u.Id = b.GuideId
     LEFT JOIN Guides g ON g.Email = u.Email
     WHERE b.TouristUserId = @userId
     ORDER BY b.CreatedAt DESC`,
    { userId }
  );

  // 4. User profile
  const userRows = await query(
    `SELECT Id, FullName, Email, AvatarUrl, CreatedAt FROM Users WHERE Id = @userId`,
    { userId }
  );

  res.json({
    ok: true,
    dashboard: {
      user: userRows[0] || null,
      stats: {
        totalBookings: Number(stats.totalBookings) || 0,
        upcomingTours: Number(stats.upcomingTours) || 0,
        completedTours: Number(stats.completedTours) || 0,
        cancelledTours: Number(stats.cancelledTours) || 0,
        totalSpent: Number(stats.totalSpent) || 0,
      },
      nextTour,
      bookings: bookingsRows,
    },
  });
}

/**
 * PUT /api/tourist/bookings/:id/cancel
 * Cancels a booking owned by the authenticated tourist.
 */
export async function cancelBooking(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new AppError('Invalid booking ID', 400);
  }

  // Verify booking exists and belongs to this tourist
  const existing = await query(
    `SELECT Id, Status FROM Bookings WHERE Id = @id AND TouristUserId = @userId`,
    { id: bookingId, userId }
  );

  if (!existing.length) {
    throw new AppError('Booking not found', 404);
  }

  const booking = existing[0];

  if (booking.Status === 'cancelled') {
    throw new AppError('Booking is already cancelled', 400);
  }

  if (booking.Status === 'completed') {
    throw new AppError('Cannot cancel a completed booking', 400);
  }

  // Update status to cancelled
  const updatedRows = await query(
    `UPDATE Bookings SET Status = 'cancelled'
     OUTPUT INSERTED.Id, INSERTED.TouristUserId, INSERTED.GuideId, INSERTED.StartDate,
            INSERTED.EndDate, INSERTED.Status, INSERTED.TotalAmount, INSERTED.Notes, INSERTED.CreatedAt
     WHERE Id = @id AND TouristUserId = @userId`,
    { id: bookingId, userId }
  );

  res.json({ ok: true, booking: updatedRows[0] });
}
