import { config } from '../config';

const BASE_URL = '/api';

export const api = {
  async fetch(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  },

  auth: {
    login: (credentials) => api.fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    signup: (userData) => api.fetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
    google: (token) => api.fetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: token }),
    }),
  },

  chat: {
    list: (token) => api.fetch('/api/chat', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    create: (message, token) => api.fetch('/api/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    }),
    addMessage: (chatId, message, token) => api.fetch(`/api/chat/${chatId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    }),
  },
}; 