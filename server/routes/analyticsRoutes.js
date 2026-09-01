import { Router } from 'express';
import {
  getGuideBookingSummary,
  getUserGuideMatch,
  getCitySpecialtyMatrix,
  getMonthlyRevenue,
} from '../controllers/analyticsController.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get('/guide-booking-summary', asyncHandler(getGuideBookingSummary));
router.get('/user-guide-match', asyncHandler(getUserGuideMatch));
router.get('/city-specialty-matrix', asyncHandler(getCitySpecialtyMatrix));
router.get('/monthly-revenue', asyncHandler(getMonthlyRevenue));

export default router;
