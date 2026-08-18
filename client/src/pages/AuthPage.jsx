import { Compass, Star, ShieldCheck, MapPin, UserCircle, Shield } from 'lucide-react';
import Reveal from '../components/Reveal.jsx';

const roles = [
  {
    key: 'tourist',
    label: 'Login as Tourist',
    description: 'Explore guides, view profiles, and book tours.',
    icon: MapPin,
    gradient: 'from-brand-600 to-teal-600',
    shadow: 'shadow-brand-600/30',
    hoverShadow: 'hover:shadow-glow',
  },
  {
    key: 'guide',
    label: 'Login as Local Guide',
    description: 'Manage your profile, set rates, and connect with tourists.',
    icon: UserCircle,
    gradient: 'from-emerald-600 to-teal-600',
    shadow: 'shadow-emerald-600/30',
    hoverShadow: 'hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]',
  },
  {
    key: 'admin',
    label: 'Admin Login',
    description: 'Full access to manage guides, bookings, and users.',
    icon: Shield,
    gradient: 'from-ink-900 to-slate-700',
    shadow: 'shadow-ink-900/30',
    hoverShadow: 'hover:shadow-xl',
  },
];

export default function AuthPage({ onLogin }) {
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
                Choose your role to continue. Tourists can browse guides, local guides can manage their profiles, and admins have full control.
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

          {/* ---------- Role selection panel ---------- */}
          <div className="flex flex-col justify-center p-8 sm:p-10">
            <h1 className="font-display text-2xl font-extrabold text-slate-900">
              Choose your role
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Select how you'd like to use WanderGuides.
            </p>

            <div className="mt-8 space-y-3">
              {roles.map(({ key, label, description, icon: Icon, gradient, shadow, hoverShadow }) => (
                <button
                  key={key}
                  onClick={() => onLogin(key)}
                  className={`group w-full text-left rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:border-transparent hover:bg-gradient-to-r ${gradient} hover:shadow-lg ${shadow} ${hoverShadow} hover:-translate-y-0.5`}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all duration-300 group-hover:bg-white/20 group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900 transition-colors duration-300 group-hover:text-white">
                        {label}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 transition-colors duration-300 group-hover:text-white/80">
                        {description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-slate-400">
              Demo mode &mdash; any role selection logs you in instantly.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
