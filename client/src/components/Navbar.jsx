import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Menu, X, LogOut, LayoutDashboard, Search, CalendarDays, UserCircle, Plus, MessageSquare, ClipboardList, Star, Map, MapPin, ShieldCheck, ChevronDown, Bell, CheckCheck, Loader2 } from 'lucide-react';
import { authFetch, getStoredUser, getToken } from '../lib/demoAuth.js';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

// Notification feed per role: tourist -> TouristNotifications, guide -> GuideNotifications.
const NOTIFICATION_SOURCES = {
  tourist: { list: '/api/tourist/notifications', read: (id) => `/api/tourist/notifications/${id}/read`, event: 'notification:new' },
  guide: { list: '/api/guide/notifications', read: (id) => `/api/guide/notifications/${id}/read`, event: 'guide_notification:new' },
};

function NotificationBell({ role }) {
  const source = NOTIFICATION_SOURCES[role];
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const unreadCount = items.filter((item) => !item.IsRead).length;

  useEffect(() => {
    if (!source) return undefined;
    let active = true;
    authFetch(source.list)
      .then((res) => res.json())
      .then((json) => { if (active && json.ok) setItems(json.notifications || []); })
      .catch(() => { /* the dropdown shows an empty state */ })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [source]);

  useEffect(() => {
    if (!source) return undefined;
    const token = getToken();
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on(source.event, (notification) => {
      setItems((current) => [notification, ...current.filter((item) => item.Id !== notification.Id)].slice(0, 30));
    });
    return () => socket.disconnect();
  }, [source]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (!source) return null;

  const markRead = async (id) => {
    if (!id) return;
    setItems((current) => current.map((item) => (item.Id === id ? { ...item, IsRead: true } : item)));
    try {
      await authFetch(source.read(id), { method: 'PUT' });
    } catch { /* stays read locally and syncs on the next load */ }
  };

  const openNotification = (item) => {
    markRead(item.Id);
    if (item.LinkUrl) {
      setOpen(false);
      navigate(item.LinkUrl);
    }
  };

  const markAllRead = () => Promise.all(items.filter((item) => !item.IsRead).map((item) => markRead(item.Id)));

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        className={`relative rounded-xl border p-2 transition-colors duration-300 ${open ? 'border-brand-500/40 bg-brand-500/10 text-brand-300' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white'}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-orange-600 px-1 text-[10px] font-extrabold text-white shadow-lg shadow-accent-500/40">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-ink-950/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="font-display text-sm font-bold text-white">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-brand-300 transition-all hover:bg-white/[0.12] hover:text-white">
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          {!loaded ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto h-6 w-6 text-slate-600" />
              <p className="mt-2 text-xs text-slate-500">No notifications yet.</p>
            </div>
          ) : (
            <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.Id}
                  onClick={() => openNotification(item)}
                  className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors ${item.IsRead ? 'hover:bg-white/5' : 'bg-brand-500/[0.08] hover:bg-brand-500/[0.14]'}`}
                >
                  {!item.IsRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />}
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold leading-snug text-white">{item.Title}</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-slate-400">{item.Body}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const loggedOutLinks = [{ to: '/', label: 'Home' }];

const roleLinks = {
  tourist: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/explore', label: 'Explore Guides', icon: Search },
    { to: '/browse-tours', label: 'Browse Tours', icon: MapPin },
    { to: '/bookings', label: 'Bookings', icon: CalendarDays },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/custom-tour', label: 'Custom Tour', icon: ClipboardList },
  ],
  guide: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/my-tours', label: 'My Tours', icon: Map },
    { to: '/bookings', label: 'Bookings', icon: CalendarDays },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/custom-requests', label: 'Custom Tour Request', icon: ClipboardList },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/guides', label: 'Manage Guides', icon: Search },
    { to: '/guides/new', label: 'Add Guide', icon: Plus },
    { to: '/guide-verifications', label: 'Verification', icon: ShieldCheck },
    { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  ],
};

// Profile menu target per role: guide-er profile + calendar eksathe /availability-te.
const profileTarget = (role) => (role === 'guide' ? '/availability' : '/profile');

function ProfileMenu({ role, onLogout, onNavigate, mobile = false }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const boxRef = useRef(null);
  const stored = getStoredUser() || {};
  const name = stored.FullName || stored.fullName || stored.name || stored.Email || 'Account';
  const initial = String(name).trim().charAt(0).toUpperCase() || 'A';
  const toProfile = profileTarget(role);
  const menuActive = ['/profile', '/availability', '/reviews'].includes(location.pathname);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open ]);

  const go = () => {
    setOpen(false);
    onNavigate?.();
  };

  const menuItems = [
    { to: toProfile, label: 'My Profile', icon: UserCircle },
    ...(role === 'admin' ? [] : [{ to: '/reviews', label: 'Reviews', icon: Star }]),
  ];

  if (mobile) {
    return (
      <div className="mt-1 border-t border-white/10 pt-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-500 text-sm font-bold text-white">
            {initial}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-white">{name}</span>
            <span className="block text-xs capitalize text-slate-400">{role || 'account'}</span>
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          {menuItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={go}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-500/15 to-teal-500/15 text-brand-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => {
              go();
              onLogout();
            }}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-left transition-colors duration-300 ${
          menuActive || open
            ? 'border-brand-500/40 bg-brand-500/10'
            : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-500 text-sm font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[140px] leading-tight lg:block">
          <span className="block truncate text-sm font-semibold text-white">{name}</span>
          <span className="block text-[11px] capitalize text-slate-400">{role || 'account'}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-ink-950/95 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-3 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="text-xs capitalize text-slate-400">{role || 'account'}</p>
          </div>
          <div className="p-1.5">
            {menuItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={go}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-500/15 text-brand-300' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                go();
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
              <>
                <NotificationBell role={role} />
                <ProfileMenu role={role} onLogout={onLogout} />
              </>
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

          {/* Mobile notifications + toggle */}
          <div className="flex items-center gap-1.5 md:hidden">
            {isAuthenticated && <NotificationBell role={role} />}
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ${
          open ? 'max-h-[32rem] overflow-y-auto border-t border-white/10 bg-ink-950/95 backdrop-blur-xl' : 'max-h-0'
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

          <div className="mt-3">
            {isAuthenticated ? (
              <ProfileMenu role={role} onLogout={onLogout} onNavigate={() => setOpen(false)} mobile />
            ) : (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
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
