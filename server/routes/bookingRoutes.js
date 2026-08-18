import { Router } from 'express';
import { getAllBookings, createBooking } from '../controllers/bookingController.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getAllBookings));
router.post('/', asyncHandler(createBooking));

export default router;
