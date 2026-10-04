import { create } from 'zustand';
import API from '../services/api';

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  loading: false,

  fetchWorkspaces: async () => {
    set({ loading: true });
    try {
      const response = await API.get('/workspaces');
      const workspaces = response.data;
      set({ workspaces, loading: false });

      // Auto-set the first workspace as active if none is selected
      if (workspaces.length > 0 && !get().activeWorkspace) {
        set({ activeWorkspace: workspaces[0] });
      } else if (get().activeWorkspace) {
        // Refresh active workspace content
        const refreshed = workspaces.find(w => w._id === get().activeWorkspace._id);
        if (refreshed) set({ activeWorkspace: refreshed });
      }
    } catch (error) {
      console.error('Error fetching workspaces', error);
      set({ loading: false });
    }
  },

  setActiveWorkspace: (workspace) => {
    set({ activeWorkspace: workspace });
  },

  createWorkspace: async (name, description) => {
    set({ loading: true });
    try {
      const response = await API.post('/workspaces', { name, description });
      const newWs = response.data;
      set((state) => ({
        workspaces: [...state.workspaces, newWs],
        activeWorkspace: state.activeWorkspace ? state.activeWorkspace : newWs,
        loading: false
      }));
      // Re-fetch to get populated details
      await get().fetchWorkspaces();
      return newWs;
    } catch (error) {
      set({ loading: false });
      throw new Error(error.response?.data?.message || 'Failed to create workspace');
    }
  },

  inviteMember: async (email, role) => {
    const ws = get().activeWorkspace;
    if (!ws) throw new Error('No active workspace selected');

    set({ loading: true });
    try {
      const response = await API.post(`/workspaces/${ws._id}/invite`, { email, role });
      set({ activeWorkspace: response.data, loading: false });
      await get().fetchWorkspaces();
      return response.data;
    } catch (error) {
      set({ loading: false });
      throw new Error(error.response?.data?.message || 'Failed to invite member');
    }
  },

  removeMember: async (userId) => {
    const ws = get().activeWorkspace;
    if (!ws) throw new Error('No active workspace selected');

    set({ loading: true });
    try {
      const response = await API.delete(`/workspaces/${ws._id}/members/${userId}`);
      set({ activeWorkspace: response.data, loading: false });
      await get().fetchWorkspaces();
      return response.data;
    } catch (error) {
      set({ loading: false });
      throw new Error(error.response?.data?.message || 'Failed to remove member');
    }
  },

  updateCustomRules: async (customRules) => {
    const ws = get().activeWorkspace;
    if (!ws) throw new Error('No active workspace selected');

    set({ loading: true });
    try {
      const response = await API.put(`/workspaces/${ws._id}/rules`, { customRules });
      set({ activeWorkspace: response.data, loading: false });
      await get().fetchWorkspaces();
      return response.data;
    } catch (error) {
      set({ loading: false });
      throw new Error(error.response?.data?.message || 'Failed to update custom rules');
    }
  }
}));
