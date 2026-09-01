const TOKEN_KEY = 'wg_token';
const USER_KEY = 'wg_user';

function getStorage() {
  return sessionStorage;
}

// ─── Local Login ──────────────────────────────────────────────
export async function login(email, password, role) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || 'Login failed');

  getStorage().setItem(TOKEN_KEY, data.token);
  getStorage().setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

// ─── Local Register ───────────────────────────────────────────
export async function register(fullName, email, password, role) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password, role }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || 'Registration failed');

  getStorage().setItem(TOKEN_KEY, data.token);
  getStorage().setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

// ─── Google Login ─────────────────────────────────────────────
export async function googleLogin(credential, role) {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, role }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.message || 'Google login failed');

  getStorage().setItem(TOKEN_KEY, data.token);
  getStorage().setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

// ─── Logout ───────────────────────────────────────────────────
export function logout() {
  getStorage().removeItem(TOKEN_KEY);
  getStorage().removeItem(USER_KEY);
}

// ─── Get stored token / user ──────────────────────────────────
export function getToken() {
  return getStorage().getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    return JSON.parse(getStorage().getItem(USER_KEY));
  } catch {
    return null;
  }
}

// ─── Fetch current user from API ──────────────────────────────
export async function fetchCurrentUser() {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.ok) {
      logout();
      return null;
    }
    getStorage().setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  } catch {
    return null;
  }
}

// ─── Authenticated fetch helper ───────────────────────────────
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...options, headers });
}
