import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, DollarSign, Map, Clock, CheckCircle, Star,
  AlertCircle, CheckCircle2, ArrowRight, User,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch, getStoredUser } from '../lib/demoAuth.js';

const statusStyles = {
  pending: 'bg-amber-500/15 text-amber-400',
  confirmed: 'bg-sky-500/15 text-sky-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-rose-500/15 text-rose-400',
  open: 'bg-emerald-500/15 text-emerald-400',
  closed: 'bg-slate-500/15 text-slate-400',
};

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MetricCard({ icon: Icon, label, value, color = 'text-brand-400' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}

export default function GuideDashboardPage() {
  const user = getStoredUser();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/guide/dashboard');
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load dashboard');
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const name = user?.FullName || user?.fullName || 'Guide';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Guide Dashboard"
        description="Track your earnings, bookings, and performance at a glance."
      />

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

      {!loading && !error && dashboard && (
        <>
          {/* Greeting */}
          <div className="mb-8 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-600 text-lg font-bold text-white shrink-0 overflow-hidden">
              {user?.AvatarUrl ? (
                <img src={user.AvatarUrl} alt={name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Welcome back, {name.split(' ')[0]}!
              </h2>
              <p className="text-sm text-slate-400">
                Here's what's happening with your tours today.
              </p>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-8">
            <MetricCard
              icon={DollarSign}
              label="Total Earnings"
              value={`$${Number(dashboard.totalEarnings || 0).toFixed(2)}`}
              color="text-emerald-400"
            />
            <MetricCard
              icon={Map}
              label="Active Tours"
              value={dashboard.activeTours || 0}
              color="text-sky-400"
            />
            <MetricCard
              icon={Clock}
              label="Pending Bookings"
              value={dashboard.pendingBookings || 0}
              color="text-amber-400"
            />
            <MetricCard
              icon={CheckCircle}
              label="Completed Tours"
              value={dashboard.completedTours || 0}
              color="text-brand-400"
            />
            <MetricCard
              icon={Star}
              label="Current Rating"
              value={dashboard.currentRating != null ? Number(dashboard.currentRating).toFixed(1) : '—'}
              color="text-amber-400"
            />
          </div>

          {/* Content Grid: Recent Bookings + Pending Requests */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recent Bookings */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-4">Recent Bookings</h3>
              {(!dashboard.recentBookings || dashboard.recentBookings.length === 0) ? (
                <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">No recent bookings yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.recentBookings.slice(0, 5).map((b) => (
                    <div key={b.Id || b.BookingId}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] shrink-0">
                          <User className="h-4 w-4 text-brand-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{b.TouristName || 'Tourist'}</p>
                          <p className="text-xs text-slate-400">{formatDate(b.StartDate)} – {formatDate(b.EndDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[b.Status] || 'bg-white/10 text-slate-400'}`}>
                          {b.Status}
                        </span>
                        <span className="text-sm font-bold text-emerald-400">${Number(b.TotalAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Custom Requests */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="text-lg font-bold text-white mb-4">Pending Custom Requests</h3>
              {(!dashboard.pendingRequests || dashboard.pendingRequests.length === 0) ? (
                <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
                  <Clock className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">No pending requests.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.pendingRequests.slice(0, 5).map((r) => (
                    <div key={r.RequestID || r.Id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-white leading-tight">{r.Title || 'Custom Tour'}</p>
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">
                          ${Number(r.Budget || 0).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{r.TouristName || 'Tourist'}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Map className="h-3 w-3 text-brand-400" />
                        {r.Destination || 'Various'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
