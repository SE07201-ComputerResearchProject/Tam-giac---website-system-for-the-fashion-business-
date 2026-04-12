import { apiCall } from './api.js?v=20260403a';

const TOKEN_KEY = 'token';

export const navigateWithLoader = (url, delay = 320, loaderOptions = {}) => {
  if (!url) {
    return;
  }

  const go = () => {
    window.location.href = url;
  };

  if (window.TamGiacLoader?.show) {
    window.TamGiacLoader.show({
      href: url,
      from: window.location.pathname.split('/').pop() || 'index.html',
      ...loaderOptions
    });
    window.setTimeout(go, delay);
    return;
  }

  go();
};

export const login = async (email, password) => {
  try {
    const body = { email, password };

    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    localStorage.setItem(TOKEN_KEY, data.token);
    return { success: true, ...data };
  } catch (error) {
    return { success: false, error: error.error || 'Login failed' };
  }
};

export const register = async (email, password, fullName, recaptchaToken) => {
  try {
    const body = { email, password, fullName };
    if (recaptchaToken) {
      body.recaptchaToken = recaptchaToken;
    }

    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return { success: true, ...data };
  } catch (error) {
    return { success: false, error: error.error || 'Sign up failed' };
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  navigateWithLoader('login.html', 760, { reason: 'logout' });
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const isLoggedIn = () => !!getToken();
export { apiCall };

export const loadProfile = async () => {
  try {
    return await apiCall('/auth/me');
  } catch {
    return null;
  }
};
