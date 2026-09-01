import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * POST /api/bids/create
 * Tourist places a custom offer on a guide.
 * GuideUserID resolves to Users.Id (matches Bookings/Reviews FK convention).
 */
export async function createBid(req, res) {
  const touristId = req.user?.id;
  if (!touristId) throw new AppError('Unauthorized', 401);

  const { guideId, offeredPrice, startDate, endDate, message } = req.body;

  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  if (eDate < sDate) throw new AppError('endDate must be on or after startDate', 400);

  // Resolve guide by Guides.Id or its linked user id.
  const guideRow =
    (await query('SELECT Id, UserID, IsActive FROM Guides WHERE Id = @id', { id: guideId }))[0] ||
    (await query('SELECT Id, UserID, IsActive FROM Guides WHERE UserID = @id', { id: guideId }))[0];

  if (!guideRow) throw new AppError('Guide not found', 404);
  if (!guideRow.UserID) throw new AppError('This guide is not linked to an account yet', 409);
  if (!guideRow.IsActive) throw new AppError('This guide is not available', 400);
  if (guideRow.UserID === touristId) throw new AppError('You cannot bid on your own guide profile', 400);

  const rows = await query(
    `INSERT INTO Bids (TouristID, GuideUserID, OfferedPrice, StartDate, EndDate, Message, Status)
     OUTPUT INSERTED.BidID, INSERTED.TouristID, INSERTED.GuideUserID, INSERTED.OfferedPrice,
            INSERTED.StartDate, INSERTED.EndDate, INSERTED.Message, INSERTED.Status, INSERTED.CreatedAt
     VALUES (@touristId, @guideUserId, @offeredPrice, @startDate, @endDate, @message, 'pending')`,
    {
      touristId,
      guideUserId: guideRow.UserID,
      offeredPrice,
      startDate,
      endDate,
      message: message || null,
    }
  );

  res.status(201).json({ ok: true, bid: rows[0] });
}