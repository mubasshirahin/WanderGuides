import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Loader2, User, Mail, Shield, MapPin, Star,
  AlertCircle, X, Clock, Globe, DollarSign, Edit3, Save, CalendarDays, ChevronLeft, ChevronRight,
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

/* ─── Main Component ─────────────────────────────────────── */
export default function GuideProfileCalendarPage() {
  const storedUser = getStoredUser();

  // Profile state
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // Fetch guide profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await authFetch('/api/guides/explore?pageSize=48');
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      const guide = (data.guides || []).find(g => Number(g.UserID) === Number(storedUser?.Id ?? storedUser?.id));
      if (guide) {
        setProfile(guide);
        setForm({
          avatarUrl: guide.AvatarUrl || storedUser?.AvatarUrl || '',
          bio: guide.Bio || '',
          city: guide.City || '',
          specialties: guide.Specialties || '',
          languages: guide.Languages || '',
          hourlyRate: guide.HourlyRate || '',
          dailyRate: guide.DailyRate || guide.RatePerDay || '',
        });
      } else {
        setProfile({
          Bio: storedUser?.Bio || '',
          City: storedUser?.City || '',
          Specialties: storedUser?.Specialties || '',
          Languages: storedUser?.Languages || '',
          HourlyRate: storedUser?.HourlyRate || '',
          DailyRate: storedUser?.DailyRate || storedUser?.RatePerDay || '',
          Rating: storedUser?.Rating || 0,
          TotalReviews: storedUser?.TotalReviews || 0,
        });
        setForm({
          avatarUrl: storedUser?.AvatarUrl || '',
          bio: storedUser?.Bio || '',
          city: storedUser?.City || '',
          specialties: storedUser?.Specialties || '',
          languages: storedUser?.Languages || '',
          hourlyRate: storedUser?.HourlyRate || '',
          dailyRate: storedUser?.DailyRate || storedUser?.RatePerDay || '',
        });
      }
    } catch {
      if (storedUser) {
        setProfile({
          Bio: storedUser.Bio || '', City: storedUser.City || '',
          Specialties: storedUser.Specialties || '', Languages: storedUser.Languages || '',
          HourlyRate: storedUser.HourlyRate || '', DailyRate: storedUser.DailyRate || storedUser.RatePerDay || '',
          Rating: storedUser.Rating || 0, TotalReviews: storedUser.TotalReviews || 0,
        });
        setForm({
          avatarUrl: storedUser.AvatarUrl || '',
          bio: storedUser.Bio || '', city: storedUser.City || '',
          specialties: storedUser.Specialties || '', languages: storedUser.Languages || '',
          hourlyRate: storedUser.HourlyRate || '', dailyRate: storedUser.DailyRate || storedUser.RatePerDay || '',
        });
      }
    }
  }, [storedUser?.Id]);

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));
  }, [fetchProfile]);

  // Save profile
  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/guides/profile', {
        method: 'PUT',
        body: JSON.stringify({
          avatarUrl: form.avatarUrl,
          bio: form.bio,
          city: form.city,
          specialties: form.specialties,
          languages: form.languages,
          hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
          dailyRate: form.dailyRate ? Number(form.dailyRate) : undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update profile');
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to update');
      sessionStorage.setItem('wg_user', JSON.stringify({ ...storedUser, AvatarUrl: form.avatarUrl || null }));
      setEditing(false);
      await fetchProfile();
      addToast('Profile updated!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const name = storedUser?.FullName || storedUser?.fullName || 'Guide';
  const email = storedUser?.Email || storedUser?.email || '';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const profileFields = [profile?.AvatarUrl || storedUser?.AvatarUrl, profile?.Bio, profile?.City, profile?.Specialties, profile?.Languages, profile?.DailyRate || profile?.RatePerDay];
  const profileCompletion = Math.round(profileFields.filter(Boolean).length / profileFields.length * 100);

  return (
    <div>
      <PageHeader eyebrow="Profile" title="My Profile" description="Manage your guide profile details." />

      {loading && <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300 flex items-center justify-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      {!loading && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Avatar + Name Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-500 to-teal-600 flex items-center justify-center text-2xl font-bold text-white mb-3 overflow-hidden ring-4 ring-brand-500/20">
                {storedUser?.AvatarUrl ? <img src={storedUser.AvatarUrl} alt={name} className="h-20 w-20 rounded-full object-cover" /> : initials}
              </div>
              <h4 className="text-lg font-bold text-white">{name}</h4>
              <p className="flex items-center gap-1.5 text-sm text-slate-400 mt-1"><Mail className="h-3.5 w-3.5 text-brand-400" />{email}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400 mt-2"><Shield className="h-3 w-3" />Guide</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {profile?.Rating != null && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                  <Star className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{Number(profile.Rating).toFixed(1)}</p>
                  <p className="text-[10px] text-slate-500">Rating</p>
                </div>
              )}
              {profile?.TotalReviews != null && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                  <User className="h-4 w-4 text-brand-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{profile.TotalReviews}</p>
                  <p className="text-[10px] text-slate-500">Reviews</p>
                </div>
              )}
            </div>
          </div>

          {/* Profile Edit Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Profile Details</h3>
                <p className="mt-1 text-xs text-slate-500">Public listing completeness: {profileCompletion}%</p>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/15 transition-colors">
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
              ) : (
                <button onClick={saveProfile} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Profile photo URL</label>
                  <input type="url" value={form.avatarUrl || ''} onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))} placeholder="https://example.com/photo.jpg"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400" />
                  <p className="mt-1 text-xs text-slate-500">Paste a public image URL. Leave blank to use your initials.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Bio</label>
                  <textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400 resize-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Specialties</label>
                  <input value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))}
                    placeholder="e.g. Adventure, Food, History"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Languages</label>
                  <input value={form.languages} onChange={e => setForm(f => ({ ...f, languages: e.target.value }))}
                    placeholder="e.g. English, Bengali"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Hourly Rate (৳)</label>
                    <input type="number" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Daily Rate (৳)</label>
                    <input type="number" value={form.dailyRate} onChange={e => setForm(f => ({ ...f, dailyRate: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-400 transition-all" style={{ width: `${profileCompletion}%` }} /></div>
                {profile?.Bio && <p className="text-sm text-slate-300">{profile.Bio}</p>}
                {profile?.City && (
                  <div className="flex items-center gap-2 text-sm"><MapPin className="h-3.5 w-3.5 text-brand-400" /><span className="text-slate-300">{profile.City}</span></div>
                )}
                {profile?.Specialties && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile.Specialties.split(',').map((s, i) => (
                      <span key={i} className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs text-brand-300">{s.trim()}</span>
                    ))}
                  </div>
                )}
                {profile?.Languages && (
                  <div className="flex items-center gap-2 text-sm mt-1"><Globe className="h-3.5 w-3.5 text-slate-500" /><span className="text-slate-400">{profile.Languages}</span></div>
                )}
                <div className="flex items-center gap-4 mt-2">
                  {profile?.HourlyRate && (
                    <div className="flex items-center gap-1 text-sm"><Clock className="h-3.5 w-3.5 text-amber-400" /><span className="font-bold text-white">৳{profile.HourlyRate}</span><span className="text-xs text-slate-500">/hr</span></div>
                  )}
                  {(profile?.DailyRate || profile?.RatePerDay) && (
                    <div className="flex items-center gap-1 text-sm"><DollarSign className="h-3.5 w-3.5 text-emerald-400" /><span className="font-bold text-white">৳{profile.DailyRate || profile.RatePerDay}</span><span className="text-xs text-slate-500">/day</span></div>
                  )}
                </div>
                {profileCompletion < 100 && <p className="pt-2 text-xs text-slate-500">Add a photo, bio, city, specialties, languages, and daily rate so tourists know what to expect. Select Edit to complete your listing.</p>}
              </div>
            )}
          </div>
          <AvailabilityCalendar />
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function dateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function AvailabilityCalendar() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [blockedDates, setBlockedDates] = useState(new Set());
  const [bookedDates, setBookedDates] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState('');
  const [error, setError] = useState('');

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [availabilityRes, bookingsRes] = await Promise.all([
        authFetch('/api/guide-availability'),
        authFetch('/api/bookings'),
      ]);
      const availability = await availabilityRes.json();
      const bookingsData = await bookingsRes.json();
      if (!availabilityRes.ok || !availability.ok) throw new Error(availability.message || 'Could not load availability');
      if (!bookingsRes.ok || !bookingsData.ok) throw new Error(bookingsData.message || 'Could not load bookings');

      setBlockedDates(new Set((availability.blockedDates || []).map((item) => dateKey(item.BlockedDate)).filter(Boolean)));
      const booked = new Set();
      for (const booking of bookingsData.bookings || []) {
        if (!['pending', 'confirmed'].includes(String(booking.Status).toLowerCase())) continue;
        const start = new Date(`${dateKey(booking.StartDate)}T00:00:00`);
        const end = new Date(`${dateKey(booking.EndDate)}T00:00:00`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
        for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
          booked.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
        }
      }
      setBookedDates(booked);
    } catch (err) {
      setError(err.message || 'Could not load availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const toggleDate = async (key) => {
    if (!key || bookedDates.has(key) || savingDate) return;
    setSavingDate(key);
    setError('');
    try {
      const isBlocked = blockedDates.has(key);
      const res = isBlocked
        ? await authFetch(`/api/guide-availability/unblock/${key}`, { method: 'DELETE' })
        : await authFetch('/api/guide-availability/block', {
            method: 'POST',
            body: JSON.stringify({ dates: [key], reason: 'Unavailable' }),
          });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Could not update this date');
      setBlockedDates((current) => {
        const next = new Set(current);
        if (isBlocked) next.delete(key);
        else next.add(key);
        return next;
      });
    } catch (err) {
      setError(err.message || 'Could not update this date');
    } finally {
      setSavingDate('');
    }
  };

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-white"><CalendarDays className="h-4 w-4 text-brand-400" />Availability calendar</h3>
          <p className="mt-1 text-xs text-slate-400">Select an open date to block it. Select a blocked date to make it available again.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Previous month" className="rounded-lg bg-white/10 p-2 text-slate-300 hover:bg-white/15"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-32 text-center text-sm font-semibold text-white">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Next month" className="rounded-lg bg-white/10 p-2 text-slate-300 hover:bg-white/15"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {error && <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-400" /></div> : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day} className="py-2">{day}</span>)}
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const date = new Date(year, monthIndex, day);
              const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isBooked = bookedDates.has(key);
              const isBlocked = blockedDates.has(key);
              const isPast = date < today;
              return (
                <button key={key} disabled={isBooked || (isPast && !isBlocked) || savingDate === key} onClick={() => toggleDate(key)} title={isBooked ? 'A pending or confirmed booking exists' : isBlocked ? 'Click to make available' : isPast ? 'Past date' : 'Click to block this date'}
                  className={`relative min-h-10 rounded-lg text-sm transition-colors disabled:cursor-not-allowed ${isBooked ? 'bg-sky-500/20 text-sky-300' : isBlocked ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' : isPast ? 'text-slate-700' : 'text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300'}`}>
                  {day}{savingDate === key && <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-ink-900/80"><Loader2 className="h-4 w-4 animate-spin" /></span>}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded bg-emerald-400/50" />Available</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded bg-rose-400/60" />Blocked by you</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded bg-sky-400/60" />Booking request or confirmed</span>
          </div>
        </>
      )}
    </section>
  );
}
