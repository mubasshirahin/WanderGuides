import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Loader2, User, Mail, Shield, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Trash2, X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch, getStoredUser } from '../lib/demoAuth.js';

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

/* ─── Calendar Helpers ───────────────────────────────────── */

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function buildCalendarGrid(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const grid = [];

  // Fill leading empty cells
  for (let i = 0; i < firstDay; i++) {
    grid.push(null);
  }

  // Fill actual days
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(d);
  }

  // Pad to 42 cells (6 weeks)
  while (grid.length < 42) {
    grid.push(null);
  }

  return grid;
}

function formatDateStr(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function isToday(year, month, day) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

function isPast(year, month, day) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const date = new Date(year, month, day);
  return date < now;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Main Component ─────────────────────────────────────── */

export default function GuideProfileCalendarPage() {
  const user = getStoredUser();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [blockedDates, setBlockedDates] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);

  const [toasts, setToasts] = useState([]);
  const toastIdRef = { current: 0 };

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchBlockedDates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/guide-availability');
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load availability');
      const dates = new Set();
      (data.dates || data.blockedDates || []).forEach(d => {
        const dateStr = typeof d === 'string' ? d : d.Date || d.date;
        if (dateStr) dates.add(dateStr.substring(0, 10));
      });
      setBlockedDates(dates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBlockedDates(); }, [fetchBlockedDates]);

  const grid = useMemo(() => buildCalendarGrid(currentYear, currentMonth), [currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const toggleDate = async (day) => {
    if (!day || isPast(currentYear, currentMonth, day)) return;
    const dateStr = formatDateStr(currentYear, currentMonth, day);
    const isBlocked = blockedDates.has(dateStr);

    setToggling(dateStr);
    try {
      if (isBlocked) {
        const res = await authFetch(`/api/guide-availability/unblock/${dateStr}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || 'Failed to unblock date');
        setBlockedDates(prev => {
          const next = new Set(prev);
          next.delete(dateStr);
          return next;
        });
        addToast(`${dateStr} is now available.`, 'success');
      } else {
        const res = await authFetch('/api/guide-availability/block', {
          method: 'POST',
          body: JSON.stringify({ dates: [dateStr] }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || 'Failed to block date');
        setBlockedDates(prev => new Set([...prev, dateStr]));
        addToast(`${dateStr} blocked.`, 'success');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setToggling(null);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Remove all blocked dates? This will make you available on all previously blocked days.')) return;
    setClearing(true);
    try {
      const res = await authFetch('/api/guide-availability/clear', { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to clear availability');
      setBlockedDates(new Set());
      addToast('All blocked dates cleared.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setClearing(false);
    }
  };

  const name = user?.FullName || user?.fullName || 'Guide';
  const email = user?.Email || user?.email || '';
  const role = user?.Role || user?.role || 'guide';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      <PageHeader
        eyebrow="Profile & Availability"
        title="Profile & Calendar"
        description="Manage your profile summary and set your availability calendar."
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

      {!loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Summary */}
          <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-5">Profile Summary</h3>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-500 to-teal-600 flex items-center justify-center text-2xl font-bold text-white mb-3 overflow-hidden ring-4 ring-brand-500/20">
                {user?.AvatarUrl ? (
                  <img src={user.AvatarUrl} alt={name} className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <h4 className="text-lg font-bold text-white">{name}</h4>
              <p className="flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                <Mail className="h-3.5 w-3.5 text-brand-400" />
                {email}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-slate-400">
                  <User className="h-4 w-4 text-brand-400" />
                  Role
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400 capitalize">
                  <Shield className="h-3 w-3" />
                  {role}
                </span>
              </div>

              {user?.City && (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-slate-400">Location</span>
                  <span className="text-sm font-medium text-white">{user.City}</span>
                </div>
              )}

              {user?.Rating != null && (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-slate-400">Rating</span>
                  <span className="text-sm font-bold text-amber-400">★ {Number(user.Rating).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Availability Calendar</h3>
              <button onClick={clearAll} disabled={clearing || blockedDates.size === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Clear All
              </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth}
                className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h4 className="text-base font-bold text-white">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h4>
              <button onClick={nextMonth}
                className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }

                const dateStr = formatDateStr(currentYear, currentMonth, day);
                const blocked = blockedDates.has(dateStr);
                const past = isPast(currentYear, currentMonth, day);
                const today = isToday(currentYear, currentMonth, day);
                const isToggling = toggling === dateStr;

                let bg = 'bg-white/[0.03]';
                let border = 'border-white/5';
                let textColor = 'text-white';

                if (past) {
                  bg = 'bg-white/[0.02]';
                  textColor = 'text-slate-600';
                } else if (blocked) {
                  bg = 'bg-red-500/15';
                  border = 'border-red-500/30';
                  textColor = 'text-red-300';
                } else {
                  bg = 'bg-emerald-500/10';
                  border = 'border-emerald-500/20';
                }

                return (
                  <button key={`day-${day}`}
                    onClick={() => toggleDate(day)}
                    disabled={past || isToggling}
                    className={`aspect-square rounded-xl border ${border} ${bg} ${textColor} flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 ${
                      today ? 'ring-2 ring-brand-400 ring-offset-1 ring-offset-ink-950 font-bold' : ''
                    } ${!past ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-50'} ${isToggling ? 'animate-pulse' : ''}`}>
                    {isToggling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>{day}</span>
                        {today && <span className="text-[9px] font-semibold text-brand-400 mt-0.5">Today</span>}
                        {!past && !blocked && <span className="text-[9px] text-emerald-400 mt-0.5">Available</span>}
                        {!past && blocked && <span className="text-[9px] text-red-400 mt-0.5">Blocked</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-5 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-3 w-3 rounded-full bg-emerald-500/30 border border-emerald-500/40" />
                Available
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-3 w-3 rounded-full bg-red-500/30 border border-red-500/40" />
                Blocked
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-3 w-3 rounded-full bg-white/10 border border-white/20" />
                Past
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
