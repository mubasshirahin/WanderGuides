import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Compass, Star, Globe, Zap, Loader2, Eye, EyeOff, MapPin, UserCircle } from 'lucide-react';
import Reveal from '../components/Reveal.jsx';

const stats = [
  { icon: Globe, value: '85+', label: 'Destinations' },
  { icon: Star, value: '4.9', label: 'Avg Rating' },
  { icon: Zap, value: '24/7', label: 'Support' },
];

export default function AuthPage({ onLogin, onRegister, onGoogleLogin, googleEnabled }) {
  const [mode, setMode] = useState('login');
  const [selectedRole, setSelectedRole] = useState('tourist');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(loginEmail, loginPassword, selectedRole);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onRegister(regName, regEmail, regPassword, selectedRole);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (accessToken) => {
    setLoading(true);
    setError('');
    try {
      await onGoogleLogin(accessToken, selectedRole);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-dark" />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <Reveal>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-teal-500 to-accent-500 text-white shadow-glow">
              <Compass className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {mode === 'login'
                ? 'Sign in to continue your journey.'
                : 'Join thousands of travelers and guides.'}
            </p>
          </div>
        </Reveal>

        {/* Stats row */}
        <Reveal delay={100}>
          <div className="mb-6 flex items-center justify-center gap-6">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-brand-400">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-display text-xs font-bold text-white">{value}</p>
                  <p className="text-[9px] text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Card */}
        <Reveal delay={200}>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">

            {/* ── Role Toggle ─────────────────────────── */}
            <div className="mb-6">
              <p className="mb-2.5 text-center text-xs font-medium text-slate-400">I want to</p>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => { setSelectedRole('tourist'); setError(''); }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 ${
                    selectedRole === 'tourist'
                      ? 'bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-lg shadow-brand-600/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Tourist
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedRole('guide'); setError(''); }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 ${
                    selectedRole === 'guide'
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCircle className="h-4 w-4" />
                  Guide
                </button>
              </div>
            </div>

            {/* Google Sign-In */}
            {googleEnabled ? (
              <GoogleSignInButton
                disabled={loading}
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
              />
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs text-slate-400">
                Google sign-in is unavailable until VITE_GOOGLE_CLIENT_ID is configured.
              </p>
            )}

            {/* Divider */}
            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
                {error}
              </div>
            )}

            {/* ── Login Form ──────────────────────────── */}
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-10 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-sheen flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all duration-300 hover:shadow-glow disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign In as {selectedRole === 'tourist' ? 'Tourist' : 'Guide'}
                </button>
                <p className="text-center text-sm text-slate-400">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(''); }}
                    className="font-semibold text-brand-400 hover:text-brand-300"
                  >
                    Sign up
                  </button>
                </p>
              </form>
            ) : (
              /* ── Register Form ────────────────────────── */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-10 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-sheen flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all duration-300 hover:shadow-glow disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create {selectedRole === 'tourist' ? 'Tourist' : 'Guide'} Account
                </button>
                <p className="text-center text-sm text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className="font-semibold text-brand-400 hover:text-brand-300"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </Reveal>

        {/* Testimonial */}
        <Reveal delay={300}>
          <div className="mt-8 flex justify-center">
            <div className="glass flex items-center gap-3 rounded-2xl px-5 py-3">
              <div className="flex -space-x-2">
                {[47, 68, 45].map((id, i) => (
                  <img
                    key={id}
                    src={`https://i.pravatar.cc/32?img=${id}`}
                    alt=""
                    className="h-7 w-7 rounded-full border-2 border-ink-950 object-cover"
                    style={{ zIndex: 3 - i }}
                  />
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-accent-400 text-accent-400" />
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Trusted by <span className="font-semibold text-white">50,000+</span> travelers
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function GoogleSignInButton({ disabled, onSuccess, onError }) {
  const googleLogin = useGoogleLogin({
    onSuccess: (response) => onSuccess(response.access_token),
    onError,
  });

  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1] hover:shadow-lg disabled:opacity-50"
    >
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Sign in with Google
    </button>
  );
}
