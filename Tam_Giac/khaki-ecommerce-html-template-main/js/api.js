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
      error: 'Khong ket noi duoc may chu auth. Hay kiem tra backend localhost:3002.'
    };
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Loi ket noi den may chu auth' }));
    throw error;
  }

  return response.json();
};
