import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Star, X, Filter, Loader2, Clock, Users,
  CalendarDays, CheckCircle, AlertCircle, Mountain, Tag, Compass, MessageCircle, Heart, ExternalLink
} from 'lucide-react';
import { authFetch } from '../lib/demoAuth.js';
import { startConversation } from '../lib/chat.js';
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
  const navigate = useNavigate();
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
  const [minRating, setMinRating] = useState('');
  const [availableDate, setAvailableDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [favorites, setFavorites] = useState([]);
  const [showingFavorites, setShowingFavorites] = useState(false);
  const [availability, setAvailability] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState(null);
  const [bookingTour, setBookingTour] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingGroupSize, setBookingGroupSize] = useState(1);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  useEffect(() => {
    if (role !== 'tourist') return;
    authFetch('/api/tourist/favorites').then((res) => res.json()).then((data) => {
      if (data.ok) setFavorites((data.tours || []).map((tour) => Number(tour.Id)));
    }).catch(() => {});
  }, [role]);

  useEffect(() => {
    if (!bookingTour || !bookingDate) { setAvailability(null); return; }
    let active = true;
    setAvailability('checking');
    fetch(`/api/guides/tours/${bookingTour.Id}/availability?date=${encodeURIComponent(bookingDate)}`)
      .then((res) => res.json())
      .then((data) => { if (active) setAvailability(data.ok && data.available); })
      .catch(() => { if (active) setAvailability(false); });
    return () => { active = false; };
  }, [bookingTour, bookingDate]);

  const flash = useCallback((message, kind = 'success') => {
    setNotice({ message, kind });
    setTimeout(() => setNotice(null), 3500);
  }, []);

  const openTourBooking = (tour) => {
    if (role !== 'tourist') return flash('Sign in as a tourist to book this tour.', 'error');
    setSelected(null);
    setBookingDate('');
    setBookingNotes('');
    setBookingGroupSize(1);
    setBookingTour(tour);
  };

  const bookTour = async (event) => {
    event.preventDefault();
    if (!bookingTour || !bookingDate || availability !== true) return;
    setBookingSubmitting(true);
    try {
      const res = await authFetch('/api/bookings/direct', {
        method: 'POST',
        body: JSON.stringify({
          tourId: bookingTour.Id,
          groupSize: Number(bookingGroupSize),
          startDate: bookingDate,
          endDate: bookingDate,
          notes: bookingNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Could not book this tour');
      setBookingTour(null);
      flash('Tour booking sent. You can track it under Bookings.');
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const messageGuide = async (tour) => {
    if (role !== 'tourist') return flash('Sign in as a tourist to message a guide.', 'error');
    if (!tour?.GuideUserId) return flash('This guide is not connected to a messaging account yet.', 'error');
    try {
      const conversation = await startConversation(tour.GuideUserId);
      navigate(`/messages?conversation=${conversation.conversationId}`);
    } catch (error) {
      flash(error.message, 'error');
    }
  };

  const fetchTours = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      if (showingFavorites) {
        const response = await authFetch('/api/tourist/favorites');
        const saved = await response.json();
        if (!response.ok || !saved.ok) throw new Error(saved.message || 'Failed to load saved tours');
        setTours(saved.tours || []);
        setTotal(saved.tours?.length || 0);
        return;
      }
      const params = new URLSearchParams();
      if (location) params.set('location', location);
      if (keyword) params.set('keyword', keyword);
      if (category) params.set('category', category);
      if (difficulty) params.set('difficulty', difficulty);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minRating) params.set('minRating', minRating);
      if (availableDate) params.set('availableDate', availableDate);
      params.set('sort', sort);
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
  }, [location, keyword, category, difficulty, minPrice, maxPrice, minRating, availableDate, sort, page, showingFavorites]);

  const toggleFavorite = async (tour) => {
    if (role !== 'tourist') return flash('Sign in as a tourist to save tours.', 'error');
    const isSaved = favorites.includes(Number(tour.Id));
    try {
      const response = await authFetch(`/api/tourist/favorites/${tour.Id}`, { method: isSaved ? 'DELETE' : 'PUT' });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'Could not update saved tours');
      setFavorites((ids) => isSaved ? ids.filter((id) => id !== Number(tour.Id)) : [...ids, Number(tour.Id)]);
      if (showingFavorites && isSaved) setTours((items) => items.filter((item) => Number(item.Id) !== Number(tour.Id)));
      flash(isSaved ? 'Removed from saved tours.' : 'Tour saved to your favorites.');
    } catch (err) { flash(err.message, 'error'); }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchTours({ page: 1 }), keyword ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchTours, keyword]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        eyebrow="Browse & Book"
        title={showingFavorites ? 'Saved Tour Packages' : 'Browse Tour Packages'}
        description={showingFavorites ? 'Your saved tours, ready when you are.' : 'Discover amazing tour packages from verified local guides. Filter by location, category, price, date, and rating.'}
      />

      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => { if (role !== 'tourist') return flash('Sign in as a tourist to view saved tours.', 'error'); setShowingFavorites((value) => !value); setPage(1); }}
          className={`rounded-xl border px-4 py-2 text-sm font-medium ${showingFavorites ? 'border-brand-400 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/[0.06] text-slate-200'}`}>
          {showingFavorites ? 'Browse all tours' : 'Saved tours'}
        </button>
      </div>

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
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort tours"
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white">
          <option value="newest">Newest</option><option value="rating">Top rated</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
        </select>
      </div>

      {/* Layout: sidebar (desktop) / grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Desktop filters */}
        <aside className="hidden space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:block">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Filters</h3>
          <TourFilterPanel
            location={location} setLocation={(value) => { setLocation(value); setPage(1); }}
            category={category} setCategory={(value) => { setCategory(value); setPage(1); }}
            difficulty={difficulty} setDifficulty={(value) => { setDifficulty(value); setPage(1); }}
            minPrice={minPrice} setMinPrice={(value) => { setMinPrice(value); setPage(1); }}
            maxPrice={maxPrice} setMaxPrice={(value) => { setMaxPrice(value); setPage(1); }}
            minRating={minRating} setMinRating={(value) => { setMinRating(value); setPage(1); }}
            availableDate={availableDate} setAvailableDate={(value) => { setAvailableDate(value); setPage(1); }}
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
              <p className="text-slate-400">{showingFavorites ? 'No saved tours yet. Browse packages and tap the heart to save one.' : 'No tours match your filters. Try widening the search.'}</p>
            </div>
          )}

          {!loading && !error && tours.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tours.map((t) => (
                  <TourCard key={t.Id} tour={t} onView={setSelected} onFavorite={toggleFavorite} isFavorite={favorites.includes(Number(t.Id))} />
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
              location={location} setLocation={(value) => { setLocation(value); setPage(1); }}
              category={category} setCategory={(value) => { setCategory(value); setPage(1); }}
              difficulty={difficulty} setDifficulty={(value) => { setDifficulty(value); setPage(1); }}
              minPrice={minPrice} setMinPrice={(value) => { setMinPrice(value); setPage(1); }}
              maxPrice={maxPrice} setMaxPrice={(value) => { setMaxPrice(value); setPage(1); }}
              minRating={minRating} setMinRating={(value) => { setMinRating(value); setPage(1); }}
              availableDate={availableDate} setAvailableDate={(value) => { setAvailableDate(value); setPage(1); }}
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
            {selected.ImageUrl && <img src={selected.ImageUrl} alt={selected.Title} className="mb-4 h-52 w-full rounded-xl object-cover" />}
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
                <a className="mt-2 inline-flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selected.MeetingPoint}, ${selected.Location || ''}`)}`}>
                  <MapPin className="h-3.5 w-3.5" /> Get directions in Maps <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {selected.Itinerary && <ItineraryPreview value={selected.Itinerary} />}

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
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => messageGuide(selected)}
                disabled={!selected.GuideUserId}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4" /> Message Guide
              </button>
              <button
                onClick={() => openTourBooking(selected)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                <CalendarDays className="h-4 w-4" /> Book This Tour
              </button>
            </div>
          </div>
        </Modal>
      )}

      {bookingTour && (
        <Modal onClose={() => setBookingTour(null)}>
          <h2 className="pr-8 text-xl font-bold text-white">Book {bookingTour.Title}</h2>
          <p className="mt-1 text-sm text-slate-400">Package price: {currency(bookingTour.Price)} · Guide: {bookingTour.GuideName}</p>
          <form onSubmit={bookTour} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Tour date</label>
              <input
                type="date"
                required
                min={new Date().toLocaleDateString('en-CA')}
                value={bookingDate}
                onChange={(event) => setBookingDate(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
              />
              {availability === 'checking' && <p className="mt-1 text-xs text-slate-400">Checking guide availability…</p>}
              {availability === true && <p className="mt-1 text-xs text-emerald-300">This date is available.</p>}
              {availability === false && <p className="mt-1 text-xs text-red-300">This guide is already booked or unavailable on this date.</p>}
            </div>
            <div><label className="mb-1 block text-xs text-slate-400">Group size (max {bookingTour.MaxGroupSize})</label><input type="number" min="1" max={bookingTour.MaxGroupSize} required value={bookingGroupSize} onChange={(event) => setBookingGroupSize(event.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white" /></div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Notes for the guide (optional)</label>
              <textarea
                rows="3"
                maxLength={500}
                value={bookingNotes}
                onChange={(event) => setBookingNotes(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400"
              />
            </div>
            <button
              type="submit"
              disabled={bookingSubmitting || availability !== true}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-60"
            >
              {bookingSubmitting ? 'Sending booking…' : `Request booking · ${currency(bookingTour.Price)}`}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Tour card ───────────────────────────────────────────────────────
function ItineraryPreview({ value }) {
  let days = [];
  try { days = Array.isArray(value) ? value : JSON.parse(value); } catch { return null; }
  if (!Array.isArray(days) || !days.length) return null;
  return <div className="mt-4"><h4 className="mb-2 text-sm font-semibold text-slate-200">Trip itinerary</h4><ol className="space-y-2">{days.map((day, index) => <li key={index} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-xs font-semibold text-brand-200">{day.title || day.day || `Stop ${index + 1}`}</p><p className="mt-1 text-sm text-slate-400">{day.details || day.description || String(day)}</p></li>)}</ol></div>;
}

function TourCard({ tour: t, onView, onFavorite, isFavorite }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500/40 hover:bg-white/[0.05]">
      <div className="relative -mx-5 -mt-5 mb-4 h-36 overflow-hidden rounded-t-2xl bg-gradient-to-br from-brand-800/70 via-slate-800 to-teal-900/70">
        {t.ImageUrl && <img src={t.ImageUrl} alt={t.Title} loading="lazy" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
        <button type="button" onClick={() => onFavorite(t)} aria-label={isFavorite ? 'Remove saved tour' : 'Save tour'}
          className="absolute right-3 top-3 rounded-full border border-white/20 bg-ink-950/70 p-2 text-white backdrop-blur hover:text-rose-300">
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
        </button>
      </div>
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
function TourFilterPanel({ location, setLocation, category, setCategory, difficulty, setDifficulty, minPrice, setMinPrice, maxPrice, setMaxPrice, minRating, setMinRating, availableDate, setAvailableDate }) {
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
        <label className="mb-1 block text-xs text-slate-400">Minimum guide rating</label>
        <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white">
          <option value="">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Available on</label>
        <input type="date" min={new Date().toLocaleDateString('en-CA')} value={availableDate} onChange={(e) => setAvailableDate(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white" />
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
