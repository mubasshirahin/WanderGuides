import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * GET /api/chat/conversations
 * Returns all active conversations for the logged-in user.
 * Each conversation shows the other user's details, last message, and unread count.
 */
export const getConversations = async (req, res) => {
  const userId = req.user && req.user.id;
  const role = req.user && req.user.role;

  if (!userId) throw new AppError('Unauthorized', 401);

  const otherRole = role === 'tourist' ? 'guide' : 'tourist';
  const myIdCol = role === 'tourist' ? 'TouristID' : 'GuideID';
  const otherIdCol = role === 'tourist' ? 'GuideID' : 'TouristID';

  const conversations = await query(
    `SELECT
       c.ConversationID,
       c.LastMessage,
       c.LastMessageAt,
       u.Id AS OtherUserId,
       u.FullName AS OtherUserName,
       u.Email AS OtherUserEmail,
       u.AvatarUrl AS OtherUserAvatar,
       u.Role AS OtherUserRole,
       ISNULL(unread.TotalUnread, 0) AS UnreadCount
     FROM Conversations c
     INNER JOIN Users u ON u.Id = c.${otherIdCol}
     LEFT JOIN (
       SELECT ConversationID, COUNT(*) AS TotalUnread
       FROM Messages
       WHERE ReceiverID = @userId AND IsRead = 0
       GROUP BY ConversationID
     ) unread ON unread.ConversationID = c.ConversationID
     WHERE c.${myIdCol} = @userId
     ORDER BY c.LastMessageAt DESC, c.ConversationID DESC`,
    { userId }
  );

  const normalized = conversations.map((row) => ({
    conversationId: row.ConversationID,
    lastMessage: row.LastMessage,
    lastMessageAt: row.LastMessageAt,
    unreadCount: Number(row.UnreadCount) || 0,
    user: {
      id: row.OtherUserId,
      fullName: row.OtherUserName,
      email: row.OtherUserEmail,
      avatarUrl: row.OtherUserAvatar,
      role: row.OtherUserRole,
    },
  }));

  res.json({ ok: true, conversations: normalized });
};

/**
 * GET /api/chat/messages/:conversationId
 * Returns the message history for a specific conversation.
 * Also marks all unread messages as read for the current user.
 */
export const getMessages = async (req, res) => {
  const userId = req.user && req.user.id;
  const { conversationId } = req.params;

  if (!userId) throw new AppError('Unauthorized', 401);

  const convoRows = await query(
    'SELECT ConversationID, TouristID, GuideID FROM Conversations WHERE ConversationID = @conversationId',
    { conversationId }
  );

  if (!convoRows.length) throw new AppError('Conversation not found', 404);

  const convo = convoRows[0];
  if (convo.TouristID !== userId && convo.GuideID !== userId) {
    throw new AppError('Forbidden', 403);
  }

  const messages = await query(
    `SELECT
       m.MessageID,
       m.MessageText,
       m.IsRead,
       m.CreatedAt,
       m.SenderID,
       u.FullName AS SenderName,
       u.AvatarUrl AS SenderAvatar
     FROM Messages m
     INNER JOIN Users u ON u.Id = m.SenderID
     WHERE m.ConversationID = @conversationId
     ORDER BY m.CreatedAt ASC, m.MessageID ASC`,
    { conversationId }
  );

  await query(
    `UPDATE Messages
     SET IsRead = 1
     WHERE ConversationID = @conversationId AND ReceiverID = @userId AND IsRead = 0`,
    { conversationId, userId }
  );

  const normalized = messages.map((row) => ({
    messageId: row.MessageID,
    text: row.MessageText,
    isRead: row.IsRead,
    createdAt: row.CreatedAt,
    senderId: row.SenderID,
    senderName: row.SenderName,
    senderAvatar: row.SenderAvatar,
    isMine: row.SenderID === userId,
  }));

  res.json({ ok: true, messages: normalized });
};

/**
 * POST /api/chat/conversations/start
 * Starts a new conversation between a tourist and a guide, or retrieves an existing one.
 */
export const startConversation = async (req, res) => {
  const userId = req.user && req.user.id;
  const role = req.user && req.user.role;
  const { otherUserId } = req.body || {};

  if (!userId) throw new AppError('Unauthorized', 401);
  if (!otherUserId) throw new AppError('otherUserId is required', 400);

  let touristId, guideId;
  if (role === 'tourist') {
    touristId = userId;
    guideId = otherUserId;
  } else if (role === 'guide') {
    touristId = otherUserId;
    guideId = userId;
  } else {
    throw new AppError('Only tourists and guides can chat', 403);
  }

  if (touristId === guideId) {
    throw new AppError('Cannot start a conversation with yourself', 400);
  }

  const otherRows = await query(
    'SELECT Id, Role, FullName, AvatarUrl FROM Users WHERE Id = @otherUserId',
    { otherUserId }
  );
  if (!otherRows.length) throw new AppError('User not found', 404);

  const otherUser = otherRows[0];
  const expectedRole = role === 'tourist' ? 'guide' : 'tourist';
  if (otherUser.Role !== expectedRole) {
    throw new AppError(`Cannot start conversation with another ${role}`, 400);
  }

  let convoRows = await query(
    'SELECT ConversationID, LastMessage, LastMessageAt FROM Conversations WHERE TouristID = @touristId AND GuideID = @guideId',
    { touristId, guideId }
  );

  let conversation;
  if (convoRows.length > 0) {
    conversation = convoRows[0];
  } else {
    const newConvo = await query(
      `INSERT INTO Conversations (TouristID, GuideID)
       OUTPUT INSERTED.ConversationID, INSERTED.LastMessage, INSERTED.LastMessageAt
       VALUES (@touristId, @guideId)`,
      { touristId, guideId }
    );
    conversation = newConvo[0];
  }

  const normalized = {
    conversationId: conversation.ConversationID,
    lastMessage: conversation.LastMessage,
    lastMessageAt: conversation.LastMessageAt,
    user: {
      id: otherUser.Id,
      fullName: otherUser.FullName,
      avatarUrl: otherUser.AvatarUrl,
      role: otherUser.Role,
    },
  };

  res.status(convoRows.length > 0 ? 200 : 201).json({ ok: true, conversation: normalized });
};
