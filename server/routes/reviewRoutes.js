import { Router } from 'express';
import {
  createReview,
  getUserReviews,
  getPendingReviews,
  getMyGivenReviews,
} from '../controllers/reviewController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.post('/', auth, requireRole('tourist'), asyncHandler(createReview));
router.get('/pending-reviews', auth, asyncHandler(getPendingReviews));
router.get('/me', auth, asyncHandler(getMyGivenReviews));
router.get('/user/:userId', asyncHandler(getUserReviews));

export default router;
