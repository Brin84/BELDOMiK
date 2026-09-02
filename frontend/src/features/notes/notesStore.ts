import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { PropertyNote } from '@/shared/api/types';

interface NotesState {
  note: PropertyNote | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchNote: (propertyId: number) => Promise<void>;
  saveNote: (propertyId: number, text: string) => Promise<boolean>;
  deleteNote: (propertyId: number) => Promise<void>;
  clear: () => void;
  clearError: () => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  note: null,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchNote: async (propertyId: number) => {
    set({ isLoading: true, error: null });
    try {
      const note = await api.get<PropertyNote | null>(API_ENDPOINTS.notes.get(propertyId));
      set({ note, isLoading: false });
    } catch {
      // Note is optional — 401/404 just means no note
      set({ note: null, isLoading: false });
    }
  },

  saveNote: async (propertyId: number, text: string) => {
    set({ isSaving: true, error: null });
    try {
      const note = await api.put<PropertyNote>(API_ENDPOINTS.notes.upsert(propertyId), { text });
      set({ note, isSaving: false });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save note', isSaving: false });
      return false;
    }
  },

  deleteNote: async (propertyId: number) => {
    set({ isSaving: true, error: null });
    try {
      await api.delete(API_ENDPOINTS.notes.delete(propertyId));
      set({ note: null, isSaving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete note', isSaving: false });
    }
  },

  clear: () => set({ note: null, error: null }),
  clearError: () => set({ error: null }),
}));
