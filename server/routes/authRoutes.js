import { Router } from 'express';
import { health, register, login } from '../controllers/authController.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get('/health', asyncHandler(health));
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));

export default router;
