import { Outlet, Navigate } from 'react-router-dom';

/**
 * Wraps the logged-in pages (guides, bookings, dashboard, profile).
 * Redirects to /auth when the mock isAuthenticated flag is false.
 */
export default function ProtectedLayout({ isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="bg-grid-light relative min-h-[70vh]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand-100/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-teal-100/50 blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </div>
  );
}