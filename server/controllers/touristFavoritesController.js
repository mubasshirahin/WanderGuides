import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

export async function getFavorites(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);
  const tours = await query(
    `SELECT gt.Id, gt.Title, gt.Description, gt.Location, gt.Price, gt.DurationHours,
            gt.MaxGroupSize, gt.Category, gt.Difficulty, gt.MeetingPoint, gt.ImageUrl,
            gt.Highlights, g.FullName AS GuideName, g.Rating AS GuideRating,
            u.AvatarUrl AS GuideAvatar
     FROM TouristFavorites f
     INNER JOIN GuideTours gt ON gt.Id = f.GuideTourId AND gt.IsActive = 1
     INNER JOIN Users u ON u.Id = gt.GuideId
     LEFT JOIN Guides g ON g.UserID = u.Id
     WHERE f.TouristUserId = @userId
     ORDER BY f.CreatedAt DESC`, { userId }
  );
  res.json({ ok: true, tours });
}

export async function addFavorite(req, res) {
  const userId = req.user?.id;
  const tourId = Number(req.params.tourId);
  if (!userId) throw new AppError('Unauthorized', 401);
  if (!Number.isInteger(tourId) || tourId <= 0) throw new AppError('Invalid tour ID', 400);
  const tours = await query('SELECT Id FROM GuideTours WHERE Id = @tourId AND IsActive = 1', { tourId });
  if (!tours.length) throw new AppError('Tour not found', 404);
  await query(
    `IF NOT EXISTS (SELECT 1 FROM TouristFavorites WHERE TouristUserId = @userId AND GuideTourId = @tourId)
       INSERT INTO TouristFavorites (TouristUserId, GuideTourId) VALUES (@userId, @tourId)`,
    { userId, tourId }
  );
  res.json({ ok: true, saved: true });
}

export async function removeFavorite(req, res) {
  const userId = req.user?.id;
  const tourId = Number(req.params.tourId);
  if (!userId) throw new AppError('Unauthorized', 401);
  if (!Number.isInteger(tourId) || tourId <= 0) throw new AppError('Invalid tour ID', 400);
  await query('DELETE FROM TouristFavorites WHERE TouristUserId = @userId AND GuideTourId = @tourId', { userId, tourId });
  res.json({ ok: true, saved: false });
}
