import { Router } from 'express';
import { createGuide, listGuides, getGuide, updateGuide, deleteGuide } from '../controllers/guideController.js';

const router = Router();

router.post('/', createGuide);           // CREATE
router.get('/', listGuides);             // READ all (with filters)
router.get('/:id', getGuide);            // READ one
router.patch('/:id', updateGuide);       // UPDATE
router.delete('/:id', deleteGuide);      // DELETE

export default router;