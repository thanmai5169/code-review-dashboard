import { create } from 'zustand';
import API from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('codelens_token') || null,
  isAuthenticated: !!localStorage.getItem('codelens_token'),
  loading: false,
  error: null,

  fetchMe: async () => {
    if (!get().token) return;
    set({ loading: true });
    try {
      const response = await API.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, loading: false });
    } catch (error) {
      console.error('Failed to load user session', error);
      get().logout();
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await API.post('/auth/login', { email, password });
      const { token, ...userData } = response.data;
      localStorage.setItem('codelens_token', token);
      set({
        token,
        user: userData,
        isAuthenticated: true,
        loading: false
      });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await API.post('/auth/register', { name, email, password });
      const { token, ...userData } = response.data;
      localStorage.setItem('codelens_token', token);
      set({
        token,
        user: userData,
        isAuthenticated: true,
        loading: false
      });
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('codelens_token');
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      error: null
    });
  },

  updateProfile: async (formData) => {
    set({ loading: true });
    try {
      // Check if updating via multipart form data (avatar file)
      const isMultipart = formData instanceof FormData;
      const response = await API.put('/auth/me', formData, {
        headers: {
          'Content-Type': isMultipart ? 'multipart/form-data' : 'application/json'
        }
      });
      set({ user: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ loading: false });
      throw new Error(error.response?.data?.message || 'Update failed');
    }
  },

  generateApiKey: async () => {
    try {
      const response = await API.post('/auth/apikey');
      set((state) => ({
        user: {
          ...state.user,
          apiKeys: {
            ...state.user.apiKeys,
            codelensApiKey: response.data.apiKey
          }
        }
      }));
      return response.data.apiKey;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Key generation failed');
    }
  },

  revokeApiKey: async () => {
    try {
      await API.delete('/auth/apikey');
      set((state) => ({
        user: {
          ...state.user,
          apiKeys: {
            ...state.user.apiKeys,
            codelensApiKey: null
          }
        }
      }));
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Key revocation failed');
    }
  },

  updateExplanationLevel: async (level) => {
    try {
      const response = await API.put('/users/me/explanation-level', { explanationLevel: level });
      set((state) => ({
        user: {
          ...state.user,
          preferences: {
            ...state.user.preferences,
            explanationLevel: response.data.explanationLevel
          }
        }
      }));
      return response.data.explanationLevel;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update explanation level');
    }
  }
}));
