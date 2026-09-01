import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * POST /api/reviews
 * Create a review for a completed booking.
 * Works for both tourist→guide and guide→tourist.
 */
export async function createReview(req, res) {
  const reviewerId = req.user?.id;
  if (!reviewerId) throw new AppError('Unauthorized', 401);

  const { bookingId, rating, comment } = req.body || {};

  if (!bookingId || rating === undefined) {
    throw new AppError('bookingId and rating are required', 400);
  }

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new AppError('Rating must be an integer between 1 and 5', 400);
  }

  const bookingRows = await query(
    'SELECT Id, TouristUserId, GuideId, Status FROM Bookings WHERE Id = @bookingId',
    { bookingId }
  );
  if (!bookingRows.length) throw new AppError('Booking not found', 404);

  const booking = bookingRows[0];

  if (booking.Status !== 'completed') {
    throw new AppError('You can only review completed bookings', 400);
  }

  let reviewerRole = null;
  let revieweeId = null;

  if (booking.TouristUserId === reviewerId) {
    reviewerRole = 'tourist';
    revieweeId = booking.GuideId;
  } else if (booking.GuideId === reviewerId) {
    reviewerRole = 'guide';
    revieweeId = booking.TouristUserId;
  } else {
    throw new AppError('You are not part of this booking', 403);
  }

  const existing = await query(
    'SELECT Id FROM Reviews WHERE BookingId = @bookingId AND ReviewerId = @reviewerId',
    { bookingId, reviewerId }
  );
  if (existing.length) {
    throw new AppError('You have already reviewed this booking', 409);
  }

  const rows = await query(
    `INSERT INTO Reviews (BookingId, ReviewerId, RevieweeId, ReviewerRole, Rating, Comment)
     OUTPUT INSERTED.Id, INSERTED.BookingId, INSERTED.ReviewerId, INSERTED.RevieweeId,
            INSERTED.ReviewerRole, INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedAt
     VALUES (@bookingId, @reviewerId, @revieweeId, @reviewerRole, @rating, @comment)`,
    {
      bookingId,
      reviewerId,
      revieweeId,
      reviewerRole,
      rating: ratingNum,
      comment: comment || null,
    }
  );

  if (reviewerRole === 'tourist') {
    await updateGuideRating(revieweeId);
  } else {
    await updateTouristRating(revieweeId);
  }

  res.status(201).json({ ok: true, review: rows[0] });
}

/**
 * GET /api/reviews/user/:userId
 * Get all reviews received by a user with pagination and avg rating.
 */
export async function getUserReviews(req, res) {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError('Invalid user ID', 400);
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const userRows = await query('SELECT Role FROM Users WHERE Id = @id', { id: userId });
  if (!userRows.length) throw new AppError('User not found', 404);

  const reviews = await query(
    `SELECT r.Id, r.BookingId, r.Rating, r.Comment, r.CreatedAt,
            reviewer.FullName AS ReviewerName, reviewer.AvatarUrl AS ReviewerAvatar,
            r.ReviewerRole
     FROM Reviews r
     INNER JOIN Users reviewer ON reviewer.Id = r.ReviewerId
     WHERE r.RevieweeId = @userId
     ORDER BY r.CreatedAt DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    { userId, offset, limit }
  );

  const countRows = await query(
    'SELECT COUNT(*) AS total FROM Reviews WHERE RevieweeId = @userId',
    { userId }
  );
  const total = Number(countRows[0]?.total) || 0;

  const avgRows = await query(
    `SELECT
       ISNULL(AVG(CAST(Rating AS DECIMAL(3,2))), 0) AS avgRating,
       ISNULL(SUM(CASE WHEN Rating = 5 THEN 1 ELSE 0 END), 0) AS star5,
       ISNULL(SUM(CASE WHEN Rating = 4 THEN 1 ELSE 0 END), 0) AS star4,
       ISNULL(SUM(CASE WHEN Rating = 3 THEN 1 ELSE 0 END), 0) AS star3,
       ISNULL(SUM(CASE WHEN Rating = 2 THEN 1 ELSE 0 END), 0) AS star2,
       ISNULL(SUM(CASE WHEN Rating = 1 THEN 1 ELSE 0 END), 0) AS star1
     FROM Reviews WHERE RevieweeId = @userId`,
    { userId }
  );

  res.json({
    ok: true,
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    avgRating: {
      average: Number(avgRows[0]?.avgRating) || 0,
      total,
      breakdown: {
        5: Number(avgRows[0]?.star5) || 0,
        4: Number(avgRows[0]?.star4) || 0,
        3: Number(avgRows[0]?.star3) || 0,
        2: Number(avgRows[0]?.star2) || 0,
        1: Number(avgRows[0]?.star1) || 0,
      },
    },
  });
}

/**
 * GET /api/reviews/pending-reviews
 * Get completed bookings for the logged-in user that haven't been reviewed yet.
 */
export async function getPendingReviews(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  const bookings = await query(
    `SELECT b.Id AS BookingId, b.StartDate, b.EndDate, b.TotalAmount,
            u.FullName AS OtherName, u.AvatarUrl AS OtherAvatar, u.Role AS OtherRole,
            g.City AS GuideCity, g.Specialties AS GuideSpecialties,
            CASE
              WHEN b.TouristUserId = @userId THEN 'tourist'
              ELSE 'guide'
            END AS MyRole,
            CASE
              WHEN b.TouristUserId = @userId THEN b.GuideId
              ELSE b.TouristUserId
            END AS RevieweeId
     FROM Bookings b
     INNER JOIN Users u ON u.Id = CASE WHEN b.TouristUserId = @userId THEN b.GuideId ELSE b.TouristUserId END
     LEFT JOIN Guides g ON g.Email = u.Email
     WHERE b.Status = 'completed'
       AND (b.TouristUserId = @userId OR b.GuideId = @userId)
       AND NOT EXISTS (
         SELECT 1 FROM Reviews r
         WHERE r.BookingId = b.Id AND r.ReviewerId = @userId
       )
     ORDER BY b.EndDate DESC`,
    { userId }
  );

  res.json({ ok: true, bookings });
}

/**
 * GET /api/reviews/me
 * Get reviews given by the current user.
 */
export async function getMyGivenReviews(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  const reviews = await query(
    `SELECT r.Id, r.BookingId, r.Rating, r.Comment, r.CreatedAt,
            reviewee.FullName AS RevieweeName, reviewee.AvatarUrl AS RevieweeAvatar,
            r.ReviewerRole
     FROM Reviews r
     INNER JOIN Users reviewee ON reviewee.Id = r.RevieweeId
     WHERE r.ReviewerId = @userId
     ORDER BY r.CreatedAt DESC`,
    { userId }
  );

  res.json({ ok: true, reviews });
}

/**
 * GET /api/guides/:id/reviews
 * List public reviews for a guide (tourist→guide reviews).
 */
/**
 * Builds the public guide-reviews handler.  Keeping the database function
 * injectable lets this query be tested without a live SQL Server instance.
 */
export function createGetGuideReviews(queryFn = query) {
  return async function getGuideReviews(req, res) {
    const guideId = Number(req.params.id);
    if (!Number.isInteger(guideId) || guideId <= 0) {
      throw new AppError('Invalid ID', 400);
    }

    const reviews = await queryFn(
      `SELECT r.Id, r.Rating, r.Comment, r.CreatedAt,
              tourist.FullName AS TouristName, tourist.AvatarUrl AS TouristAvatarUrl
       FROM Reviews r
       INNER JOIN Users tourist ON tourist.Id = r.TouristUserId
       WHERE r.GuideId = @guideId
       ORDER BY r.CreatedAt DESC`,
      { guideId }
    );

    res.json({ ok: true, reviews });
  };
}

export const getGuideReviews = createGetGuideReviews();

/** Helper: recalculate guide average rating */
async function updateGuideRating(guideUserId) {
  const userRows = await query('SELECT Email FROM Users WHERE Id = @id', { id: guideUserId });
  if (!userRows.length) return;

  const result = await query(
    `SELECT AVG(CAST(r.Rating AS DECIMAL(3,2))) AS AvgRating
     FROM Reviews r
     WHERE r.RevieweeId = @guideUserId AND r.ReviewerRole = 'tourist'`,
    { guideUserId }
  );

  const avgRating = Number(result[0]?.AvgRating) || 0;

  await query(
    'UPDATE Guides SET Rating = @rating, UpdatedAt = SYSUTCDATETIME() WHERE Email = @email',
    { rating: Number(avgRating).toFixed(2), email: userRows[0].Email }
  );
}

/** Helper: recalculate tourist average rating */
async function updateTouristRating(touristUserId) {
  const result = await query(
    `SELECT AVG(CAST(r.Rating AS DECIMAL(3,2))) AS AvgRating
     FROM Reviews r
     WHERE r.RevieweeId = @touristUserId AND r.ReviewerRole = 'guide'`,
    { touristUserId }
  );

  const avgRating = Number(result[0]?.AvgRating) || 0;

  await query(
    'UPDATE Users SET TouristAvgRating = @rating, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id',
    { rating: Number(avgRating).toFixed(2), id: touristUserId }
  );
}
