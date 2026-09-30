import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { query, getPool } from '../config/db.js';
import AppError from '../utils/AppError.js';
import { getJwtSecret } from './jwtSecret.js';

let ioInstance = null;

export function initSocket(server) {
  ioInstance = new Server(server, {
    cors: {
      origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()),
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
        const payload = jwt.verify(token, getJwtSecret());
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
        const touristId = Number(convo.TouristID);
        const guideId = Number(convo.GuideID);
        const isDirectMember = touristId === authenticatedUserId || guideId === authenticatedUserId;
        if (!isDirectMember) {
          // Legacy row te GuideID te Guides.Id (profile) thakle profile mapping diye member dhorbo,
          // jate guide reply korte pare.
          const profileRows = await query('SELECT Id FROM Guides WHERE UserID = @authId', {
            authId: authenticatedUserId,
          });
          const profileIds = new Set(profileRows.map((r) => Number(r.Id)));
          if (!profileIds.has(touristId) && !profileIds.has(guideId)) {
            return callback?.({ ok: false, message: 'Forbidden' });
          }
        }

        const senderId = authenticatedUserId;
        // Legacy row hole receiver onno side er direct Users.Id (TouristID).
        let receiverId = touristId === senderId ? guideId : touristId;

        // receiverId te Guides.Id (profile) dhuke thakle Users.Id te translate,
        // nahole Messages/GuideNotifications FK fail kore guide kokhono message peto na.
        const receiverUserRows = await query('SELECT Id FROM Users WHERE Id = @receiverId', {
          receiverId,
        });
        if (!receiverUserRows.length) {
          const linkedRows = await query('SELECT UserID FROM Guides WHERE Id = @receiverId', {
            receiverId,
          });
          if (linkedRows.length && linkedRows[0].UserID) {
            receiverId = Number(linkedRows[0].UserID);
          }
        }

        const now = new Date();
        // NOTE: Messages-te AFTER INSERT trigger ache, tai OUTPUT ... INTO @table pattern.
        const insertResult = await query(
          `DECLARE @newMsg TABLE (MessageID INT, ConversationID INT, SenderID INT, ReceiverID INT, MessageText NVARCHAR(MAX), IsRead BIT, CreatedAt DATETIME2);
           INSERT INTO Messages (ConversationID, SenderID, ReceiverID, MessageText)
           OUTPUT INSERTED.MessageID, INSERTED.ConversationID, INSERTED.SenderID, INSERTED.ReceiverID,
                  INSERTED.MessageText, INSERTED.IsRead, INSERTED.CreatedAt INTO @newMsg
           VALUES (@conversationId, @senderId, @receiverId, @messageText);
           SELECT MessageID, ConversationID, SenderID, ReceiverID, MessageText, IsRead, CreatedAt FROM @newMsg;`,
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

        if (Number(convo.GuideID) === Number(senderId)) {
          const noticeRows = await query(
            `INSERT INTO TouristNotifications (TouristUserId, Type, Title, Body, LinkUrl)
             OUTPUT INSERTED.Id, INSERTED.Type, INSERTED.Title, INSERTED.Body, INSERTED.LinkUrl,
                    INSERTED.IsRead, INSERTED.CreatedAt
             VALUES (@touristId, 'message', 'New message from your guide', @body, '/messages')`,
            { touristId: receiverId, body: String(message.MessageText).trim().slice(0, 500) }
          );
          ioInstance.to(String(receiverId)).emit('notification:new', noticeRows[0]);
        } else {
          try {
            const noticeRows = await query(
              `INSERT INTO GuideNotifications (GuideUserId, Type, Title, Body, LinkUrl)
               OUTPUT INSERTED.Id, INSERTED.Type, INSERTED.Title, INSERTED.Body, INSERTED.LinkUrl,
                      INSERTED.IsRead, INSERTED.CreatedAt
               VALUES (@guideId, 'message', 'New message from a tourist', @body, '/messages')`,
              { guideId: receiverId, body: String(message.MessageText).trim().slice(0, 500) }
            );
            ioInstance.to(String(receiverId)).emit('guide_notification:new', noticeRows[0]);
          } catch (notificationError) {
            console.error('[socket] Could not create guide message notification:', notificationError.message);
          }
        }

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
