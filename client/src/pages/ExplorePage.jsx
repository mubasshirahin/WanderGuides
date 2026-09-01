import { useCallback, useEffect, useState } from 'react';
import {
  Search, MapPin, Star, X, Filter, Loader2, Eye, Clock,
  CalendarDays, CheckCircle, AlertCircle, Gavel, DollarSign, Coins
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch } from '../lib/demoAuth.js';

const currency = (n) =>
  n == null || Number.isNaN(Number(n)) ? '—' : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// ─── Reusable modal overlay ───────────────────────────────────────────
function Modal({ onClose, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-white/10 bg-ink-950 p-6 shadow-card-hover`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function Stars({ rating }) {
  const r = Number(rating || 0);
  return (
    <span className="flex items-center gap-1 text-accent-400">
      <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" />
      <span className="text-xs font-semibold text-slate-200">{r.toFixed(1)}</span>
    </span>
  );
}

function Avatar({ src, name, className = 'h-12 w-12' }) {
  return src ? (
    <img src={src} alt={name} className={`${className} rounded-full object-cover ring-2 ring-brand-500/40`} />
  ) : (
    <div className={`${className} flex items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-teal-700 text-lg font-bold text-white`}>
      {(name || 'G').charAt(0).toUpperCase()}
    </div>
  );
}

export default function ExplorePage({ role }) {
  const [guides, setGuides] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [location, setLocation] = useState('');
  const [keyword, setKeyword] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('0');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterOpen, setFilterOpen] = useState(false); // mobile drawer
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);      // guide detail
  const [bookGuide, setBookGuide] = useState(null);    // direct book modal
  const [bidGuide, setBidGuide] = useState(null);      // bid modal

  const [bookForm, setBookForm] = useState({ guideId: '', startDate: '', endDate: '', notes: '' });
  const [bidForm, setBidForm] = useState({ guideId: '', offeredPrice: '', startDate: '', endDate: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

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
      params.set('page', opts.page || page);
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/guides/explore?${params}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load guides');
      setGuides(data.guides || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, keyword, minPrice, maxPrice, minRating]);

  // Debounce keyword; filters trigger immediately.
  useEffect(() => {
    const t = setTimeout(() => fetchGuides({ page: 1 }), keyword ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchGuides, keyword]);

  const openDetail = async (guide) => {
    try {
      const res = await fetch(`/api/guides/${guide.Id}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load guide');
      setSelected(data.guide);
    } catch (e) {
      flash(e.message, 'error');
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
      setBookForm({ guideId: '', startDate: '', endDate: '', notes: '' });
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

  return (
    <div>
      <PageHeader
        eyebrow="Explore & Find"
        title="Explore & Find Guides"
        description="Browse verified local guides, compare daily & hourly rates, then book directly or negotiate with your own offer."
      />

      {notice && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            notice.kind === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
          role="status"
        >
          {notice.kind === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          {notice.message}
        </div>
      )}

      {/* Top bar: search + mobile filter toggle */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by specialty, language, or guide name..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.1]"
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Layout: sidebar (desktop) / grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Desktop filters */}
        <aside className="hidden space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:block">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Filters</h3>
          <FilterPanel
            location={location} setLocation={setLocation}
            minPrice={minPrice} setMinPrice={setMinPrice}
            maxPrice={maxPrice} setMaxPrice={setMaxPrice}
            minRating={minRating} setMinRating={setMinRating}
          />
        </aside>

        {/* Guide grid */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
            <span>{loading ? 'Searching…' : `${total} guide${total === 1 ? '' : 's'} found`}</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && guides.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
              <Search className="mx-auto mb-4 h-10 w-10 text-slate-500" />
              <p className="text-slate-400">No guides match your filters. Try widening the search.</p>
            </div>
          )}

          {!loading && !error && guides.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {guides.map((g) => (
                  <GuideCard
                    key={g.Id}
                    guide={g}
                    onView={openDetail}
                    onBook={openBook}
                    onBid={openBid}
                    isTourist={role === 'tourist'}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); fetchGuides({ page: page - 1 }); }}
                    disabled={page <= 1}
                    className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm text-slate-400">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); fetchGuides({ page: page + 1 }); }}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
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
          <div className="absolute inset-0 bg-black/60" onClick={() => setFilterOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-ink-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Filters</h3>
              <button onClick={() => setFilterOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-white" aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterPanel
              location={location} setLocation={setLocation}
              minPrice={minPrice} setMinPrice={setMinPrice}
              maxPrice={maxPrice} setMaxPrice={setMaxPrice}
              minRating={minRating} setMinRating={setMinRating}
            />
            <button
              onClick={() => setFilterOpen(false)}
              className="mt-5 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Guide detail modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)} maxWidth="max-w-2xl">
          <div className="flex items-center gap-4">
            <Avatar src={selected.AvatarUrl} name={selected.FullName} className="h-16 w-16" />
            <div>
              <h2 className="text-xl font-bold text-white">{selected.FullName}</h2>
              <p className="flex items-center gap-1 text-sm text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-brand-400" />
                {selected.City || 'Various cities'}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <Stars rating={selected.Rating} />
                <span className="text-xs text-slate-400">({selected.TotalReviews || 0} reviews)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                <Clock className="h-4 w-4 text-brand-400" /> Hourly rate
              </p>
              <p className="mt-1 text-2xl font-bold text-white">{currency(selected.HourlyRate)}<span className="text-sm font-normal text-slate-400">/hr</span></p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                <CalendarDays className="h-4 w-4 text-brand-400" /> Daily rate
              </p>
              <p className="mt-1 text-2xl font-bold text-white">{currency(selected.DailyRate)}<span className="text-sm font-normal text-slate-400">/day</span></p>
            </div>
          </div>

          {selected.Bio && (
            <div className="mt-5">
              <h4 className="mb-1 text-sm font-semibold text-slate-200">Bio</h4>
              <p className="text-sm leading-relaxed text-slate-300">{selected.Bio}</p>
            </div>
          )}

          {(selected.Specialties || selected.Languages) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {selected.Specialties?.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                <span key={i} className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-medium text-brand-300">
                  {s}
                </span>
              ))}
              {selected.Languages?.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                <span key={`lang-${i}`} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
                  {s}
                </span>
              ))}
            </div>
          )}

          <h4 className="mt-6 mb-3 text-sm font-semibold text-slate-200">
            Customer reviews ({selected.reviews?.length || 0})
          </h4>
          {selected.reviews && selected.reviews.length > 0 ? (
            <div className="space-y-3">
              {selected.reviews.map((r) => (
                <div key={r.Id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar src={r.TouristAvatarUrl} name={r.TouristName} className="h-8 w-8" />
                      <span className="text-sm font-medium text-slate-200">{r.TouristName}</span>
                    </div>
                    <Stars rating={r.Rating} />
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{r.Comment}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(r.CreatedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No reviews yet.</p>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => openBook({ Id: selected.Id, UserID: selected.UserID, FullName: selected.FullName })}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
            >
              Direct Book
            </button>
            <button
              onClick={() => openBid({ Id: selected.Id, UserID: selected.UserID, FullName: selected.FullName })}
              className="flex-1 rounded-xl border border-indigo-500/40 bg-indigo-500/15 py-2.5 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/25"
            >
              Place a Bid
            </button>
          </div>

          </Modal>
      )}

      {/* Direct book modal */}
      {bookGuide && (
        <Modal onClose={() => setBookGuide(null)}>
          <h3 className="text-lg font-bold text-white">Direct Book · {bookGuide.FullName}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Reserve at the listed rate. Daily rate: {currency(bookGuide.DailyRate)}.
          </p>
          <form onSubmit={submitBook} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Start date</label>
                <input
                  type="date" required
                  value={bookForm.startDate}
                  onChange={field('startDate', setBookForm)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">End date</label>
                <input
                  type="date" required
                  value={bookForm.endDate}
                  onChange={field('endDate', setBookForm)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Notes (optional)</label>
              <textarea
                rows="3"
                value={bookForm.notes}
                onChange={field('notes', setBookForm)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-60"
            >
              {submitting ? 'Placing booking…' : 'Confirm Direct Booking'}
            </button>
          </form>
        </Modal>
      )}

      {/* Bid modal */}
      {bidGuide && (
        <Modal onClose={() => setBidGuide(null)}>
          <h3 className="text-lg font-bold text-white">Place a Bid for {bidGuide.FullName}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Listed daily rate: {currency(bidGuide.DailyRate)}. Offer your best price; the guide will review it.
          </p>
          <form onSubmit={submitBid} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Your offer (USD)</label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="number" min="0" step="0.01" required
                  value={bidForm.offeredPrice}
                  onChange={field('offeredPrice', setBidForm)}
                  placeholder="e.g. 80"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-brand-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Start date</label>
                <input
                  type="date" required
                  value={bidForm.startDate}
                  onChange={field('startDate', setBidForm)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">End date</label>
                <input
                  type="date" required
                  value={bidForm.endDate}
                  onChange={field('endDate', setBidForm)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Message to the guide</label>
              <textarea
                rows="3"
                value={bidForm.message}
                onChange={field('message', setBidForm)}
                placeholder="Tell the guide about your trip, group size, or what you'd like to see..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
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
function GuideCard({ guide: g, onView, onBook, onBid, isTourist }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500/40 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between">
        <Avatar src={g.AvatarUrl} name={g.FullName} />
        <Stars rating={g.Rating} />
      </div>

      <h3 className="mt-3 text-lg font-semibold text-white">{g.FullName}</h3>
      <p className="flex items-center gap-1 text-sm text-slate-400">
        <MapPin className="h-3.5 w-3.5 text-brand-400" />
        {g.City || 'Various cities'}
      </p>

      {g.Bio && <p className="mt-2 line-clamp-2 text-sm text-slate-400">{g.Bio}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {g.Specialties?.split(',').slice(0, 3).map((s) => s.trim()).filter(Boolean).map((s, i) => (
          <span key={i} className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs text-brand-300">{s}</span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            <Clock className="mr-1 inline h-3 w-3 text-brand-400" />Hourly
          </p>
          <p className="text-sm font-bold text-white">{currency(g.HourlyRate)}<span className="text-xs font-normal text-slate-400">/hr</span></p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            <CalendarDays className="mr-1 inline h-3 w-3 text-brand-400" />Daily
          </p>
          <p className="text-sm font-bold text-white">{currency(g.DailyRate)}<span className="text-xs font-normal text-slate-400">/day</span></p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onView(g)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/[0.1]"
        >
          <Eye className="h-3.5 w-3.5" /> Profile
        </button>
        <button
          onClick={() => onBook(g)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-500"
        >
          <Coins className="h-3.5 w-3.5" /> Book
        </button>
        <button
          onClick={() => onBid(g)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Gavel className="h-3.5 w-3.5" /> Bid
        </button>
      </div>
    </div>
  );
}

// ─── Shared filter panel (desktop sidebar + mobile drawer) ──────────
function FilterPanel({ location, setLocation, minPrice, setMinPrice, maxPrice, setMaxPrice, minRating, setMinRating }) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs text-slate-400">Location / City</label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="e.g. Kyoto, Dhaka..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-brand-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Daily price range</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" min="0" placeholder="Min $"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-400"
          />
          <input
            type="number" min="0" placeholder="Max $"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Minimum rating</label>
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
        >
          <option value="0">Any rating</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
      </div>
    </>
  );
}
