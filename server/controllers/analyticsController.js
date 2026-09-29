import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * GET /api/analytics/guide-booking-summary
 * Course topic VIEW: db/views.sql -> vw_GuideEarnings use kore.
 * (Age RIGHT JOIN + GROUP BY inline chilo.)
 */
export async function getGuideBookingSummary(req, res) {
  const rows = await query(
    `SELECT GuideId, GuideName, City, Rating, TotalBookings,
            TotalEarnings AS totalEarnings
      FROM dbo.vw_GuideEarnings
      ORDER BY TotalBookings DESC`,
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
 * Course topic VIEW: db/views.sql -> vw_MonthlyRevenue use kore.
 */
export async function getMonthlyRevenue(req, res) {
  const rows = await query(
    `SELECT [Month] AS month, TotalBookings AS totalBookings,
            TotalRevenue AS totalRevenue, MinBookingAmount AS minBookingAmount,
            MaxBookingAmount AS maxBookingAmount, AvgBookingAmount AS avgBookingAmount
      FROM dbo.vw_MonthlyRevenue
      ORDER BY [Month] DESC`,
    {}
  );

  res.json({ ok: true, revenue: rows });
}
