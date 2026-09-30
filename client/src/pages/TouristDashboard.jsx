import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startConversation } from '../lib/chat.js';
import {
  LayoutDashboard, CalendarDays, MapPin, Star, Clock,
  CheckCircle2, XCircle, Loader2, Phone, MessageSquare, X, Menu,
  ChevronRight, ChevronLeft, TriangleAlert, User, Bell, Users, ExternalLink,
  Wallet, Plane, TicketCheck, RefreshCw,
  BadgeCheck, Navigation, CircleDot
} from 'lucide-react';
import { authFetch } from '../lib/demoAuth.js';
import { handleImgError, getInitials } from '../lib/avatar.js';

const statusMeta = {
  pending: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  confirmed: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  cancelled: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

function formatDate(d) {
  if (!d) return '—';
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
  const [cancellingId, setCancellingId] = useState(null);
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

  // ─── Loading skeleton ─────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="hidden w-72 shrink-0 lg:block">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <div className="h-24 animate-pulse bg-gradient-to-r from-brand-500/30 via-teal-500/20 to-accent-500/20" />
            <div className="space-y-3 p-6">
              <div className="mx-auto h-16 w-16 animate-pulse rounded-2xl bg-white/10" />
              <div className="mx-auto h-4 w-32 animate-pulse rounded bg-white/10" />
              <div className="mx-auto h-3 w-24 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-5">
          <div className="h-44 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0,1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />)}
          </div>
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-brand-400" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center backdrop-blur-xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
          <TriangleAlert className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-lg font-bold text-white">Couldn&apos;t load your dashboard</h2>
        <p className="mt-1 text-sm text-rose-200/80">{error}</p>
        <button onClick={fetchDashboard} className="btn-sheen mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  const { user, stats = {}, nextTour, bookings = [] } = data || {};
  const safeStats = {
    totalBookings: stats.totalBookings ?? 0,
    upcomingTours: stats.upcomingTours ?? 0,
    completedTours: stats.completedTours ?? 0,
    totalSpent: stats.totalSpent ?? 0,
  };
  const confirmedBooking = bookings?.find((booking) => booking.Status === 'confirmed');
  const completionRate = safeStats.totalBookings > 0 ? Math.round((safeStats.completedTours / safeStats.totalBookings) * 100) : 0;

  return (
    <div className="relative">
      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[19rem] overflow-y-auto border-r border-white/10 bg-ink-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 font-display text-sm font-bold text-white">
                <LayoutDashboard className="h-4 w-4 text-brand-400" /> Traveler menu
              </p>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white" aria-label="Close menu">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent user={user} stats={safeStats} completionRate={completionRate} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ─── Desktop sidebar ─── */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24">
            <SidebarContent user={user} stats={safeStats} completionRate={completionRate} />
          </div>
        </aside>

        {/* ─── Main ─── */}
        <main className="min-w-0 flex-1 space-y-6">
          {/* Mobile top bar */}
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="rounded-xl border border-white/10 bg-white/[0.06] p-2.5 text-slate-300" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <p className="font-display text-base font-bold text-white">My Dashboard</p>
          </div>

          {/* ─── Metric cards ─── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <MetricCard icon={TicketCheck} label="Total bookings" value={safeStats.totalBookings} sub={`${safeStats.upcomingTours} upcoming`} gradient="from-brand-500 to-emerald-600" shadow="shadow-brand-500/25" />
            <MetricCard icon={Clock} label="Upcoming tours" value={safeStats.upcomingTours} sub="On your calendar" gradient="from-sky-500 to-cyan-600" shadow="shadow-sky-500/25" />
            <MetricCard icon={BadgeCheck} label="Completed" value={safeStats.completedTours} sub={`${completionRate}% completion`} gradient="from-teal-500 to-emerald-600" shadow="shadow-teal-500/25" />
            <MetricCard icon={Wallet} label="Total spent" value={`৳${Number(safeStats.totalSpent).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Across all trips" gradient="from-accent-500 to-orange-600" shadow="shadow-accent-500/25" />
          </div>

          {/* ─── Inline alerts ─── */}
          {confirmedBooking && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/25 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 p-4 text-sm text-emerald-100" role="status">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <p className="leading-relaxed"><strong className="font-bold text-white">Booking confirmed:</strong> {confirmedBooking.GuideName} confirmed your trip for {formatDate(confirmedBooking.StartDate)}. Manage it from the Bookings page.</p>
            </div>
          )}
          {nextTour && daysUntil(nextTour.StartDate) >= 0 && daysUntil(nextTour.StartDate) <= 7 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-500/15 to-orange-500/10 p-4 text-sm text-amber-100" role="status">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                <Bell className="h-4 w-4" />
              </span>
              <p className="leading-relaxed"><strong className="font-bold text-white">Trip reminder:</strong> your tour with {nextTour.GuideName} is {daysUntil(nextTour.StartDate) === 0 ? 'today' : `in ${daysUntil(nextTour.StartDate)} day(s)`}. Coordinate pickup with your guide.</p>
            </div>
          )}

          {/* ─── Next tour spotlight ─── */}
          {nextTour && <NextTourBanner tour={nextTour} onCancel={handleCancel} cancellingId={cancellingId} />}

          {/* ─── Trip calendar ─── */}
          <BookingCalendar bookings={bookings} />
        </main>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function SidebarContent({ user, stats, completionRate = 0, onNavigate }) {
  return (
    <div className="space-y-4" onClick={onNavigate}>
      {/* Profile card */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div className="px-5 pb-5 pt-5">
          <div className="mb-3 flex justify-center">
            <div className="h-[4.5rem] w-[4.5rem] overflow-hidden rounded-3xl bg-ink-950 p-1 ring-2 ring-brand-400/60 shadow-xl shadow-brand-500/20">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.1rem] bg-gradient-to-br from-brand-500 to-teal-600 font-display text-xl font-extrabold text-white">
                <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
                  {getInitials(user?.FullName || 'Traveler')}
                </span>
                {user?.AvatarUrl && (
                  <img src={user.AvatarUrl} alt={user?.FullName || 'Traveler'} onError={(e) => handleImgError(e, user?.FullName)} className="absolute inset-0 h-full w-full object-cover" />
                )}
              </div>
            </div>
          </div>
          <p className="text-center font-display text-[15px] font-extrabold text-white">{user?.FullName || 'Traveler'}</p>
          <p className="mt-0.5 truncate text-center text-[11px] text-slate-500">{user?.Email || ''}</p>

          {/* Journey progress */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-ink-950/50 p-3.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase tracking-wider text-slate-400">Journey</span>
              <span className="font-extrabold text-brand-300">{completionRate}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-teal-400 transition-all" style={{ width: `${completionRate}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{stats.completedTours} of {stats.totalBookings} trips completed</p>
          </div>

          {/* Quick stats */}
          <div className="mt-3 space-y-2">
            <SidebarStat icon={TicketCheck} label="Total bookings" value={stats.totalBookings} />
            <SidebarStat icon={Clock} label="Upcoming" value={stats.upcomingTours} accent />
            <SidebarStat icon={CheckCircle2} label="Completed" value={stats.completedTours} />
            <SidebarStat icon={Wallet} label="Total spent" value={`৳${Number(stats.totalSpent).toFixed(0)}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarStat({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2.5">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent ? 'bg-sky-500/15 text-sky-300' : 'bg-white/[0.07] text-slate-400'}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 text-xs text-slate-400">{label}</span>
      <span className="font-display text-sm font-extrabold text-white">{value}</span>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────
function BookingCalendar({ bookings }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [selectedDay, setSelectedDay] = useState(localToday);
  const firstWeekday = month.getDay();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1);
    return { date, inMonth: date.getMonth() === month.getMonth(), key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` };
  });
  const bookingDates = new Set(bookings.map((b) => String(b.StartDate).slice(0, 10)));
  const onDay = bookings.filter((booking) => String(booking.StartDate).slice(0, 10) === selectedDay);
  return (
    <section className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/25">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-white">Trip calendar</h2>
            <p className="text-[11px] text-slate-500">Booking dates at a glance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition-all hover:bg-white/[0.12] hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-32 text-center text-[13px] font-bold text-white">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition-all hover:bg-white/[0.12] hover:text-white"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <span key={day} className="py-2">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth, key }) => {
          const hasBooking = bookingDates.has(key);
          const isSelected = selectedDay === key;
          const isToday = localToday === key;
          return (
            <button
              key={key}
              disabled={!inMonth}
              onClick={() => setSelectedDay(key)}
              className={`relative rounded-xl py-2 text-[13px] font-semibold transition-all ${!inMonth ? 'text-slate-700' : isSelected ? 'bg-gradient-to-br from-brand-500 to-teal-500 text-white shadow-lg shadow-brand-500/30' : isToday ? 'bg-white/[0.08] text-white ring-1 ring-white/20 hover:bg-white/[0.12]' : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'} disabled:opacity-40`}
            >
              {date.getDate()}
              {hasBooking && !isSelected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />}
            </button>
          );
        })}
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-ink-950/50 p-3.5">
        <p className="mb-2 text-xs font-bold text-slate-200">{new Date(`${selectedDay}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
        {onDay.length ? onDay.map((booking) => (
          <div key={booking.Id} className="mb-1.5 flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 last:mb-0">
            <Navigation className="h-3.5 w-3.5 shrink-0 text-brand-300" />
            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{booking.TourTitle || `Tour with ${booking.GuideName}`}</p>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${statusMeta[booking.Status] || 'border-white/10 bg-white/10 text-slate-300'}`}>{booking.Status}</span>
          </div>
        )) : <p className="text-xs text-slate-500">No booking on this date — pick a dotted day to preview.</p>}
      </div>
    </section>
  );
}

// ─── Metric Card ──────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, gradient, shadow }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07] sm:p-5">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="mb-3 flex items-center justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg ${shadow} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="truncate font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-300">{label}</p>
      <p className="mt-1 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

// ─── Next Tour Banner ─────────────────────────────────────────
function NextTourBanner({ tour, onCancel, cancellingId }) {
  const navigate = useNavigate();
  const [messaging, setMessaging] = useState(false);

  const messageGuide = async () => {
    if (!tour?.GuideId) return;
    setMessaging(true);
    try {
      const conversation = await startConversation(tour.GuideId);
      navigate(`/messages?conversation=${conversation.conversationId}`);
    } catch (err) {
      alert(err.message || 'Could not start a conversation');
    } finally {
      setMessaging(false);
    }
  };

  const days = daysUntil(tour.StartDate);
  const isUrgent = days <= 3 && days >= 0;
  const countdownLabel = days < 0 ? 'Started' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className={`absolute -top-20 left-10 h-56 w-56 rounded-full blur-[80px] ${isUrgent ? 'bg-amber-500/25' : 'bg-sky-500/25'}`} />
        <div className="absolute -bottom-24 right-0 h-56 w-72 rounded-full bg-brand-500/20 blur-[80px]" />
      </div>
      <div className={`absolute inset-x-0 top-0 h-px ${isUrgent ? 'bg-gradient-to-r from-transparent via-amber-400/70 to-transparent' : 'bg-gradient-to-r from-transparent via-sky-400/70 to-transparent'}`} />

      <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row">
        {/* Countdown */}
        <div className={`flex shrink-0 items-center gap-4 rounded-2xl border p-4 sm:p-5 lg:w-60 lg:flex-col lg:items-start lg:justify-center ${isUrgent ? 'border-amber-400/25 bg-amber-500/10' : 'border-sky-400/25 bg-sky-500/10'}`}>
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg ${isUrgent ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' : 'bg-gradient-to-br from-sky-500 to-cyan-600 shadow-sky-500/30'}`}>
            {isUrgent ? <TriangleAlert className="h-5 w-5" /> : <Plane className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Next upcoming tour</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-white">{countdownLabel}</p>
            <p className="mt-1 text-xs text-slate-400">{formatDate(tour.StartDate)} — {formatDate(tour.EndDate)}</p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${statusMeta[tour.Status] || 'border-white/10 bg-white/10 text-slate-300'}`}>
            <CircleDot className="h-3 w-3" /> {tour.Status}
          </span>
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl font-extrabold text-white">{tour.TourTitle || `Trip with ${tour.GuideName}`}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-400">
                <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5 text-brand-300" /> {tour.GuideName}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-rose-300" /> {tour.TourLocation || tour.GuideCity || 'N/A'}</span>
                {tour.GuideRating > 0 && <span className="inline-flex items-center gap-1 font-semibold text-accent-300"><Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" /> {Number(tour.GuideRating).toFixed(1)}</span>}
              </p>
            </div>
            <p className="rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-2 text-right">
              <span className="block font-display text-lg font-extrabold text-white">৳{Number(tour.TotalAmount || 0).toLocaleString()}</span>
              <span className={`block text-[11px] font-bold capitalize ${tour.PaymentStatus === 'paid' ? 'text-emerald-300' : 'text-amber-300'}`}>{tour.PaymentStatus || 'unpaid'}</span>
            </p>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoPill icon={Users} label="Group size" value={`${tour.GroupSize || 1} traveler(s)`} />
            <InfoPill icon={MapPin} label="Meeting point" value={tour.MeetingPoint || tour.TourLocation || tour.GuideCity || 'Coordinate with guide'} />
            <InfoPill icon={Clock} label="Cancel until" value={tour.CancellationDeadline ? formatDate(tour.CancellationDeadline) : '48h before start'} />
          </div>

          {tour.GuideSpecialties && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tour.GuideSpecialties.split(',').map((s, i) => (
                <span key={i} className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-2 py-1 text-[11px] font-semibold text-brand-200">
                  {s.trim()}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {tour.Status !== 'cancelled' && tour.Status !== 'completed' && tour.CanCancel !== false && tour.CanCancel !== 0 && (
              <button
                onClick={() => onCancel(tour.Id)}
                disabled={cancellingId === tour.Id}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-[13px] font-bold text-rose-200 transition-all hover:bg-rose-500/20 disabled:opacity-50"
              >
                {cancellingId === tour.Id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Cancel booking
              </button>
            )}
            {tour.GuidePhone && (
              <a href={`tel:${tour.GuidePhone}`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-2.5 text-[13px] font-bold text-slate-200 transition-all hover:bg-white/[0.12] hover:text-white">
                <Phone className="h-4 w-4 text-emerald-300" /> {tour.GuidePhone}
              </a>
            )}
            <button
              type="button"
              onClick={messageGuide}
              disabled={messaging || !tour?.GuideId}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-2.5 text-[13px] font-bold text-slate-200 transition-all hover:bg-white/[0.12] hover:text-white disabled:opacity-50"
            >
              {messaging ? <Loader2 className="h-4 w-4 animate-spin text-sky-300" /> : <MessageSquare className="h-4 w-4 text-sky-300" />}
              Message guide
            </button>
            <a target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(tour.MeetingPoint || tour.TourLocation || tour.GuideCity || '')}`}
              className="inline-flex items-center gap-1.5 px-2 py-2.5 text-xs font-bold text-brand-300 hover:text-brand-200">
              <MapPin className="h-3.5 w-3.5" /> Open in Maps <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value, capitalize }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-ink-950/50 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-slate-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`truncate text-[13px] font-bold text-white ${capitalize ? 'capitalize' : ''}`}>{value || '—'}</p>
      </div>
    </div>
  );
}

