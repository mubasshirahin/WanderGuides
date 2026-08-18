import { Router } from 'express';
import { health, register, login, me } from '../controllers/authController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/health', asyncHandler(health));
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', auth, asyncHandler(me));

export default router;
