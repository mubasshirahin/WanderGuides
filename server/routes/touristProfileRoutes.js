import { Router } from 'express';
import {
  getPublicProfile,
  getMyProfile,
  updateProfile,
  changePassword,
} from '../controllers/touristProfileController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { validate, touristProfileUpdateSchema, changePasswordSchema } from '../middleware/validate.js';

const router = Router();

// Private — authenticated tourist only (MUST be before /:userId)
router.get('/me', auth, asyncHandler(getMyProfile));
router.put('/', auth, validate(touristProfileUpdateSchema), asyncHandler(updateProfile));
router.put('/change-password', auth, validate(changePasswordSchema), asyncHandler(changePassword));

// Public — anyone can view a tourist's public profile (AFTER /me)
router.get('/:userId', asyncHandler(getPublicProfile));

export default router;
