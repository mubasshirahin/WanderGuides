import { query } from '../config/db.js';
import AppError from '../utils/AppError.js';

/**
 * GET /api/chat/conversations
 * Returns all active conversations for the logged-in user.
 * Each conversation shows the other user's details, last message, and unread count.
 */
export const getConversations = async (req, res) => {
  const userId = req.user && req.user.id;

  if (!userId) throw new AppError('Unauthorized', 401);

  // Role-agnostic: user jekono side (tourist/guide) hok, tar sob conversation.
  // Age role diye TouristID/GuideID column beche neoa hoto — token e role
  // missing/vul thakle guide tar conversation dekhte peto na. Ekhon CASE diye
  // other-user resolve kora hoy, tai role er upor nirvorota nei.
  // Legacy safety: kono purono row te GuideID/TouristID te Guides.Id (profile)
  // dhuke thakle setao current user er Guides.UserID mapping diye dhora hoy,
  //jate tourist er pathano thread guide er inbox e ase.
  // Other-user age direct Users match (du), na pele Guides link (gu) theke.
  const conversations = await query(
    `SELECT
       c.ConversationID,
       c.LastMessage,
       c.LastMessageAt,
       COALESCE(du.Id, gu.Id) AS OtherUserId,
       COALESCE(du.FullName, gu.FullName) AS OtherUserName,
       COALESCE(du.Email, gu.Email) AS OtherUserEmail,
       COALESCE(du.AvatarUrl, gu.AvatarUrl) AS OtherUserAvatar,
       COALESCE(du.Role, gu.Role) AS OtherUserRole,
       ISNULL(unread.TotalUnread, 0) AS UnreadCount
     FROM Conversations c
     LEFT JOIN Users du ON du.Id = CASE WHEN c.TouristID = @userId THEN c.GuideID ELSE c.TouristID END
     LEFT JOIN Guides gOther ON gOther.Id = CASE WHEN c.TouristID = @userId THEN c.GuideID ELSE c.TouristID END
     LEFT JOIN Users gu ON gu.Id = gOther.UserID
     LEFT JOIN (
       SELECT ConversationID, COUNT(*) AS TotalUnread
       FROM Messages
       WHERE ReceiverID = @userId AND IsRead = 0
       GROUP BY ConversationID
     ) unread ON unread.ConversationID = c.ConversationID
     WHERE c.TouristID = @userId OR c.GuideID = @userId
        OR c.GuideID IN (SELECT Id FROM Guides WHERE UserID = @userId)
        OR c.TouristID IN (SELECT Id FROM Guides WHERE UserID = @userId)
     ORDER BY c.LastMessageAt DESC, c.ConversationID DESC`,
    { userId }
  );

  const normalized = conversations
    .filter((row) => row.OtherUserId != null)
    .map((row) => ({
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
  const requestedLimit = Number(req.query?.limit ?? 50);
  const beforeMessageId = req.query?.before ? Number(req.query.before) : null;

  if (!userId) throw new AppError('Unauthorized', 401);
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
    throw new AppError('limit must be between 1 and 100', 400);
  }
  if (beforeMessageId !== null && (!Number.isSafeInteger(beforeMessageId) || beforeMessageId < 1)) {
    throw new AppError('before must be a positive message ID', 400);
  }

  const convoRows = await query(
    'SELECT ConversationID, TouristID, GuideID FROM Conversations WHERE ConversationID = @conversationId',
    { conversationId }
  );

  if (!convoRows.length) throw new AppError('Conversation not found', 404);

  const convo = convoRows[0];
  const isDirectMember =
    Number(convo.TouristID) === Number(userId) || Number(convo.GuideID) === Number(userId);
  if (!isDirectMember) {
    // Legacy row te GuideID/TouristID te Guides.Id dhuke thakle profile mapping diye allow.
    const profileRows = await query('SELECT Id FROM Guides WHERE UserID = @userId', { userId });
    const profileIds = new Set(profileRows.map((r) => Number(r.Id)));
    if (!profileIds.has(Number(convo.TouristID)) && !profileIds.has(Number(convo.GuideID))) {
      throw new AppError('Forbidden', 403);
    }
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
       AND (@beforeMessageId IS NULL OR m.MessageID < @beforeMessageId)
     ORDER BY m.MessageID DESC
     OFFSET 0 ROWS FETCH NEXT @pageLimit ROWS ONLY`,
    { conversationId, beforeMessageId, pageLimit: requestedLimit + 1 }
  );

  const hasMore = messages.length > requestedLimit;
  const pageRows = messages.slice(0, requestedLimit);
  const nextBeforeId = hasMore ? pageRows[pageRows.length - 1]?.MessageID : null;
  pageRows.reverse();

  if (pageRows.length) {
    const readIds = pageRows.map((row) => row.MessageID);
    const readParams = { conversationId, userId };
    const readIdList = readIds.map((id, index) => {
      readParams[`messageId${index}`] = id;
      return `@messageId${index}`;
    }).join(', ');
    await query(
      `UPDATE Messages SET IsRead = 1
       WHERE ConversationID = @conversationId AND ReceiverID = @userId AND IsRead = 0
         AND MessageID IN (${readIdList})`,
      readParams
    );
  }

  const normalized = pageRows.map((row) => ({
    messageId: row.MessageID,
    text: row.MessageText,
    isRead: row.IsRead,
    createdAt: row.CreatedAt,
    senderId: row.SenderID,
    senderName: row.SenderName,
    senderAvatar: row.SenderAvatar,
    isMine: Number(row.SenderID) === Number(userId),
  }));

  res.json({ ok: true, messages: normalized, hasMore, nextBeforeId });
};

/**
 * POST /api/chat/conversations/start
 * Starts a new conversation between a tourist and a guide, or retrieves an existing one.
 */
export const startConversation = async (req, res) => {
  const userId = Number(req.user && req.user.id);
  const requestedId = Number(req.body?.otherUserId);

  if (!userId) throw new AppError('Unauthorized', 401);
  if (!Number.isSafeInteger(requestedId) || requestedId < 1) {
    throw new AppError('otherUserId is required', 400);
  }
  if (requestedId === userId) {
    throw new AppError('Cannot start a conversation with yourself', 400);
  }

  // Nijer role DB theke nao — token e role missing/stale thakleo thik thakbe.
  const meRows = await query(
    'SELECT Id, Role FROM Users WHERE Id = @userId',
    { userId }
  );
  if (!meRows.length) throw new AppError('Unauthorized', 401);
  const myRole = meRows[0].Role;
  if (!['tourist', 'guide'].includes(myRole)) {
    throw new AppError('Only tourists and guides can chat', 403);
  }
  const oppositeRole = myRole === 'tourist' ? 'guide' : 'tourist';

  // Other-user resolve.
  // Client sadharonoto Users.Id pathay, kintu kokhono Guides.Id (profile)
  // aste pare. Guides.Id ar Users.Id overlap kore (duita identity 1 theke),
  // tai role check chara Users match nile vul manusher sathe conversation
  // toiri hoy — tourist message pathalo, asol guide kichu dekhlo na.
  // Tai: Users row tokhoni nebo jokhon tar Role opposite; noyto Guides
  // mapping (g.Id -> u.Id) theke nebo.
  const userRows = await query(
    'SELECT Id, Role, FullName, AvatarUrl FROM Users WHERE Id = @requestedId',
    { requestedId }
  );
  const guideLinkRows = await query(
    `SELECT u.Id, u.Role, u.FullName, u.AvatarUrl
     FROM Guides g
     INNER JOIN Users u ON u.Id = g.UserID
     WHERE g.Id = @requestedId`,
    { requestedId }
  );
  const directMatch = userRows.find((r) => r.Role === oppositeRole) || null;
  const linkedMatch = guideLinkRows.find((r) => r.Role === oppositeRole) || null;
  // Tourist -> guide: current client ra Users.Id pathay, tai direct age.
  // Guide -> tourist: tourist er Guides row thake na, direct e lagbe.
  const otherUser = directMatch || linkedMatch || null;
  if (!otherUser) {
    if (userRows.length || guideLinkRows.length) {
      throw new AppError(`Cannot start conversation with another ${myRole}`, 400);
    }
    throw new AppError('User not found', 404);
  }

  const otherUserId = Number(otherUser.Id);
  if (otherUserId === userId) {
    throw new AppError('Cannot start a conversation with yourself', 400);
  }

  let touristId, guideId;
  if (myRole === 'tourist') {
    touristId = userId;
    guideId = otherUserId;
  } else {
    touristId = otherUserId;
    guideId = userId;
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
