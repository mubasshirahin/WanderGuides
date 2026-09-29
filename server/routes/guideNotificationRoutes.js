import { Router } from 'express';
import { getGuideNotifications, markGuideNotificationRead } from '../controllers/guideNotificationController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();
router.use(auth, requireRole('guide'));
router.get('/', asyncHandler(getGuideNotifications));
router.put('/:id/read', asyncHandler(markGuideNotificationRead));

export default router;
