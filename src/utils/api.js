const API_BASE = '/.netlify/edge-functions/api';

export const api = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  },

  signup: async (email, password, name) => {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });
    return await response.json();
  },

  sendMessage: async (message) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });
    return await response.json();
  },

  getChatHistory: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/chat/history`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await response.json();
  },
}; 