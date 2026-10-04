import { create } from 'zustand';
import API from '../services/api';

export const useReviewStore = create((set, get) => ({
  reviews: [],
  currentReview: null,
  scanProgress: { status: '', percentage: 0 },
  chatMessages: [],
  loading: false,
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },

  setScanProgress: (progress) => {
    set({ scanProgress: progress });
  },

  clearScanProgress: () => {
    set({ scanProgress: { status: '', percentage: 0 } });
  },

  setCurrentReview: (review) => {
    set({ currentReview: review, chatMessages: review?.chatHistory || [] });
  },

  fetchReviews: async (page = 1, filters = {}) => {
    set({ loading: true });
    try {
      const { search, language, severity, workspaceId, bookmarked, date } = filters;
      const params = { page, limit: 20, search, language, severity, workspaceId, bookmarked, date };
      
      const response = await API.get('/history/reviews', { params });
      set({
        reviews: response.data.reviews,
        pagination: response.data.pagination,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching review history:', error);
      set({ loading: false });
    }
  },

  fetchReviewDetails: async (id) => {
    set({ loading: true });
    try {
      const response = await API.get(`/reviews/${id}`);
      set({
        currentReview: response.data,
        chatMessages: response.data.chatHistory || [],
        loading: false
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching review detail:', error);
      set({ loading: false });
      throw error;
    }
  },

  analyzePaste: async (code, language, workspaceId, explanationLevel, intentStatement) => {
    set({ loading: true, currentReview: null });
    get().setScanProgress({ status: 'Connecting to scanner...', percentage: 5 });
    try {
      const response = await API.post('/reviews/analyze', { 
        code, 
        language, 
        workspaceId, 
        explanationLevel,
        intentStatement
      });
      set({ currentReview: response.data, chatMessages: [], loading: false });
      get().clearScanProgress();
      return response.data;
    } catch (error) {
      set({ loading: false });
      get().clearScanProgress();
      throw new Error(error.response?.data?.message || 'Code analysis failed');
    }
  },

  analyzeUpload: async (formData) => {
    set({ loading: true, currentReview: null });
    get().setScanProgress({ status: 'Uploading file...', percentage: 5 });
    try {
      const response = await API.post('/reviews/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      set({ currentReview: response.data, chatMessages: [], loading: false });
      get().clearScanProgress();
      return response.data;
    } catch (error) {
      set({ loading: false });
      get().clearScanProgress();
      throw new Error(error.response?.data?.message || 'File analysis failed');
    }
  },

  analyzeBatch: async (files, workspaceId, title) => {
    set({ loading: true, currentReview: null });
    get().setScanProgress({ status: 'Preparing batch payloads...', percentage: 5 });
    try {
      const response = await API.post('/reviews/analyze-batch', { files, workspaceId, title });
      set({ currentReview: response.data, chatMessages: [], loading: false });
      get().clearScanProgress();
      return response.data;
    } catch (error) {
      set({ loading: false });
      get().clearScanProgress();
      throw new Error(error.response?.data?.message || 'Batch analysis failed');
    }
  },

  analyzePullRequest: async (owner, repo, pullNumber, workspaceId) => {
    set({ loading: true, currentReview: null });
    get().setScanProgress({ status: `Connecting to GitHub PR #${pullNumber}...`, percentage: 5 });
    try {
      const response = await API.post('/reviews/analyze-pr', { owner, repo, pullNumber, workspaceId });
      set({ currentReview: response.data, chatMessages: [], loading: false });
      get().clearScanProgress();
      return response.data;
    } catch (error) {
      set({ loading: false });
      get().clearScanProgress();
      throw new Error(error.response?.data?.message || 'Pull Request analysis failed');
    }
  },

  resolveFinding: async (findingId) => {
    const review = get().currentReview;
    if (!review) return;

    try {
      const response = await API.put(`/reviews/${review._id}/findings/${findingId}/resolve`);
      const { finding, findings } = response.data;
      
      set((state) => ({
        currentReview: {
          ...state.currentReview,
          findings: findings || state.currentReview.findings.map(f => f._id === findingId ? finding : f)
        }
      }));

      return finding;
    } catch (error) {
      console.error('Error resolving finding:', error);
      throw error;
    }
  },

  toggleBookmark: async (id) => {
    try {
      const response = await API.put(`/reviews/${id}/bookmark`);
      const { isBookmarked } = response.data;
      
      if (get().currentReview && get().currentReview._id === id) {
        set((state) => ({
          currentReview: { ...state.currentReview, isBookmarked }
        }));
      }

      set((state) => ({
        reviews: state.reviews.map(r => r._id === id ? { ...r, isBookmarked } : r)
      }));

      return isBookmarked;
    } catch (error) {
      console.error('Error toggling bookmark status:', error);
    }
  },

  applyFixInReview: async (findingId, newCode, updatedFindings, updatedMetrics, changedFiles) => {
    const review = get().currentReview;
    if (!review) return;

    try {
      const response = await API.put(`/reviews/${review._id}/apply-fix`, {
        optimizedCode: newCode,
        findingId,
        findings: updatedFindings,
        metrics: updatedMetrics,
        changedFiles
      });
      set({ currentReview: response.data });
      return response.data;
    } catch (error) {
      console.error('Error applying fix update on DB:', error);
    }
  },

  appendChatChunk: (text) => {
    set((state) => {
      const lastMsgIndex = state.chatMessages.length - 1;
      const lastMsg = state.chatMessages[lastMsgIndex];
      
      if (lastMsg && lastMsg.role === 'model') {
        const updated = [...state.chatMessages];
        updated[lastMsgIndex] = { ...lastMsg, content: lastMsg.content + text };
        return { chatMessages: updated };
      } else {
        return {
          chatMessages: [...state.chatMessages, { role: 'model', content: text, timestamp: new Date() }]
        };
      }
    });
  },

  submitChatQuestion: async (message) => {
    const review = get().currentReview;
    if (!review) return;

    const userMsg = { role: 'user', content: message, timestamp: new Date() };
    set((state) => ({
      chatMessages: [...state.chatMessages, userMsg]
    }));

    try {
      await API.post(`/reviews/${review._id}/chat`, { message });
    } catch (error) {
      console.error('Chat submit failed', error);
      throw error;
    }
  }
}));
