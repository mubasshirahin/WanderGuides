import { Router } from 'express';
import { getAllBookings, createBooking, updateBookingStatus, updatePaymentStatus } from '../controllers/bookingController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate, bookingSchema, paymentStatusSchema } from '../middleware/validate.js';

const router = Router();

router.get('/', auth, requireRole('tourist', 'guide', 'admin'), asyncHandler(getAllBookings));
router.post('/', auth, requireRole('tourist'), validate(bookingSchema), asyncHandler(createBooking));
router.post('/direct', auth, requireRole('tourist'), validate(bookingSchema), asyncHandler(createBooking));
router.patch('/:id', auth, requireRole('tourist', 'guide'), asyncHandler(updateBookingStatus));
router.patch('/:id/payment-status', auth, requireRole('guide', 'admin'), validate(paymentStatusSchema), asyncHandler(updatePaymentStatus));

export default router;
