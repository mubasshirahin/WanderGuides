import { Router } from 'express';
import { createBid } from '../controllers/bidController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate, guideBidSchema } from '../middleware/validate.js';

const router = Router();

// Tourist places a custom offer on a guide.
router.post('/create', auth, requireRole('tourist'), validate(guideBidSchema), asyncHandler(createBid));

export default router;