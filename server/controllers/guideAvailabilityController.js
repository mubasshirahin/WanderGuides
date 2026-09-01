import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * GET /api/guide-availability
 * Fetch all blocked dates for the logged-in guide.
 */
export async function getBlockedDates(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const rows = await query(
    `SELECT Id, BlockedDate, Reason, CreatedAt
     FROM GuideAvailability
     WHERE GuideId = @guideId
     ORDER BY BlockedDate ASC`,
    { guideId }
  );

  res.json({ ok: true, blockedDates: rows });
}

/**
 * POST /api/guide-availability/block
 * Block a date (or multiple dates) for the guide.
 */
export async function blockDates(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const { dates, reason } = req.body || {};
  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    throw new AppError('dates array is required', 400);
  }

  const blocked = [];
  for (const dateStr of dates) {
    try {
      const rows = await query(
        `INSERT INTO GuideAvailability (GuideId, BlockedDate, Reason)
         OUTPUT INSERTED.Id, INSERTED.BlockedDate, INSERTED.Reason
         VALUES (@guideId, @date, @reason)`,
        { guideId, date: dateStr, reason: reason || 'Blocked' }
      );
      if (rows.length) blocked.push(rows[0]);
    } catch (err) {
      // Skip duplicates (UQ constraint)
      if (err.number !== 2627 && err.number !== 2601) throw err;
    }
  }

  res.json({ ok: true, blocked });
}

/**
 * DELETE /api/guide-availability/unblock/:date
 * Unblock a specific date.
 */
export async function unblockDate(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  const dateStr = req.params.date;
  if (!dateStr) throw new AppError('Date is required', 400);

  const rows = await query(
    `DELETE FROM GuideAvailability
     OUTPUT DELETED.Id, DELETED.BlockedDate
     WHERE GuideId = @guideId AND BlockedDate = @date`,
    { guideId, date: dateStr }
  );

  if (!rows.length) throw new AppError('Blocked date not found', 404);
  res.json({ ok: true, unblocked: rows[0] });
}

/**
 * DELETE /api/guide-availability/clear
 * Clear all blocked dates for the guide.
 */
export async function clearBlockedDates(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);

  await query(
    'DELETE FROM GuideAvailability WHERE GuideId = @guideId',
    { guideId }
  );

  res.json({ ok: true, message: 'All blocked dates cleared' });
}
