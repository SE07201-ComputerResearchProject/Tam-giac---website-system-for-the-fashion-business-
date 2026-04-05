const API_BASE = '/api';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...options
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, config);
  } catch (error) {
    throw {
      error: 'Unable to reach the web server. Please make sure Tam Giac server is running.'
    };
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Auth server connection error' }));
    throw error;
  }

  return response.json();
};
