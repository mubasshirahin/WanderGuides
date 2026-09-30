import { getPool, query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/** POST /api/reviews - submit a tourist review for a completed booking.
 * Course topics:
 *  PROCEDURE + TRANSACTION: db/procedures.sql -> sp_SubmitReview (same logic DB level e).
 *    Node theke chaile: query('EXEC dbo.sp_SubmitReview @bookingId, @touristId, @rating, @comment', {...})
 *  TRIGGER: db/triggers.sql -> trg_Reviews_AfterInsert guide rating auto-update kore,
 *    tai nicher manual UPDATE ta double-safe (trigger thakleo / na thakleo thik thakbe).
 */
/** Shared transaction: validate booking ownership/status, insert review, refresh guide rating. */
async function submitReviewForBooking(getPoolFn, touristId, parsedBookingId, ratingNum, comment) {
  const transaction = (await getPoolFn()).transaction();
    let transactionStarted = false;
    try {
      await transaction.begin();
      transactionStarted = true;

    const bookingRequest = transaction.request();
    bookingRequest.input('bookingId', parsedBookingId);
    const bookingResult = await bookingRequest.query(
      `SELECT Id, TouristUserId, GuideId, Status
       FROM Bookings WITH (UPDLOCK, HOLDLOCK)
       WHERE Id = @bookingId`
    );
    const booking = bookingResult.recordset[0];
    if (!booking) throw new AppError('Booking not found', 404);
    if (Number(booking.TouristUserId) !== touristId) throw new AppError('Forbidden', 403);
    if (String(booking.Status).toLowerCase() !== 'completed') {
      throw new AppError('You can only review completed bookings', 403);
    }

    const duplicateRequest = transaction.request();
    duplicateRequest.input('bookingId', parsedBookingId);
    const duplicateResult = await duplicateRequest.query(
      'SELECT Id FROM Reviews WHERE BookingId = @bookingId'
    );
    if (duplicateResult.recordset.length) {
      throw new AppError('You have already reviewed this booking', 409);
    }

    const insertRequest = transaction.request();
    insertRequest.input('bookingId', parsedBookingId);
    insertRequest.input('touristId', touristId);
    insertRequest.input('guideId', Number(booking.GuideId));
    insertRequest.input('rating', ratingNum);
    insertRequest.input('comment', comment || null);
    const insertResult = await insertRequest.query(
      // NOTE: Reviews-te AFTER INSERT trigger ache, tai OUTPUT ... INTO @table pattern.
      `DECLARE @newReview TABLE (Id INT, BookingId INT, TouristUserId INT, GuideId INT, Rating TINYINT, Comment NVARCHAR(MAX), CreatedAt DATETIME2);
       INSERT INTO Reviews (BookingId, TouristUserId, GuideId, Rating, Comment)
       OUTPUT INSERTED.Id, INSERTED.BookingId, INSERTED.TouristUserId,
              INSERTED.GuideId, INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedAt INTO @newReview
       VALUES (@bookingId, @touristId, @guideId, @rating, @comment);
       SELECT Id, BookingId, TouristUserId, GuideId, Rating, Comment, CreatedAt FROM @newReview;`
    );

    const ratingRequest = transaction.request();
    ratingRequest.input('guideId', Number(booking.GuideId));
    const ratingResult = await ratingRequest.query(
      `SELECT AVG(CAST(Rating AS DECIMAL(10, 2))) AS AverageRating,
              COUNT(*) AS ReviewCount
       FROM Reviews
       WHERE GuideId = @guideId`
    );
    const averageRating = Number(ratingResult.recordset[0]?.AverageRating) || 0;
    const reviewCount = Number(ratingResult.recordset[0]?.ReviewCount) || 0;

    const updateRequest = transaction.request();
    updateRequest.input('guideId', Number(booking.GuideId));
    updateRequest.input('rating', averageRating.toFixed(2));
    updateRequest.input('reviewCount', reviewCount);
    await updateRequest.query(
      `UPDATE Guides
       SET Rating = @rating, TotalReviews = @reviewCount, UpdatedAt = SYSUTCDATETIME()
       WHERE UserID = @guideId`
    );

    await transaction.commit();
    return insertResult.recordset[0];
    } catch (err) {
      if (transactionStarted) await transaction.rollback().catch(() => {});
      if (err?.number === 2601 || err?.number === 2627) {
        throw new AppError('You have already reviewed this booking', 409);
      }
      throw err;
    }
}

export function createCreateReview(getPoolFn = getPool) {
  return async function createReview(req, res) {
    const touristId = Number(req.user?.id);
    if (!touristId) throw new AppError('Unauthorized', 401);
    if (req.user?.role !== 'tourist') throw new AppError('Forbidden', 403);

    const { bookingId, rating, comment } = req.body || {};
    const parsedBookingId = Number(bookingId);
    const ratingNum = Number(rating);
    if (!Number.isInteger(parsedBookingId) || parsedBookingId <= 0 || rating === undefined) {
      throw new AppError('bookingId and rating are required', 400);
    }
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new AppError('Rating must be an integer between 1 and 5', 400);
    }

    const review = await submitReviewForBooking(getPoolFn, touristId, parsedBookingId, ratingNum, comment || null);
    res.status(201).json({ ok: true, review });
  };
}

export const createReview = createCreateReview();

/** POST /api/reviews/guide + POST /api/guides/reviews + POST /api/guides/:id/reviews
 *  Open review from Explore view.
 *  Tour complete kora lage na — View te giye je kono tourist guide ke
 *  rating/review dite parbe (one-way: tourist -> guide only).
 *  Reviews.BookingId NULL থাকে (db/migrate-open-reviews.sql চালানোর পর).
 *  Ek tourist ek guide ke 1ta open review dite parbe; abar dile update hobe.
 */
export function createCreateGuideReview(queryFn = query) {
  return async function createGuideReview(req, res) {
    const touristId = Number(req.user?.id);
    if (!touristId) throw new AppError('Unauthorized', 401);
    if (req.user?.role !== 'tourist') throw new AppError('Forbidden', 403);

    const body = req.body || {};
    // Aliases support: body.guideId (primary) ba URL params.id (/api/guides/:id/reviews)
    const rawGuideId = body.guideId ?? body.GuideId ?? body.guideID ?? req.params?.id;
    const { rating, comment } = body;
    const ratingNum = Number(rating);
    if (rawGuideId === undefined || rawGuideId === null || String(rawGuideId).trim() === '') {
      throw new AppError('guideId is required', 400);
    }
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new AppError('Rating must be an integer between 1 and 5', 400);
    }

    // guideId Users.Id hote pare, abar Guides.Id o hote pare — 2tai resolve kori.
    let guideUserId = Number(rawGuideId);
    const guideUserRows = await queryFn(
      `SELECT Id FROM Users WHERE Id = @id AND Role = 'guide'`,
      { id: guideUserId }
    );
    if (!guideUserRows.length) {
      const profileRows = await queryFn(
        `SELECT UserID FROM Guides WHERE Id = @id AND IsActive = 1`,
        { id: guideUserId }
      );
      if (!profileRows.length || !profileRows[0]?.UserID) {
        throw new AppError('Guide not found or has no linked account yet', 404);
      }
      guideUserId = Number(profileRows[0].UserID);
    }

    const cleanComment = comment && String(comment).trim() ? String(comment).trim() : null;

    // Live DB (ReviewerId/RevieweeId) vs schema.sql (TouristUserId/GuideId) —
    // Invalid column (207) pele live query-te fallback.
    let live = false;
    const runQ = async (legacySql, liveSql, params) => {
      try {
        if (!live) return await queryFn(legacySql, params);
        return await queryFn(liveSql, params);
      } catch (err) {
        if (err?.number === 207 && !live) {
          live = true;
          return await queryFn(liveSql, params);
        }
        throw err;
      }
    };

    const EXIST_LEGACY = `SELECT Id FROM Reviews WHERE TouristUserId = @touristId AND GuideId = @guideId AND BookingId IS NULL`;
    const EXIST_LIVE = `SELECT Id FROM Reviews WHERE ReviewerId = @touristId AND RevieweeId = @guideId AND ReviewerRole = 'tourist' AND BookingId IS NULL`;
    // NOTE: Reviews-te AFTER INSERT trigger ache, tai OUTPUT ... INTO @table pattern (direct OUTPUT fail kore).
    const UPDATE_LEGACY = `DECLARE @upd TABLE (Id INT, BookingId INT, TouristUserId INT, GuideId INT, Rating TINYINT, Comment NVARCHAR(MAX), CreatedAt DATETIME2);
           UPDATE Reviews SET Rating = @rating, Comment = @comment
           OUTPUT INSERTED.Id, INSERTED.BookingId, INSERTED.TouristUserId,
                  INSERTED.GuideId, INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedAt INTO @upd
           WHERE Id = @id;
           SELECT Id, BookingId, TouristUserId, GuideId, Rating, Comment, CreatedAt FROM @upd;`;
    const UPDATE_LIVE = `DECLARE @upd TABLE (Id INT, BookingId INT, TouristUserId INT, GuideId INT, Rating TINYINT, Comment NVARCHAR(MAX), CreatedAt DATETIME2);
           UPDATE Reviews SET Rating = @rating, Comment = @comment
           OUTPUT INSERTED.Id, INSERTED.BookingId, INSERTED.ReviewerId,
                  INSERTED.RevieweeId, INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedAt INTO @upd
           WHERE Id = @id;
           SELECT Id, BookingId, TouristUserId, GuideId, Rating, Comment, CreatedAt FROM @upd;`;
    const INSERT_LEGACY = `DECLARE @new TABLE (Id INT, BookingId INT, TouristUserId INT, GuideId INT, Rating TINYINT, Comment NVARCHAR(MAX), CreatedAt DATETIME2);
           INSERT INTO Reviews (BookingId, TouristUserId, GuideId, Rating, Comment)
           OUTPUT INSERTED.Id, INSERTED.BookingId, INSERTED.TouristUserId,
                  INSERTED.GuideId, INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedAt INTO @new
           VALUES (NULL, @touristId, @guideId, @rating, @comment);
           SELECT Id, BookingId, TouristUserId, GuideId, Rating, Comment, CreatedAt FROM @new;`;
    const INSERT_LIVE = `DECLARE @new TABLE (Id INT, BookingId INT, TouristUserId INT, GuideId INT, Rating TINYINT, Comment NVARCHAR(MAX), CreatedAt DATETIME2);
           INSERT INTO Reviews (BookingId, ReviewerId, RevieweeId, ReviewerRole, Rating, Comment)
           OUTPUT INSERTED.Id, INSERTED.BookingId, INSERTED.ReviewerId,
                  INSERTED.RevieweeId, INSERTED.Rating, INSERTED.Comment, INSERTED.CreatedAt INTO @new
           VALUES (NULL, @touristId, @guideId, 'tourist', @rating, @comment);
           SELECT Id, BookingId, TouristUserId, GuideId, Rating, Comment, CreatedAt FROM @new;`;
    const AVG_LEGACY = `SELECT AVG(CAST(Rating AS DECIMAL(10, 2))) AS AverageRating,
              COUNT(*) AS ReviewCount
       FROM Reviews WHERE GuideId = @guideId`;
    const AVG_LIVE = `SELECT AVG(CAST(Rating AS DECIMAL(10, 2))) AS AverageRating,
              COUNT(*) AS ReviewCount
       FROM Reviews WHERE RevieweeId = @guideId AND ReviewerRole = 'tourist'`;

    // Age open review thakle update (je keo abar rating dite parbe)
    const existing = await runQ(EXIST_LEGACY, EXIST_LIVE, { touristId, guideId: guideUserId });

    let reviewRow;
    try {
      if (existing.length) {
        const updated = await runQ(UPDATE_LEGACY, UPDATE_LIVE,
          { id: Number(existing[0].Id), rating: ratingNum, comment: cleanComment }
        );
        reviewRow = updated[0];
      } else {
        const inserted = await runQ(INSERT_LEGACY, INSERT_LIVE,
          { touristId, guideId: guideUserId, rating: ratingNum, comment: cleanComment }
        );
        reviewRow = inserted[0];
      }
    } catch (err) {
      // Migration na chalale BookingId NOT NULL thakbe (error 515)
      if (err?.number === 515) {
        throw new AppError('Open reviews need DB migration: run db/migrate-open-reviews.sql once.', 500);
      }
      // Race-e duplicate hole existing ta update kore dao
      if (err?.number === 2601 || err?.number === 2627) {
        const again = await runQ(EXIST_LEGACY, EXIST_LIVE, { touristId, guideId: guideUserId });
        if (again.length) {
          const updated = await runQ(UPDATE_LEGACY, UPDATE_LIVE,
            { id: Number(again[0].Id), rating: ratingNum, comment: cleanComment }
          );
          reviewRow = updated[0];
        } else {
          throw new AppError('You have already reviewed this guide', 409);
        }
      } else {
        throw err;
      }
    }

    // Guide rating recalc (booking + open sob review mile)
    const ratingRows = await runQ(AVG_LEGACY, AVG_LIVE, { guideId: guideUserId });
    const averageRating = Number(ratingRows[0]?.AverageRating) || 0;
    const reviewCount = Number(ratingRows[0]?.ReviewCount) || 0;
    await queryFn(
      `UPDATE Guides
       SET Rating = @rating, TotalReviews = @reviewCount, UpdatedAt = SYSUTCDATETIME()
       WHERE UserID = @guideId`,
      { guideId: guideUserId, rating: averageRating.toFixed(2), reviewCount }
    );

    res.status(existing.length ? 200 : 201).json({ ok: true, review: reviewRow });
  };
}

export const createGuideReview = createCreateGuideReview();

/**
 * GET /api/reviews/user/:userId
 * Get all reviews received by a user with pagination and avg rating.
 * One-way rule: only tourist -> guide reviews exist (Reviews table).
 * Tourists never receive reviews, so a tourist target always returns empty.
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

  const isTourist = String(userRows[0].Role).toLowerCase() === 'tourist';
  if (isTourist) {
    // Guide-to-tourist reviews are disabled — tourists only give, never receive.
    return res.json({
      ok: true,
      reviews: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      avgRating: {
        average: 0,
        total: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
    });
  }

  const source = 'Reviews';
  const reviewerIdColumn = 'TouristUserId';
  const targetIdColumn = 'GuideId';
  const idColumn = 'Id';
  const bookingIdColumn = 'BookingID';

  const LEGACY_Q = `SELECT r.${idColumn} AS Id, r.${bookingIdColumn} AS BookingId,
            r.Rating, r.Comment, r.CreatedAt,
            r.GuideResponse AS GuideResponse,
            r.GuideResponseAt AS GuideResponseAt,
            reviewer.FullName AS ReviewerName, reviewer.AvatarUrl AS ReviewerAvatar,
            'tourist' AS ReviewerRole
     FROM ${source} r
     INNER JOIN Users reviewer ON reviewer.Id = r.${reviewerIdColumn}
     WHERE r.${targetIdColumn} = @userId
     ORDER BY r.CreatedAt DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
  const LIVE_Q = `SELECT r.Id AS Id, r.BookingId AS BookingId,
            r.Rating, r.Comment, r.CreatedAt,
            r.GuideResponse AS GuideResponse,
            r.GuideResponseAt AS GuideResponseAt,
            reviewer.FullName AS ReviewerName, reviewer.AvatarUrl AS ReviewerAvatar,
            'tourist' AS ReviewerRole
     FROM Reviews r
     INNER JOIN Users reviewer ON reviewer.Id = r.ReviewerId
     WHERE r.RevieweeId = @userId AND r.ReviewerRole = 'tourist'
     ORDER BY r.CreatedAt DESC
     OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
  let reviews;
  try {
    reviews = await query(LEGACY_Q, { userId, offset, limit });
  } catch (err) {
    if (err?.number === 207) reviews = await query(LIVE_Q, { userId, offset, limit });
    else throw err;
  }

  const STATS_LEGACY = `SELECT COUNT(*) AS total,
       ISNULL(AVG(CAST(Rating AS DECIMAL(10,2))), 0) AS avgRating,
       ISNULL(SUM(CASE WHEN Rating = 5 THEN 1 ELSE 0 END), 0) AS star5,
       ISNULL(SUM(CASE WHEN Rating = 4 THEN 1 ELSE 0 END), 0) AS star4,
       ISNULL(SUM(CASE WHEN Rating = 3 THEN 1 ELSE 0 END), 0) AS star3,
       ISNULL(SUM(CASE WHEN Rating = 2 THEN 1 ELSE 0 END), 0) AS star2,
       ISNULL(SUM(CASE WHEN Rating = 1 THEN 1 ELSE 0 END), 0) AS star1
     FROM ${source} WHERE ${targetIdColumn} = @userId`;
  const STATS_LIVE = `SELECT COUNT(*) AS total,
       ISNULL(AVG(CAST(Rating AS DECIMAL(10,2))), 0) AS avgRating,
       ISNULL(SUM(CASE WHEN Rating = 5 THEN 1 ELSE 0 END), 0) AS star5,
       ISNULL(SUM(CASE WHEN Rating = 4 THEN 1 ELSE 0 END), 0) AS star4,
       ISNULL(SUM(CASE WHEN Rating = 3 THEN 1 ELSE 0 END), 0) AS star3,
       ISNULL(SUM(CASE WHEN Rating = 2 THEN 1 ELSE 0 END), 0) AS star2,
       ISNULL(SUM(CASE WHEN Rating = 1 THEN 1 ELSE 0 END), 0) AS star1
     FROM Reviews WHERE RevieweeId = @userId AND ReviewerRole = 'tourist'`;
  let statsRows;
  try {
    statsRows = await query(STATS_LEGACY, { userId });
  } catch (err) {
    if (err?.number === 207) statsRows = await query(STATS_LIVE, { userId });
    else throw err;
  }
  const stats = statsRows[0] || {};
  const total = Number(stats.total) || 0;

  res.json({
    ok: true,
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    avgRating: {
      average: Number(stats.avgRating) || 0,
      total,
      breakdown: {
        5: Number(stats.star5) || 0,
        4: Number(stats.star4) || 0,
        3: Number(stats.star3) || 0,
        2: Number(stats.star2) || 0,
        1: Number(stats.star1) || 0,
      },
    },
  });
}

/** PUT /api/reviews/:reviewId/response - let the guide respond to their review. */
export async function respondToReview(req, res) {
  const guideId = Number(req.user?.id);
  const reviewId = Number(req.params.reviewId);
  const response = String(req.body?.response || '').trim();
  if (!guideId) throw new AppError('Unauthorized', 401);
  if (!Number.isInteger(reviewId) || reviewId <= 0) throw new AppError('Invalid review ID', 400);
  if (!response || response.length > 1000) throw new AppError('Response must be between 1 and 1000 characters', 400);

  const LEGACY = `UPDATE Reviews
     SET GuideResponse = @response, GuideResponseAt = SYSUTCDATETIME()
     OUTPUT INSERTED.Id, INSERTED.GuideResponse, INSERTED.GuideResponseAt
     WHERE Id = @reviewId AND GuideId = @guideId`;
  const LIVE = `UPDATE Reviews
     SET GuideResponse = @response, GuideResponseAt = SYSUTCDATETIME()
     OUTPUT INSERTED.Id, INSERTED.GuideResponse, INSERTED.GuideResponseAt
     WHERE Id = @reviewId AND RevieweeId = @guideId AND ReviewerRole = 'tourist'`;
  let rows;
  try {
    rows = await query(LEGACY, { reviewId, guideId, response });
  } catch (err) {
    if (err?.number === 207) rows = await query(LIVE, { reviewId, guideId, response });
    else throw err;
  }
  if (!rows.length) throw new AppError('Review not found for this guide', 404);
  res.json({ ok: true, review: rows[0] });
}

/**
 * GET /api/reviews/pending-reviews
 * Get completed bookings for the logged-in user that haven't been reviewed yet.
 */
export async function getPendingReviews(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);

  if (String(req.user?.role).toLowerCase() !== 'tourist') {
    return res.json({ ok: true, bookings: [] });
  }

  const bookings = await query(
    `SELECT b.Id AS BookingId, b.StartDate, b.EndDate, b.TotalAmount,
            guide.FullName AS OtherName, guide.AvatarUrl AS OtherAvatar, guide.Role AS OtherRole,
            g.City AS GuideCity, g.Specialties AS GuideSpecialties,
            'tourist' AS MyRole, b.GuideId AS RevieweeId
     FROM Bookings b
     INNER JOIN Users guide ON guide.Id = b.GuideId
     LEFT JOIN Guides g ON g.UserID = guide.Id
     WHERE b.Status = 'completed'
       AND b.TouristUserId = @userId
       AND NOT EXISTS (
         SELECT 1 FROM Reviews r
         WHERE r.BookingId = b.Id
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

  const LEGACY = `SELECT r.Id, r.BookingId, r.Rating, r.Comment, r.CreatedAt,
            guide.FullName AS RevieweeName, guide.AvatarUrl AS RevieweeAvatar,
            'tourist' AS ReviewerRole
     FROM Reviews r
     INNER JOIN Users guide ON guide.Id = r.GuideId
     WHERE r.TouristUserId = @userId
     ORDER BY r.CreatedAt DESC`;
  const LIVE = `SELECT r.Id, r.BookingId, r.Rating, r.Comment, r.CreatedAt,
            guide.FullName AS RevieweeName, guide.AvatarUrl AS RevieweeAvatar,
            'tourist' AS ReviewerRole
     FROM Reviews r
     INNER JOIN Users guide ON guide.Id = r.RevieweeId
     WHERE r.ReviewerId = @userId AND r.ReviewerRole = 'tourist'
     ORDER BY r.CreatedAt DESC`;
  let reviews;
  try {
    reviews = await query(LEGACY, { userId });
  } catch (err) {
    if (err?.number === 207) reviews = await query(LIVE, { userId });
    else throw err;
  }

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

    // params Guides.Id o hote pare, Users.Id o hote pare — 2tai cover kori
    // (open review BookingId NULL + booking review BookingId NOT NULL — 2tai asbe)
    // Live DB (ReviewerId/RevieweeId) vs schema.sql (TouristUserId/GuideId) — 207 pele fallback.
    const LEGACY = `SELECT r.Id, r.Rating, r.Comment, r.GuideResponse, r.GuideResponseAt, r.CreatedAt,
              tourist.FullName AS TouristName, tourist.AvatarUrl AS TouristAvatarUrl
       FROM Reviews r
       INNER JOIN Users tourist ON tourist.Id = r.TouristUserId
       WHERE r.GuideId = @guideId
          OR r.GuideId IN (SELECT UserID FROM Guides WHERE Id = @guideId AND UserID IS NOT NULL)
       ORDER BY r.CreatedAt DESC`;
    const LIVE = `SELECT r.Id, r.Rating, r.Comment, r.GuideResponse, r.GuideResponseAt, r.CreatedAt,
              tourist.FullName AS TouristName, tourist.AvatarUrl AS TouristAvatarUrl
       FROM Reviews r
       INNER JOIN Users tourist ON tourist.Id = r.ReviewerId
       WHERE (r.RevieweeId = @guideId AND r.ReviewerRole = 'tourist')
          OR r.RevieweeId IN (SELECT UserID FROM Guides WHERE Id = @guideId AND UserID IS NOT NULL)
       ORDER BY r.CreatedAt DESC`;
    let reviews;
    try {
      reviews = await queryFn(LEGACY, { guideId });
    } catch (err) {
      if (err?.number === 207) reviews = await queryFn(LIVE, { guideId });
      else throw err;
    }

    res.json({ ok: true, reviews });
  };
}

export const getGuideReviews = createGetGuideReviews();

/** Helper: recalculate guide average rating (tourist -> guide only) */
async function updateGuideRating(guideUserId) {
  const userRows = await query('SELECT Email FROM Users WHERE Id = @id', { id: guideUserId });
  if (!userRows.length) return;

  let result;
  try {
    result = await query(
      `SELECT AVG(CAST(r.Rating AS DECIMAL(3,2))) AS AvgRating
       FROM Reviews r
       WHERE r.GuideId = @guideUserId`,
      { guideUserId }
    );
  } catch (err) {
    if (err?.number !== 207) throw err;
    result = await query(
      `SELECT AVG(CAST(r.Rating AS DECIMAL(3,2))) AS AvgRating
       FROM Reviews r
       WHERE r.RevieweeId = @guideUserId AND r.ReviewerRole = 'tourist'`,
      { guideUserId }
    );
  }

  const avgRating = Number(result[0]?.AvgRating) || 0;

  await query(
    'UPDATE Guides SET Rating = @rating, UpdatedAt = SYSUTCDATETIME() WHERE Email = @email',
    { rating: Number(avgRating).toFixed(2), email: userRows[0].Email }
  );
}
