const API_BASE = 'http://localhost:3002/api';

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
      error: 'Unable to reach the auth server. Please check backend localhost:3002.'
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
