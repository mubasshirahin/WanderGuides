import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Compass, Menu, X, LogOut, LayoutDashboard, Search, CalendarDays, UserCircle, Plus, MessageSquare, ClipboardList, Star, Map, Clock } from 'lucide-react';

const loggedOutLinks = [{ to: '/', label: 'Home' }];

const roleLinks = {
  tourist: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/explore', label: 'Explore', icon: Search },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/custom-tour', label: 'Custom Tour', icon: ClipboardList },
    { to: '/reviews', label: 'Reviews', icon: Star },
    { to: '/profile', label: 'Profile', icon: UserCircle },
  ],
  guide: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/my-tours', label: 'My Tours', icon: Map },
    { to: '/custom-requests', label: 'Custom Requests', icon: ClipboardList },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/availability', label: 'Profile', icon: UserCircle },
  ],
  admin: [
    { to: '/guides', label: 'Manage Guides', icon: Search },
    { to: '/guides/new', label: 'Add Guide', icon: Plus },
    { to: '/bookings', label: 'Bookings', icon: CalendarDays },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/profile', label: 'Profile', icon: UserCircle },
  ],
};

export default function Navbar({ isAuthenticated, role, onLogout }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const links = isAuthenticated ? (roleLinks[role] || roleLinks.tourist) : loggedOutLinks;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/10 bg-ink-950/90 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl'
          : 'border-b border-transparent bg-ink-950/60 backdrop-blur-md'
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent"
      />

      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 via-teal-500 to-accent-500 text-white shadow-lg shadow-brand-500/30 transition-transform duration-500 group-hover:rotate-[8deg]">
              <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Compass className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Wander<span className="text-gradient">Guides</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `group relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-300 after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-gradient-to-r after:from-brand-500 after:to-teal-500 after:transition-transform after:duration-300 hover:after:scale-x-100 ${
                    isActive
                      ? 'text-brand-400 after:scale-x-100'
                      : 'text-slate-400 hover:text-white'
                  }`
                }
              >
                {Icon && (
                  <Icon className="h-4 w-4 text-slate-500 transition-colors duration-300 group-hover:text-brand-400" />
                )}
                {label}
              </NavLink>
            ))}
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <button
                onClick={onLogout}
                className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/15"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition-colors duration-300 hover:text-white"
                >
                  Login
                </Link>
                <Link
                  to="/auth?mode=register"
                  className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ${
          open ? 'max-h-96 border-t border-white/10 bg-ink-950/95 backdrop-blur-xl' : 'max-h-0'
        }`}
      >
        <div className="px-4 pb-4 pt-3">
          <div className="flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500/15 to-teal-500/15 text-brand-400'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {Icon && <Icon className="h-4 w-4" />}
                {label}
              </NavLink>
            ))}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  Login
                </Link>
                <Link
                  to="/auth?mode=register"
                  onClick={() => setOpen(false)}
                  className="btn-sheen rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-brand-600/30"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
