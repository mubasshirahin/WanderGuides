import { Router } from 'express';
import {
  createRequest,
  getOpenRequests,
  getMyRequests,
  getRequestWithBids,
  createBid,
  acceptBid,
  declineBid,
  cancelRequest,
} from '../controllers/customTourController.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate, customTourRequestSchema, tourBidSchema } from '../middleware/validate.js';

const router = Router();

// Tourist creates a new custom tour request
router.post(
  '/',
  auth,
  requireRole('tourist'),
  validate(customTourRequestSchema),
  asyncHandler(createRequest)
);

// Guides browse all open tour requests (with filters)
router.get(
  '/',
  auth,
  requireRole('guide', 'admin'),
  asyncHandler(getOpenRequests)
);

// Tourist fetches their own requests with bid counts
router.get(
  '/my-requests',
  auth,
  requireRole('tourist'),
  asyncHandler(getMyRequests)
);

// Tourist cancels their own open request
router.put(
  '/:id/cancel',
  auth,
  requireRole('tourist'),
  asyncHandler(cancelRequest)
);

// Fetch a single request with its bids
router.get(
  '/:id',
  auth,
  asyncHandler(getRequestWithBids)
);

// Guide submits a bid on a request
router.post(
  '/:id/bids',
  auth,
  requireRole('guide'),
  validate(tourBidSchema),
  asyncHandler(createBid)
);

// Tourist accepts a bid (converts to booking)
router.put(
  '/bids/:bidId/accept',
  auth,
  requireRole('tourist'),
  asyncHandler(acceptBid)
);

// Tourist declines a bid
router.put(
  '/bids/:bidId/decline',
  auth,
  requireRole('tourist'),
  asyncHandler(declineBid)
);

export default router;
