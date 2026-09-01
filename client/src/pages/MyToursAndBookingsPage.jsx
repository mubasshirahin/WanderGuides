import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, MapPin, Clock, DollarSign, Users, Eye, Trash2,
  X, CheckCircle2, XCircle, ChevronRight, AlertCircle, Pencil, ToggleLeft, ToggleRight,
  Tag, Mountain, Flag, CheckSquare, Star, Globe,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch, getStoredUser } from '../lib/demoAuth.js';

const statusStyles = {
  pending: 'bg-amber-500/15 text-amber-400',
  confirmed: 'bg-sky-500/15 text-sky-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-rose-500/15 text-rose-400',
  active: 'bg-emerald-500/15 text-emerald-400',
  inactive: 'bg-slate-500/15 text-slate-400',
};

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

/* ─── Drawer ─────────────────────────────────────────────── */

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

/* ─── Create Tour Form ───────────────────────────────────── */

const CATEGORIES = [
  'Adventure', 'Cultural', 'Nature', 'Food & Culinary', 'Historical',
  'Religious', 'Wildlife', 'Beach & Water', 'Photography', 'Custom',
];
const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging', 'Extreme'];

function CreateTourForm({ tour, onCreated, onClose }) {
  const isEdit = !!tour;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: tour?.Title || '', description: tour?.Description || '', location: tour?.Location || '',
    price: tour?.Price || '', duration: tour?.Duration || '', maxGroupSize: tour?.MaxGroupSize || '',
    category: tour?.Category || '', difficulty: tour?.Difficulty || '',
    meetingPoint: tour?.MeetingPoint || '', included: tour?.Included || '',
    highlights: tour?.Highlights || '', languages: tour?.Languages || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const inputBase = 'w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15';

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const totalSteps = 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/guide/tours/${tour.Id}` : '/api/guide/tours';
      const res = await authFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          durationHours: Number(form.duration) * 24 || 8,
          maxGroupSize: Number(form.maxGroupSize),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || (isEdit ? 'Failed to update tour' : 'Failed to create tour'));
      onCreated(data.tour);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3].map(s => (
          <button key={s} type="button" onClick={() => setStep(s)}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
              step === s ? 'bg-brand-500 text-white' : step > s ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-500'
            }`}>
            {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
          </button>
        ))}
        <span className="text-xs text-slate-500 ml-2">
          {step === 1 ? 'Basic Info' : step === 2 ? 'Details' : 'Review'}
        </span>
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tour Title *</label>
            <input name="title" value={form.title} onChange={handleChange} required maxLength={150}
              placeholder="e.g. 3-Day Cultural Heritage Tour of Sylhet"
              className={inputBase} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} maxLength={4000}
              placeholder="Describe your tour — itinerary, what makes it special, what tourists will experience..."
              className={`${inputBase} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <div className="relative">
                <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select name="category" value={form.category} onChange={handleChange}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  className={`${inputBase} pl-10 pr-8`}>
                  <option value="" className="bg-ink-800 text-slate-300">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-ink-800 text-white">{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Difficulty</label>
              <div className="relative">
                <Mountain className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select name="difficulty" value={form.difficulty} onChange={handleChange}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  className={`${inputBase} pl-10 pr-8`}>
                  <option value="" className="bg-ink-800 text-slate-300">Select difficulty</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d} className="bg-ink-800 text-white">{d}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Location *</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input name="location" value={form.location} onChange={handleChange} required maxLength={100}
                placeholder="e.g. Sylhet, Bangladesh"
                className={`${inputBase} pl-10`} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Meeting Point</label>
            <div className="relative">
              <Flag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input name="meetingPoint" value={form.meetingPoint} onChange={handleChange} maxLength={255}
                placeholder="e.g. Zindabazar Bridge, Sylhet"
                className={`${inputBase} pl-10`} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Price (৳) *</label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="price" type="number" min={0} step="0.01" value={form.price} onChange={handleChange} required
                  placeholder="1500"
                  className={`${inputBase} pl-10`} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Duration (days)</label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="duration" type="number" min={1} value={form.duration} onChange={handleChange} required
                  placeholder="3"
                  className={`${inputBase} pl-10`} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Max Group</label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="maxGroupSize" type="number" min={1} max={50} value={form.maxGroupSize} onChange={handleChange} required
                  placeholder="10"
                  className={`${inputBase} pl-10`} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Languages</label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input name="languages" value={form.languages} onChange={handleChange} maxLength={255}
                placeholder="e.g. Bengali, English, Hindi"
                className={`${inputBase} pl-10`} />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Extras & Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">What's Included</label>
            <textarea name="included" value={form.included} onChange={handleChange} rows={3} maxLength={500}
              placeholder="e.g. Hotel pickup, Lunch, Guide, Entry tickets, Transport"
              className={`${inputBase} resize-none`} />
            <p className="text-[10px] text-slate-500 mt-1">Separate items with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Highlights</label>
            <textarea name="highlights" value={form.highlights} onChange={handleChange} rows={3} maxLength={500}
              placeholder="e.g. Sunrise at Jaflong, Tea garden visit,igenous village tour"
              className={`${inputBase} resize-none`} />
            <p className="text-[10px] text-slate-500 mt-1">Key attractions tourists will experience</p>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preview</p>
            <h4 className="text-sm font-bold text-white">{form.title || 'Tour Title'}</h4>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              {form.category && <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-brand-300">{form.category}</span>}
              {form.difficulty && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">{form.difficulty}</span>}
              {form.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{form.location}</span>}
            </div>
            {form.description && <p className="text-xs text-slate-400 line-clamp-2">{form.description}</p>}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-3 pt-2">
        <button type="button" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06] transition-colors">
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        {step < totalSteps ? (
          <button type="button" onClick={() => setStep(s => s + 1)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="submit" disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? 'Update Tour' : 'Create Tour'}
          </button>
        )}
      </div>
    </form>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function MyToursAndBookingsPage() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTour, setEditTour] = useState(null);

  const [drawerTour, setDrawerTour] = useState(null);
  const [responses, setResponses] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(false);

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

  const fetchTours = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/guide/my-tours');
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load tours');
      setTours(data.tours || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTours(); }, [fetchTours]);

  const handleCreated = (tour) => {
    setTours(prev => [tour, ...prev]);
    addToast('Tour created successfully!', 'success');
  };

  const handleUpdated = (tour) => {
    setTours(prev => prev.map(t => t.Id === tour.Id ? { ...t, ...tour } : t));
    addToast('Tour updated successfully!', 'success');
  };

  const toggleActive = async (tour) => {
    try {
      const res = await authFetch(`/api/guide/tours/${tour.Id}/toggle`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to toggle tour');
      setTours(prev => prev.map(t =>
        t.Id === tour.Id ? { ...t, IsActive: !t.IsActive } : t
      ));
      addToast(`Tour ${tour.IsActive ? 'deactivated' : 'activated'}.`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const deleteTour = async (tour) => {
    if (!window.confirm(`Delete "${tour.Title}"? This cannot be undone.`)) return;
    try {
      const res = await authFetch(`/api/guide/tours/${tour.Id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to delete tour');
      setTours(prev => prev.filter(t => t.Id !== tour.Id));
      addToast('Tour deleted.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const openResponses = async (tour) => {
    setDrawerTour(tour);
    setResponsesLoading(true);
    setResponses([]);
    try {
      const res = await authFetch(`/api/guide/tours/${tour.Id}/responses`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load responses');
      setResponses(data.responses || data.bookings || []);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setResponsesLoading(false);
    }
  };

  const acceptResponse = async (response) => {
    try {
      const res = await authFetch(`/api/bookings/${response.Id}/accept`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to accept');
      setResponses(prev => prev.map(r =>
        r.Id === response.Id ? { ...r, Status: 'confirmed' } : r
      ));
      addToast('Booking accepted!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const rejectResponse = async (response) => {
    if (!window.confirm('Reject this booking?')) return;
    try {
      const res = await authFetch(`/api/bookings/${response.Id}/reject`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to reject');
      setResponses(prev => prev.map(r =>
        r.Id === response.Id ? { ...r, Status: 'cancelled' } : r
      ));
      addToast('Booking rejected.', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Your Tours"
        title="My Tours & Bookings"
        description="Create tours, manage listings, and handle tourist bookings."
      />

      {/* Action bar */}
      <div className="flex justify-end mb-6">
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5">
          <Plus className="h-4 w-4" />
          Create New Tour
        </button>
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

      {!loading && !error && tours.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <MapPin className="mx-auto mb-4 h-10 w-10 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No Tours Yet</h3>
          <p className="text-sm text-slate-400">Create your first tour to start attracting bookings.</p>
        </div>
      )}

      {!loading && !error && tours.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tours.map((tour) => (
            <div key={tour.Id}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h4 className="font-bold text-white leading-tight">{tour.Title}</h4>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[tour.IsActive ? 'active' : 'inactive']}`}>
                  {tour.IsActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-slate-400 mb-4 flex-1">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                  {tour.Location}
                </p>
                <p className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                  ৳{Number(tour.Price || 0).toFixed(2)}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                  {tour.Duration} {tour.Duration === 1 ? 'day' : 'days'}
                </p>
                <p className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                  Max {tour.MaxGroupSize} people
                </p>
              </div>

              {tour.BookingCount != null && (
                <p className="text-xs text-slate-500 mb-3">
                  {tour.BookingCount} {tour.BookingCount === 1 ? 'booking' : 'bookings'}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                <button onClick={() => openResponses(tour)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.1] transition-colors">
                  <Eye className="h-3.5 w-3.5" />
                  Responses
                </button>
                <button onClick={() => setEditTour(tour)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.1] transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button onClick={() => toggleActive(tour)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.1] transition-colors">
                  {tour.IsActive ? (
                    <ToggleRight className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  {tour.IsActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => deleteTour(tour)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Tour">
        <CreateTourForm onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTour} onClose={() => setEditTour(null)} title="Edit Tour">
        {editTour && (
          <CreateTourForm tour={editTour} onCreated={handleUpdated} onClose={() => setEditTour(null)} />
        )}
      </Modal>

      {/* Responses Drawer */}
      <Drawer open={!!drawerTour} onClose={() => setDrawerTour(null)}
        title={drawerTour ? `Responses: ${drawerTour.Title}` : 'Responses'}>
        {responsesLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}
        {!responsesLoading && responses.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <Clock className="mx-auto mb-3 h-8 w-8 text-slate-500" />
            <p className="text-sm text-slate-400">No responses yet. Tourists will book or bid on your tour.</p>
          </div>
        )}
        {!responsesLoading && responses.length > 0 && (
          <div className="space-y-4">
            {responses.map((r) => (
              <div key={r.Id}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                      {r.TouristAvatar ? (
                        <img src={r.TouristAvatar} alt={r.TouristName} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        (r.TouristName || 'T')[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{r.TouristName || 'Tourist'}</p>
                      <p className="text-xs text-slate-400">{formatDate(r.StartDate)} – {formatDate(r.EndDate)}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[r.Status] || 'bg-white/10 text-slate-400'}`}>
                    {r.Status}
                  </span>
                </div>
                {r.TotalAmount != null && (
                  <p className="text-sm font-bold text-emerald-400 mb-3">
                    <DollarSign className="h-3.5 w-3.5 inline" />
                    {Number(r.TotalAmount).toFixed(2)}
                  </p>
                )}
                {r.Notes && <p className="text-xs text-slate-400 mb-3">{r.Notes}</p>}
                {r.Status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => acceptResponse(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accept
                    </button>
                    <button onClick={() => rejectResponse(r)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition-colors">
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
