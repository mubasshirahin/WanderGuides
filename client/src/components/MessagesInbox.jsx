import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { authFetch } from '../lib/demoAuth.js';
import { ArrowLeft, Send, Search, MoreVertical, CircleCheck, Circle } from 'lucide-react';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:5050' : window.location.origin;

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function MessagesInbox({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const textInputRef = useRef(null);

  const activeConversation = conversations.find((c) => c.conversationId === activeConversationId) || null;

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    setError('');
    try {
      const res = await authFetch('/api/chat/conversations');
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load conversations');
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId) => {
    setLoadingMessages(true);
    try {
      const res = await authFetch(`/api/chat/messages/${conversationId}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load messages');
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const socket = io(SOCKET_URL, {
      auth: { token: sessionStorage.getItem('wg_token') },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('[MessagesInbox] Socket connected');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log('[MessagesInbox] Socket disconnected');
    });

    socket.on('receive_message', (message) => {
      const userId = currentUser.id;
      const isForCurrentConversation =
        activeConversationId && message.conversationId === activeConversationId;

      if (isForCurrentConversation) {
        setMessages((prev) => {
          if (prev.some((m) => m.messageId === message.messageId)) return prev;
          return [...prev, { ...message, isMine: message.senderId === userId }];
        });
      }

      setConversations((prev) => {
        const exists = prev.some((c) => c.conversationId === message.conversationId);
        if (!exists) {
          fetchConversations();
          return prev;
        }
        return prev
          .map((c) =>
            c.conversationId === message.conversationId
              ? {
                  ...c,
                  lastMessage: message.text,
                  lastMessageAt: message.createdAt,
                  unreadCount: isForCurrentConversation ? 0 : c.unreadCount + 1,
                }
              : c
          )
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.id, activeConversationId, SOCKET_URL, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conversationId) => {
    setActiveConversationId(conversationId);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConversationId || !socketRef.current || sending) return;

    const messageText = text.trim();
    setText('');
    setSending(true);

    try {
      const result = await new Promise((resolve) => {
        socketRef.current.emit('send_message', { conversationId: activeConversationId, messageText }, resolve);
      });

      if (result?.ok) {
        setMessages((prev) => {
          if (prev.some((m) => m.messageId === result.message.messageId)) return prev;
          return [...prev, { ...result.message, isMine: true }];
        });
        setConversations((prev) =>
          prev
            .map((c) =>
              c.conversationId === activeConversationId
                ? { ...c, lastMessage: messageText, lastMessageAt: new Date().toISOString() }
                : c
            )
            .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
        );
      } else {
        setError(result?.message || 'Failed to send message');
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
      textInputRef.current?.focus();
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.user?.fullName?.toLowerCase().includes(q);
  });

  const isMobileView = () => {
    return activeConversationId && window.innerWidth < 768;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 shadow-card backdrop-blur-xl sm:h-[calc(100vh-10rem)]">
      {/* Sidebar */}
      <div
        className={`${
          isMobileView() ? 'hidden' : 'flex'
        } w-full flex-col border-r border-white/10 bg-ink-950/40 md:w-80 md:min-w-[280px] lg:w-96`}
      >
        {/* Sidebar Header */}
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">Messages</h2>
            <span className={`inline-flex items-center gap-1.5 text-xs ${socketConnected ? 'text-brand-400' : 'text-slate-500'}`}>
              <span className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-brand-500' : 'bg-slate-500'}`} />
              {socketConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-brand-500/50 focus:bg-white/10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-slate-400">No conversations yet.</p>
              <p className="text-xs text-slate-500">Start chatting with a guide or tourist from their profile.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredConversations.map((convo) => (
                <button
                  key={convo.conversationId}
                  onClick={() => handleSelectConversation(convo.conversationId)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                    activeConversationId === convo.conversationId ? 'bg-brand-500/10' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-teal-600 text-sm font-bold text-white">
                      {convo.user?.avatarUrl ? (
                        <img src={convo.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (convo.user?.fullName || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-950 bg-slate-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">{convo.user?.fullName}</p>
                      <span className="flex-shrink-0 text-xs text-slate-500">{formatDate(convo.lastMessageAt)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-slate-400">{convo.lastMessage || 'No messages yet'}</p>
                      {convo.unreadCount > 0 && (
                        <span className="inline-flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`${
          isMobileView() ? 'flex' : 'hidden'
        } flex-1 flex-col bg-ink-950/20 md:flex`}
      >
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <button
                onClick={() => setActiveConversationId(null)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-teal-600 text-sm font-bold text-white">
                {activeConversation.user?.avatarUrl ? (
                  <img src={activeConversation.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (activeConversation.user?.fullName || '?').charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{activeConversation.user?.fullName}</p>
                <p className="text-xs capitalize text-slate-400">{activeConversation.user?.role}</p>
              </div>

              <div className="ml-auto">
                <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm text-slate-400">No messages yet.</p>
                  <p className="text-xs text-slate-500">Say hello to start the conversation!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.messageId}
                      className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`relative max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          msg.isMine
                            ? 'rounded-br-md bg-gradient-to-br from-brand-600 to-teal-600 text-white'
                            : 'rounded-bl-md bg-white/10 text-slate-200'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            msg.isMine ? 'text-brand-100' : 'text-slate-400'
                          }`}
                        >
                          <span>{formatTime(msg.createdAt)}</span>
                          {msg.isMine && (msg.isRead ? <CircleCheck className="h-3 w-3" /> : <Circle className="h-3 w-3" />)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSend} className="border-t border-white/10 px-4 py-3">
              {error && (
                <p className="mb-2 text-xs text-red-400">{error}</p>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={textInputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-brand-500/50 focus:bg-white/10 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-lg shadow-brand-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
              <Send className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Select a conversation</p>
              <p className="mt-1 text-xs text-slate-400">Choose a chat from the left to start messaging.</p>
            </div>
          </div>
        )}
      </div>

      {/* Empty state when no conversation selected on desktop */}
      {!activeConversation && !isMobileView() && (
        <div className="hidden flex-1 flex-col items-center justify-center gap-3 p-6 text-center md:flex">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
            <Send className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Select a conversation</p>
            <p className="mt-1 text-xs text-slate-400">Choose a chat from the left to start messaging.</p>
          </div>
        </div>
      )}
    </div>
  );
}
