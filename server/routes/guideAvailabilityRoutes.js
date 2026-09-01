import { Router } from 'express';
import {
  getBlockedDates,
  blockDates,
  unblockDate,
  clearBlockedDates,
} from '../controllers/guideAvailabilityController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.get('/', auth, requireRole('guide'), asyncHandler(getBlockedDates));
router.post('/block', auth, requireRole('guide'), asyncHandler(blockDates));
router.delete('/unblock/:date', auth, requireRole('guide'), asyncHandler(unblockDate));
router.delete('/clear', auth, requireRole('guide'), asyncHandler(clearBlockedDates));

export default router;
