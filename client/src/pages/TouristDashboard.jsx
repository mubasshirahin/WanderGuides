import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard, CalendarDays, MapPin, DollarSign, Star, Clock,
  CheckCircle, XCircle, Loader2, Phone, MessageSquare, X, Menu,
  Search, ChevronRight, AlertTriangle, User
} from 'lucide-react';
import { authFetch } from '../lib/demoAuth.js';

const TABS = [
  { key: 'active', label: 'Active', icon: Clock },
  { key: 'past', label: 'Past', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

const statusStyles = {
  pending: 'bg-amber-500/15 text-amber-400',
  confirmed: 'bg-sky-500/15 text-sky-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-rose-500/15 text-rose-400',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function daysUntil(d) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function TouristDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [cancellingId, setCancellingId] = useState(null);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/tourist/dashboard');
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'Failed to load dashboard');
      setData(json.dashboard);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancellingId(bookingId);
    try {
      const res = await authFetch(`/api/tourist/bookings/${bookingId}/cancel`, {
        method: 'PUT',
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'Cancel failed');
      await fetchDashboard();
    } catch (e) {
      alert(e.message);
    } finally {
      setCancellingId(null);
    }
  };

  // Filter bookings by tab
  const filterBookings = (bookings) => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      if (activeTab === 'active') return b.Status === 'pending' || b.Status === 'confirmed';
      if (activeTab === 'past') return b.Status === 'completed';
      if (activeTab === 'cancelled') return b.Status === 'cancelled';
      return true;
    });
  };

  const filteredBookings = filterBookings(data?.bookings).filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (b.GuideName || '').toLowerCase().includes(q) ||
      (b.Notes || '').toLowerCase().includes(q) ||
      (b.GuideCity || '').toLowerCase().includes(q)
    );
  });

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
        {error}
        <button onClick={fetchDashboard} className="ml-3 underline hover:text-red-200">Retry</button>
      </div>
    );
  }

  const { user, stats, nextTour, bookings } = data || {};

  return (
    <div className="flex min-h-[calc(100vh-4rem)] gap-0">
      {/* ─── Mobile Sidebar Overlay ──────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-ink-950 border-r border-white/10 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-bold text-white">Menu</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent user={user} stats={stats} />
          </div>
        </div>
      )}

      {/* ─── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-white/10 bg-white/[0.02] p-6">
        <SidebarContent user={user} stats={stats} />
      </aside>

      {/* ─── Main Content ────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header bar */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-base font-bold text-white">Dashboard</h1>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* ─── Header ──────────────────────────────────── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                {getGreeting()}, {user?.FullName?.split(' ')[0] || 'Traveler'}
              </h1>
              <p className="mt-1 text-sm text-slate-400">Here&apos;s what&apos;s happening with your tours.</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 sm:w-72"
              />
            </div>
          </div>

          {/* ─── Metric Cards ────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <MetricCard icon={CalendarDays} label="Total Bookings" value={stats.totalBookings} color="text-brand-400" />
            <MetricCard icon={Clock} label="Upcoming Tours" value={stats.upcomingTours} color="text-sky-400" />
            <MetricCard icon={CheckCircle} label="Completed" value={stats.completedTours} color="text-emerald-400" />
            <MetricCard icon={DollarSign} label="Total Spent" value={`৳${Number(stats.totalSpent).toFixed(2)}`} color="text-accent-400" />
          </div>

          {/* ─── Priority Banner: Next Upcoming Tour ─────── */}
          {nextTour && <NextTourBanner tour={nextTour} onCancel={handleCancel} cancellingId={cancellingId} />}

          {/* ─── Tabbed Booking List ─────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10 overflow-x-auto">
              {TABS.map(({ key, label, icon: Icon }) => {
                const count = filterBookings(bookings).filter((b) => {
                  if (key === 'active') return b.Status === 'pending' || b.Status === 'confirmed';
                  if (key === 'past') return b.Status === 'completed';
                  if (key === 'cancelled') return b.Status === 'cancelled';
                  return false;
                }).length;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                      activeTab === key
                        ? 'text-brand-400 border-b-2 border-brand-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      activeTab === key ? 'bg-brand-500/20 text-brand-300' : 'bg-white/10 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Booking list */}
            <div className="divide-y divide-white/5">
              {filteredBookings.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    {activeTab === 'active' && 'No active bookings.'}
                    {activeTab === 'past' && 'No completed bookings yet.'}
                    {activeTab === 'cancelled' && 'No cancelled bookings.'}
                  </p>
                </div>
              )}
              {filteredBookings.map((b) => (
                <BookingRow
                  key={b.Id}
                  booking={b}
                  onCancel={handleCancel}
                  cancellingId={cancellingId}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Sidebar Content ──────────────────────────────────────────
function SidebarContent({ user, stats }) {
  return (
    <div className="space-y-6">
      {/* User info */}
      <div className="text-center">
        <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-teal-600 p-0.5">
          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-ink-950 overflow-hidden">
            {user?.AvatarUrl ? (
              <img src={user.AvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-slate-500" />
            )}
          </div>
        </div>
        <p className="font-display text-sm font-bold text-white">{user?.FullName}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{user?.Email}</p>
      </div>

      {/* Quick stats */}
      <div className="space-y-2">
        <SidebarStat icon={CalendarDays} label="Total Bookings" value={stats.totalBookings} />
        <SidebarStat icon={Clock} label="Upcoming" value={stats.upcomingTours} />
        <SidebarStat icon={CheckCircle} label="Completed" value={stats.completedTours} />
        <SidebarStat icon={DollarSign} label="Total Spent" value={`৳${Number(stats.totalSpent).toFixed(2)}`} />
      </div>
    </div>
  );
}

function SidebarStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="flex-1 text-xs text-slate-400">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.06] sm:p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="font-display text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  );
}

// ─── Next Tour Banner ─────────────────────────────────────────
function NextTourBanner({ tour, onCancel, cancellingId }) {
  const days = daysUntil(tour.StartDate);
  const isUrgent = days <= 3 && days >= 0;

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 backdrop-blur-xl ${
      isUrgent
        ? 'border-amber-500/30 bg-amber-500/5'
        : 'border-sky-500/20 bg-sky-500/5'
    }`}>
      <div className="flex items-start gap-3 mb-4">
        {isUrgent ? (
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <CalendarDays className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Next Upcoming Tour</p>
          <h3 className="mt-1 font-display text-lg font-bold text-white">
            {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `In ${days} days`}
          </h3>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoPill icon={User} label="Guide" value={tour.GuideName} />
        <InfoPill icon={MapPin} label="City" value={tour.GuideCity || 'N/A'} />
        <InfoPill icon={Star} label="Rating" value={tour.GuideRating ? Number(tour.GuideRating).toFixed(1) : 'N/A'} />
        <InfoPill icon={CalendarDays} label="Dates" value={`${formatDate(tour.StartDate)} — ${formatDate(tour.EndDate)}`} />
        <InfoPill icon={DollarSign} label="Cost" value={`৳${Number(tour.TotalAmount).toFixed(2)}`} />
        <InfoPill icon={Clock} label="Status" value={tour.Status} capitalize />
      </div>

      {tour.GuideSpecialties && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tour.GuideSpecialties.split(',').map((s, i) => (
            <span key={i} className="rounded-lg bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-slate-300">
              {s.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {tour.Status !== 'cancelled' && tour.Status !== 'completed' && (
          <button
            onClick={() => onCancel(tour.Id)}
            disabled={cancellingId === tour.Id}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            {cancellingId === tour.Id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancel Booking
          </button>
        )}
        {tour.GuidePhone && (
          <a
            href={`tel:${tour.GuidePhone}`}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.1] hover:text-white"
          >
            <Phone className="h-4 w-4" />
            Contact Guide
          </a>
        )}
        <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.1] hover:text-white">
          <MessageSquare className="h-4 w-4" />
          Message
        </button>
      </div>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value, capitalize }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500">{label}</p>
        <p className={`text-xs font-semibold text-white truncate ${capitalize ? 'capitalize' : ''}`}>{value || '—'}</p>
      </div>
    </div>
  );
}

// ─── Booking Row ──────────────────────────────────────────────
function BookingRow({ booking: b, onCancel, cancellingId }) {
  const days = daysUntil(b.StartDate);
  const isActive = b.Status === 'pending' || b.Status === 'confirmed';

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-4 transition-colors hover:bg-white/[0.03]">
      {/* Guide avatar + info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/[0.06]">
          {b.GuideAvatar ? (
            <img src={b.GuideAvatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-5 w-5 text-slate-500" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{b.GuideName}</p>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {b.GuideCity || 'N/A'}
            {b.GuideRating > 0 && (
              <>
                <Star className="ml-1 h-3 w-3 fill-accent-400 text-accent-400" />
                {Number(b.GuideRating).toFixed(1)}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Dates */}
      <div className="text-xs text-slate-300 sm:w-40">
        {formatDate(b.StartDate)} — {formatDate(b.EndDate)}
        {isActive && days >= 0 && (
          <span className="ml-1 text-sky-400">
            ({days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`})
          </span>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 sm:w-32">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusStyles[b.Status] || 'bg-white/10 text-slate-400'}`}>
          {b.Status}
        </span>
      </div>

      {/* Amount */}
      <div className="text-sm font-semibold text-white sm:w-24 sm:text-right">
        ৳{Number(b.TotalAmount).toFixed(2)}
      </div>

      {/* Actions */}
      {isActive && (
        <div className="sm:w-32 sm:text-right">
          <button
            onClick={() => onCancel(b.Id)}
            disabled={cancellingId === b.Id}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            {cancellingId === b.Id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
