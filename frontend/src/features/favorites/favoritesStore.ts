import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { PropertyShort, PaginatedResponse } from '@/shared/api/types';

export interface FavoritesState {
  // Data
  favorites: PropertyShort[];
  favoriteIds: Set<number>;

  // Pagination
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;

  // UI State
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Request deduplication
  pendingRequests: Set<number>;

  // Actions
  fetchFavorites: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  toggleFavorite: (propertyId: number) => Promise<void>;
  addFavorite: (propertyId: number) => Promise<void>;
  removeFavorite: (propertyId: number) => Promise<void>;
  checkFavorite: (propertyId: number) => Promise<boolean>;
  fetchFavoriteIds: () => Promise<void>;
  clearError: () => void;
}

const defaultPageSize = 500;

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  favoriteIds: new Set(),

  page: 1,
  pageSize: defaultPageSize,
  total: 0,
  totalPages: 0,
  hasMore: true,

  isLoading: false,
  isLoadingMore: false,
  error: null,

  pendingRequests: new Set(),

  fetchFavorites: async (reset = false) => {
    const { pageSize, isLoading, isLoadingMore, hasMore } = get();

    // Guard against concurrent requests
    if (isLoading || isLoadingMore) {
      return;
    }

    if (reset) {
      set({ page: 1, favorites: [], hasMore: true, error: null });
    } else if (!hasMore) {
      return;
    }

    const isFirstPage = get().page === 1;
    if (isFirstPage) {
      set({ isLoading: true, error: null });
    } else {
      set({ isLoadingMore: true, error: null });
    }

    try {
      const currentPage = get().page;
      const response = await api.get<PaginatedResponse<PropertyShort>>(
        API_ENDPOINTS.favorites.list,
        { page: currentPage, page_size: pageSize }
      );

      const newFavorites = response.items;

      set((state) => ({
        favorites: reset ? newFavorites : [...state.favorites, ...newFavorites],
        page: response.page,
        pageSize: response.page_size,
        total: response.total,
        totalPages: response.pages,
        hasMore: response.page < response.pages,
        isLoading: false,
        isLoadingMore: false,
      }));

      // Update favoriteIds set
      const allFavorites = reset ? newFavorites : [...get().favorites, ...newFavorites];
      set({ favoriteIds: new Set(allFavorites.map((f) => f.id)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load favorites';
      set({ error: message, isLoading: false, isLoadingMore: false });
    }
  },

  loadMore: async () => {
    const { hasMore, isLoadingMore, isLoading, page } = get();
    if (!hasMore || isLoadingMore || isLoading) return;

    const nextPage = page + 1;
    set({ page: nextPage });
    await get().fetchFavorites(false);
  },

  toggleFavorite: async (propertyId: number) => {
    const { favoriteIds, pendingRequests } = get();
    // Request deduplication: skip if already processing
    if (pendingRequests.has(propertyId)) {
      return;
    }
    const isFavorite = favoriteIds.has(propertyId);

    if (isFavorite) {
      await get().removeFavorite(propertyId);
    } else {
      await get().addFavorite(propertyId);
    }
  },

  addFavorite: async (propertyId: number) => {
    // Request deduplication
    const { pendingRequests } = get();
    if (pendingRequests.has(propertyId)) {
      return;
    }

    // Store previous state for rollback
    const previousFavoriteIds = new Set(get().favoriteIds);
    const previousFavorites = [...get().favorites];

    // Mark as pending
    set((state) => ({
      pendingRequests: new Set([...state.pendingRequests, propertyId]),
    }));

    // Optimistically update local state BEFORE API call
    set((state) => {
      const newFavoriteIds = new Set(state.favoriteIds);
      newFavoriteIds.add(propertyId);
      return { favoriteIds: newFavoriteIds };
    });

    try {
      await api.post(API_ENDPOINTS.favorites.add(propertyId));

      // Refresh to get full property data
      await get().fetchFavoriteIds();
    } catch (error) {
      // Rollback optimistic update on error
      set({
        favoriteIds: previousFavoriteIds,
        favorites: previousFavorites,
        error: error instanceof Error ? error.message : 'Failed to add to favorites',
      });
      throw error;
    } finally {
      // Clear pending request
      set((state) => {
        const newPending = new Set(state.pendingRequests);
        newPending.delete(propertyId);
        return { pendingRequests: newPending };
      });
    }
  },

  removeFavorite: async (propertyId: number) => {
    // Request deduplication
    const { pendingRequests } = get();
    if (pendingRequests.has(propertyId)) {
      return;
    }

    // Store previous state for rollback
    const previousFavoriteIds = new Set(get().favoriteIds);
    const previousFavorites = [...get().favorites];

    // Mark as pending
    set((state) => ({
      pendingRequests: new Set([...state.pendingRequests, propertyId]),
    }));

    // Optimistically update local state BEFORE API call
    set((state) => {
      const newFavoriteIds = new Set(state.favoriteIds);
      newFavoriteIds.delete(propertyId);
      const newFavorites = state.favorites.filter((f) => f.id !== propertyId);
      return { favoriteIds: newFavoriteIds, favorites: newFavorites };
    });

    try {
      await api.delete(API_ENDPOINTS.favorites.remove(propertyId));

      await get().fetchFavoriteIds();
    } catch (error) {
      // Rollback optimistic update on error
      set({
        favoriteIds: previousFavoriteIds,
        favorites: previousFavorites,
        error: error instanceof Error ? error.message : 'Failed to remove from favorites',
      });
      throw error;
    } finally {
      // Clear pending request
      set((state) => {
        const newPending = new Set(state.pendingRequests);
        newPending.delete(propertyId);
        return { pendingRequests: newPending };
      });
    }
  },

  checkFavorite: async (propertyId: number) => {
    try {
      const response = await api.get<{ is_favorite: boolean }>(
        API_ENDPOINTS.favorites.check(propertyId)
      );
      const isFavorite = response.is_favorite;

      // Update local cache
      set((state) => {
        const newFavoriteIds = new Set(state.favoriteIds);
        if (isFavorite) {
          newFavoriteIds.add(propertyId);
        } else {
          newFavoriteIds.delete(propertyId);
        }
        return { favoriteIds: newFavoriteIds };
      });

      return isFavorite;
    } catch {
      // If check fails, assume not favorite
      return false;
    }
  },

  fetchFavoriteIds: async () => {
    try {
      const response = await api.get<{ favorite_ids: number[] }>(API_ENDPOINTS.favorites.ids);
      set({ favoriteIds: new Set(response.favorite_ids) });
    } catch {
      // Silently fail - not critical
    }
  },

  clearError: () => set({ error: null }),
}));