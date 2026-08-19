import { Router } from 'express';
import { health, register, login, me, demoLogin } from '../controllers/authController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/health', asyncHandler(health));
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/demo-login', asyncHandler(demoLogin));
router.get('/me', auth, asyncHandler(me));

export default router;
