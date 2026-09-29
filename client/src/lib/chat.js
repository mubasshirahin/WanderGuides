import { authFetch } from './demoAuth.js';

export async function startConversation(otherUserId) {
  const res = await authFetch('/api/chat/conversations/start', {
    method: 'POST',
    body: JSON.stringify({ otherUserId: Number(otherUserId) }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Could not start a conversation');
  }
  return data.conversation;
}
