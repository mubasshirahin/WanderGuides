import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Search, Send, MapPin, Calendar, Users, DollarSign,
  ClipboardList, X, AlertCircle, CheckCircle2, Eye,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch, getStoredUser } from '../lib/demoAuth.js';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Modal ──────────────────────────────────────────────── */

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

/* ─── Toast ──────────────────────────────────────────────── */

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

/* ─── Bid Form ───────────────────────────────────────────── */

function BidForm({ request, onBidCreated, onClose }) {
  const [offeredPrice, setOfferedPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/guide/custom-requests/${request.RequestID}/bid`, {
        method: 'POST',
        body: JSON.stringify({
          offeredPrice: Number(offeredPrice),
          message: message || undefined,
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
        Tourist budget: <span className="font-semibold text-white">${Number(request.Budget || 0).toFixed(2)}</span>
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Your Offered Price ($)</label>
        <div className="relative">
          <DollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="number" min={0} step="0.01" value={offeredPrice} onChange={e => setOfferedPrice(e.target.value)} required
            placeholder="450.00"
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Proposal Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} maxLength={4000}
          placeholder="Why should the tourist choose you? Describe your plan..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15 resize-none" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit Bid
        </button>
      </div>
    </form>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function GuideCustomRequestsPage() {
  const user = getStoredUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [bidModal, setBidModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = { current: 0 };

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current;
    const toast = { id, message, type };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (destFilter) params.set('destination', destFilter);
      const res = await authFetch(`/api/guide/custom-requests?${params.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load requests');
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [destFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleBidCreated = () => {
    fetchRequests();
    setBidModal(null);
    addToast('Bid submitted successfully!', 'success');
  };

  const filtered = requests.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.Title + ' ' + r.Destination + ' ' + (r.Description || '')).toLowerCase().includes(q);
  });

  const hasBid = (req) => {
    return req.HasBid || req.hasBid || req.AlreadyBid || false;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Custom Tour Requests"
        description="Browse open tour requests from tourists and place your best offer."
      />

      {/* Search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search title, destination..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15" />
        </div>
        <input type="text" placeholder="Filter by destination" value={destFilter}
          onChange={e => setDestFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15 min-w-[180px]" />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300 flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <ClipboardList className="mx-auto mb-4 h-10 w-10 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No Open Requests Found</h3>
          <p className="text-sm text-slate-400">Check back later or adjust your search filters.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((req) => (
            <div key={req.RequestID}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h4 className="font-bold text-white text-sm leading-tight">{req.Title}</h4>
                <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">
                  ${Number(req.Budget || 0).toFixed(0)}
                </span>
              </div>

              {/* Tourist info */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
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
                  Budget: ${Number(req.Budget || 0).toFixed(2)}
                </p>
              </div>

              {req.Description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{req.Description}</p>
              )}

              {/* Bid count */}
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                <ClipboardList className="h-3.5 w-3.5" />
                {req.BidCount || req.TotalBids || 0} {(req.BidCount || req.TotalBids || 0) === 1 ? 'bid' : 'bids'} so far
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-white/5">
                {hasBid(req) ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Already Bid
                  </div>
                ) : (
                  <button onClick={() => setBidModal(req)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 transition-all duration-300 hover:-translate-y-0.5">
                    <Send className="h-3.5 w-3.5" />
                    Place Bid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bid Modal */}
      {bidModal && (
        <Modal open={!!bidModal} onClose={() => setBidModal(null)} title={`Bid on "${bidModal.Title}"`}>
          <BidForm request={bidModal} onBidCreated={handleBidCreated} onClose={() => setBidModal(null)} />
        </Modal>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
