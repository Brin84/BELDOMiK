import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { Collection, CollectionCreate, CollectionDetail } from '@/shared/api/types';

interface CollectionsState {
  collections: Collection[];
  current: CollectionDetail | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchCollections: () => Promise<void>;
  fetchCollection: (id: number) => Promise<void>;
  createCollection: (data: CollectionCreate) => Promise<Collection | null>;
  updateCollection: (id: number, data: { name?: string; description?: string }) => Promise<void>;
  deleteCollection: (id: number) => Promise<void>;
  addProperty: (collectionId: number, propertyId: number) => Promise<void>;
  removeProperty: (collectionId: number, propertyId: number) => Promise<void>;
  clearError: () => void;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  current: null,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchCollections: async () => {
    set({ isLoading: true, error: null });
    try {
      const collections = await api.get<Collection[]>(API_ENDPOINTS.collections.list);
      set({ collections, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load collections', isLoading: false });
    }
  },

  fetchCollection: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const detail = await api.get<CollectionDetail>(API_ENDPOINTS.collections.detail(id));
      set({ current: detail, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load collection', isLoading: false });
    }
  },

  createCollection: async (data: CollectionCreate) => {
    set({ isSaving: true, error: null });
    try {
      const created = await api.post<Collection>(API_ENDPOINTS.collections.create, data);
      set((state) => ({ collections: [created, ...state.collections], isSaving: false }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create collection', isSaving: false });
      return null;
    }
  },

  updateCollection: async (id: number, data: { name?: string; description?: string }) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await api.patch<Collection>(API_ENDPOINTS.collections.update(id), data);
      set((state) => ({
        collections: state.collections.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        current: state.current && state.current.id === id ? { ...state.current, ...updated } : state.current,
        isSaving: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update collection', isSaving: false });
    }
  },

  deleteCollection: async (id: number) => {
    set({ isSaving: true, error: null });
    try {
      await api.delete(API_ENDPOINTS.collections.delete(id));
      set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
        current: state.current && state.current.id === id ? null : state.current,
        isSaving: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete collection', isSaving: false });
    }
  },

  addProperty: async (collectionId: number, propertyId: number) => {
    try {
      await api.post(API_ENDPOINTS.collections.addItem(collectionId), { property_id: propertyId });
      // Refresh collection counts
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId ? { ...c, property_count: c.property_count + 1 } : c
        ),
      }));
      const current = get().current;
      if (current && current.id === collectionId) {
        // Add the property to the current collection's items optimistically
        const existing = current.items.find((p) => p.id === propertyId);
        if (!existing) {
          await get().fetchCollection(collectionId);
        }
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add property' });
    }
  },

  removeProperty: async (collectionId: number, propertyId: number) => {
    try {
      await api.delete(API_ENDPOINTS.collections.removeItem(collectionId, propertyId));
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId ? { ...c, property_count: Math.max(0, c.property_count - 1) } : c
        ),
        current: state.current && state.current.id === collectionId
          ? { ...state.current, items: state.current.items.filter((p) => p.id !== propertyId) }
          : state.current,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove property' });
    }
  },

  clearError: () => set({ error: null }),
}));
