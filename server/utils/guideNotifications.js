import { query } from '../config/db.js';
import { getIO } from './socket.js';

export async function notifyGuide({ guideId, type, title, body, linkUrl = '/dashboard' }) {
  const rows = await query(
    `INSERT INTO GuideNotifications (GuideUserId, Type, Title, Body, LinkUrl)
     OUTPUT INSERTED.Id, INSERTED.Type, INSERTED.Title, INSERTED.Body,
            INSERTED.LinkUrl, INSERTED.IsRead, INSERTED.CreatedAt
     VALUES (@guideId, @type, @title, @body, @linkUrl)`,
    { guideId, type, title, body: body || null, linkUrl }
  );
  try {
    getIO().to(String(guideId)).emit('guide_notification:new', rows[0]);
  } catch {
    // The persisted notification remains available when sockets are offline.
  }
  return rows[0];
}
