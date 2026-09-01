import express from 'express';
import * as chatController from '../controllers/chatController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

router.get('/conversations', chatController.getConversations);
router.get('/messages/:conversationId', chatController.getMessages);
router.post('/conversations/start', chatController.startConversation);

export default router;
