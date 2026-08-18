import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Compass, Mail, Lock, User, ChevronDown, Star, ShieldCheck } from 'lucide-react';
import Reveal from '../components/Reveal.jsx';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-3 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/15';

function Field({ id, label, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AuthPage({ onLogin }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = params.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);

  const isRegister = mode === 'register';

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
    navigate('/guides');
  };

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 animate-float-slow rounded-full bg-brand-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 animate-float-slow rounded-full bg-teal-200/40 blur-3xl [animation-delay:3s]"
      />

      <Reveal className="relative w-full max-w-4xl">
        <div className="grid overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-card-hover sm:grid-cols-2">
          {/* ---------- Brand panel ---------- */}
          <div className="noise relative hidden flex-col justify-between overflow-hidden bg-ink-950 p-10 sm:flex">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 animate-aurora rounded-full bg-brand-500/30 blur-[90px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 animate-float-slow rounded-full bg-teal-500/25 blur-[90px]"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-dark" />

            <div className="relative flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-teal-500 to-accent-500 text-white shadow-glow">
                <Compass className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold text-white">WanderGuides</span>
            </div>

            <div className="relative">
              <h2 className="font-display text-3xl font-extrabold leading-tight text-white">
                Every destination has a{' '}
                <span className="text-gradient">story.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Join thousands of travelers who explore with local, vetted tourist guides — or sign
                up as a guide and share your city with the world.
              </p>

              <div className="glass mt-8 flex animate-float items-center gap-3 rounded-2xl p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/20 text-accent-300">
                  <Star className="h-5 w-5 fill-accent-300" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">"Best day of our trip"</p>
                  <p className="text-xs text-slate-400">— Sarah &amp; Tom, Kyoto</p>
                </div>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                {['Verified local guides', 'Secure payments', 'Flexible schedules'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative font-mono text-xs text-slate-600">
              &copy; {new Date().getFullYear()} WanderGuides
            </p>
          </div>

          {/* ---------- Form panel ---------- */}
          <div className="p-8 sm:p-10">
            <h1 className="font-display text-2xl font-extrabold text-slate-900">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isRegister ? 'Join WanderGuides in less than a minute.' : 'Log in to continue exploring.'}
            </p>

            {/* Toggle with sliding pill */}
            <div className="relative mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <span
                aria-hidden="true"
                className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-md transition-all duration-400 ease-out ${
                  mode === 'register' ? 'left-[calc(50%)]' : 'left-1'
                }`}
              />
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`relative z-10 rounded-xl py-2.5 text-sm font-semibold capitalize transition-colors duration-300 ${
                    mode === m ? 'text-brand-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {isRegister && (
                <Field id="name" label="Full name">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input id="name" type="text" required placeholder="Minh Tran" className={inputBase} />
                  </div>
                </Field>
              )}

              <Field id="email" label="Email address">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className={inputBase}
                  />
                </div>
              </Field>

              <Field id="password" label="Password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className={inputBase}
                  />
                </div>
              </Field>

              {isRegister && (
                <Field id="role" label="I am a...">
                  <div className="relative">
                    <select
                      id="role"
                      className={`${inputBase} appearance-none bg-white pr-9`}
                      defaultValue="tourist"
                    >
                      <option value="tourist">Tourist — I want to hire guides</option>
                      <option value="guide">Tour Guide — I want to offer tours</option>
                    </select>
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </Field>
              )}

              <button
                type="submit"
                className="btn-sheen w-full rounded-xl bg-gradient-to-r from-brand-600 via-teal-600 to-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow"
              >
                {isRegister ? 'Create account' : 'Log in'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Demo mode &mdash; any credentials log you in. Mock `isAuthenticated` in App.jsx.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}