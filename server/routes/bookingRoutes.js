import { Router } from 'express';
import { getAllBookings, createBooking } from '../controllers/bookingController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', asyncHandler(getAllBookings));
router.post('/', auth, asyncHandler(createBooking));

export default router;
