import { useEffect, useState, useCallback } from 'react';
import {
  UserCircle, Mail, Phone, MapPin, Globe, Languages, Shield, ShieldCheck,
  Star, CalendarDays, Loader2, Save, Eye, EyeOff, Lock, Camera, Edit3,
  Heart, AlertTriangle, X, CheckCircle, MapPinned, BadgeCheck
} from 'lucide-react';
import { authFetch } from '../lib/demoAuth.js';

const INTEREST_OPTIONS = [
  'Hiking', 'Foodie', 'Culture', 'History', 'Adventure', 'Photography',
  'Nature', 'Beach', 'Shopping', 'Nightlife', 'Wildlife', 'Spiritual',
  'Architecture', 'Museums', 'Festivals', 'Sports', 'Luxury', 'Backpacking',
];

export default function TouristProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    fullName: '', phone: '', avatarUrl: '', bio: '',
    city: '', country: '', languages: '', travelInterests: '',
    emergencyContactName: '', emergencyContactPhone: '',
  });

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/tourist-profile/me');
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'Failed to load profile');
      setProfile(json.profile);

      const u = json.profile.user;
      const tp = json.profile.touristProfile;
      setForm({
        fullName: u.FullName || '',
        phone: u.Phone || '',
        avatarUrl: u.AvatarUrl || '',
        bio: tp?.Bio || u.Bio || '',
        city: tp?.City || '',
        country: tp?.Country || '',
        languages: tp?.Languages || '',
        travelInterests: tp?.TravelInterests || '',
        emergencyContactName: tp?.EmergencyContactName || '',
        emergencyContactPhone: tp?.EmergencyContactPhone || '',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setSuccess('');
  };

  const toggleInterest = (interest) => {
    setForm(f => {
      const current = f.travelInterests ? f.travelInterests.split(',').map(s => s.trim()) : [];
      const updated = current.includes(interest)
        ? current.filter(i => i !== interest)
        : [...current, interest];
      return { ...f, travelInterests: updated.join(', ') };
    });
    setSuccess('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess('');
    try {
      const res = await authFetch('/api/tourist-profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'Failed to update');

      // Update session storage user data
      if (json.user) {
        const stored = JSON.parse(sessionStorage.getItem('wg_user') || '{}');
        sessionStorage.setItem('wg_user', JSON.stringify({ ...stored, ...json.user }));
      }

      setSuccess('Profile updated successfully!');
      await fetchProfile();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setChangingPw(true);
    setError(null);
    setSuccess('');
    try {
      const res = await authFetch('/api/tourist-profile/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'Failed to change password');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
        {error}
        <button onClick={fetchProfile} className="ml-3 underline hover:text-red-200">Retry</button>
      </div>
    );
  }

  const { user, touristProfile, stats, reviews } = profile || {};
  const isNidVerified = touristProfile?.IsNIDVerified;
  const interests = touristProfile?.TravelInterests
    ? touristProfile.TravelInterests.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const memberSince = user?.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div>
      {/* ─── Tab Navigation ────────────────────────────── */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
        <button
          onClick={() => { setActiveTab('profile'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'profile'
              ? 'bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCircle className="h-4 w-4" />
          View Profile
        </button>
        <button
          onClick={() => { setActiveTab('edit'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'edit'
              ? 'bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Edit3 className="h-4 w-4" />
          Edit Profile & Settings
        </button>
      </div>

      {/* ─── Success / Error Banners ───────────────────── */}
      {success && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-300">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 1: PUBLIC PROFILE VIEW                        */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Hero Header */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-brand-500 via-teal-500 to-accent-500 p-0.5">
                  <div className="flex h-full w-full items-center justify-center rounded-2xl bg-ink-950 overflow-hidden">
                    {user?.AvatarUrl ? (
                      <img src={user.AvatarUrl} alt={user.FullName} className="h-full w-full object-cover rounded-2xl" />
                    ) : (
                      <UserCircle className="h-12 w-12 text-slate-500" />
                    )}
                  </div>
                </div>
                {isNidVerified && (
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="font-display text-2xl font-bold text-white">{user?.FullName}</h2>
                  {isNidVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                      <BadgeCheck className="h-3 w-3" />
                      Verified Tourist
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-slate-400">
                  {touristProfile?.City && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {touristProfile.City}{touristProfile.Country ? `, ${touristProfile.Country}` : ''}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Member since {memberSince}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <StatCard icon={CheckCircle} label="Completed Tours" value={stats?.completedTours || 0} color="text-emerald-400" />
            <StatCard icon={Star} label="Reviews" value={stats?.totalReviews || 0} color="text-accent-400" />
            <StatCard icon={CalendarDays} label="Total Bookings" value={stats?.totalBookings || 0} color="text-brand-400" />
          </div>

          {/* Travel Interests */}
          {interests.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
                <Heart className="h-5 w-5 text-rose-400" />
                Travel Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span key={interest} className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300 border border-brand-500/20">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {touristProfile?.Languages && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
                <Languages className="h-5 w-5 text-teal-400" />
                Languages
              </h3>
              <p className="text-sm text-slate-300">{touristProfile.Languages}</p>
            </div>
          )}

          {/* Bio */}
          {(user?.Bio || touristProfile?.Bio) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
                <UserCircle className="h-5 w-5 text-brand-400" />
                About Me
              </h3>
              <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                {touristProfile?.Bio || user?.Bio}
              </p>
            </div>
          )}

          {/* Emergency Contact — Privacy Notice */}
          {touristProfile?.EmergencyContactName && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">Emergency Contact</p>
                  <p className="mt-1 text-xs text-slate-400">
                    This information is private and only shared with guides during active bookings.
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-sm text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <UserCircle className="h-3.5 w-3.5" />
                      {touristProfile.EmergencyContactName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {touristProfile.EmergencyContactPhone}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reviews from Guides */}
          {reviews && reviews.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
                <Star className="h-5 w-5 text-accent-400" />
                Reviews from Guides
                <span className="ml-auto text-sm font-normal text-slate-400">({reviews.length})</span>
              </h3>
              <div className="space-y-4">
                {reviews.map((review, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-full bg-white/[0.06]">
                        {review.GuideAvatar ? (
                          <img src={review.GuideAvatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserCircle className="h-5 w-5 text-slate-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{review.GuideName}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} className={`h-3 w-3 ${j < review.Rating ? 'fill-accent-400 text-accent-400' : 'text-slate-600'}`} />
                          ))}
                          <span className="ml-1 text-[10px] text-slate-500">
                            {new Date(review.CreatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.Comment && (
                      <p className="mt-2 text-sm text-slate-300">{review.Comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No reviews placeholder */}
          {reviews && reviews.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
              <Star className="mx-auto mb-3 h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">No reviews from guides yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 2: EDIT PROFILE & SETTINGS                    */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'edit' && (
        <div className="space-y-6">
          {/* Profile Edit Form */}
          <form onSubmit={handleSaveProfile} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
            <h3 className="mb-6 font-display text-lg font-bold text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-brand-400" />
              Personal Information
            </h3>

            {/* Avatar URL */}
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Avatar URL</label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={form.avatarUrl}
                  onChange={handleChange('avatarUrl')}
                  placeholder="https://example.com/avatar.jpg"
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                />
                {form.avatarUrl && (
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10">
                    <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Name & Phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Full Name</label>
                <input type="text" value={form.fullName} onChange={handleChange('fullName')}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Phone</label>
                <input type="text" value={form.phone} onChange={handleChange('phone')} placeholder="+880 1XXXXXXXXX"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15" />
              </div>
            </div>

            {/* City & Country */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">City</label>
                <input type="text" value={form.city} onChange={handleChange('city')} placeholder="e.g. Dhaka"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Country</label>
                <input type="text" value={form.country} onChange={handleChange('country')} placeholder="e.g. Bangladesh"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15" />
              </div>
            </div>

            {/* Languages */}
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Spoken Languages</label>
              <input type="text" value={form.languages} onChange={handleChange('languages')} placeholder="e.g. English, Bengali, Hindi"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15" />
            </div>

            {/* Bio */}
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Bio</label>
              <textarea value={form.bio} onChange={handleChange('bio')} rows={3} placeholder="Tell guides about yourself..."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15" />
            </div>

            {/* Travel Interests */}
            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium text-slate-300">Travel Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => {
                  const selected = form.travelInterests.split(',').map(s => s.trim()).includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all border ${
                        selected
                          ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                          : 'bg-white/[0.04] text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {selected && <CheckCircle className="mr-1 inline h-3 w-3" />}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="mt-6 border-t border-white/10 pt-6">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Emergency Contact
                <span className="text-[10px] font-normal text-slate-500">(Private — only shared during active bookings)</span>
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Contact Name</label>
                  <input type="text" value={form.emergencyContactName} onChange={handleChange('emergencyContactName')} placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Contact Phone</label>
                  <input type="text" value={form.emergencyContactPhone} onChange={handleChange('emergencyContactPhone')} placeholder="+880 1XXXXXXXXX"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15" />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all duration-300 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Security Section */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
            <h3 className="mb-6 font-display text-lg font-bold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-brand-400" />
              Security
            </h3>

            {/* Google Account Status */}
            <div className="mb-6 flex items-center justify-between rounded-xl bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">Google Account</p>
                  <p className="text-xs text-slate-400">Sign in with Google</p>
                </div>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-400">
                Not Linked
              </span>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-300">Change Password</h4>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-10 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="Min 6 characters"
                      minLength={6}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-10 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                    minLength={6}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={changingPw || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
              >
                {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {changingPw ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl text-center">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="font-display text-xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">{label}</p>
    </div>
  );
}
