import { Router } from 'express';
import {
  getGuideBookingSummary,
  getUserGuideMatch,
  getCitySpecialtyMatrix,
  getMonthlyRevenue,
} from '../controllers/analyticsController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();
router.use(auth, requireRole('admin'));

router.get('/guide-booking-summary', asyncHandler(getGuideBookingSummary));
router.get('/user-guide-match', asyncHandler(getUserGuideMatch));
router.get('/city-specialty-matrix', asyncHandler(getCitySpecialtyMatrix));
router.get('/monthly-revenue', asyncHandler(getMonthlyRevenue));

export default router;
