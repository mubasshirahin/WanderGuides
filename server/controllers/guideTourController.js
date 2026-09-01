import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * POST /api/guide/tours
 * Create a new tour package post.
 */
export async function createTour(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const { title, description, location, price, durationHours, maxGroupSize,
    category, difficulty, meetingPoint, included, highlights, languages } = req.body || {};

  if (!title || price === undefined) {
    throw new AppError('title and price are required', 400);
  }

  const rows = await query(
    `INSERT INTO GuideTours (GuideId, Title, Description, Location, Price, DurationHours, MaxGroupSize,
       Category, Difficulty, MeetingPoint, Included, Highlights, Languages)
     OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Description, INSERTED.Location,
            INSERTED.Price, INSERTED.DurationHours, INSERTED.MaxGroupSize,
            INSERTED.Category, INSERTED.Difficulty, INSERTED.MeetingPoint,
            INSERTED.Included, INSERTED.Highlights, INSERTED.Languages,
            INSERTED.IsActive, INSERTED.CreatedAt
     VALUES (@guideId, @title, @description, @location, @price, @durationHours, @maxGroupSize,
       @category, @difficulty, @meetingPoint, @included, @highlights, @languages)`,
    {
      guideId,
      title,
      description: description || null,
      location: location || null,
      price: Number(price),
      durationHours: Number(durationHours) || 8,
      maxGroupSize: Number(maxGroupSize) || 10,
      category: category || null,
      difficulty: difficulty || null,
      meetingPoint: meetingPoint || null,
      included: included || null,
      highlights: highlights || null,
      languages: languages || null,
    }
  );

  res.status(201).json({ ok: true, tour: rows[0] });
}

/**
 * GET /api/guide/my-tours
 * Fetch only the logged-in guide's tour posts with response/bid counts.
 */
export async function getMyTours(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const rows = await query(
    `SELECT
       gt.Id, gt.Title, gt.Description, gt.Location, gt.Price,
       gt.DurationHours, gt.MaxGroupSize, gt.IsActive, gt.CreatedAt,
       gt.Category, gt.Difficulty, gt.MeetingPoint, gt.Included, gt.Highlights, gt.Languages,
       (SELECT COUNT(*) FROM Bookings b WHERE b.GuideId = @guideId AND b.Notes LIKE '%' + gt.Title + '%') AS bookingCount,
       (SELECT COUNT(*) FROM TourBids tb WHERE tb.GuideID = @guideId AND tb.RequestID IN (
         SELECT ctr.RequestID FROM CustomTourRequests ctr WHERE ctr.Title LIKE '%' + gt.Title + '%'
       )) AS bidCount
     FROM GuideTours gt
     WHERE gt.GuideId = @guideId
     ORDER BY gt.CreatedAt DESC`,
    { guideId }
  );

  res.json({ ok: true, tours: rows });
}

/**
 * GET /api/guide/tours/:tourId/responses
 * Get all tourist booking responses/bids for a specific guide tour post.
 */
export async function getTourResponses(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const tourId = Number(req.params.tourId);
  if (!Number.isInteger(tourId) || tourId <= 0) {
    throw new AppError('Invalid tour ID', 400);
  }

  // Verify tour belongs to this guide
  const tourRows = await query(
    'SELECT Id, Title FROM GuideTours WHERE Id = @tourId AND GuideId = @guideId',
    { tourId, guideId }
  );
  if (!tourRows.length) throw new AppError('Tour not found', 404);

  // Get bookings that reference this tour
  const bookings = await query(
    `SELECT
       b.Id AS BookingId, b.TouristUserId, b.StartDate, b.EndDate,
       b.Status, b.TotalAmount, b.Notes, b.CreatedAt,
       u.FullName AS TouristName, u.Email AS TouristEmail, u.AvatarUrl AS TouristAvatar
     FROM Bookings b
     INNER JOIN Users u ON u.Id = b.TouristUserId
     WHERE b.GuideId = @guideId
       AND (b.Notes LIKE '%' + @tourTitle + '%' OR b.Notes IS NULL)
     ORDER BY b.CreatedAt DESC`,
    { guideId, tourTitle: tourRows[0].Title }
  );

  // Get bids for custom tours matching this guide
  const bids = await query(
    `SELECT
       tb.BidID, tb.RequestID, tb.GuideID, tb.OfferedPrice, tb.Message,
       tb.Status AS BidStatus, tb.CreatedAt AS BidCreatedAt,
       ctr.Title AS RequestTitle, ctr.Destination, ctr.Budget,
       ctr.StartDate AS RequestStartDate, ctr.EndDate AS RequestEndDate,
       u.FullName AS TouristName, u.Email AS TouristEmail, u.AvatarUrl AS TouristAvatar
     FROM TourBids tb
     INNER JOIN CustomTourRequests ctr ON ctr.RequestID = tb.RequestID
     INNER JOIN Users u ON u.Id = ctr.TouristID
     WHERE tb.GuideID = @guideId
     ORDER BY tb.CreatedAt DESC`,
    { guideId }
  );

  res.json({
    ok: true,
    tour: tourRows[0],
    bookings,
    bids,
  });
}

/**
 * PUT /api/guide/tours/:tourId/toggle
 * Toggle a tour's active status.
 */
export async function toggleTour(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const tourId = Number(req.params.tourId);
  if (!Number.isInteger(tourId) || tourId <= 0) {
    throw new AppError('Invalid tour ID', 400);
  }

  const rows = await query(
    `UPDATE GuideTours
     SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END,
         UpdatedAt = SYSUTCDATETIME()
     OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.IsActive
     WHERE Id = @tourId AND GuideId = @guideId`,
    { tourId, guideId }
  );

  if (!rows.length) throw new AppError('Tour not found', 404);
  res.json({ ok: true, tour: rows[0] });
}

/**
 * PUT /api/guide/tours/:tourId
 * Update a tour post.
 */
export async function updateTour(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const tourId = Number(req.params.tourId);
  if (!Number.isInteger(tourId) || tourId <= 0) {
    throw new AppError('Invalid tour ID', 400);
  }

  const { title, description, location, price, durationHours, maxGroupSize,
    category, difficulty, meetingPoint, included, highlights, languages } = req.body || {};

  if (!title || price === undefined) {
    throw new AppError('title and price are required', 400);
  }

  const rows = await query(
    `UPDATE GuideTours
     SET Title = @title, Description = @description, Location = @location,
         Price = @price, DurationHours = @durationHours, MaxGroupSize = @maxGroupSize,
         Category = @category, Difficulty = @difficulty, MeetingPoint = @meetingPoint,
         Included = @included, Highlights = @highlights, Languages = @languages,
         UpdatedAt = GETUTCDATE()
     OUTPUT INSERTED.Id, INSERTED.Title, INSERTED.Description, INSERTED.Location,
            INSERTED.Price, INSERTED.DurationHours, INSERTED.MaxGroupSize,
            INSERTED.Category, INSERTED.Difficulty, INSERTED.MeetingPoint,
            INSERTED.Included, INSERTED.Highlights, INSERTED.Languages,
            INSERTED.IsActive, INSERTED.CreatedAt
     WHERE Id = @tourId AND GuideId = @guideId`,
    {
      tourId,
      guideId,
      title,
      description: description || null,
      location: location || null,
      price: Number(price),
      durationHours: Number(durationHours) || 8,
      maxGroupSize: Number(maxGroupSize) || 10,
      category: category || null,
      difficulty: difficulty || null,
      meetingPoint: meetingPoint || null,
      included: included || null,
      highlights: highlights || null,
      languages: languages || null,
    }
  );

  if (!rows.length) throw new AppError('Tour not found', 404);
  res.json({ ok: true, tour: rows[0] });
}

/**
 * DELETE /api/guide/tours/:tourId
 * Delete a tour post.
 */
export async function deleteTour(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const tourId = Number(req.params.tourId);
  if (!Number.isInteger(tourId) || tourId <= 0) {
    throw new AppError('Invalid tour ID', 400);
  }

  const rows = await query(
    'DELETE FROM GuideTours OUTPUT DELETED.Id WHERE Id = @tourId AND GuideId = @guideId',
    { tourId, guideId }
  );

  if (!rows.length) throw new AppError('Tour not found', 404);
  res.json({ ok: true, message: 'Tour deleted' });
}

/**
 * GET /api/guide/custom-requests
 * Get all open tourist custom tour requests.
 */
export async function getOpenCustomRequests(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const rows = await query(
    `SELECT
       ctr.RequestID, ctr.TouristID, ctr.Title, ctr.Destination,
       ctr.Budget, ctr.StartDate, ctr.EndDate, ctr.Status, ctr.CreatedAt,
       u.FullName AS TouristName, u.Email AS TouristEmail, u.AvatarUrl AS TouristAvatar,
       (SELECT COUNT(*) FROM TourBids tb WHERE tb.RequestID = ctr.RequestID) AS totalBids,
       (SELECT COUNT(*) FROM TourBids tb WHERE tb.RequestID = ctr.RequestID AND tb.GuideID = @guideId) AS myBidCount
     FROM CustomTourRequests ctr
     INNER JOIN Users u ON u.Id = ctr.TouristID
     WHERE ctr.Status = 'open'
     ORDER BY ctr.CreatedAt DESC`,
    { guideId }
  );

  res.json({ ok: true, requests: rows });
}

/**
 * POST /api/guide/custom-requests/:requestId/bid
 * Submit a guide bid/offer for a tourist's custom request.
 */
export async function submitBid(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const requestId = Number(req.params.requestId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new AppError('Invalid request ID', 400);
  }

  const { offeredPrice, message } = req.body || {};
  if (!offeredPrice) throw new AppError('offeredPrice is required', 400);

  // Check request exists and is open
  const reqRows = await query(
    'SELECT RequestID, Status FROM CustomTourRequests WHERE RequestID = @requestId',
    { requestId }
  );
  if (!reqRows.length) throw new AppError('Request not found', 404);
  if (reqRows[0].Status !== 'open') throw new AppError('Request is no longer open', 400);

  // Check if already bid
  const existingBid = await query(
    'SELECT BidID FROM TourBids WHERE RequestID = @requestId AND GuideID = @guideId',
    { requestId, guideId }
  );
  if (existingBid.length) {
    // Update existing bid
    const rows = await query(
      `UPDATE TourBids
       SET OfferedPrice = @offeredPrice, Message = @message, Status = 'pending', CreatedAt = SYSUTCDATETIME()
       OUTPUT INSERTED.BidID, INSERTED.RequestID, INSERTED.OfferedPrice, INSERTED.Message, INSERTED.Status
       WHERE RequestID = @requestId AND GuideID = @guideId`,
      { requestId, guideId, offeredPrice: Number(offeredPrice), message: message || null }
    );
    return res.json({ ok: true, bid: rows[0], updated: true });
  }

  // Create new bid
  const rows = await query(
    `INSERT INTO TourBids (RequestID, GuideID, OfferedPrice, Message, Status)
     OUTPUT INSERTED.BidID, INSERTED.RequestID, INSERTED.OfferedPrice, INSERTED.Message, INSERTED.Status, INSERTED.CreatedAt
     VALUES (@requestId, @guideId, @offeredPrice, @message, 'pending')`,
    { requestId, guideId, offeredPrice: Number(offeredPrice), message: message || null }
  );

  res.status(201).json({ ok: true, bid: rows[0] });
}

/**
 * GET /api/guide/dashboard
 * Guide dashboard with aggregated stats.
 */
export async function getGuideDashboard(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  // Stats
  const statsRows = await query(
    `SELECT
       (SELECT COUNT(*) FROM GuideTours WHERE GuideId = @guideId AND IsActive = 1) AS activeTours,
       (SELECT COUNT(*) FROM Bookings WHERE GuideId = @guideId AND Status IN ('pending','confirmed')) AS pendingBookings,
       (SELECT COUNT(*) FROM Bookings WHERE GuideId = @guideId AND Status = 'completed') AS completedBookings,
       (SELECT ISNULL(SUM(TotalAmount), 0) FROM Bookings WHERE GuideId = @guideId AND Status = 'completed') AS totalEarnings,
       (SELECT ISNULL(Rating, 0) FROM Guides WHERE Email = (SELECT Email FROM Users WHERE Id = @guideId)) AS currentRating`,
    { guideId }
  );

  // Recent bookings
  const recentBookings = await query(
    `SELECT TOP 5
       b.Id, b.StartDate, b.EndDate, b.Status, b.TotalAmount, b.CreatedAt,
       u.FullName AS TouristName, u.AvatarUrl AS TouristAvatar
     FROM Bookings b
     INNER JOIN Users u ON u.Id = b.TouristUserId
     WHERE b.GuideId = @guideId
     ORDER BY b.CreatedAt DESC`,
    { guideId }
  );

  // Pending custom requests
  const pendingRequests = await query(
    `SELECT TOP 5
       ctr.RequestID, ctr.Title, ctr.Destination, ctr.Budget, ctr.CreatedAt,
       u.FullName AS TouristName
     FROM CustomTourRequests ctr
     INNER JOIN Users u ON u.Id = ctr.TouristID
     WHERE ctr.Status = 'open'
     ORDER BY ctr.CreatedAt DESC`,
    { guideId }
  );

  res.json({
    ok: true,
    dashboard: {
      stats: statsRows[0] || {},
      recentBookings,
      pendingRequests,
    },
  });
}
