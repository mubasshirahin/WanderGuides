import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Loader2, User, Mail, Shield, MapPin, Star,
  AlertCircle, X, Clock, Globe, DollarSign, Edit3, Save,
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
      const guide = (data.guides || []).find(g => g.UserID === storedUser?.Id);
      if (guide) {
        setProfile(guide);
        setForm({
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
              <h3 className="text-sm font-bold text-white">Profile Details</h3>
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
              </div>
            )}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
