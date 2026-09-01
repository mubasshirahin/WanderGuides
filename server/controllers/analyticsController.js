import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * GET /api/analytics/guide-booking-summary
 * RIGHT JOIN example: Shows ALL guides including those with no bookings.
 * Useful to find guides who have never been booked.
 */
export async function getGuideBookingSummary(req, res) {
  const rows = await query(
    `SELECT
       g.Id AS GuideId,
       g.FullName AS GuideName,
       g.City,
       g.Rating,
       COUNT(b.Id) AS totalBookings,
       ISNULL(SUM(b.TotalAmount), 0) AS totalEarnings
     FROM Bookings b
     RIGHT JOIN Guides g ON g.Id = b.GuideId
     WHERE g.IsActive = 1
     GROUP BY g.Id, g.FullName, g.City, g.Rating
     ORDER BY totalBookings DESC`,
    {}
  );

  res.json({ ok: true, summary: rows });
}

/**
 * GET /api/analytics/user-guide-match
 * FULL JOIN example: Shows all tourists and all guides with their booking connections.
 * Highlights tourists who never booked and guides who were never booked.
 */
export async function getUserGuideMatch(req, res) {
  const rows = await query(
    `SELECT
       u.Id AS UserId,
       u.FullName AS UserName,
       u.Role,
       u.AvatarUrl,
       b.Id AS BookingId,
       b.Status AS BookingStatus,
       b.TotalAmount,
       g.FullName AS GuideName,
       g.City AS GuideCity
     FROM Users u
     FULL JOIN Bookings b ON u.Id = b.TouristUserId
     FULL JOIN Guides g ON g.Id = b.GuideId
     WHERE u.Role = 'tourist'
     ORDER BY u.FullName`,
    {}
  );

  res.json({ ok: true, matches: rows });
}

/**
 * GET /api/analytics/city-specialty-matrix
 * CROSS JOIN example: Generates all possible City × Specialty combinations.
 * Useful to identify which cities have which specialties covered.
 */
export async function getCitySpecialtyMatrix(req, res) {
  const rows = await query(
    `SELECT
       DISTINCT g.City AS GuideCity,
       s.Specialty
     FROM Guides g
     CROSS JOIN (
       SELECT DISTINCT value AS Specialty
       FROM Guides
       CROSS APPLY STRING_SPLIT(Specialties, ',')
       WHERE Specialties IS NOT NULL AND Specialties != ''
     ) s
     WHERE g.IsActive = 1
     ORDER BY g.City, s.Specialty`,
    {}
  );

  res.json({ ok: true, matrix: rows });
}

/**
 * GET /api/analytics/monthly-revenue
 * Additional aggregate example: Monthly revenue with MIN/MAX/AVG per month.
 */
export async function getMonthlyRevenue(req, res) {
  const rows = await query(
    `SELECT
       FORMAT(b.CreatedAt, 'yyyy-MM') AS month,
       COUNT(*) AS totalBookings,
       SUM(b.TotalAmount) AS totalRevenue,
       MIN(b.TotalAmount) AS minBookingAmount,
       MAX(b.TotalAmount) AS maxBookingAmount,
       AVG(b.TotalAmount) AS avgBookingAmount
     FROM Bookings b
     WHERE b.Status != 'cancelled'
     GROUP BY FORMAT(b.CreatedAt, 'yyyy-MM')
     ORDER BY month DESC`,
    {}
  );

  res.json({ ok: true, revenue: rows });
}
