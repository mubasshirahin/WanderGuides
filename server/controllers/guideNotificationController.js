import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

export async function getGuideNotifications(req, res) {
  const guideId = req.user?.id;
  if (!guideId) throw new AppError('Unauthorized', 401);
  const notifications = await query(
    `SELECT TOP 30 Id, Type, Title, Body, LinkUrl, IsRead, CreatedAt
     FROM GuideNotifications WHERE GuideUserId = @guideId
     ORDER BY CreatedAt DESC, Id DESC`,
    { guideId }
  );
  res.json({ ok: true, notifications, unreadCount: notifications.filter((item) => !item.IsRead).length });
}

export async function markGuideNotificationRead(req, res) {
  const guideId = req.user?.id;
  const notificationId = Number(req.params.id);
  if (!guideId) throw new AppError('Unauthorized', 401);
  if (!Number.isInteger(notificationId) || notificationId <= 0) throw new AppError('Invalid notification ID', 400);
  const rows = await query(
    `UPDATE GuideNotifications SET IsRead = 1
     OUTPUT INSERTED.Id
     WHERE Id = @notificationId AND GuideUserId = @guideId`,
    { notificationId, guideId }
  );
  if (!rows.length) throw new AppError('Notification not found', 404);
  res.json({ ok: true });
}
