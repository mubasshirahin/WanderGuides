import { Router } from 'express';
import {
  createTour,
  getMyTours,
  getTourResponses,
  toggleTour,
  deleteTour,
  getOpenCustomRequests,
  submitBid,
  getGuideDashboard,
} from '../controllers/guideTourController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.get('/dashboard', auth, requireRole('guide'), asyncHandler(getGuideDashboard));
router.post('/tours', auth, requireRole('guide'), asyncHandler(createTour));
router.get('/my-tours', auth, requireRole('guide'), asyncHandler(getMyTours));
router.get('/tours/:tourId/responses', auth, requireRole('guide'), asyncHandler(getTourResponses));
router.put('/tours/:tourId/toggle', auth, requireRole('guide'), asyncHandler(toggleTour));
router.delete('/tours/:tourId', auth, requireRole('guide'), asyncHandler(deleteTour));
router.get('/custom-requests', auth, requireRole('guide'), asyncHandler(getOpenCustomRequests));
router.post('/custom-requests/:requestId/bid', auth, requireRole('guide'), asyncHandler(submitBid));

export default router;
