import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Landing from './pages/Landing.jsx';
import AuthPage from './pages/AuthPage.jsx';
import GuidesPage from './pages/GuidesPage.jsx';
import GuideFormPage from './pages/GuideFormPage.jsx';
import BookingsPage from './pages/BookingsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ProtectedLayout from './components/ProtectedLayout.jsx';
import { demoLogin, demoLogout } from './lib/demoAuth.js';

export default function App() {
  // Mock auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null); // 'tourist' | 'guide' | 'admin'

  const handleLogin = async (selectedRole) => {
    await demoLogin(selectedRole);
    setIsAuthenticated(true);
    setRole(selectedRole);
  };

  const handleLogout = () => {
    demoLogout();
    setIsAuthenticated(false);
    setRole(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={isAuthenticated} role={role} onLogout={handleLogout} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing isAuthenticated={isAuthenticated} />} />

          {/* Auth page only makes sense when logged out */}
          {!isAuthenticated && (
            <Route
              path="/auth"
              element={<AuthPage onLogin={handleLogin} />}
            />
          )}

          {/* Protected area — requires login */}
          <Route
            path="/"
            element={<ProtectedLayout isAuthenticated={isAuthenticated} />}
          >
            <Route path="guides" element={<GuidesPage role={role} />} />
            {role === 'admin' && <Route path="guides/new" element={<GuideFormPage />} />}
            {role === 'admin' && <Route path="guides/:id/edit" element={<GuideFormPage />} />}
            <Route path="bookings" element={<BookingsPage role={role} />} />
            <Route path="dashboard" element={<DashboardPage role={role} />} />
            <Route path="profile" element={<ProfilePage role={role} />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-10 h-64 w-64 animate-float-slow rounded-full bg-brand-500/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 animate-float-slow rounded-full bg-teal-500/15 blur-3xl [animation-delay:2s]"
      />
      <p className="text-gradient font-display text-7xl font-extrabold">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-1 text-slate-400">The page you are looking for doesn&apos;t exist.</p>
    </div>
  );
}
