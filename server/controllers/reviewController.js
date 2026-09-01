import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/** GET /api/guides/:id/reviews - list public reviews for a guide. */
export function createGetGuideReviews(runQuery = query) {
  return async function getGuideReviews(req, res) {
    const guideId = Number(req.params.id);
    if (!Number.isInteger(guideId) || guideId <= 0) {
      throw new AppError('Invalid ID', 400);
    }

    const reviews = await runQuery(
      `
        SELECT
          r.Id,
          r.Rating,
          r.Comment,
          r.CreatedAt,
          tourist.FullName AS TouristName,
          tourist.AvatarUrl AS TouristAvatarUrl
        FROM Reviews r
        INNER JOIN Users tourist ON tourist.Id = r.TouristUserId
        WHERE r.GuideId = @guideId
        ORDER BY r.CreatedAt DESC
      `,
      { guideId }
    );

    res.json({ ok: true, reviews });
  };
}

export const getGuideReviews = createGetGuideReviews();
