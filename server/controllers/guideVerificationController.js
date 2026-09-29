import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';
import { notifyGuide } from '../utils/guideNotifications.js';

export async function getMyVerificationRequest(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);
  const rows = await query(
    `SELECT TOP 1 Id, RequestNote, Status, AdminNote, RequestedAt, ReviewedAt
     FROM GuideVerificationRequests WHERE GuideUserId = @guideId
     ORDER BY RequestedAt DESC, Id DESC`,
    { guideId }
  );
  const statusRows = await query('SELECT IsVerified FROM Guides WHERE UserID = @guideId', { guideId });
  res.json({ ok: true, request: rows[0] || null, isVerified: Boolean(statusRows[0]?.IsVerified) });
}

export async function createVerificationRequest(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);
  const requestNote = String(req.body?.requestNote || '').trim();
  if (requestNote.length < 20 || requestNote.length > 2000) {
    throw new AppError('Add 20 to 2000 characters describing your identity verification request', 400);
  }
  const guideRows = await query('SELECT IsVerified FROM Guides WHERE UserID = @guideId', { guideId });
  if (!guideRows.length) throw new AppError('Complete your guide profile before requesting verification', 409);
  if (guideRows[0].IsVerified) throw new AppError('Your guide profile is already verified', 409);
  const pending = await query(
    "SELECT Id FROM GuideVerificationRequests WHERE GuideUserId = @guideId AND Status = 'pending'",
    { guideId }
  );
  if (pending.length) throw new AppError('A verification request is already being reviewed', 409);
  let rows;
  try {
    rows = await query(
      `INSERT INTO GuideVerificationRequests (GuideUserId, RequestNote)
       OUTPUT INSERTED.Id, INSERTED.RequestNote, INSERTED.Status, INSERTED.RequestedAt
       VALUES (@guideId, @requestNote)`,
      { guideId, requestNote }
    );
  } catch (error) {
    if ([2601, 2627].includes(error.number)) throw new AppError('A verification request is already being reviewed', 409);
    throw error;
  }
  res.status(201).json({ ok: true, request: rows[0] });
}

export async function listVerificationRequests(req, res) {
  const status = String(req.query.status || 'pending').toLowerCase();
  if (!['pending', 'approved', 'rejected', 'all'].includes(status)) throw new AppError('Invalid status filter', 400);
  const requests = await query(
    `SELECT r.Id, r.GuideUserId, r.RequestNote, r.Status, r.AdminNote, r.RequestedAt, r.ReviewedAt,
            u.FullName AS GuideName, u.Email AS GuideEmail, u.Phone AS GuidePhone,
            g.City, g.Specialties, g.Languages
     FROM GuideVerificationRequests r
     INNER JOIN Users u ON u.Id = r.GuideUserId
     LEFT JOIN Guides g ON g.UserID = r.GuideUserId
     WHERE (@status = 'all' OR r.Status = @status)
     ORDER BY CASE WHEN r.Status = 'pending' THEN 0 ELSE 1 END, r.RequestedAt DESC`,
    { status }
  );
  res.json({ ok: true, requests });
}

export async function reviewVerificationRequest(req, res) {
  const requestId = Number(req.params.id);
  const status = String(req.body?.status || '').toLowerCase();
  const adminNote = String(req.body?.adminNote || '').trim();
  if (!Number.isInteger(requestId) || requestId <= 0) throw new AppError('Invalid request ID', 400);
  if (!['approved', 'rejected'].includes(status)) throw new AppError('Status must be approved or rejected', 400);
  if (status === 'rejected' && !adminNote) throw new AppError('Add a note explaining why the request was rejected', 400);
  const rows = await query(
    `UPDATE GuideVerificationRequests
     SET Status = @status, AdminNote = @adminNote, ReviewedAt = SYSUTCDATETIME(), ReviewedByUserId = @adminId
     OUTPUT INSERTED.Id, INSERTED.GuideUserId, INSERTED.Status, INSERTED.AdminNote, INSERTED.ReviewedAt
     WHERE Id = @requestId AND Status = 'pending'`,
    { requestId, status, adminNote: adminNote || null, adminId: req.user?.id }
  );
  if (!rows.length) throw new AppError('Pending verification request not found', 404);
  await query('UPDATE Guides SET IsVerified = @isVerified, UpdatedAt = SYSUTCDATETIME() WHERE UserID = @guideId', {
    guideId: rows[0].GuideUserId,
    isVerified: status === 'approved',
  });
  try {
    await notifyGuide({
      guideId: rows[0].GuideUserId,
      type: 'verification',
      title: status === 'approved' ? 'Guide profile verified' : 'Verification request reviewed',
      body: status === 'approved' ? 'Your guide profile now displays a verified badge.' : (adminNote || 'Please submit a new request when you are ready.'),
      linkUrl: '/availability',
    });
  } catch (notificationError) {
    console.error('[reviewVerificationRequest] Could not notify guide:', notificationError.message);
  }
  res.json({ ok: true, request: rows[0] });
}
