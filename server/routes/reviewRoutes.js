import { Router } from 'express';
import {
  createReview,
  createGuideReview,
  getUserReviews,
  getPendingReviews,
  getMyGivenReviews,
  respondToReview,
} from '../controllers/reviewController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.post('/', auth, requireRole('tourist'), asyncHandler(createReview));
router.post('/guide', auth, requireRole('tourist'), asyncHandler(createGuideReview));
router.get('/pending-reviews', auth, asyncHandler(getPendingReviews));
router.get('/me', auth, asyncHandler(getMyGivenReviews));
router.get('/user/:userId', asyncHandler(getUserReviews));
router.put('/:reviewId/response', auth, requireRole('guide'), asyncHandler(respondToReview));

export default router;
