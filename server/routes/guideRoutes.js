import { Router } from 'express';
import { createGuide, listGuides, getGuideEx, updateGuide, deleteGuide, exploreGuides, updateGuideProfile, getTopRatedGuides, browseTours, checkTourAvailability } from '../controllers/guideController.js';
import { getGuideReviews, createGuideReview } from '../controllers/reviewController.js';
import { recordTourView } from '../controllers/guideTourController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate, validateQuery, exploreQuerySchema, guidesQuerySchema, guideSelfProfileSchema } from '../middleware/validate.js';

const router = Router();

router.post('/', auth, requireRole('guide', 'admin'), asyncHandler(createGuide));           // CREATE (admin/guide)
router.get('/', validateQuery(guidesQuerySchema), asyncHandler(listGuides));                 // READ public list with filters/sorting
router.get('/explore', validateQuery(exploreQuerySchema), asyncHandler(exploreGuides));    // READ public explore (search/filter/paginate) — must precede /:id
router.get('/tours/browse', asyncHandler(browseTours));    // READ public tour packages browse
router.post('/tours/:tourId/view', asyncHandler(recordTourView));
router.get('/tours/:tourId/availability', asyncHandler(checkTourAvailability));
router.get('/top-rated', asyncHandler(getTopRatedGuides));    // GET top-rated guides by city (GROUP BY + HAVING)
router.get('/:id', asyncHandler(getGuideEx));            // READ one (with reviews)
router.get('/:id/reviews', asyncHandler(getGuideReviews));  // GET guide reviews
// Open-review aliases (same handler as POST /api/reviews/guide — tour lage na)
router.post('/reviews', auth, requireRole('tourist'), asyncHandler(createGuideReview));
router.post('/:id/reviews', auth, requireRole('tourist'), asyncHandler(createGuideReview));
router.patch('/:id', auth, requireRole('guide', 'admin'), asyncHandler(updateGuide));       // UPDATE (admin/guide)
router.put('/profile', auth, requireRole('guide'), validate(guideSelfProfileSchema), asyncHandler(updateGuideProfile)); // UPDATE own listing (guide)
router.delete('/:id', auth, requireRole('admin'), asyncHandler(deleteGuide));      // DELETE (admin)

export default router;
