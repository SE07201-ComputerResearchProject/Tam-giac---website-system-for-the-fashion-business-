import { apiCall } from './api.js?v=20260320b';

const TOKEN_KEY = 'token';
const LOCAL_USERS_KEY = 'tamgiac_local_users';
const LOCAL_TOKEN_PREFIX = 'local-dev:';

const normalizeEmail = (email) => email.trim().toLowerCase();

const readLocalUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeLocalUsers = (users) => {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const createLocalToken = (email) => `${LOCAL_TOKEN_PREFIX}${normalizeEmail(email)}`;

const isLocalToken = (token) => typeof token === 'string' && token.startsWith(LOCAL_TOKEN_PREFIX);

const getLocalProfileByEmail = (email) => {
  const users = readLocalUsers();
  return users.find((user) => user.email === normalizeEmail(email)) || null;
};

const getLocalProfileFromToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!isLocalToken(token)) {
    return null;
  }

  const email = token.slice(LOCAL_TOKEN_PREFIX.length);
  return getLocalProfileByEmail(email);
};

const isAuthServerUnavailable = (error) =>
  (error?.error || '').includes('Khong ket noi duoc may chu auth');

export const navigateWithLoader = (url, delay = 140) => {
  if (!url) {
    return;
  }

  const go = () => {
    window.location.href = url;
  };

  if (window.TamGiacLoader?.show) {
    window.TamGiacLoader.show();
    window.setTimeout(go, delay);
    return;
  }

  go();
};

export const login = async (email, password) => {
  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    return { success: true, ...data };
  } catch (error) {
    if (isAuthServerUnavailable(error)) {
      const profile = getLocalProfileByEmail(email);
      if (profile && profile.password === password) {
        localStorage.setItem(TOKEN_KEY, createLocalToken(email));
        return {
          success: true,
          token: createLocalToken(email),
          message: 'Dang nhap OK (local dev mode)'
        };
      }
    }

    return { success: false, error: error.error || 'Dang nhap that bai' };
  }
};

export const register = async (email, password, fullName) => {
  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName })
    });
    return { success: true, ...data };
  } catch (error) {
    if (isAuthServerUnavailable(error)) {
      const normalizedEmail = normalizeEmail(email);
      const users = readLocalUsers();
      const existingUser = users.find((user) => user.email === normalizedEmail);

      if (existingUser) {
        return { success: false, error: 'Email da ton tai' };
      }

      users.push({
        id: `local-${Date.now()}`,
        email: normalizedEmail,
        password,
        fullName,
        phone: '',
        role: 'user'
      });
      writeLocalUsers(users);

      return {
        success: true,
        message: 'Dang ky thanh cong (local dev mode)'
      };
    }

    return { success: false, error: error.error || 'Dang ky that bai' };
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  navigateWithLoader('index.html');
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const isLoggedIn = () => !!getToken();
export { apiCall };

export const loadProfile = async () => {
  const localProfile = getLocalProfileFromToken();
  if (localProfile) {
    return {
      id: localProfile.id,
      email: localProfile.email,
      fullName: localProfile.fullName,
      phone: localProfile.phone,
      role: localProfile.role
    };
  }

  try {
    return await apiCall('/auth/me');
  } catch {
    return null;
  }
};
