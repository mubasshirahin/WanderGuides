import { Link } from 'react-router-dom';
import { Compass, Globe2, ShieldCheck, Headset } from 'lucide-react';

const links = [
  { to: '/', label: 'Home' },
  { to: '/guides', label: 'Search Guides' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/dashboard', label: 'Dashboard' },
];

const trust = [
  { icon: ShieldCheck, label: 'Verified guides' },
  { icon: Globe2, label: '85+ destinations' },
  { icon: Headset, label: '24/7 support' },
];

export default function Footer() {
  return (
    <footer className="noise relative overflow-hidden bg-ink-950">
      {/* top aurora line */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[100px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-teal-500 to-accent-500 text-white shadow-lg shadow-brand-500/30 transition-transform duration-500 group-hover:rotate-[8deg]">
              <Compass className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold text-white">
              Wander<span className="text-gradient">Guides</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="relative transition-colors duration-300 after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-gradient-to-r after:from-brand-400 after:to-teal-400 after:transition-transform after:duration-300 hover:text-white hover:after:origin-left hover:after:scale-x-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {trust.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-300"
              >
                <Icon className="h-3.5 w-3.5 text-emerald-300" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/10 pt-7 text-center sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} WanderGuides. Crafted for explorers — powered by MS SQL Server.
          </p>
          <p className="font-mono text-xs text-slate-600">wander.guides / est. 2026</p>
        </div>
      </div>
    </footer>
  );
}