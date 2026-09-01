import { useState, useEffect } from 'react';
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
import { login, register, googleLogin, logout, getStoredUser, fetchCurrentUser } from './lib/demoAuth.js';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setIsAuthenticated(true);
      setRole(storedUser.Role);
      fetchCurrentUser().then((user) => {
        if (user) {
          setRole(user.Role);
        } else {
          setIsAuthenticated(false);
          setRole(null);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (email, password, role) => {
    const data = await login(email, password, role);
    setIsAuthenticated(true);
    setRole(data.user.Role);
    return data;
  };

  const handleRegister = async (fullName, email, password, role) => {
    const data = await register(fullName, email, password, role);
    setIsAuthenticated(true);
    setRole(data.user.Role);
    return data;
  };

  const handleGoogleLogin = async (credential, role) => {
    const data = await googleLogin(credential, role);
    setIsAuthenticated(true);
    setRole(data.user.Role);
    return data;
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setRole(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={isAuthenticated} role={role} onLogout={handleLogout} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing isAuthenticated={isAuthenticated} />} />

          {!isAuthenticated && (
            <Route
              path="/auth"
              element={
                <AuthPage
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  onGoogleLogin={handleGoogleLogin}
                />
              }
            />
          )}

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
      <p className="text-gradient font-display text-7xl font-extrabold">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-1 text-slate-400">The page you are looking for doesn&apos;t exist.</p>
    </div>
  );
}
