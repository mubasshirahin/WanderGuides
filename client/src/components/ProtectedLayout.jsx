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
    <div className="bg-grid-dark relative min-h-[70vh]">
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </div>
  );
}
