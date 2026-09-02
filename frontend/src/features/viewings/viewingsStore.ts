import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { ViewingRequest, ViewingRequestCreate } from '@/shared/api/types';

interface ViewingsState {
  viewings: ViewingRequest[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchViewings: () => Promise<void>;
  createViewing: (data: ViewingRequestCreate) => Promise<boolean>;
  updateStatus: (id: number, status: 'pending' | 'confirmed' | 'cancelled') => Promise<void>;
  clearError: () => void;
}

export const useViewingsStore = create<ViewingsState>((set) => ({
  viewings: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchViewings: async () => {
    set({ isLoading: true, error: null });
    try {
      const viewings = await api.get<ViewingRequest[]>(API_ENDPOINTS.viewings.list);
      set({ viewings, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load viewings', isLoading: false });
    }
  },

  createViewing: async (data: ViewingRequestCreate) => {
    set({ isSaving: true, error: null });
    try {
      await api.post<ViewingRequest>(API_ENDPOINTS.viewings.create, data);
      set({ isSaving: false });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to submit viewing request', isSaving: false });
      return false;
    }
  },

  updateStatus: async (id: number, status: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      const updated = await api.patch<ViewingRequest>(API_ENDPOINTS.viewings.updateStatus(id), { status });
      set((state) => ({
        viewings: state.viewings.map((v) => (v.id === id ? updated : v)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update viewing' });
    }
  },

  clearError: () => set({ error: null }),
}));
