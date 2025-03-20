import { config } from '../config';

const BASE_URL = '/.netlify/functions/api';

export const api = {
  async fetch(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    console.log('Making request to:', url);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || 'Request failed');
      }

      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
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