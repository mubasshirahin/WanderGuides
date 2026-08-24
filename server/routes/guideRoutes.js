import { Router } from 'express';
import { createGuide, listGuides, getGuide, updateGuide, deleteGuide } from '../controllers/guideController.js';
import { getGuideReviews } from '../controllers/reviewController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.post('/', auth, requireRole('guide', 'admin'), asyncHandler(createGuide));           // CREATE
router.get('/', asyncHandler(listGuides));             // READ all (with filters)
router.get('/:id/reviews', asyncHandler(getGuideReviews)); // READ public guide reviews
router.get('/:id', asyncHandler(getGuide));            // READ one
router.patch('/:id', asyncHandler(updateGuide));       // UPDATE
router.delete('/:id', asyncHandler(deleteGuide));      // DELETE

export default router;
