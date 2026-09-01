import { query, getPool } from '../config/db.js';
import AppError from '../utils/AppError.js';

/** GET /api/guides/:id/reviews - list public reviews for a guide. */
export async function getGuideReviews(req, res) {
  const guideId = Number(req.params.id);
  if (!Number.isInteger(guideId) || guideId <= 0) {
    throw new AppError('Invalid ID', 400);
  }

  const reviews = await query(
    `
      SELECT
        r.Id,
        r.Rating,
        r.Comment,
        r.CreatedAt,
        tourist.FullName AS TouristName,
        tourist.AvatarUrl AS TouristAvatarUrl
      FROM Reviews r
      INNER JOIN Users tourist ON tourist.Id = r.TouristUserId
      WHERE r.GuideId = @guideId
      ORDER BY r.CreatedAt DESC
    `,
    { guideId }
  );

  res.json({ ok: true, reviews });
}

/** POST /api/reviews - create a new review for a completed booking. */
export async function createReview(req, res) {
  const touristId = req.user && req.user.id;
  if (!touristId) throw new AppError('Unauthorized', 401);

  const { bookingId, rating, comment } = req.body || {};

  if (!bookingId || rating === undefined) {
    throw new AppError('bookingId and rating are required', 400);
  }

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new AppError('Rating must be an integer between 1 and 5', 400);
  }

  // Verify booking exists, belongs to tourist, and is completed
  const bookingRows = await query(
    'SELECT Id, TouristUserId, GuideId, Status FROM Bookings WHERE Id = @bookingId',
    { bookingId }
  );

  if (!bookingRows.length) {
    throw new AppError('Booking not found', 404);
  }

  const booking = bookingRows[0];
  if (booking.TouristUserId !== touristId) {
    throw new AppError('This booking does not belong to you', 403);
  }

  if (booking.Status !== 'completed') {
    throw new AppError('You can only review completed bookings', 400);
  }

  // Check if review already exists for this booking
  const existingReview = await query(
    'SELECT Id FROM Reviews WHERE BookingId = @bookingId',
    { bookingId }
  );

  if (existingReview.length) {
    throw new AppError('A review already exists for this booking', 409);
  }

  const insertSql = `
    INSERT INTO Reviews (BookingId, TouristUserId, GuideId, Rating, Comment)
    OUTPUT INSERTED.Id, INSERTED.BookingId, INSERTED.TouristUserId, INSERTED.GuideId,
           INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedAt
    VALUES (@bookingId, @touristId, @guideId, @rating, @comment)
  `;

  const params = {
    bookingId,
    touristId,
    guideId: booking.GuideId,
    rating: ratingNum,
    comment: comment || null,
  };

  try {
    const rows = await query(insertSql, params);
    await updateGuideRating(booking.GuideId);
    res.status(201).json({ ok: true, review: rows[0] });
  } catch (err) {
    console.error('[createReview]', err);
    throw new AppError('Failed to create review', 500);
  }
}

/** GET /api/reviews/me - get current user's reviews. */
export async function getMyReviews(req, res) {
  const userId = req.user && req.user.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  const reviews = await query(
    `
      SELECT
        r.Id,
        r.BookingId,
        r.Rating,
        r.Comment,
        r.CreatedAt,
        guide.FullName AS GuideName,
        guide.AvatarUrl AS GuideAvatarUrl
      FROM Reviews r
      INNER JOIN Users guide ON guide.Id = r.GuideId
      WHERE r.TouristUserId = @userId
      ORDER BY r.CreatedAt DESC
    `,
    { userId }
  );

  res.json({ ok: true, reviews });
}

/** PATCH /api/reviews/:id - update a review (owner only). */
export async function updateReview(req, res) {
  const userId = req.user && req.user.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  const reviewId = Number(req.params.id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new AppError('Invalid ID', 400);
  }

  const { rating, comment } = req.body || {};

  if (rating === undefined && comment === undefined) {
    throw new AppError('At least one field (rating or comment) is required', 400);
  }

  // Verify review exists and belongs to user
  const reviewRows = await query(
    'SELECT Id, TouristUserId, GuideId FROM Reviews WHERE Id = @reviewId',
    { reviewId }
  );

  if (!reviewRows.length) {
    throw new AppError('Review not found', 404);
  }

  const review = reviewRows[0];
  if (review.TouristUserId !== userId) {
    throw new AppError('You can only update your own reviews', 403);
  }

  const fields = [];
  const params = { reviewId };

  if (rating !== undefined) {
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new AppError('Rating must be an integer between 1 and 5', 400);
    }
    fields.push('Rating = @rating');
    params.rating = ratingNum;
  }

  if (comment !== undefined) {
    fields.push('Comment = @comment');
    params.comment = comment || null;
  }

  const updateSql = `
    UPDATE Reviews SET ${fields.join(', ')}
    OUTPUT INSERTED.Id, INSERTED.BookingId, INSERTED.TouristUserId, INSERTED.GuideId,
           INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedAt
    WHERE Id = @reviewId
  `;

  try {
    const rows = await query(updateSql, params);
    await updateGuideRating(review.GuideId);
    res.json({ ok: true, review: rows[0] });
  } catch (err) {
    console.error('[updateReview]', err);
    throw new AppError('Failed to update review', 500);
  }
}

/** DELETE /api/reviews/:id - delete a review (owner only). */
export async function deleteReview(req, res) {
  const userId = req.user && req.user.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  const reviewId = Number(req.params.id);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new AppError('Invalid ID', 400);
  }

  // Verify review exists and belongs to user
  const reviewRows = await query(
    'SELECT Id, TouristUserId, GuideId FROM Reviews WHERE Id = @reviewId',
    { reviewId }
  );

  if (!reviewRows.length) {
    throw new AppError('Review not found', 404);
  }

  const review = reviewRows[0];
  if (review.TouristUserId !== userId) {
    throw new AppError('You can only delete your own reviews', 403);
  }

  const deleteSql = 'DELETE FROM Reviews WHERE Id = @reviewId';
  const result = await getPool().then(p => p.request().input('reviewId', reviewId).query(deleteSql));

  if (result.rowsAffected[0] === 0) {
    throw new AppError('Review not found', 404);
  }

  await updateGuideRating(review.GuideId);
  res.json({ ok: true, message: 'Review deleted' });
}

/** Helper: recalculate and update a guide's average rating. */
async function updateGuideRating(guideId) {
  const result = await query(
    'SELECT AVG(CAST(Rating AS DECIMAL(3,2))) AS AvgRating FROM Reviews WHERE GuideId = @guideId',
    { guideId }
  );

  const avgRating = result[0]?.AvgRating || 0;
  await query(
    'UPDATE Guides SET Rating = @rating, UpdatedAt = SYSUTCDATETIME() WHERE Id = @guideId',
    { rating: Number(avgRating).toFixed(2), guideId }
  );
}
