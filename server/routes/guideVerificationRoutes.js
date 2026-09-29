import { Router } from 'express';
import {
  getMyVerificationRequest, createVerificationRequest,
  listVerificationRequests, reviewVerificationRequest,
} from '../controllers/guideVerificationController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();
router.get('/me', auth, requireRole('guide'), asyncHandler(getMyVerificationRequest));
router.post('/', auth, requireRole('guide'), asyncHandler(createVerificationRequest));
router.get('/', auth, requireRole('admin'), asyncHandler(listVerificationRequests));
router.put('/:id/review', auth, requireRole('admin'), asyncHandler(reviewVerificationRequest));
export default router;
