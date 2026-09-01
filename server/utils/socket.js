import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { query, getPool } from '../config/db.js';
import AppError from '../utils/AppError.js';

let ioInstance = null;

export function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.on('connection', async (socket) => {
    let authenticatedUserId = null;

    const authenticateSocket = () => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        socket.disconnect(true);
        throw new AppError('Missing socket token', 401);
      }

      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        authenticatedUserId = payload && payload.id ? Number(payload.id) : null;
        if (!authenticatedUserId) {
          socket.disconnect(true);
          throw new AppError('Invalid token payload', 401);
        }
      } catch (err) {
        socket.disconnect(true);
        throw err;
      }
    };

    try {
      authenticateSocket();
    } catch (err) {
      console.error('[socket] Auth failed:', err.message);
      return;
    }

    socket.join(String(authenticatedUserId));
    console.log(`[socket] User ${authenticatedUserId} connected on socket ${socket.id}`);

    socket.on('send_message', async (payload, callback) => {
      try {
        if (!authenticatedUserId) {
          return callback?.({ ok: false, message: 'Unauthorized' });
        }

        const { conversationId, messageText } = payload || {};
        if (!conversationId || !messageText || !String(messageText).trim()) {
          return callback?.({ ok: false, message: 'conversationId and messageText are required' });
        }

        const convoRows = await query(
          'SELECT ConversationID, TouristID, GuideID FROM Conversations WHERE ConversationID = @conversationId',
          { conversationId }
        );
        if (!convoRows.length) {
          return callback?.({ ok: false, message: 'Conversation not found' });
        }

        const convo = convoRows[0];
        if (convo.TouristID !== authenticatedUserId && convo.GuideID !== authenticatedUserId) {
          return callback?.({ ok: false, message: 'Forbidden' });
        }

        const senderId = authenticatedUserId;
        const receiverId = convo.TouristID === senderId ? convo.GuideID : convo.TouristID;

        const now = new Date();
        const insertResult = await query(
          `INSERT INTO Messages (ConversationID, SenderID, ReceiverID, MessageText)
           OUTPUT INSERTED.MessageID, INSERTED.ConversationID, INSERTED.SenderID, INSERTED.ReceiverID,
                  INSERTED.MessageText, INSERTED.IsRead, INSERTED.CreatedAt
           VALUES (@conversationId, @senderId, @receiverId, @messageText)`,
          { conversationId, senderId, receiverId, messageText: String(messageText).trim() }
        );

        const message = insertResult[0];

        await query(
          `UPDATE Conversations
           SET LastMessage = @lastMessage, LastMessageAt = @now
           WHERE ConversationID = @conversationId`,
          { conversationId, lastMessage: message.MessageText, now }
        );

        const normalizedMessage = {
          messageId: message.MessageID,
          conversationId: message.ConversationID,
          text: message.MessageText,
          isRead: message.IsRead,
          createdAt: message.CreatedAt,
          senderId: message.SenderID,
          receiverId: message.ReceiverID,
          isMine: false,
        };

        ioInstance.to(String(receiverId)).emit('receive_message', {
          ...normalizedMessage,
          isMine: false,
        });

        callback?.({ ok: true, message: normalizedMessage });
      } catch (err) {
        console.error('[socket] send_message error:', err);
        callback?.({ ok: false, message: err.message || 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[socket] User ${authenticatedUserId} disconnected from socket ${socket.id}`);
    });
  });

  console.log('[socket] Socket.io server initialized');
  return ioInstance;
}

export function getIO() {
  if (!ioInstance) {
    throw new AppError('Socket.io not initialized', 500);
  }
  return ioInstance;
}
