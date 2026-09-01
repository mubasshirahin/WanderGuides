import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  ClipboardList, Plus, MapPin, Calendar, Users, DollarSign,
  Loader2, Search, X, Send,
  MessageCircle, CheckCircle2, XCircle, Eye, Clock, BadgeCheck,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch, getStoredUser, getToken } from '../lib/demoAuth.js';

const API = '/api/custom-tours';

/* ─── Helpers ─────────────────────────────────────────────── */

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusColor(status) {
  switch (status) {
    case 'open': return 'bg-emerald-500/15 text-emerald-400';
    case 'fulfilled': return 'bg-blue-500/15 text-blue-400';
    case 'cancelled': return 'bg-red-500/15 text-red-400';
    case 'pending': return 'bg-amber-500/15 text-amber-400';
    case 'accepted': return 'bg-emerald-500/15 text-emerald-400';
    case 'rejected': return 'bg-red-500/15 text-red-400';
    default: return 'bg-white/10 text-slate-400';
  }
}

/* ─── Badge ───────────────────────────────────────────────── */

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColor(status)}`}>
      {status === 'accepted' && <BadgeCheck className="h-3 w-3" />}
      {status === 'open' && <Clock className="h-3 w-3" />}
      {status}
    </span>
  );
}

/* ─── Toast Notifications ─────────────────────────────────── */

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 max-w-sm">
      {toasts.map((t) => (
        <div key={t.id}
          className={`rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-8 fade-in duration-300 ${
            t.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
            : t.type === 'error' ? 'border-red-500/30 bg-red-500/15 text-red-300'
            : 'border-brand-500/30 bg-brand-500/15 text-brand-300'
          }`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm font-medium">{t.message}</div>
            <button onClick={() => onDismiss(t.id)} className="shrink-0 p-0.5 hover:opacity-70 transition-opacity">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Modal Shell ─────────────────────────────────────────── */

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-ink-800 p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Drawer (for viewing bids) ───────────────────────────── */

function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-ink-800 border-l border-white/10 shadow-2xl h-full overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-ink-800 p-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ─── Socket Hook ─────────────────────────────────────────── */

function useCustomTourSocket(addToast) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[socket] Custom tour notifications connected');
    });

    socket.on('custom_tour:new', (data) => {
      addToast(`New tour request: "${data.request?.Title}"`, 'info');
    });

    socket.on('custom_tour:bid_received', (data) => {
      addToast(`${data.guideName} placed a bid on "${data.requestTitle}"`, 'success');
    });

    socket.on('custom_tour:bid_accepted', (data) => {
      addToast(`Your bid on "${data.requestTitle}" was accepted! 🎉`, 'success');
    });

    socket.on('custom_tour:bid_rejected', (data) => {
      addToast(`Another bid was accepted for "${data.requestTitle}"`, 'info');
    });

    socket.on('custom_tour:bid_declined', (data) => {
      addToast(`Your bid on "${data.requestTitle}" was declined`, 'info');
    });

    socket.on('custom_tour:request_cancelled', (data) => {
      addToast(`Tour request "${data.requestTitle}" was cancelled`, 'info');
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] Connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addToast]);

  return socketRef;
}

/* ─── Create Request Form ─────────────────────────────────── */

function CreateRequestForm({ onCreated, onClose }) {
  const [form, setForm] = useState({
    title: '', destination: '', startDate: '', endDate: '',
    groupSize: 1, budget: '', description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authFetch(API, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          groupSize: Number(form.groupSize),
          budget: Number(form.budget),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to create request');
      onCreated(data.request);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
        <input name="title" value={form.title} onChange={handleChange} required maxLength={150}
          placeholder="e.g. 3-Day Cultural Heritage Tour"
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Destination</label>
        <input name="destination" value={form.destination} onChange={handleChange} required maxLength={100}
          placeholder="e.g. Kyoto, Japan"
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
          <input name="startDate" type="date" value={form.startDate} onChange={handleChange} required
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
          <input name="endDate" type="date" value={form.endDate} onChange={handleChange} required
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Group Size</label>
          <input name="groupSize" type="number" min={1} max={50} value={form.groupSize} onChange={handleChange} required
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Max Budget ($)</label>
          <input name="budget" type="number" min={0} step="0.01" value={form.budget} onChange={handleChange} required
            placeholder="500.00"
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Special Notes / Requirements</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={3} maxLength={4000}
          placeholder="Any dietary needs, accessibility requirements, interests..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15 resize-none" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Post Request
        </button>
      </div>
    </form>
  );
}

/* ─── Bid Form (Guide submits a bid) ──────────────────────── */

function BidForm({ requestId, budget, onBidCreated, onClose }) {
  const [offeredPrice, setOfferedPrice] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/${requestId}/bids`, {
        method: 'POST',
        body: JSON.stringify({
          offeredPrice: Number(offeredPrice),
          proposalMessage: proposalMessage || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to submit bid');
      onBidCreated(data.bid);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}
      <p className="text-sm text-slate-400">
        Tourist budget: <span className="font-semibold text-white">৳{Number(budget).toFixed(2)}</span>
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Your Offered Price ($)</label>
        <input type="number" min={0} step="0.01" value={offeredPrice} onChange={e => setOfferedPrice(e.target.value)} required
          placeholder="450.00"
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Proposal Message</label>
        <textarea value={proposalMessage} onChange={e => setProposalMessage(e.target.value)} rows={3} maxLength={4000}
          placeholder="Why should the tourist choose you? Describe your plan..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15 resize-none" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit Bid
        </button>
      </div>
    </form>
  );
}

/* ─── Tourist View: My Requests + Bids Drawer ─────────────── */

function TouristView({ addToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API}/my-requests`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load');
      setRequests(data.requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleCreated = (request) => {
    setRequests(prev => [request, ...prev]);
  };

  const openBidsDrawer = async (req) => {
    setSelectedRequest(req);
    setBidsLoading(true);
    setBids([]);
    try {
      const res = await authFetch(`${API}/${req.RequestID}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load bids');
      setBids(data.bids);
    } catch (err) {
      setBids([]);
    } finally {
      setBidsLoading(false);
    }
  };

  const handleAcceptBid = async (bid) => {
    if (!window.confirm(`Accept this bid for ৳${Number(bid.OfferedPrice).toFixed(2)} from ${bid.GuideName}?`)) return;
    try {
      const res = await authFetch(`${API}/bids/${bid.BidID}/accept`, { method: 'PUT' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to accept bid');
      fetchRequests();
      setSelectedRequest(null);
      addToast('Bid accepted! Booking created.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeclineBid = async (bid) => {
    if (!window.confirm(`Decline bid from ${bid.GuideName}?`)) return;
    try {
      const res = await authFetch(`${API}/bids/${bid.BidID}/decline`, { method: 'PUT' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to decline bid');
      // Update the bid in the local list
      setBids(prev => prev.map(b => b.BidID === bid.BidID ? { ...b, Status: 'rejected' } : b));
      addToast('Bid declined.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCancelRequest = async (req) => {
    if (!window.confirm(`Cancel "${req.Title}"? All pending bids will be rejected.`)) return;
    try {
      const res = await authFetch(`${API}/${req.RequestID}/cancel`, { method: 'PUT' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to cancel request');
      fetchRequests();
      addToast('Request cancelled.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleMessageGuide = () => {
    navigate('/messages');
  };

  return (
    <div>
      {/* Create Button */}
      <div className="flex justify-end mb-6">
        <button onClick={() => setShowCreate(true)}
          className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5">
          <Plus className="h-4 w-4" />
          Post a Tour Request
        </button>
      </div>

      {/* Loading / Error / Empty */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-center">{error}</div>
      )}
      {!loading && !error && requests.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No Tour Requests Yet</h3>
          <p className="text-sm text-slate-400">Post your first custom tour request and let guides compete for your business.</p>
        </div>
      )}

      {/* Request Cards */}
      {!loading && !error && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.RequestID}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-white truncate">{req.Title}</h4>
                    <StatusBadge status={req.Status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-brand-400" />
                      {req.Destination}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-brand-400" />
                      {formatDate(req.StartDate)} – {formatDate(req.EndDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-brand-400" />
                      {req.GroupSize} {req.GroupSize === 1 ? 'person' : 'people'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-brand-400" />
                      ৳{Number(req.Budget).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openBidsDrawer(req)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/[0.1] transition-colors whitespace-nowrap">
                    <Eye className="h-4 w-4" />
                    View Bids
                    {req.TotalBids > 0 && (
                      <span className="ml-1 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
                        {req.TotalBids}
                      </span>
                    )}
                  </button>
                  {req.Status === 'open' && (
                    <button onClick={() => handleCancelRequest(req)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Post a Tour Request">
        <CreateRequestForm onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      </Modal>

      {/* Bids Drawer */}
      <Drawer open={!!selectedRequest} onClose={() => setSelectedRequest(null)}
        title={selectedRequest ? `Bids on "${selectedRequest.Title}"` : 'Bids'}>
        {bidsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}
        {!bidsLoading && bids.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <p className="text-slate-400">No bids yet. Guides will see your request and place offers.</p>
          </div>
        )}
        {!bidsLoading && bids.length > 0 && (
          <div className="space-y-4">
            {bids.map((bid) => (
              <div key={bid.BidID}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {bid.GuideAvatar ? (
                      <img src={bid.GuideAvatar} alt={bid.GuideName} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      (bid.GuideName || 'G')[0]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{bid.GuideName}</span>
                      <StatusBadge status={bid.Status} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {bid.GuideCity && <span>{bid.GuideCity} · </span>}
                      {bid.GuideSpecialties && <span>{bid.GuideSpecialties} · </span>}
                      ★ {Number(bid.GuideRating).toFixed(1)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-brand-400">৳{Number(bid.OfferedPrice).toFixed(2)}</p>
                  </div>
                </div>
                {bid.ProposalMessage && (
                  <p className="text-sm text-slate-300 mb-3 pl-13">{bid.ProposalMessage}</p>
                )}
                {bid.Status === 'pending' && (
                  <div className="flex gap-2 pl-13">
                    <button onClick={() => handleAcceptBid(bid)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accept Bid
                    </button>
                    <button onClick={() => handleDeclineBid(bid)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-colors">
                      <XCircle className="h-3.5 w-3.5" />
                      Decline
                    </button>
                    <button onClick={handleMessageGuide}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.1] transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Message Guide
                    </button>
                  </div>
                )}
                {bid.Status === 'rejected' && (
                  <div className="pl-13">
                    <span className="text-xs text-red-400/70 italic">Declined</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ─── Guide View: Browse Requests + Bid ────────────────────── */

function GuideView({ addToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [destFilter, setDestFilter] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bidModal, setBidModal] = useState(null);
  const navigate = useNavigate();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (destFilter) params.set('destination', destFilter);
      if (budgetMin) params.set('minBudget', budgetMin);
      if (budgetMax) params.set('maxBudget', budgetMax);
      const res = await authFetch(`${API}?${params.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load');
      setRequests(data.requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [destFilter, budgetMin, budgetMax]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Listen for real-time new request events to refresh the list
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('custom_tour:new', () => {
      fetchRequests();
    });

    socket.on('custom_tour:request_cancelled', () => {
      fetchRequests();
    });

    return () => { socket.disconnect(); };
  }, [fetchRequests]);

  const handleBidCreated = () => {
    fetchRequests();
    setBidModal(null);
  };

  const handleAcceptBudget = async (req) => {
    if (!window.confirm(`Instantly bid at the tourist's budget of ৳${Number(req.Budget).toFixed(2)}?`)) return;
    try {
      const res = await authFetch(`${API}/${req.RequestID}/bids`, {
        method: 'POST',
        body: JSON.stringify({
          offeredPrice: Number(req.Budget),
          proposalMessage: `I accept your proposed budget of ৳${Number(req.Budget).toFixed(2)}. I am ready to provide an excellent tour experience!`,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to submit bid');
      fetchRequests();
      addToast('Bid submitted at tourist\'s budget!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleMessageTourist = () => {
    navigate('/messages');
  };

  const filtered = requests.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.Title + ' ' + r.Destination + ' ' + (r.Description || '')).toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search title, destination..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
        </div>
        <input type="text" placeholder="Destination filter" value={destFilter}
          onChange={e => setDestFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15 min-w-[160px]" />
        <input type="number" placeholder="Min budget" value={budgetMin} min={0}
          onChange={e => setBudgetMin(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15 w-28" />
        <input type="number" placeholder="Max budget" value={budgetMax} min={0}
          onChange={e => setBudgetMax(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15 w-28" />
      </div>

      {/* Loading / Error / Empty */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-center">{error}</div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No Open Requests Found</h3>
          <p className="text-sm text-slate-400">Check back later or adjust your filters.</p>
        </div>
      )}

      {/* Request Cards (Job Board) */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((req) => (
            <div key={req.RequestID}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h4 className="font-bold text-white text-sm leading-tight">{req.Title}</h4>
                <span className="shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-400">
                  ৳{Number(req.Budget).toFixed(0)}
                </span>
              </div>

              {/* Tourist info */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {req.TouristAvatar ? (
                    <img src={req.TouristAvatar} alt={req.TouristName} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    (req.TouristName || 'T')[0]
                  )}
                </div>
                <span className="text-xs text-slate-400">{req.TouristName}</span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm text-slate-400 mb-4 flex-1">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                  {req.Destination}
                </p>
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                  {formatDate(req.StartDate)} – {formatDate(req.EndDate)}
                </p>
                <p className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                  {req.GroupSize} {req.GroupSize === 1 ? 'person' : 'people'}
                </p>
                <p className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                  Budget: ৳{Number(req.Budget).toFixed(2)}
                </p>
              </div>

              {/* Description preview */}
              {req.Description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{req.Description}</p>
              )}

              {/* Bid count */}
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                <ClipboardList className="h-3.5 w-3.5" />
                {req.BidCount} {req.BidCount === 1 ? 'bid' : 'bids'} so far
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <button onClick={() => setBidModal(req)}
                  className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 transition-all duration-300 hover:-translate-y-0.5">
                  <Send className="h-3.5 w-3.5" />
                  Bid Now
                </button>
                <button onClick={() => handleAcceptBudget(req)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Accept Budget
                </button>
                <button onClick={handleMessageTourist}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.1] transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bid Modal */}
      {bidModal && (
        <Modal open={!!bidModal} onClose={() => setBidModal(null)} title={`Bid on "${bidModal.Title}"`}>
          <BidForm requestId={bidModal.RequestID} budget={bidModal.Budget}
            onBidCreated={handleBidCreated} onClose={() => setBidModal(null)} />
        </Modal>
      )}
    </div>
  );
}

/* ─── Main Page Component ─────────────────────────────────── */

export default function CustomTourPage({ role }) {
  const user = getStoredUser();
  const isGuide = role === 'guide' || user?.Role === 'guide';
  const toastsRef = useRef([]);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    const toast = { id, message, type };
    toastsRef.current = [...toastsRef.current, toast];
    setToasts([...toastsRef.current]);
    // Auto-dismiss after 5s
    setTimeout(() => {
      toastsRef.current = toastsRef.current.filter(t => t.id !== id);
      setToasts([...toastsRef.current]);
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    toastsRef.current = toastsRef.current.filter(t => t.id !== id);
    setToasts([...toastsRef.current]);
  }, []);

  // Socket.io connection for real-time notifications
  useCustomTourSocket(addToast);

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Custom Tour Requests"
        description={isGuide
          ? 'Browse open tour requests and place your best offer.'
          : 'Post your dream tour and let experienced guides compete for your business.'
        }
      />

      {isGuide ? <GuideView addToast={addToast} /> : <TouristView addToast={addToast} />}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
