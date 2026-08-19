import { Router } from 'express';
import { getAllBookings, createBooking } from '../controllers/bookingController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.get('/', auth, requireRole('tourist', 'guide', 'admin'), asyncHandler(getAllBookings));
router.post('/', auth, requireRole('tourist'), asyncHandler(createBooking));

export default router;
