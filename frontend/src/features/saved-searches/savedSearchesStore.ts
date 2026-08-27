import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { SavedSearch, SavedSearchCreate, SavedSearchUpdate } from '@/shared/api/types';

export interface SavedSearchesState {
  // Data
  savedSearches: SavedSearch[];

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSavedSearches: () => Promise<void>;
  createSavedSearch: (data: SavedSearchCreate) => Promise<SavedSearch>;
  updateSavedSearch: (id: number, data: SavedSearchUpdate) => Promise<SavedSearch>;
  deleteSavedSearch: (id: number) => Promise<void>;
  toggleNotifications: (id: number) => Promise<SavedSearch>;
  clearError: () => void;
}

export const useSavedSearchesStore = create<SavedSearchesState>((set) => ({
  savedSearches: [],

  isLoading: false,
  error: null,

  fetchSavedSearches: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get<SavedSearch[]>(API_ENDPOINTS.savedSearches.list);
      set({ savedSearches: response, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load saved searches';
      set({ error: message, isLoading: false });
    }
  },

  createSavedSearch: async (data: SavedSearchCreate) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.post<SavedSearch>(API_ENDPOINTS.savedSearches.create, data);
      set((state) => ({
        savedSearches: [response, ...state.savedSearches],
        isLoading: false,
      }));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create saved search';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateSavedSearch: async (id: number, data: SavedSearchUpdate) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.put<SavedSearch>(API_ENDPOINTS.savedSearches.update(id), data);
      set((state) => ({
        savedSearches: state.savedSearches.map((s) => (s.id === id ? response : s)),
        isLoading: false,
      }));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update saved search';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteSavedSearch: async (id: number) => {
    set({ isLoading: true, error: null });

    try {
      await api.delete(API_ENDPOINTS.savedSearches.delete(id));
      set((state) => ({
        savedSearches: state.savedSearches.filter((s) => s.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete saved search';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  toggleNotifications: async (id: number) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.post<SavedSearch>(API_ENDPOINTS.savedSearches.toggleNotify(id));
      set((state) => ({
        savedSearches: state.savedSearches.map((s) => (s.id === id ? response : s)),
        isLoading: false,
      }));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle notifications';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));