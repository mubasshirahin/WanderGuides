import { Router } from 'express';
import { getDashboard, cancelBooking } from '../controllers/touristController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', auth, asyncHandler(getDashboard));
router.put('/bookings/:id/cancel', auth, asyncHandler(cancelBooking));

export default router;
