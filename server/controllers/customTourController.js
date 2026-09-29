import { query, getPool } from '../config/db.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../utils/socket.js';
import { notifyGuide } from '../utils/guideNotifications.js';

/**
 * POST /api/custom-tours
 * Tourist creates a new custom tour request.
 */
export async function createRequest(req, res) {
  const touristId = req.user?.id;
  if (!touristId) throw new AppError('Unauthorized', 401);

  const { title, destination, startDate, endDate, groupSize, budget, description } = req.body;

  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  if (eDate < sDate) throw new AppError('endDate must be on or after startDate', 400);

  const rows = await query(
    `INSERT INTO CustomTourRequests (TouristID, Title, Destination, StartDate, EndDate, GroupSize, Budget, Description, Status)
     OUTPUT INSERTED.RequestID, INSERTED.TouristID, INSERTED.Title, INSERTED.Destination,
            INSERTED.StartDate, INSERTED.EndDate, INSERTED.GroupSize, INSERTED.Budget,
            INSERTED.Description, INSERTED.Status, INSERTED.CreatedAt
     VALUES (@touristId, @title, @destination, @startDate, @endDate, @groupSize, @budget, @description, 'open')`,
    { touristId, title, destination, startDate, endDate, groupSize, budget, description: description || null }
  );

  const request = rows[0];

  // Broadcast to all guides that a new request is available
  try {
    const io = getIO();
    io.to('guides').emit('custom_tour:new', { request });
  } catch (_) { /* socket not critical */ }

  try {
    const guideRows = await query('SELECT UserID FROM Guides WHERE IsActive = 1 AND UserID IS NOT NULL');
    await Promise.all(guideRows.map(({ UserID }) => notifyGuide({
      guideId: UserID,
      type: 'custom_request',
      title: 'New custom tour request',
      body: `${request.Title} in ${request.Destination} · budget ৳${Number(request.Budget).toFixed(0)}`,
      linkUrl: '/custom-requests',
    })));
  } catch (notificationError) {
    console.error('[createRequest] Could not notify guides:', notificationError.message);
  }

  res.status(201).json({ ok: true, request });
}

/**
 * GET /api/custom-tours
 * Fetch all 'open' custom tour requests with optional filters for Guides to browse.
 */
export async function getOpenRequests(req, res) {
  const { destination, minBudget, maxBudget } = req.query || {};
  const page = Number(req.query?.page ?? 1);
  const pageSize = Number(req.query?.pageSize ?? 12);
  const parsedMinBudget = minBudget === undefined || minBudget === '' ? null : Number(minBudget);
  const parsedMaxBudget = maxBudget === undefined || maxBudget === '' ? null : Number(maxBudget);

  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) {
    throw new AppError('page must be a positive integer', 400);
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new AppError('pageSize must be between 1 and 100', 400);
  }
  if (parsedMinBudget !== null && (!Number.isFinite(parsedMinBudget) || parsedMinBudget < 0)) {
    throw new AppError('minBudget must be a non-negative number', 400);
  }
  if (parsedMaxBudget !== null && (!Number.isFinite(parsedMaxBudget) || parsedMaxBudget < 0)) {
    throw new AppError('maxBudget must be a non-negative number', 400);
  }
  if (parsedMinBudget !== null && parsedMaxBudget !== null && parsedMinBudget > parsedMaxBudget) {
    throw new AppError('minBudget cannot exceed maxBudget', 400);
  }

  let sql = `
    SELECT
      ctr.RequestID, ctr.TouristID, ctr.Title, ctr.Destination,
      ctr.StartDate, ctr.EndDate, ctr.GroupSize, ctr.Budget,
      ctr.Description, ctr.Status, ctr.CreatedAt,
      u.FullName AS TouristName, u.AvatarUrl AS TouristAvatar,
      (SELECT COUNT(*) FROM TourBids tb WHERE tb.RequestID = ctr.RequestID AND tb.Status = 'pending') AS BidCount
    FROM CustomTourRequests ctr
    INNER JOIN Users u ON u.Id = ctr.TouristID
    WHERE ctr.Status = 'open'
  `;
  const params = {};

  if (destination) {
    sql += ` AND ctr.Destination LIKE @destination`;
    params.destination = `%${destination}%`;
  }
  if (parsedMinBudget !== null) {
    sql += ` AND ctr.Budget >= @minBudget`;
    params.minBudget = parsedMinBudget;
  }
  if (parsedMaxBudget !== null) {
    sql += ` AND ctr.Budget <= @maxBudget`;
    params.maxBudget = parsedMaxBudget;
  }

  const countSql = `SELECT COUNT(*) AS total FROM CustomTourRequests ctr WHERE ctr.Status = 'open'${destination ? ' AND ctr.Destination LIKE @destination' : ''}${parsedMinBudget !== null ? ' AND ctr.Budget >= @minBudget' : ''}${parsedMaxBudget !== null ? ' AND ctr.Budget <= @maxBudget' : ''}`;
  params.offset = (page - 1) * pageSize;
  params.pageSize = pageSize;
  sql += ` ORDER BY ctr.CreatedAt DESC, ctr.RequestID DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`;

  const [requests, countRows] = await Promise.all([query(sql, params), query(countSql, params)]);
  const total = Number(countRows[0]?.total || 0);
  res.json({ ok: true, requests, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}

/**
 * GET /api/custom-tours/my-requests
 * Tourist fetches their own posted requests along with received bids count.
 */
export async function getMyRequests(req, res) {
  const touristId = req.user?.id;
  if (!touristId) throw new AppError('Unauthorized', 401);

  const requests = await query(
    `SELECT
       ctr.RequestID, ctr.Title, ctr.Destination, ctr.StartDate, ctr.EndDate,
       ctr.GroupSize, ctr.Budget, ctr.Description, ctr.Status, ctr.CreatedAt,
       (SELECT COUNT(*) FROM TourBids tb WHERE tb.RequestID = ctr.RequestID) AS TotalBids,
       (SELECT COUNT(*) FROM TourBids tb WHERE tb.RequestID = ctr.RequestID AND tb.Status = 'pending') AS PendingBids
     FROM CustomTourRequests ctr
     WHERE ctr.TouristID = @touristId
     ORDER BY ctr.CreatedAt DESC`,
    { touristId }
  );

  res.json({ ok: true, requests });
}

/**
 * GET /api/custom-tours/:id
 * Fetch a single tour request with all its bids.
 */
export async function getRequestWithBids(req, res) {
  const { id } = req.params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new AppError('Invalid request ID', 400);
  }

  const requestRows = await query(
    `SELECT
       ctr.RequestID, ctr.TouristID, ctr.Title, ctr.Destination, ctr.StartDate, ctr.EndDate,
       ctr.GroupSize, ctr.Budget, ctr.Description, ctr.Status, ctr.CreatedAt,
       u.FullName AS TouristName, u.AvatarUrl AS TouristAvatar
     FROM CustomTourRequests ctr
     INNER JOIN Users u ON u.Id = ctr.TouristID
     WHERE ctr.RequestID = @requestId`,
    { requestId }
  );

  if (!requestRows.length) throw new AppError('Tour request not found', 404);

  const bids = await query(
    `SELECT
       tb.BidID, tb.RequestID, tb.GuideID, tb.OfferedPrice, tb.ProposalMessage, tb.Status, tb.CreatedAt,
       u.FullName AS GuideName, u.AvatarUrl AS GuideAvatar,
       ISNULL(g.Rating, 0) AS GuideRating,
       g.City AS GuideCity, g.Specialties AS GuideSpecialties
     FROM TourBids tb
     INNER JOIN Users u ON u.Id = tb.GuideID
     LEFT JOIN Guides g ON g.UserID = tb.GuideID
     WHERE tb.RequestID = @requestId
     ORDER BY tb.CreatedAt DESC`,
    { requestId }
  );

  res.json({ ok: true, request: requestRows[0], bids });
}

/**
 * POST /api/custom-tours/:id/bids
 * Guide submits a bid/offer on a request.
 */
export async function createBid(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new AppError('Invalid request ID', 400);
  }

  // Verify request exists and is open
  const requestRows = await query(
    `SELECT RequestID, Status, TouristID, Title FROM CustomTourRequests WHERE RequestID = @requestId`,
    { requestId }
  );
  if (!requestRows.length) throw new AppError('Tour request not found', 404);
  if (requestRows[0].Status !== 'open') throw new AppError('This tour request is no longer open', 400);

  // Check if guide already bid on this request
  const existingBid = await query(
    `SELECT BidID FROM TourBids WHERE RequestID = @requestId AND GuideID = @guideId`,
    { requestId, guideId }
  );
  if (existingBid.length) throw new AppError('You have already placed a bid on this request', 409);

  const { offeredPrice, proposalMessage } = req.body;

  const rows = await query(
    `INSERT INTO TourBids (RequestID, GuideID, OfferedPrice, ProposalMessage, Status)
     OUTPUT INSERTED.BidID, INSERTED.RequestID, INSERTED.GuideID, INSERTED.OfferedPrice,
            INSERTED.ProposalMessage, INSERTED.Status, INSERTED.CreatedAt
     VALUES (@requestId, @guideId, @offeredPrice, @proposalMessage, 'pending')`,
    { requestId, guideId, offeredPrice, proposalMessage: proposalMessage || null }
  );

  const bid = rows[0];

  // Emit real-time notification to the tourist who owns the request
  try {
    const io = getIO();
    // Fetch guide name for the notification
    const guideRows = await query(
      `SELECT FullName AS GuideName FROM Users WHERE Id = @guideId`,
      { guideId }
    );
    io.to(String(requestRows[0].TouristID)).emit('custom_tour:bid_received', {
      requestId,
      requestTitle: requestRows[0].Title,
      bid,
      guideName: guideRows[0]?.GuideName || 'A guide',
    });
  } catch (_) { /* socket not critical */ }

  res.status(201).json({ ok: true, bid });
}

/**
 * PUT /api/custom-tours/bids/:bidId/accept
 * Tourist accepts a bid:
 *  - Updates TourBids.Status to 'accepted'
 *  - Creates a new record in Bookings table with status 'confirmed'
 *  - Updates CustomTourRequests.Status to 'fulfilled'
 *  - Rejects all other bids on the same request
 */
export async function acceptBid(req, res) {
  const touristId = req.user?.id;
  if (!touristId) throw new AppError('Unauthorized', 401);

  const bidId = Number(req.params.bidId);
  if (!Number.isInteger(bidId) || bidId <= 0) {
    throw new AppError('Invalid bid ID', 400);
  }

  const pool = await getPool();
  const transaction = pool.transaction();
  let bid;
  let booking;

  try {
    await transaction.begin();

    // Lock both records before checking state so accept/cancel requests serialize.
    const bidResult = await transaction.request()
      .input('bidId', bidId)
      .query(
        `SELECT tb.BidID, tb.RequestID, tb.GuideID, tb.OfferedPrice,
                tb.Status AS BidStatus, ctr.TouristID, ctr.StartDate, ctr.EndDate,
                ctr.Status AS RequestStatus, ctr.Title
         FROM TourBids tb WITH (UPDLOCK, HOLDLOCK)
         INNER JOIN CustomTourRequests ctr WITH (UPDLOCK, HOLDLOCK)
           ON ctr.RequestID = tb.RequestID
         WHERE tb.BidID = @bidId`
      );
    bid = bidResult.recordset[0];
    if (!bid) throw new AppError('Bid not found', 404);
    if (Number(bid.TouristID) !== Number(touristId)) {
      throw new AppError('You can only accept bids on your own requests', 403);
    }
    if (String(bid.RequestStatus).toLowerCase() !== 'open') {
      throw new AppError('This tour request is no longer open', 400);
    }
    if (String(bid.BidStatus).toLowerCase() !== 'pending') {
      throw new AppError('This bid has already been processed', 400);
    }

    // Conditional state changes are checked inside the same transaction.
    const requestUpdate = await transaction.request()
      .input('requestId', bid.RequestID)
      .query(`UPDATE CustomTourRequests SET Status = 'fulfilled'
              WHERE RequestID = @requestId AND Status = 'open'`);
    if (requestUpdate.rowsAffected[0] !== 1) {
      throw new AppError('This tour request is no longer open', 409);
    }

    const bidUpdate = await transaction.request()
      .input('bidId', bidId)
      .query(`UPDATE TourBids SET Status = 'accepted'
              WHERE BidID = @bidId AND Status = 'pending'`);
    if (bidUpdate.rowsAffected[0] !== 1) {
      throw new AppError('This bid has already been processed', 409);
    }

    // Reject the other offers before creating the single confirmed booking.
    await transaction.request()
      .input('requestId', bid.RequestID)
      .input('bidId', bidId)
      .query(`UPDATE TourBids SET Status = 'rejected' WHERE RequestID = @requestId AND BidID != @bidId AND Status = 'pending'`);

    // Create a booking only after this transaction has claimed the open request.
    const bookingResult = await transaction.request()
      .input('touristId', touristId)
      .input('guideId', bid.GuideID)
      .input('startDate', bid.StartDate)
      .input('endDate', bid.EndDate)
      .input('totalAmount', bid.OfferedPrice)
      .input('notes', `Accepted from custom tour: ${bid.Title}`)
      .query(
        `INSERT INTO Bookings (TouristUserId, GuideId, StartDate, EndDate, Status, TotalAmount, Notes)
         OUTPUT INSERTED.Id, INSERTED.TouristUserId, INSERTED.GuideId, INSERTED.StartDate,
                INSERTED.EndDate, INSERTED.Status, INSERTED.TotalAmount, INSERTED.Notes, INSERTED.CreatedAt
         VALUES (@touristId, @guideId, @startDate, @endDate, 'confirmed', @totalAmount, @notes)`
      );

    booking = bookingResult.recordset[0];
    await transaction.commit();

    // Emit real-time notification to the accepted guide
    try {
      const io = getIO();
      io.to(String(bid.GuideID)).emit('custom_tour:bid_accepted', {
        requestId: bid.RequestID,
        requestTitle: bid.Title,
        bidId: bid.BidID,
        offeredPrice: bid.OfferedPrice,
      });
      // Notify other rejected guides
      const rejectedRows = await query(
        `SELECT GuideID FROM TourBids WHERE RequestID = @requestId AND Status = 'rejected'`,
        { requestId: bid.RequestID }
      );
      for (const row of rejectedRows) {
        io.to(String(row.GuideID)).emit('custom_tour:bid_rejected', {
          requestId: bid.RequestID,
          requestTitle: bid.Title,
          bidId: bid.BidID,
        });
      }
    } catch (_) { /* socket not critical */ }

    res.json({
      ok: true,
      message: 'Bid accepted and booking created',
      booking,
    });
  } catch (err) {
    await transaction.rollback().catch(() => {});
    if (err instanceof AppError) throw err;
    console.error('[acceptBid]', err);
    throw new AppError('Failed to accept bid', 500);
  }
}

/**
 * PUT /api/custom-tours/bids/:bidId/decline
 * Tourist declines/rejects a specific bid.
 */
export async function declineBid(req, res) {
  const touristId = req.user?.id;
  if (!touristId) throw new AppError('Unauthorized', 401);

  const bidId = Number(req.params.bidId);
  if (!Number.isInteger(bidId) || bidId <= 0) {
    throw new AppError('Invalid bid ID', 400);
  }

  const bidRows = await query(
    `SELECT
       tb.BidID, tb.RequestID, tb.GuideID, tb.Status AS BidStatus,
       ctr.TouristID, ctr.Status AS RequestStatus, ctr.Title
     FROM TourBids tb
     INNER JOIN CustomTourRequests ctr ON ctr.RequestID = tb.RequestID
     WHERE tb.BidID = @bidId`,
    { bidId }
  );

  if (!bidRows.length) throw new AppError('Bid not found', 404);

  const bid = bidRows[0];

  if (bid.TouristID !== touristId) throw new AppError('You can only decline bids on your own requests', 403);
  if (bid.RequestStatus !== 'open') throw new AppError('This tour request is no longer open', 400);
  if (bid.BidStatus !== 'pending') throw new AppError('This bid has already been processed', 400);

  const updatedRows = await query(
    `UPDATE TourBids SET Status = 'rejected'
     OUTPUT INSERTED.BidID, INSERTED.RequestID, INSERTED.GuideID, INSERTED.OfferedPrice,
            INSERTED.ProposalMessage, INSERTED.Status, INSERTED.CreatedAt
     WHERE BidID = @bidId AND Status = 'pending'`,
    { bidId }
  );

  // Emit real-time notification to the guide whose bid was declined
  try {
    const io = getIO();
    io.to(String(bid.GuideID)).emit('custom_tour:bid_declined', {
      requestId: bid.RequestID,
      requestTitle: bid.Title,
      bidId: bid.BidID,
    });
  } catch (_) { /* socket not critical */ }

  res.json({ ok: true, bid: updatedRows[0] });
}

/**
 * PUT /api/custom-tours/:id/cancel
 * Tourist cancels their own open tour request.
 * All pending bids on the request are also rejected.
 */
export async function cancelRequest(req, res) {
  const touristId = req.user?.id;
  if (!touristId) throw new AppError('Unauthorized', 401);

  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new AppError('Invalid request ID', 400);
  }

  const requestRows = await query(
    `SELECT RequestID, TouristID, Status, Title FROM CustomTourRequests WHERE RequestID = @requestId`,
    { requestId }
  );

  if (!requestRows.length) throw new AppError('Tour request not found', 404);

  const request = requestRows[0];

  if (request.TouristID !== touristId) throw new AppError('You can only cancel your own requests', 403);
  if (request.Status !== 'open') throw new AppError('Only open requests can be cancelled', 400);

  // Use a transaction to cancel request + reject all pending bids
  const pool = await getPool();
  const transaction = pool.transaction();

  try {
    await transaction.begin();

    // 1. Update request status to cancelled
    const cancelUpdate = await transaction.request()
      .input('requestId', requestId)
      .query(`UPDATE CustomTourRequests SET Status = 'cancelled'
              WHERE RequestID = @requestId AND Status = 'open'`);
    if (cancelUpdate.rowsAffected[0] !== 1) {
      throw new AppError('This tour request has already been processed', 409);
    }

    // 2. Reject all pending bids
    const rejectedResult = await transaction.request()
      .input('requestId', requestId)
      .query(
        `UPDATE TourBids SET Status = 'rejected'
         OUTPUT INSERTED.GuideID
         WHERE RequestID = @requestId AND Status = 'pending'`
      );

    await transaction.commit();

    // Emit real-time notifications to all guides whose bids were rejected
    try {
      const io = getIO();
      for (const row of rejectedResult.recordset) {
        io.to(String(row.GuideID)).emit('custom_tour:request_cancelled', {
          requestId,
          requestTitle: request.Title,
        });
      }
    } catch (_) { /* socket not critical */ }

    res.json({ ok: true, message: 'Request cancelled' });
  } catch (err) {
    await transaction.rollback().catch(() => {});
    if (err instanceof AppError) throw err;
    console.error('[cancelRequest]', err);
    throw new AppError('Failed to cancel request', 500);
  }
}
