import { Router } from 'express';
import { getDashboard, cancelBooking } from '../controllers/touristController.js';
import { getFavorites, addFavorite, removeFavorite } from '../controllers/touristFavoritesController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.get('/dashboard', auth, asyncHandler(getDashboard));
router.get('/favorites', auth, requireRole('tourist'), asyncHandler(getFavorites));
router.put('/favorites/:tourId', auth, requireRole('tourist'), asyncHandler(addFavorite));
router.delete('/favorites/:tourId', auth, requireRole('tourist'), asyncHandler(removeFavorite));
router.put('/bookings/:id/cancel', auth, asyncHandler(cancelBooking));

export default router;
