import { useCallback, useEffect, useState } from 'react';
import {
  Search, MapPin, Star, X, Filter, Loader2, Clock, Users,
  CalendarDays, CheckCircle, AlertCircle, Mountain, Tag, Compass
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';

const currency = (n) =>
  n == null || Number.isNaN(Number(n)) ? '—' : `\u09F3${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

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

const CATEGORIES = ['Cultural', 'Adventure', 'Beach', 'Nature', 'Trekking', 'Food', 'Historical'];
const DIFFICULTIES = ['Easy', 'Moderate', 'Hard'];

export default function BrowseToursPage({ role }) {
  const [tours, setTours] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [location, setLocation] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState(null);

  const flash = useCallback((message, kind = 'success') => {
    setNotice({ message, kind });
    setTimeout(() => setNotice(null), 3500);
  }, []);

  const fetchTours = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (location) params.set('location', location);
      if (keyword) params.set('keyword', keyword);
      if (category) params.set('category', category);
      if (difficulty) params.set('difficulty', difficulty);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      params.set('page', opts.page || page);
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/guides/tours/browse?${params}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load tours');
      setTours(data.tours || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [location, keyword, category, difficulty, minPrice, maxPrice, page]);

  useEffect(() => {
    const t = setTimeout(() => fetchTours({ page: 1 }), keyword ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchTours, keyword]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        eyebrow="Browse & Book"
        title="Browse Tour Packages"
        description="Discover amazing tour packages from verified local guides. Filter by location, category, price, and more."
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
            placeholder="Search tours by name, destination, highlights..."
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
          <TourFilterPanel
            location={location} setLocation={setLocation}
            category={category} setCategory={setCategory}
            difficulty={difficulty} setDifficulty={setDifficulty}
            minPrice={minPrice} setMinPrice={setMinPrice}
            maxPrice={maxPrice} setMaxPrice={setMaxPrice}
          />
        </aside>

        {/* Tours grid */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
            <span>{loading ? 'Searching...' : `${total} tour${total === 1 ? '' : 's'} found`}</span>
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

          {!loading && !error && tours.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
              <Compass className="mx-auto mb-4 h-10 w-10 text-slate-500" />
              <p className="text-slate-400">No tours match your filters. Try widening the search.</p>
            </div>
          )}

          {!loading && !error && tours.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tours.map((t) => (
                  <TourCard key={t.Id} tour={t} onView={setSelected} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
                    disabled={page <= 1}
                    className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm text-slate-400">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); }}
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
            <TourFilterPanel
              location={location} setLocation={setLocation}
              category={category} setCategory={setCategory}
              difficulty={difficulty} setDifficulty={setDifficulty}
              minPrice={minPrice} setMinPrice={setMinPrice}
              maxPrice={maxPrice} setMaxPrice={setMaxPrice}
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

      {/* Tour detail modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)} maxWidth="max-w-2xl">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.Title}</h2>
                <p className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-brand-400" />
                  {selected.Location || 'Various locations'}
                </p>
              </div>
              <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-medium text-brand-300">
                {selected.Category}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500"><Clock className="mr-1 inline h-3 w-3 text-brand-400" />Duration</p>
                <p className="text-sm font-bold text-white mt-1">{selected.DurationHours}h</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500"><Users className="mr-1 inline h-3 w-3 text-brand-400" />Group Size</p>
                <p className="text-sm font-bold text-white mt-1">{selected.MaxGroupSize}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500"><Mountain className="mr-1 inline h-3 w-3 text-brand-400" />Difficulty</p>
                <p className="text-sm font-bold text-white mt-1">{selected.Difficulty || '—'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500"><Tag className="mr-1 inline h-3 w-3 text-brand-400" />Price</p>
                <p className="text-sm font-bold text-white mt-1">{currency(selected.Price)}</p>
              </div>
            </div>

            {selected.Description && (
              <div className="mt-5">
                <h4 className="mb-1 text-sm font-semibold text-slate-200">About this tour</h4>
                <p className="text-sm leading-relaxed text-slate-300">{selected.Description}</p>
              </div>
            )}

            {selected.MeetingPoint && (
              <div className="mt-4">
                <h4 className="mb-1 text-sm font-semibold text-slate-200">Meeting Point</h4>
                <p className="text-sm text-slate-300">{selected.MeetingPoint}</p>
              </div>
            )}

            {selected.Included && (
              <div className="mt-4">
                <h4 className="mb-1 text-sm font-semibold text-slate-200">What's Included</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selected.Included.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                    <span key={i} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selected.Highlights && (
              <div className="mt-4">
                <h4 className="mb-1 text-sm font-semibold text-slate-200">Highlights</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selected.Highlights.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                    <span key={i} className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-medium text-brand-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Guide info */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Tour Guide</p>
              <div className="flex items-center gap-3">
                <Avatar src={selected.GuideAvatar} name={selected.GuideName} className="h-10 w-10" />
                <div>
                  <p className="text-sm font-semibold text-white">{selected.GuideName}</p>
                  <div className="flex items-center gap-2">
                    <Stars rating={selected.GuideRating} />
                    <span className="text-xs text-slate-400">({selected.GuideReviews || 0} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tour card ───────────────────────────────────────────────────────
function TourCard({ tour: t, onView }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500/40 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between">
        <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-medium text-brand-300">
          {t.Category || 'Tour'}
        </span>
        <Stars rating={t.GuideRating} />
      </div>

      <h3 className="mt-3 text-lg font-semibold text-white line-clamp-1">{t.Title}</h3>
      <p className="flex items-center gap-1 text-sm text-slate-400">
        <MapPin className="h-3.5 w-3.5 text-brand-400" />
        {t.Location || 'Various locations'}
      </p>

      {t.Description && <p className="mt-2 line-clamp-2 text-sm text-slate-400">{t.Description}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {t.Highlights?.split(',').slice(0, 3).map((s) => s.trim()).filter(Boolean).map((s, i) => (
          <span key={i} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-300">{s}</span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            <Clock className="mr-1 inline h-3 w-3 text-brand-400" />Duration
          </p>
          <p className="text-sm font-bold text-white">{t.DurationHours}h</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            <Users className="mr-1 inline h-3 w-3 text-brand-400" />Group
          </p>
          <p className="text-sm font-bold text-white">{t.MaxGroupSize}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            <Tag className="mr-1 inline h-3 w-3 text-brand-400" />Price
          </p>
          <p className="text-sm font-bold text-white">{currency(t.Price)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Avatar src={t.GuideAvatar} name={t.GuideName} className="h-7 w-7" />
        <span className="text-xs text-slate-400">{t.GuideName}</span>
      </div>

      <button
        onClick={() => onView(t)}
        className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.1]"
      >
        View Details
      </button>
    </div>
  );
}

// ─── Filter panel ────────────────────────────────────────────────────
function TourFilterPanel({ location, setLocation, category, setCategory, difficulty, setDifficulty, minPrice, setMinPrice, maxPrice, setMaxPrice }) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs text-slate-400">Location / City</label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="e.g. Cox's Bazar, Sylhet..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-brand-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Difficulty</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
        >
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Price range (BDT)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" min="0" placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-400"
          />
          <input
            type="number" min="0" placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-brand-400"
          />
        </div>
      </div>
    </>
  );
}
