import { Router } from 'express';
import { createGuide, listGuides, getGuideEx, updateGuide, deleteGuide, exploreGuides, updateGuideProfile, getTopRatedGuides } from '../controllers/guideController.js';
import { getGuideReviews } from '../controllers/reviewController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate, validateQuery, exploreQuerySchema, guideSelfProfileSchema } from '../middleware/validate.js';

const router = Router();

router.post('/', auth, requireRole('guide', 'admin'), asyncHandler(createGuide));           // CREATE (admin/guide)
router.get('/explore', validateQuery(exploreQuerySchema), asyncHandler(exploreGuides));    // READ public explore (search/filter/paginate) — must precede /:id
router.get('/top-rated', asyncHandler(getTopRatedGuides));    // GET top-rated guides by city (GROUP BY + HAVING)
router.get('/:id', asyncHandler(getGuideEx));            // READ one (with reviews)
router.get('/:id/reviews', asyncHandler(getGuideReviews));  // GET guide reviews
router.patch('/:id', auth, requireRole('guide', 'admin'), asyncHandler(updateGuide));       // UPDATE (admin/guide)
router.put('/profile', auth, requireRole('guide'), validate(guideSelfProfileSchema), asyncHandler(updateGuideProfile)); // UPDATE own listing (guide)
router.delete('/:id', auth, requireRole('admin'), asyncHandler(deleteGuide));      // DELETE (admin)

export default router;
