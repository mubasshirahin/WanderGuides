import { useCallback, useEffect, useState } from 'react';
import {
  Search, MapPin, Star, X, Filter, Loader2, Eye, Clock,
  CalendarDays, CheckCircle, AlertCircle, Gavel, DollarSign, Coins, Mail, Phone, MessageCircle, Heart,
  Sparkles, BadgeCheck, SlidersHorizontal, ArrowRight, RefreshCw, Globe, Languages, ShieldCheck, Users,
  Send, PenLine
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/demoAuth.js';
import { startConversation } from '../lib/chat.js';
import SmartImage from '../components/SmartImage.jsx';

const currency = (n) =>
  n == null || Number.isNaN(Number(n)) ? '—' : `\u09F3${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// ─── Reusable modal overlay ───────────────────────────────────────────
function Modal({ onClose, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-7`}
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/[0.06] p-1.5 text-slate-400 transition-all hover:bg-white/[0.12] hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function Stars({ rating, reviews }) {
  const r = Number(rating || 0);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1">
      <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" />
      <span className="text-xs font-extrabold text-white">{r.toFixed(1)}</span>
      {reviews != null && <span className="text-[11px] text-slate-500">({reviews})</span>}
    </span>
  );
}

function Avatar({ src, name, className = 'h-12 w-12' }) {
  return (
    <SmartImage
      src={src}
      name={name}
      className={className}
      rounded="rounded-2xl"
      imgClassName="ring-2 ring-brand-400/50 shadow-lg shadow-brand-500/20"
    />
  );
}

export default function ExplorePage({ role }) {
  const navigate = useNavigate();
  const [guides, setGuides] = useState([]);
  const [savedGuides, setSavedGuides] = useState([]);
  const [showingSavedGuides, setShowingSavedGuides] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [location, setLocation] = useState('');
  const [keyword, setKeyword] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [sortBy, setSortBy] = useState('rating');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterOpen, setFilterOpen] = useState(false); // mobile drawer
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);      // guide detail
  const [bookGuide, setBookGuide] = useState(null);    // direct book modal
  const [bidGuide, setBidGuide] = useState(null);      // bid modal

  const [bookForm, setBookForm] = useState({ guideId: '', startDate: '', endDate: '', groupSize: 1, notes: '' });
  const [bidForm, setBidForm] = useState({ guideId: '', offeredPrice: '', startDate: '', endDate: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  // Guide open-review form (tourist only, no tour needed — View te giye je keo dite parbe)
  const [guideRating, setGuideRating] = useState(0);
  const [guideHoverRating, setGuideHoverRating] = useState(0);
  const [guideComment, setGuideComment] = useState('');
  const [guideReviewBusy, setGuideReviewBusy] = useState(false);
  const [guideReviewError, setGuideReviewError] = useState(null);

  useEffect(() => {
    if (role !== 'tourist') return;
    authFetch('/api/tourist/saved-guides').then((response) => response.json()).then((json) => {
      if (json.ok) setSavedGuides(json.guides || []);
    }).catch(() => {});
  }, [role]);

  const flash = useCallback((message, kind = 'success') => {
    setNotice({ message, kind });
    setTimeout(() => setNotice(null), 3500);
  }, []);

  const fetchGuides = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (location) params.set('location', location);
      if (keyword) params.set('keyword', keyword);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minRating && Number(minRating) > 0) params.set('minRating', minRating);
      params.set('sort', sortBy);
      params.set('page', opts.page || page);
      params.set('pageSize', String(pageSize));

      console.log('[Explore] Fetching:', params.toString());
      const res = await fetch(`/api/guides/explore?${params}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load guides');
      setGuides(data.guides || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('[Explore] Error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, keyword, minPrice, maxPrice, minRating, sortBy]);

  // Debounce keyword; other filters trigger immediately.
  useEffect(() => {
    const t = setTimeout(() => fetchGuides({ page: 1 }), keyword ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchGuides, keyword, location, minPrice, maxPrice, minRating, sortBy]);

  const openDetail = async (guide) => {
    setGuideRating(0);
    setGuideHoverRating(0);
    setGuideComment('');
    setGuideReviewError(null);
    try {
      const res = await fetch(`/api/guides/${guide.Id}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load guide');
      setSelected(data.guide);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  // Open review: tour complete lage na, View thekei tourist rating dite parbe
  const submitGuideReview = async (e) => {
    e.preventDefault();
    if (!selected || guideRating === 0) return;
    if (role !== 'tourist') return flash('Sign in as a tourist to review a guide.', 'error');
    const targetGuideId = selected.UserID || selected.Id;
    if (!targetGuideId) {
      setGuideReviewError('This guide has no linked account yet.');
      return;
    }
    setGuideReviewBusy(true);
    setGuideReviewError(null);
    const payload = {
      guideId: targetGuideId,
      rating: guideRating,
      comment: guideComment.trim() || null,
    };
    // Primary + alias endpoints (stale server / proxy safe)
    const endpoints = [
      '/api/reviews/guide',
      '/api/guides/reviews',
      `/api/guides/${selected.Id}/reviews`,
    ];
    try {
      let lastError = null;
      let done = false;
      for (const url of endpoints) {
        try {
          const res = await authFetch(url, { method: 'POST', body: JSON.stringify(payload) });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) { done = true; break; }
          // 404 hole next alias try koro (stale bundle/server safe)
          if (res.status === 404) { lastError = new Error(data.message || `Route not found (${url})`); continue; }
          throw new Error(data.message || 'Failed to submit review');
        } catch (err) {
          // Network error holeo next endpoint try koro, seshe asol error dekhabo
          lastError = err;
          if (String(err.message || '').includes('Failed to fetch')) continue;
          if (String(err.message || '').includes('Route not found')) continue;
          throw err;
        }
      }
      if (!done) {
        const msg = String(lastError?.message || '');
        if (msg.includes('Route not found')) {
          throw new Error('Server purano code chalacche — server restart koro: npm --prefix server run dev');
        }
        throw lastError || new Error('Failed to submit review');
      }
      flash('Review submitted. Thank you!');
      setGuideRating(0);
      setGuideComment('');
      const refreshedId = selected.Id;
      // Modal refresh — openDetail vetore pending-booking fetch ar nai, tai loop hobe na
      try {
        const refresh = await fetch(`/api/guides/${refreshedId}`);
        const refreshJson = await refresh.json();
        if (refreshJson.ok) setSelected(refreshJson.guide);
      } catch {
        /* refresh fail korleo form clear thakbe */
      }
    } catch (err) {
      setGuideReviewError(err.message);
    } finally {
      setGuideReviewBusy(false);
    }
  };

  const requireTourist = () => role === 'tourist';

  const openBook = (guide) => {
    if (!requireTourist()) return flash('Sign in as a tourist to book', 'error');
    setBookGuide(guide);
    setBookForm((f) => ({ ...f, guideId: guide.UserID || guide.Id }));
  };

  const openBid = (guide) => {
    if (!requireTourist()) return flash('Sign in as a tourist to place a bid', 'error');
    setBidGuide(guide);
    setBidForm((f) => ({ ...f, guideId: guide.UserID || guide.Id }));
  };

  const messageGuide = async (guide) => {
    if (role !== 'tourist') return flash('Sign in as a tourist to message a guide.', 'error');
    if (!guide?.UserID) return flash('This guide has not linked a messaging account yet.', 'error');
    try {
      const conversation = await startConversation(guide.UserID);
      navigate(`/messages?conversation=${conversation.conversationId}`);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const toggleSavedGuide = async (guide) => {
    if (role !== 'tourist') return flash('Sign in as a tourist to save guides.', 'error');
    const guideId = Number(guide.UserID || guide.Id);
    const isSaved = savedGuides.some((item) => Number(item.UserID) === guideId);
    try {
      const response = await authFetch(`/api/tourist/saved-guides/${guideId}`, { method: isSaved ? 'DELETE' : 'PUT' });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'Could not update saved guides');
      setSavedGuides((items) => isSaved ? items.filter((item) => Number(item.UserID) !== guideId) : [...items, guide]);
      flash(isSaved ? 'Guide removed from saved list.' : 'Guide saved.');
    } catch (err) { flash(err.message, 'error'); }
  };

  const toggleSavedList = async () => {
    if (role !== 'tourist') return flash('Sign in as a tourist to view saved guides.', 'error');
    if (showingSavedGuides) { setShowingSavedGuides(false); return; }
    try {
      const response = await authFetch('/api/tourist/saved-guides');
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'Could not load saved guides');
      setSavedGuides(result.guides || []);
      setShowingSavedGuides(true);
    } catch (err) { flash(err.message, 'error'); }
  };

  const clearFilters = () => {
    setLocation(''); setKeyword(''); setMinPrice(''); setMaxPrice(''); setMinRating('0'); setSortBy('rating'); setPage(1);
  };

  const activeFilterCount = [location, minPrice, maxPrice, minRating !== '0' ? minRating : ''].filter(Boolean).length;

  const submitBook = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/bookings/direct', {
        method: 'POST',
        body: JSON.stringify(bookForm),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Booking failed');
      flash('Direct booking placed! Pending confirmation.');
      setBookGuide(null);
      setBookForm({ guideId: '', startDate: '', endDate: '', groupSize: 1, notes: '' });
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitBid = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/bids/create', {
        method: 'POST',
        body: JSON.stringify(bidForm),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Bid failed');
      flash(bidGuide ? `Bid of ${currency(bidForm.offeredPrice)} sent to ${bidGuide.FullName}` : 'Bid placed successfully!');
      setBidGuide(null);
      setBidForm({ guideId: '', offeredPrice: '', startDate: '', endDate: '', message: '' });
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, setter) => (e) => setter((f) => ({ ...f, [key]: e.target.value }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visibleGuides = showingSavedGuides ? savedGuides : guides;

  return (
    <div className="space-y-6">
      {/* ─── Hero ─── */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-300">
              <Sparkles className="h-3 w-3" /> Explore & Find
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-slate-300">
              <ShieldCheck className="h-3 w-3 text-emerald-300" /> Verified local guides
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                Find your <span className="text-gradient">local expert</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-[15px]">
                Browse verified guides, compare daily & hourly rates, then book directly or negotiate with your own offer.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-ink-950/60 px-3.5 py-2 text-xs font-bold text-slate-200">
                <Users className="h-3.5 w-3.5 text-brand-300" /> {total} guides
              </span>
              {role === 'tourist' && (
                <button type="button" onClick={toggleSavedList} className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all ${showingSavedGuides ? 'border-rose-400/40 bg-rose-500/15 text-rose-200' : 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:text-white'}`}>
                  <Heart className={`h-3.5 w-3.5 ${showingSavedGuides ? 'fill-rose-400 text-rose-400' : 'text-rose-300'}`} />
                  {showingSavedGuides ? `Saved (${savedGuides.length})` : `Saved (${savedGuides.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {notice && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm backdrop-blur-xl ${
            notice.kind === 'error'
              ? 'border-rose-400/25 bg-gradient-to-r from-rose-500/15 to-transparent text-rose-100'
              : 'border-emerald-400/25 bg-gradient-to-r from-emerald-500/15 to-transparent text-emerald-100'
          }`}
          role="status"
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${notice.kind === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {notice.kind === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </span>
          <p className="pt-1.5 leading-relaxed">{notice.message}</p>
        </div>
      )}

      {/* ─── Search toolbar ─── */}
      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by specialty, language, or guide name…"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="w-full rounded-2xl border border-white/10 bg-ink-950/60 py-3 pl-10 pr-10 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400/60 focus:ring-4 focus:ring-brand-500/15"
          />
          {keyword && (
            <button onClick={() => { setKeyword(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:text-white" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setFilterOpen(true)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-200 transition-all hover:bg-white/[0.1] hover:text-white lg:hidden"
          >
            <Filter className="h-4 w-4" /> Filters
            {activeFilterCount > 0 && <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">{activeFilterCount}</span>}
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort guides"
            className="flex-1 rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition-all focus:border-brand-400/60 sm:flex-none"
          >
            <option value="rating">Top rated</option>
            <option value="reviews">Most reviews</option>
            <option value="price_asc">Price: low → high</option>
            <option value="price_desc">Price: high → low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* ─── Layout: sidebar + grid ─── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
        {/* Filters sidebar (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent" />
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
              <p className="flex items-center gap-2 font-display text-sm font-bold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-lg shadow-brand-500/25">
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                Filters
                {activeFilterCount > 0 && <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-extrabold text-brand-300">{activeFilterCount}</span>}
              </p>
              <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-white">
                <RefreshCw className="h-3 w-3" /> Reset
              </button>
            </div>
            <div className="space-y-5 p-5">
              <FilterPanel
                location={location} setLocation={setLocation}
                minPrice={minPrice} setMinPrice={setMinPrice}
                maxPrice={maxPrice} setMaxPrice={setMaxPrice}
                minRating={minRating} setMinRating={setMinRating}
                sortBy={sortBy} setSortBy={setSortBy}
              />
            </div>
          </div>
        </aside>

        {/* Guide grid */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[13px] text-slate-400">
              {loading ? 'Searching guides…' : showingSavedGuides
                ? <span><strong className="font-bold text-white">{savedGuides.length}</strong> saved guides</span>
                : <span><strong className="font-bold text-white">{total}</strong> guide{total === 1 ? '' : 's'} found</span>}
            </p>
            {activeFilterCount > 0 && !showingSavedGuides && (
              <button onClick={clearFilters} className="text-xs font-bold text-brand-300 hover:text-brand-200">Clear all ×</button>
            )}
          </div>

          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-start justify-between">
                    <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/10" />
                    <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
                  </div>
                  <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-white/5" />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
                    <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center backdrop-blur-xl">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
                <AlertCircle className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-rose-200">{error}</p>
              <button onClick={() => fetchGuides({ page: 1 })} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.14]">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          {!loading && !error && visibleGuides.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-16 text-center backdrop-blur-xl">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-500">
                <Search className="h-6 w-6" />
              </span>
              <p className="mt-4 font-display text-sm font-bold text-white">{showingSavedGuides ? 'No saved guides yet' : 'No guides match your filters'}</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">{showingSavedGuides ? 'Tap the heart on any guide to save them here.' : 'Try widening the search or clearing filters.'}</p>
              {!showingSavedGuides && (
                <button onClick={clearFilters} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] px-4 py-2 text-xs font-bold text-brand-300 hover:bg-white/[0.12] hover:text-white">
                  Clear filters <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {!loading && !error && visibleGuides.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleGuides.map((g) => (
                  <GuideCard
                    key={g.Id}
                    guide={g}
                    onView={openDetail}
                    onBook={openBook}
                    onBid={openBid}
                    isTourist={role === 'tourist'}
                    isSaved={savedGuides.some((item) => Number(item.UserID) === Number(g.UserID || g.Id))}
                    onSave={toggleSavedGuide}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && !showingSavedGuides && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); fetchGuides({ page: page - 1 }); }}
                    disabled={page <= 1}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-[13px] font-bold text-slate-200 transition-all hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-2.5 font-mono text-xs text-slate-300">Page {page} / {totalPages}</span>
                  <button
                    onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); fetchGuides({ page: page + 1 }); }}
                    disabled={page >= totalPages}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-[13px] font-bold text-slate-200 transition-all hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-950 p-6">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/15" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-white">
                <SlidersHorizontal className="h-4 w-4 text-brand-300" /> Filters
              </h3>
              <button onClick={() => setFilterOpen(false)} className="rounded-xl border border-white/10 bg-white/[0.06] p-1.5 text-slate-400 hover:text-white" aria-label="Close filters">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5">
              <FilterPanel
                location={location} setLocation={setLocation}
                minPrice={minPrice} setMinPrice={setMinPrice}
                maxPrice={maxPrice} setMaxPrice={setMaxPrice}
                minRating={minRating} setMinRating={setMinRating}
                sortBy={sortBy} setSortBy={setSortBy}
              />
            </div>
            <div className="mt-5 flex gap-2.5">
              <button onClick={clearFilters} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-300">Reset</button>
              <button
                onClick={() => setFilterOpen(false)}
                className="btn-sheen flex-1 rounded-2xl bg-gradient-to-r from-brand-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25"
              >
                Show {total} guides
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide detail modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)} maxWidth="max-w-2xl">
          <div className="flex flex-col gap-4 pr-8 sm:flex-row sm:items-center">
            <Avatar src={selected.AvatarUrl} name={selected.FullName} className="h-20 w-20" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-extrabold text-white">{selected.FullName}</h2>
                {selected.IsVerified && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" />Verified</span>}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-brand-400" />
                {selected.City || 'Various cities'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Stars rating={selected.Rating} reviews={selected.TotalReviews || 0} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950/60 p-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/50 to-transparent" />
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Clock className="h-3.5 w-3.5 text-brand-400" /> Hourly rate
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-white">{currency(selected.HourlyRate)}<span className="text-sm font-medium text-slate-500">/hr</span></p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950/60 p-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <CalendarDays className="h-3.5 w-3.5 text-teal-300" /> Daily rate
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-white">{currency(selected.DailyRate)}<span className="text-sm font-medium text-slate-500">/day</span></p>
            </div>
          </div>

          {/* Contact Info */}
          {(selected.Email || selected.Phone) && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact information</p>
              <div className="space-y-1.5">
                {selected.Email && (
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.07] text-brand-300"><Mail className="h-3.5 w-3.5" /></span> {selected.Email}
                  </p>
                )}
                {selected.Phone && (
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.07] text-brand-300"><Phone className="h-3.5 w-3.5" /></span> {selected.Phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {selected.Bio && (
            <div className="mt-5">
              <h4 className="mb-1.5 font-display text-sm font-bold text-white">About</h4>
              <p className="text-sm leading-relaxed text-slate-300">{selected.Bio}</p>
            </div>
          )}

          {(selected.Specialties || selected.Languages) && (
            <div className="mt-5">
              <h4 className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-white"><Sparkles className="h-3.5 w-3.5 text-brand-300" /> Skills & languages</h4>
              <div className="flex flex-wrap gap-1.5">
                {selected.Specialties?.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                  <span key={i} className="rounded-lg border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-200">
                    {s}
                  </span>
                ))}
                {selected.Languages?.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                  <span key={`lang-${i}`} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-300">
                    <Languages className="h-3 w-3 text-slate-500" />{s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tours */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-400" />
              <h4 className="font-display text-[13px] font-bold text-white">
                {selected.totalCompleted || 0} tour{(selected.totalCompleted || 0) !== 1 ? 's' : ''} completed
              </h4>
            </div>
            {selected.recentBookings && selected.recentBookings.length > 0 ? (
              <div className="space-y-2">
                {selected.recentBookings.map((b) => (
                  <div key={b.Id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink-950/60 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-white">{b.TourName || 'Tour'}</p>
                      <p className="text-[11px] text-slate-500">
                        {b.TouristName} · {new Date(b.StartDate).toLocaleDateString()} – {new Date(b.EndDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="whitespace-nowrap font-display text-[13px] font-extrabold text-brand-300">{currency(b.FinalPrice || b.TotalAmount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-slate-500">No completed tours yet.</p>
            )}
          </div>

          {role === 'tourist' && (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-4">
              <h4 className="flex items-center gap-2 font-display text-sm font-bold text-white">
                <PenLine className="h-4 w-4 text-amber-300" /> Rate this guide
              </h4>
              <p className="mt-1 text-[12px] text-slate-400">
                No tour needed — View te giye je keo rating/review dite parbe. Only tourists can review.
              </p>
              {!selected.UserID ? (
                <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-ink-950/50 p-3 text-[13px] text-slate-400">
                  This guide has no linked account yet, so reviews are disabled for this listing.
                </p>
              ) : (
                <form onSubmit={submitGuideReview} className="mt-3 space-y-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setGuideHoverRating(s)}
                        onMouseLeave={() => setGuideHoverRating(0)}
                        onClick={() => setGuideRating(s)}
                        className="transition-transform hover:scale-110"
                        aria-label={`${s} star${s > 1 ? 's' : ''}`}
                      >
                        <Star className={`h-7 w-7 transition-colors ${
                          s <= (guideHoverRating || guideRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-600'
                        }`} />
                      </button>
                    ))}
                  </div>
                  {guideRating > 0 && (
                    <p className="text-xs text-slate-400">
                      {guideRating === 1 && 'Poor'}
                      {guideRating === 2 && 'Fair'}
                      {guideRating === 3 && 'Good'}
                      {guideRating === 4 && 'Very Good'}
                      {guideRating === 5 && 'Excellent'}
                    </p>
                  )}
                  <textarea
                    rows={3}
                    value={guideComment}
                    onChange={(e) => setGuideComment(e.target.value)}
                    placeholder="Share your experience with this guide (optional)..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-400/60"
                  />
                  {guideReviewError && <p role="alert" className="text-xs text-red-300">{guideReviewError}</p>}
                  <button
                    type="submit"
                    disabled={guideReviewBusy || guideRating === 0}
                    className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/25 disabled:opacity-50"
                  >
                    {guideReviewBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {guideReviewBusy ? 'Submitting…' : 'Submit review'}
                  </button>
                </form>
              )}
            </div>
          )}

          <h4 className="mb-3 mt-6 font-display text-sm font-bold text-white">
            Customer reviews ({selected.reviews?.length || 0})
          </h4>
          {selected.reviews && selected.reviews.length > 0 ? (
            <div className="space-y-3">
              {selected.reviews.map((r) => (
                <div key={r.Id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={r.TouristAvatarUrl} name={r.TouristName} className="h-9 w-9" />
                      <span className="text-[13px] font-bold text-white">{r.TouristName}</span>
                    </div>
                    <Stars rating={r.Rating} />
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-slate-300">{r.Comment}</p>
                  {r.GuideResponse && <div className="mt-3 rounded-xl border-l-2 border-brand-400/60 bg-brand-500/[0.07] px-3 py-2.5"><p className="text-[11px] font-bold uppercase tracking-wider text-brand-300">Guide response</p><p className="mt-1 whitespace-pre-wrap text-[13px] text-slate-300">{r.GuideResponse}</p></div>}
                  <p className="mt-2 text-[11px] text-slate-600">{new Date(r.CreatedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-[13px] text-slate-500">No reviews yet.</p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              onClick={() => messageGuide(selected)}
              disabled={!selected.UserID}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] py-3 text-[13px] font-bold text-slate-200 transition-all hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4 text-sky-300" /> Message
            </button>
            <button
              onClick={() => openBook({ Id: selected.Id, UserID: selected.UserID, FullName: selected.FullName })}
              className="btn-sheen rounded-2xl bg-gradient-to-r from-brand-500 to-teal-500 py-3 text-[13px] font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5"
            >
              Direct Book
            </button>
            <button
              onClick={() => openBid({ Id: selected.Id, UserID: selected.UserID, FullName: selected.FullName })}
              className="rounded-2xl border border-indigo-400/30 bg-indigo-500/15 py-3 text-[13px] font-bold text-indigo-200 transition-all hover:bg-indigo-500/25"
            >
              Place a Bid
            </button>
          </div>

          </Modal>
      )}

      {/* Direct book modal */}
      {bookGuide && (
        <Modal onClose={() => setBookGuide(null)}>
          <h3 className="pr-8 font-display text-lg font-extrabold text-white">Direct Book · {bookGuide.FullName}</h3>
          <p className="mt-1 text-[13px] text-slate-400">
            Reserve at the listed rate. Daily rate: <strong className="text-brand-300">{currency(bookGuide.DailyRate)}</strong>.
          </p>
          <form onSubmit={submitBook} className="mt-5 space-y-4">
            <div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Group size</label><input type="number" min="1" max="50" required value={bookForm.groupSize} onChange={field('groupSize', setBookForm)} className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-400/60 focus:ring-4 focus:ring-brand-500/15" /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Start date</label>
                <input
                  type="date" required
                  value={bookForm.startDate}
                  onChange={field('startDate', setBookForm)}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-400/60"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">End date</label>
                <input
                  type="date" required
                  value={bookForm.endDate}
                  onChange={field('endDate', setBookForm)}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-400/60"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes (optional)</label>
              <textarea
                rows="3"
                value={bookForm.notes}
                onChange={field('notes', setBookForm)}
                placeholder="Pickup point, interests, group details…"
                className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-brand-400/60"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-sheen w-full rounded-2xl bg-gradient-to-r from-brand-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 disabled:opacity-60"
            >
              {submitting ? 'Placing booking…' : 'Confirm Direct Booking'}
            </button>
          </form>
        </Modal>
      )}

      {/* Bid modal */}
      {bidGuide && (
        <Modal onClose={() => setBidGuide(null)}>
          <h3 className="pr-8 font-display text-lg font-extrabold text-white">Bid for {bidGuide.FullName}</h3>
          <p className="mt-1 text-[13px] text-slate-400">
            Listed daily rate: <strong className="text-brand-300">{currency(bidGuide.DailyRate)}</strong>. Offer your best price.
          </p>
          <form onSubmit={submitBid} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Your offer (BDT)</label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="number" min="0" step="0.01" required
                  value={bidForm.offeredPrice}
                  onChange={field('offeredPrice', setBidForm)}
                  placeholder="e.g. 80"
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2.5 pl-10 pr-3.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Start date</label>
                <input
                  type="date" required
                  value={bidForm.startDate}
                  onChange={field('startDate', setBidForm)}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400/60"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">End date</label>
                <input
                  type="date" required
                  value={bidForm.endDate}
                  onChange={field('endDate', setBidForm)}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-400/60"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Message to the guide</label>
              <textarea
                rows="3"
                value={bidForm.message}
                onChange={field('message', setBidForm)}
                placeholder="Tell the guide about your trip, group size, or what you'd like to see..."
                className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/60"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60"
            >
              {submitting ? 'Sending offer…' : 'Submit Offer'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Guide card ───────────────────────────────────────────────────────
function GuideCard({ guide: g, onView, onBook, onBid, isTourist, isSaved, onSave }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-brand-500/10">
      <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      {/* Cover */}
      <div className="relative h-20 bg-gradient-to-br from-brand-600/40 via-teal-600/25 to-ink-900">
        <div aria-hidden="true" className="absolute inset-0 bg-grid-dark opacity-50" />
        <button type="button" onClick={() => onSave(g)} aria-label={isSaved ? 'Remove saved guide' : 'Save guide'} className={`absolute right-3 top-3 rounded-xl border p-2 backdrop-blur transition-all ${isSaved ? 'border-rose-400/40 bg-rose-500/20 text-rose-300' : 'border-white/15 bg-black/30 text-slate-300 hover:text-rose-300'}`}>
          <Heart className={`h-4 w-4 ${isSaved ? 'fill-rose-400 text-rose-400' : ''}`} />
        </button>
        {g.IsVerified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur">
            <BadgeCheck className="h-3 w-3" /> Verified
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col p-5 pt-0">
        <div className="-mt-7 mb-3 flex items-end justify-between">
          <Avatar src={g.AvatarUrl} name={g.FullName} className="h-14 w-14" />
          <Stars rating={g.Rating} reviews={g.TotalReviews} />
        </div>

        <h3 className="truncate font-display text-[17px] font-extrabold text-white">{g.FullName}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-400" />
          <span className="truncate">{g.City || 'Various cities'}</span>
        </p>

        {g.Bio && <p className="mt-2 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-slate-400">{g.Bio}</p>}

        <div className="mt-3 flex min-h-7 flex-wrap gap-1.5">
          {g.Specialties?.split(',').slice(0, 3).map((s) => s.trim()).filter(Boolean).map((s, i) => (
            <span key={i} className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-2 py-1 text-[11px] font-bold text-brand-200">{s}</span>
          ))}
          {g.Languages && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] font-semibold text-slate-400">
              <Globe className="h-3 w-3" />{(g.Languages || '').split(',').slice(0, 2).join(', ')}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-white/5 bg-ink-950/60 p-3">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Clock className="h-3 w-3 text-brand-400" />Hourly
            </p>
            <p className="mt-1 truncate font-display text-[15px] font-extrabold text-white">{currency(g.HourlyRate)}<span className="text-[11px] font-medium text-slate-500">/hr</span></p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-ink-950/60 p-3">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <CalendarDays className="h-3 w-3 text-teal-300" />Daily
            </p>
            <p className="mt-1 truncate font-display text-[15px] font-extrabold text-white">{currency(g.DailyRate)}<span className="text-[11px] font-medium text-slate-500">/day</span></p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => onView(g)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-xs font-bold text-slate-200 transition-all hover:bg-white/[0.12] hover:text-white"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </button>
          <button
            onClick={() => onBook(g)}
            title={isTourist ? 'Book now' : 'Sign in as tourist'}
            className="btn-sheen inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5"
          >
            <Coins className="h-3.5 w-3.5" /> Book
          </button>
          <button
            onClick={() => onBid(g)}
            title={isTourist ? 'Place a bid' : 'Sign in as tourist'}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-400/30 bg-indigo-500/15 py-2.5 text-xs font-bold text-indigo-200 transition-all hover:bg-indigo-500/25"
          >
            <Gavel className="h-3.5 w-3.5" /> Bid
          </button>
        </div>
      </div>
      <span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-gradient-to-r from-brand-500 to-teal-500 transition-transform duration-500 group-hover:scale-x-100" />
    </article>
  );
}

// ─── Shared filter panel (desktop sidebar + mobile drawer) ──────────
function FilterPanel({ location, setLocation, minPrice, setMinPrice, maxPrice, setMaxPrice, minRating, setMinRating, sortBy, setSortBy }) {
  const inputCls = 'w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-brand-400/60 focus:ring-4 focus:ring-brand-500/15';
  const labelCls = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
  return (
    <>
      <div>
        <label className={labelCls}>Sort by</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={inputCls}
        >
          <option value="rating">Top rated</option>
          <option value="reviews">Most reviews</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      <div>
        <label className={labelCls}>Location / city</label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="e.g. Cox's Bazar, Sylhet…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Daily price (৳)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" min="0" placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={inputCls}
          />
          <input
            type="number" min="0" placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Minimum rating</label>
        <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-ink-950/60 p-1.5">
          {[
            { v: '0', label: 'Any' },
            { v: '3', label: '3+' },
            { v: '4', label: '4+' },
            { v: '4.5', label: '4.5+' },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setMinRating(o.v)}
              className={`rounded-xl px-2 py-2 text-xs font-bold transition-all ${String(minRating) === o.v ? 'bg-gradient-to-r from-brand-500 to-teal-500 text-white shadow-lg shadow-brand-500/25' : 'text-slate-400 hover:text-white'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
