import { Router } from 'express';
import { health, register, login, me, demoLogin } from '../controllers/authController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../middleware/validate.js';

const router = Router();

router.get('/health', asyncHandler(health));
router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/demo-login', asyncHandler(demoLogin));
router.get('/me', auth, asyncHandler(me));

export default router;