import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

export async function getSavedGuides(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);
  const guides = await query(
    `SELECT g.Id, g.UserID, g.FullName, g.Email, g.Phone, g.City, g.Bio, g.Specialties,
            g.Languages, g.HourlyRate, COALESCE(g.DailyRate, g.RatePerDay) AS DailyRate,
            g.Rating, g.TotalReviews, u.AvatarUrl
     FROM TouristFavoriteGuides f
     INNER JOIN Guides g ON g.UserID = f.GuideUserId AND g.IsActive = 1
     LEFT JOIN Users u ON u.Id = g.UserID
     WHERE f.TouristUserId = @userId ORDER BY f.CreatedAt DESC`, { userId }
  );
  res.json({ ok: true, guides });
}

export async function saveGuide(req, res) {
  const userId = req.user?.id;
  const guideId = Number(req.params.guideId);
  if (!userId) throw new AppError('Unauthorized', 401);
  if (!Number.isInteger(guideId) || guideId <= 0) throw new AppError('Invalid guide ID', 400);
  const guides = await query('SELECT UserID FROM Guides WHERE UserID = @guideId AND IsActive = 1', { guideId });
  if (!guides.length) throw new AppError('Guide not found', 404);
  await query(
    `IF NOT EXISTS (SELECT 1 FROM TouristFavoriteGuides WHERE TouristUserId = @userId AND GuideUserId = @guideId)
       INSERT INTO TouristFavoriteGuides (TouristUserId, GuideUserId) VALUES (@userId, @guideId)`,
    { userId, guideId }
  );
  res.json({ ok: true, saved: true });
}

export async function unsaveGuide(req, res) {
  const userId = req.user?.id;
  const guideId = Number(req.params.guideId);
  if (!userId) throw new AppError('Unauthorized', 401);
  if (!Number.isInteger(guideId) || guideId <= 0) throw new AppError('Invalid guide ID', 400);
  await query('DELETE FROM TouristFavoriteGuides WHERE TouristUserId = @userId AND GuideUserId = @guideId', { userId, guideId });
  res.json({ ok: true, saved: false });
}

export async function getNotifications(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);
  const notifications = await query(
    `SELECT TOP 30 Id, Type, Title, Body, LinkUrl, IsRead, CreatedAt
     FROM TouristNotifications WHERE TouristUserId = @userId ORDER BY CreatedAt DESC`, { userId }
  );
  res.json({ ok: true, notifications, unreadCount: notifications.filter((item) => !item.IsRead).length });
}

export async function markNotificationRead(req, res) {
  const userId = req.user?.id;
  const notificationId = Number(req.params.id);
  if (!userId) throw new AppError('Unauthorized', 401);
  if (!Number.isInteger(notificationId) || notificationId <= 0) throw new AppError('Invalid notification ID', 400);
  const rows = await query(
    `UPDATE TouristNotifications SET IsRead = 1 OUTPUT INSERTED.Id
     WHERE Id = @notificationId AND TouristUserId = @userId`, { notificationId, userId }
  );
  if (!rows.length) throw new AppError('Notification not found', 404);
  res.json({ ok: true });
}
