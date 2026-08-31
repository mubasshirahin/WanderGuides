import { Router } from 'express';
import { createReview, getMyReviews, updateReview, deleteReview } from '../controllers/reviewController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/', auth, asyncHandler(createReview));
router.get('/me', auth, asyncHandler(getMyReviews));
router.patch('/:id', auth, asyncHandler(updateReview));
router.delete('/:id', auth, asyncHandler(deleteReview));

export default router;
