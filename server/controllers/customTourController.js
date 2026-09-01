import { query, getPool } from '../config/db.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../utils/socket.js';

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

  res.status(201).json({ ok: true, request });
}

/**
 * GET /api/custom-tours
 * Fetch all 'open' custom tour requests with optional filters for Guides to browse.
 */
export async function getOpenRequests(req, res) {
  const { destination, minBudget, maxBudget } = req.query || {};

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
  if (minBudget) {
    sql += ` AND ctr.Budget >= @minBudget`;
    params.minBudget = Number(minBudget);
  }
  if (maxBudget) {
    sql += ` AND ctr.Budget <= @maxBudget`;
    params.maxBudget = Number(maxBudget);
  }

  sql += ` ORDER BY ctr.CreatedAt DESC`;

  const requests = await query(sql, params);
  res.json({ ok: true, requests });
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
     LEFT JOIN Guides g ON g.Id = tb.GuideID
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

  // Fetch the bid along with the associated request (verify ownership)
  const bidRows = await query(
    `SELECT
       tb.BidID, tb.RequestID, tb.GuideID, tb.OfferedPrice, tb.Status AS BidStatus,
       ctr.TouristID, ctr.StartDate, ctr.EndDate, ctr.Status AS RequestStatus, ctr.Title
     FROM TourBids tb
     INNER JOIN CustomTourRequests ctr ON ctr.RequestID = tb.RequestID
     WHERE tb.BidID = @bidId`,
    { bidId }
  );

  if (!bidRows.length) throw new AppError('Bid not found', 404);

  const bid = bidRows[0];

  if (bid.TouristID !== touristId) throw new AppError('You can only accept bids on your own requests', 403);
  if (bid.RequestStatus !== 'open') throw new AppError('This tour request is no longer open', 400);
  if (bid.BidStatus !== 'pending') throw new AppError('This bid has already been processed', 400);

  // Use a transaction for atomicity
  const pool = await getPool();
  const transaction = pool.transaction();

  try {
    await transaction.begin();

    // 1. Accept the bid
    await transaction.request()
      .input('bidId', bidId)
      .query(`UPDATE TourBids SET Status = 'accepted' WHERE BidID = @bidId`);

    // 2. Reject all other bids on the same request
    await transaction.request()
      .input('requestId', bid.RequestID)
      .input('bidId', bidId)
      .query(`UPDATE TourBids SET Status = 'rejected' WHERE RequestID = @requestId AND BidID != @bidId AND Status = 'pending'`);

    // 3. Update request status to fulfilled
    await transaction.request()
      .input('requestId', bid.RequestID)
      .query(`UPDATE CustomTourRequests SET Status = 'fulfilled' WHERE RequestID = @requestId`);

    // 4. Create a booking
    const bookingResult = await transaction.request()
      .input('touristId', touristId)
      .input('guideId', bid.GuideID)
      .input('startDate', bid.StartDate)
      .input('endDate', bid.EndDate)
      .input('totalAmount', bid.OfferedPrice)
      .query(
        `INSERT INTO Bookings (TouristUserId, GuideId, StartDate, EndDate, Status, TotalAmount, Notes)
         OUTPUT INSERTED.Id, INSERTED.TouristUserId, INSERTED.GuideId, INSERTED.StartDate,
                INSERTED.EndDate, INSERTED.Status, INSERTED.TotalAmount, INSERTED.Notes, INSERTED.CreatedAt
         VALUES (@touristId, @guideId, @startDate, @endDate, 'confirmed', @totalAmount, @notes)`,
        { touristId, guideId: bid.GuideID, startDate: bid.StartDate, endDate: bid.EndDate, totalAmount: bid.OfferedPrice, notes: `Accepted from custom tour: ${bid.Title}` }
      );

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
      booking: bookingResult.recordset[0],
    });
  } catch (err) {
    await transaction.rollback();
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
    await transaction.request()
      .input('requestId', requestId)
      .query(`UPDATE CustomTourRequests SET Status = 'cancelled' WHERE RequestID = @requestId`);

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
    await transaction.rollback();
    console.error('[cancelRequest]', err);
    throw new AppError('Failed to cancel request', 500);
  }
}
