import sql, { query, getPool } from '../config/db.js';
import AppError from '../utils/AppError.js';
import { getIO } from '../utils/socket.js';
import { notifyGuide } from '../utils/guideNotifications.js';

const ALLOWED_STATUSES = new Set(['pending', 'confirmed', 'completed', 'cancelled']);
const TOURIST_STATUS_UPDATES = new Set(['cancelled']);

function parseBookingId(id) {
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new AppError('Invalid booking ID', 400);
  }
  return bookingId;
}

function normalizeStatus(status) {
  if (typeof status !== 'string') {
    throw new AppError('status is required', 400);
  }

  const normalized = status.trim().toLowerCase();
  if (!ALLOWED_STATUSES.has(normalized)) {
    throw new AppError('Invalid status', 400);
  }

  return normalized;
}

/** GET /api/bookings - list bookings for the authenticated tourist or guide. */
export const getAllBookings = async (req, res) => {
  const userId = req.user && req.user.id;
  const role = req.user && req.user.role;

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  if (!['tourist', 'guide', 'admin'].includes(role)) {
    throw new AppError('Forbidden', 403);
  }

  const { status } = req.query || {};
  let normalizedStatus = null;

  if (status !== undefined) {
    normalizedStatus = String(status).trim().toLowerCase();
    if (!ALLOWED_STATUSES.has(normalizedStatus)) {
      throw new AppError('Invalid status filter', 400);
    }
  }

  // Course topic VIEW: vari JOIN ta db/views.sql -> vw_BookingDetails e rakha.
  // Controller ekhon sudhu view theke filter kore.
  const whereClause =
    role === 'guide' ? 'v.GuideId = @userId'
    : role === 'tourist' ? 'v.TouristUserId = @userId'
    : '1=1';
  const sql = `
    SELECT
      v.Id, v.TouristUserId, v.GuideId, v.TourId, v.GroupSize, v.StartDate, v.EndDate,
      v.Status, v.TotalAmount, v.PaymentStatus, v.Notes, v.CreatedAt,
      v.CancellationDeadline, v.CanCancel, v.TourTitle, v.Itinerary, v.MeetingPoint,
      v.TourLocation, v.TourImageUrl, v.TouristName, v.TouristEmail,
      v.GuideName, v.GuideEmail, v.GuidePhone, v.GuideAvatarUrl, v.GuideBio,
      CASE WHEN r.Id IS NOT NULL THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS HasReview
    FROM dbo.vw_BookingDetails v
    LEFT JOIN dbo.Reviews r ON r.BookingId = v.Id
    WHERE ${whereClause}
      AND (@status IS NULL OR v.Status = @status)
    ORDER BY v.CreatedAt DESC, v.Id DESC
  `;

  const bookings = await query(sql, {
    userId,
    status: normalizedStatus,
  });

  res.json({ ok: true, bookings });
};

/** POST /api/bookings - create a booking after validating availability. */
export const createBooking = async (req, res) => {
  const { guideId, tourId, startDate, endDate, notes } = req.body || {};
  const groupSize = Number(req.body?.groupSize || 1);

  // tourist id should come from authenticated token
  const touristId = req.user && req.user.id;
  if (!touristId) throw new AppError('Unauthorized', 401);

  if ((!guideId && !tourId) || !startDate || !endDate) {
    throw new AppError('guideId or tourId, startDate and endDate are required', 400);
  }

  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  if (Number.isNaN(sDate.getTime()) || Number.isNaN(eDate.getTime())) {
    throw new AppError('Invalid date format', 400);
  }

  if (eDate < sDate) throw new AppError('endDate must be on or after startDate', 400);

  let guideRow;
  let tourTitle = null;
  let packagePrice = null;

  if (tourId) {
    if (sDate.getTime() !== eDate.getTime()) {
      throw new AppError('Tour package bookings must be for a single date', 400);
    }
    const tourRows = await query(
      `SELECT gt.GuideId AS UserID, gt.Title, gt.Price, gt.MaxGroupSize,
              COALESCE(g.DailyRate, g.RatePerDay) AS DailyRate
       FROM GuideTours gt
       INNER JOIN Guides g ON g.UserID = gt.GuideId
       WHERE gt.Id = @tourId AND gt.IsActive = 1 AND g.IsActive = 1`,
      { tourId }
    );
    guideRow = tourRows[0];
    if (guideRow) {
      tourTitle = guideRow.Title;
      packagePrice = Number(guideRow.Price);
    }
    if (!guideRow) throw new AppError('Tour package is unavailable', 404);
    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > Number(guideRow.MaxGroupSize)) {
      throw new AppError(`Group size must be between 1 and ${guideRow.MaxGroupSize}`, 400);
    }
    if (guideId && Number(guideId) !== Number(guideRow.UserID)) {
      throw new AppError('Tour package does not belong to this guide', 400);
    }
  } else {
    // Prefer the account ID used by the API; fall back to a directory profile ID.
    guideRow =
      (await query('SELECT UserID, COALESCE(DailyRate, RatePerDay) AS DailyRate FROM Guides WHERE UserID = @id AND IsActive = 1', { id: guideId }))[0] ||
      (await query('SELECT UserID, COALESCE(DailyRate, RatePerDay) AS DailyRate FROM Guides WHERE Id = @id AND IsActive = 1', { id: guideId }))[0];
  }
  if (!guideRow) throw new AppError('Guide not found', 404);
  const guideUserId = guideRow.UserID;
  if (!guideUserId) throw new AppError('This guide is not linked to an account yet', 409);

  const ratePerDay = Number(guideRow.DailyRate) || 0;

  // Calculate total amount (inclusive days)
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((eDate - sDate) / msPerDay) + 1;
  const totalAmount = packagePrice === null
    ? Number((ratePerDay * days).toFixed(2))
    : Number(packagePrice.toFixed(2));
  const bookingNotes = [tourTitle ? `Tour package: ${tourTitle}` : null, notes?.trim() || null]
    .filter(Boolean)
    .join(' — ')
    .slice(0, 500) || null;

  // NOTE: Bookings-te AFTER INSERT trigger ache, tai OUTPUT ... INTO @table
  // pattern (trigger thakle OUTPUT without INTO SQL error 334 dey).
  const insertSql = `
    DECLARE @newBooking TABLE (Id INT, TouristUserId INT, GuideId INT, TourId INT, GroupSize INT, StartDate DATE, EndDate DATE, Status NVARCHAR(20), BookingType NVARCHAR(20), TotalAmount DECIMAL(10,2), FinalPrice DECIMAL(10,2), PaymentStatus NVARCHAR(20), Notes NVARCHAR(500), CreatedAt DATETIME2);
    INSERT INTO Bookings (TouristUserId, GuideId, TourId, GroupSize, StartDate, EndDate, Status, BookingType, TotalAmount, FinalPrice, Notes)
    OUTPUT INSERTED.Id, INSERTED.TouristUserId, INSERTED.GuideId, INSERTED.TourId, INSERTED.GroupSize, INSERTED.StartDate, INSERTED.EndDate, INSERTED.Status, INSERTED.BookingType, INSERTED.TotalAmount, INSERTED.FinalPrice, INSERTED.PaymentStatus, INSERTED.Notes, INSERTED.CreatedAt INTO @newBooking
    VALUES (@touristId, @guideUserId, @tourId, @groupSize, @startDate, @endDate, 'pending', 'direct', @totalAmount, @totalAmount, @notes);
    SELECT Id, TouristUserId, GuideId, TourId, GroupSize, StartDate, EndDate, Status, BookingType, TotalAmount, FinalPrice, PaymentStatus, Notes, CreatedAt FROM @newBooking;
  `;

  const params = {
    touristId,
    guideUserId,
    tourId: tourId ? Number(tourId) : null,
    groupSize,
    startDate,
    endDate,
    totalAmount,
    notes: bookingNotes,
  };

  const pool = await getPool();
  const transaction = pool.transaction();
  let transactionStarted = false;
  let createdBooking;
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;
    const runInTransaction = async (statement, values) => {
      const request = transaction.request();
      Object.entries(values).forEach(([key, value]) => request.input(key, value));
      return (await request.query(statement)).recordset;
    };

    const blockedDates = await runInTransaction(
      `SELECT BlockedDate FROM GuideAvailability WITH (UPDLOCK, HOLDLOCK)
       WHERE GuideId = @guideId AND BlockedDate >= @startDate AND BlockedDate <= @endDate`,
      { guideId: guideUserId, startDate, endDate }
    );
    if (blockedDates.length) {
      throw new AppError(`Guide has blocked these dates: ${blockedDates.map((row) => row.BlockedDate).join(', ')}`, 409);
    }

    const overlapping = await runInTransaction(
      `SELECT Id FROM Bookings WITH (UPDLOCK, HOLDLOCK)
       WHERE GuideId = @guideId AND Status IN ('pending', 'confirmed')
         AND NOT (EndDate < @startDate OR StartDate > @endDate)`,
      { guideId: guideUserId, startDate, endDate }
    );
    if (overlapping.length) throw new AppError('Guide is already booked for the selected dates', 409);

    [createdBooking] = await runInTransaction(insertSql, params);
    await transaction.commit();
  } catch (err) {
    if (transactionStarted) await transaction.rollback().catch(() => {});
    if (err instanceof AppError) throw err;
    console.error('[createBooking]', err);
    throw new AppError('Failed to create booking', 500);
  }

  try {
    const touristRows = await query('SELECT FullName FROM Users WHERE Id = @touristId', { touristId });
    await notifyGuide({
      guideId: guideUserId,
      type: 'booking',
      title: 'New booking request',
      body: `${touristRows[0]?.FullName || 'A tourist'} requested a booking for ${new Date(startDate).toLocaleDateString()}.`,
      linkUrl: '/bookings',
    });
  } catch (notificationError) {
    console.error('[createBooking] Could not notify guide:', notificationError.message);
  }
  res.status(201).json({ ok: true, booking: createdBooking });
};

export function createUpdateBookingStatus(queryFn = query) {
  return async function updateBookingStatus(req, res) {
    const bookingId = parseBookingId(req.params && req.params.id);
    const userId = req.user && req.user.id;
    const role = req.user && req.user.role;

    if (!userId) throw new AppError('Unauthorized', 401);
    if (!['tourist', 'guide'].includes(role)) throw new AppError('Forbidden', 403);

    const status = normalizeStatus(req.body && req.body.status);
    const rows = await queryFn(
      'SELECT Id, TouristUserId, GuideId, Status, StartDate FROM Bookings WHERE Id = @bookingId',
      { bookingId }
    );
    const booking = rows[0];

    if (!booking) throw new AppError('Booking not found', 404);

    if (role === 'guide') {
      if (Number(booking.GuideId) !== Number(userId)) {
        throw new AppError('Forbidden', 403);
      }
      const currentStatus = String(booking.Status).toLowerCase();
      const validGuideTransition =
        (status === 'confirmed' && currentStatus === 'pending') ||
        (status === 'completed' && currentStatus === 'confirmed') ||
        (status === 'cancelled' && currentStatus === 'pending');
      if (!validGuideTransition) {
        throw new AppError('Guides can confirm or decline pending bookings, then mark confirmed tours completed', 400);
      }
    }

    if (role === 'tourist') {
      if (!TOURIST_STATUS_UPDATES.has(status)) {
        throw new AppError("Tourists can only cancel bookings", 400);
      }
      if (Number(booking.TouristUserId) !== Number(userId)) {
        throw new AppError('Forbidden', 403);
      }
      if (!['pending', 'confirmed'].includes(String(booking.Status).toLowerCase())) {
        throw new AppError('Only pending or confirmed bookings can be cancelled', 400);
      }
      if (booking.StartDate && new Date(booking.StartDate).getTime() - Date.now() < 48 * 60 * 60 * 1000) {
        throw new AppError('Cancellation closes 48 hours before the tour starts', 400);
      }
    }

    // NOTE: Bookings-te AFTER UPDATE trigger ache, tai OUTPUT ... INTO @table pattern.
    const updatedRows = await queryFn(
      `DECLARE @updBooking TABLE (Id INT, TouristUserId INT, GuideId INT, StartDate DATE, EndDate DATE, Status NVARCHAR(20), TotalAmount DECIMAL(10,2), Notes NVARCHAR(500), CreatedAt DATETIME2);
       UPDATE Bookings
       SET Status = @status
       OUTPUT INSERTED.Id, INSERTED.TouristUserId, INSERTED.GuideId, INSERTED.StartDate,
              INSERTED.EndDate, INSERTED.Status, INSERTED.TotalAmount, INSERTED.Notes,
              INSERTED.CreatedAt INTO @updBooking
       WHERE Id = @bookingId;
       SELECT Id, TouristUserId, GuideId, StartDate, EndDate, Status, TotalAmount, Notes, CreatedAt FROM @updBooking;`,
      { bookingId, status }
    );

    if (queryFn === query && ['confirmed', 'cancelled'].includes(status) && role === 'guide') {
      const title = status === 'confirmed' ? 'Booking confirmed' : 'Booking cancelled';
      const body = status === 'confirmed'
        ? 'Your guide confirmed your booking.'
        : 'Your guide cancelled your booking.';
      const notificationRows = await query(
        `INSERT INTO TouristNotifications (TouristUserId, Type, Title, Body, LinkUrl)
         OUTPUT INSERTED.Id, INSERTED.Type, INSERTED.Title, INSERTED.Body, INSERTED.LinkUrl, INSERTED.IsRead, INSERTED.CreatedAt
         VALUES (@userId, 'booking', @title, @body, '/dashboard')`,
        { userId: booking.TouristUserId, title, body }
      );
      try { getIO().to(String(booking.TouristUserId)).emit('notification:new', notificationRows[0]); } catch { /* persisted notification remains available */ }
    }

    if (queryFn === query && status === 'cancelled' && role === 'tourist') {
      try {
        const touristRows = await query('SELECT FullName FROM Users WHERE Id = @touristId', { touristId: booking.TouristUserId });
        await notifyGuide({
          guideId: booking.GuideId,
          type: 'booking',
          title: 'Booking cancelled',
          body: `${touristRows[0]?.FullName || 'A tourist'} cancelled booking #${bookingId}.`,
          linkUrl: '/bookings',
        });
      } catch (notificationError) {
        console.error('[updateBookingStatus] Could not notify guide:', notificationError.message);
      }
    }

    res.json({ ok: true, booking: updatedRows[0] });
  };
}

export const updateBookingStatus = createUpdateBookingStatus();

export function createUpdatePaymentStatus(queryFn = query) {
  return async function updatePaymentStatus(req, res) {
    const bookingId = parseBookingId(req.params && req.params.id);
    const userId = Number(req.user?.id);
    const role = req.user?.role;
    const nextStatus = String(req.body?.paymentStatus || '').trim().toLowerCase();
    if (!userId) throw new AppError('Unauthorized', 401);
    if (!['guide', 'admin'].includes(role)) throw new AppError('Forbidden', 403);
    if (!['paid', 'refunded'].includes(nextStatus)) throw new AppError('Invalid payment status', 400);

    const rows = await queryFn(
      'SELECT Id, GuideId, Status, PaymentStatus FROM Bookings WHERE Id = @bookingId',
      { bookingId }
    );
    const booking = rows[0];
    if (!booking) throw new AppError('Booking not found', 404);
    const currentStatus = String(booking.PaymentStatus || 'unpaid').toLowerCase();
    if (String(booking.Status).toLowerCase() === 'cancelled') {
      throw new AppError('Cancelled bookings cannot change payment status', 400);
    }

    if (role === 'guide') {
      if (Number(booking.GuideId) !== userId) throw new AppError('Forbidden', 403);
    }
    if (currentStatus === nextStatus) return res.json({ ok: true, paymentStatus: currentStatus });

    if (role === 'guide') {
      if (nextStatus !== 'paid' || currentStatus !== 'unpaid') {
        throw new AppError('Guides can only mark an unpaid booking as paid', 403);
      }
      if (!['confirmed', 'completed'].includes(String(booking.Status).toLowerCase())) {
        throw new AppError('Only confirmed or completed bookings can be marked paid', 400);
      }
    } else if (nextStatus === 'refunded' && currentStatus !== 'paid') {
      throw new AppError('Only paid bookings can be refunded', 400);
    } else if (nextStatus === 'paid' && currentStatus !== 'unpaid') {
      throw new AppError('Only unpaid bookings can be marked paid', 400);
    }

    const updated = await queryFn(
      `UPDATE Bookings
       SET PaymentStatus = @nextStatus
       OUTPUT INSERTED.Id, INSERTED.PaymentStatus
       WHERE Id = @bookingId AND PaymentStatus = @currentStatus`,
      { bookingId, nextStatus, currentStatus }
    );
    if (!updated.length) throw new AppError('Payment status changed; refresh and try again', 409);
    res.json({ ok: true, paymentStatus: updated[0].PaymentStatus });
  };
}

export const updatePaymentStatus = createUpdatePaymentStatus();
