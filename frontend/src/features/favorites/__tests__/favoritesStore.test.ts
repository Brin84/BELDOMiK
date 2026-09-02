import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useFavoritesStore } from '../favoritesStore';
import { api, API_ENDPOINTS } from '@/shared/api';

// Mock the api module
vi.mock('@/shared/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  API_ENDPOINTS: {
    favorites: {
      list: '/api/v1/favorites',
      add: (id: number) => `/api/v1/favorites/${id}`,
      remove: (id: number) => `/api/v1/favorites/${id}`,
      check: (id: number) => `/api/v1/favorites/check/${id}`,
      ids: '/api/v1/favorites/ids',
    },
  },
}));

describe('useFavoritesStore', () => {
  const mockProperty = {
    id: 1,
    type_id: 1,
    operation_id: 1,
    city_id: 1,
    district_id: null,
    neighborhood_id: null,
    street_id: null,
    metro_station_id: null,
    address: 'Test Address',
    lat: 53.9,
    lng: 27.56,
    total_area: 50,
    living_area: 35,
    kitchen_area: 10,
    rooms_count: 2,
    floor: 3,
    total_floors: 5,
    build_year: 2020,
    renovation: 'cosmetic',
    furniture: true,
    balcony: true,
    parking: false,
    elevator: true,
    metro_distance: 500,
    status: 'published',
    views_count: 10,
    favorites_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_id: 1,
    price_byn: 100000,
    price_usd: 30000,
    price_per_m2_byn: 2000,
    photo_url: 'https://example.com/photo.jpg',
    photo_count: 3,
    city_name: 'Minsk',
    district_name: 'Central',
    neighborhood_name: null,
    street_name: 'Independence Ave',
    metro_station_name: 'Nemiga',
    type_name: 'Apartment',
    operation_name: 'Sale',
    owner_name: 'John',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useFavoritesStore.setState({
      favorites: [],
      favoriteIds: new Set(),
      page: 1,
      pageSize: 500,
      total: 0,
      totalPages: 0,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      pendingRequests: new Set(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchFavorites', () => {
    it('fetches favorites on first page', async () => {
      const mockResponse = {
        items: [mockProperty],
        total: 1,
        page: 1,
        page_size: 20,
        pages: 1,
      };

      (api.get as vi.Mock).mockResolvedValue(mockResponse);

      await useFavoritesStore.getState().fetchFavorites(true);

      expect(api.get).toHaveBeenCalledWith('/api/v1/favorites', { page: 1, page_size: 500 });
      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(1);
      expect(state.favorites[0].id).toBe(1);
      expect(state.total).toBe(1);
      expect(state.hasMore).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('updates favoriteIds set after fetch', async () => {
      const mockResponse = {
        items: [mockProperty, { ...mockProperty, id: 2 }],
        total: 2,
        page: 1,
        page_size: 20,
        pages: 1,
      };

      (api.get as vi.Mock).mockResolvedValue(mockResponse);

      await useFavoritesStore.getState().fetchFavorites(true);

      const state = useFavoritesStore.getState();
      expect(state.favoriteIds.has(1)).toBe(true);
      expect(state.favoriteIds.has(2)).toBe(true);
    });

    it('does not fetch if already loading', async () => {
      let resolveFirst!: (value: any) => void;
      const firstPromise = new Promise(resolve => {
        resolveFirst = resolve;
      });
      (api.get as vi.Mock).mockReturnValueOnce(firstPromise);

      // Start first fetch (don't await)
      const promise1 = useFavoritesStore.getState().fetchFavorites(true);

      // Small delay to let first fetch set isLoading
      await new Promise(r => setTimeout(r, 10));

      // Try to start second fetch immediately
      await useFavoritesStore.getState().fetchFavorites(true);

      // Resolve first fetch
      resolveFirst({ items: [], total: 0, page: 1, page_size: 20, pages: 1 });
      await promise1;

      // api.get should only be called once
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('does not fetch if no more pages', async () => {
      useFavoritesStore.setState({ hasMore: false });

      await useFavoritesStore.getState().fetchFavorites(false);

      expect(api.get).not.toHaveBeenCalled();
    });

    it('handles fetch error', async () => {
      (api.get as vi.Mock).mockRejectedValue(new Error('Network error'));

      await useFavoritesStore.getState().fetchFavorites(true);

      const state = useFavoritesStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });

    it('appends results on subsequent pages', async () => {
      const firstPage = {
        items: [mockProperty],
        total: 2,
        page: 1,
        page_size: 20,
        pages: 2,
      };
      const secondPage = {
        items: [{ ...mockProperty, id: 2 }],
        total: 2,
        page: 2,
        page_size: 20,
        pages: 2,
      };

      (api.get as vi.Mock)
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      // First page
      await useFavoritesStore.getState().fetchFavorites(true);

      // Second page
      await useFavoritesStore.getState().fetchFavorites(false);

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(2);
      expect(state.page).toBe(2);
    });
  });

  describe('loadMore', () => {
    it('loads next page when hasMore is true', async () => {
      const firstPage = {
        items: [mockProperty],
        total: 2,
        page: 1,
        page_size: 20,
        pages: 2,
      };
      const secondPage = {
        items: [{ ...mockProperty, id: 2 }],
        total: 2,
        page: 2,
        page_size: 20,
        pages: 2,
      };

      (api.get as vi.Mock)
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      await useFavoritesStore.getState().fetchFavorites(true);

      await useFavoritesStore.getState().loadMore();

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(2);
      expect(state.page).toBe(2);
    });

    it('does nothing when hasMore is false', async () => {
      useFavoritesStore.setState({ hasMore: false });

      await useFavoritesStore.getState().loadMore();

      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('toggleFavorite', () => {
    it('calls addFavorite when not in favorites', async () => {
      (api.post as vi.Mock).mockResolvedValue({});
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [1] });

      await useFavoritesStore.getState().toggleFavorite(1);

      expect(api.post).toHaveBeenCalledWith('/api/v1/favorites/1');
      const state = useFavoritesStore.getState();
      expect(state.favoriteIds.has(1)).toBe(true);
    });

    it('calls removeFavorite when already in favorites', async () => {
      useFavoritesStore.setState({ favoriteIds: new Set([1]) });

      (api.delete as vi.Mock).mockResolvedValue({});
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [] });

      await useFavoritesStore.getState().toggleFavorite(1);

      expect(api.delete).toHaveBeenCalledWith('/api/v1/favorites/1');
      const state = useFavoritesStore.getState();
      expect(state.favoriteIds.has(1)).toBe(false);
    });

    it('does nothing if request is already pending', async () => {
      useFavoritesStore.setState({ pendingRequests: new Set([1]) });

      await useFavoritesStore.getState().toggleFavorite(1);

      expect(api.post).not.toHaveBeenCalled();
      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  describe('addFavorite', () => {
    it('optimistically adds to favorites and calls API', async () => {
      (api.post as vi.Mock).mockResolvedValue({});
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [1] });

      await useFavoritesStore.getState().addFavorite(1);

      expect(api.post).toHaveBeenCalledWith('/api/v1/favorites/1');
      const state = useFavoritesStore.getState();
      expect(state.favoriteIds.has(1)).toBe(true);
    });

    it('rolls back on API error', async () => {
      (api.post as vi.Mock).mockRejectedValue(new Error('Server error'));
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [] });

      try {
        await useFavoritesStore.getState().addFavorite(1);
      } catch {
        // Expected to throw
      }

      const state = useFavoritesStore.getState();
      expect(state.favoriteIds.has(1)).toBe(false);
      expect(state.error).toBe('Server error');
    });

    it('clears pending request after completion', async () => {
      (api.post as vi.Mock).mockResolvedValue({});
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [1] });

      await useFavoritesStore.getState().addFavorite(1);

      const state = useFavoritesStore.getState();
      expect(state.pendingRequests.has(1)).toBe(false);
    });

    it('clears pending request even on error', async () => {
      (api.post as vi.Mock).mockRejectedValue(new Error('Server error'));
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [] });

      try {
        await useFavoritesStore.getState().addFavorite(1);
      } catch {
        // Expected
      }

      const state = useFavoritesStore.getState();
      expect(state.pendingRequests.has(1)).toBe(false);
    });

    it('does nothing if request already pending', async () => {
      useFavoritesStore.setState({ pendingRequests: new Set([1]) });

      await useFavoritesStore.getState().addFavorite(1);

      expect(api.post).not.toHaveBeenCalled();
    });

    it('preserves previous favorites array on rollback', async () => {
      const existingProperty = { ...mockProperty, id: 2 };
      useFavoritesStore.setState({
        favorites: [existingProperty],
        favoriteIds: new Set([2]),
      });

      (api.post as vi.Mock).mockRejectedValue(new Error('Server error'));
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [2] });

      try {
        await useFavoritesStore.getState().addFavorite(1);
      } catch {
        // Expected
      }

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(1);
      expect(state.favorites[0].id).toBe(2);
    });
  });

  describe('removeFavorite', () => {
    it('optimistically removes from favorites and calls API', async () => {
      useFavoritesStore.setState({
        favorites: [mockProperty],
        favoriteIds: new Set([1]),
      });

      (api.delete as vi.Mock).mockResolvedValue({});
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [] });

      await useFavoritesStore.getState().removeFavorite(1);

      expect(api.delete).toHaveBeenCalledWith('/api/v1/favorites/1');
      const state = useFavoritesStore.getState();
      expect(state.favoriteIds.has(1)).toBe(false);
      expect(state.favorites).toHaveLength(0);
    });

    it('rolls back on API error', async () => {
      useFavoritesStore.setState({
        favorites: [mockProperty],
        favoriteIds: new Set([1]),
      });

      (api.delete as vi.Mock).mockRejectedValue(new Error('Server error'));
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [1] });

      try {
        await useFavoritesStore.getState().removeFavorite(1);
      } catch {
        // Expected
      }

      const state = useFavoritesStore.getState();
      expect(state.favoriteIds.has(1)).toBe(true);
      expect(state.favorites).toHaveLength(1);
      expect(state.error).toBe('Server error');
    });

    it('clears pending request after completion', async () => {
      useFavoritesStore.setState({
        favorites: [mockProperty],
        favoriteIds: new Set([1]),
      });

      (api.delete as vi.Mock).mockResolvedValue({});
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [] });

      await useFavoritesStore.getState().removeFavorite(1);

      const state = useFavoritesStore.getState();
      expect(state.pendingRequests.has(1)).toBe(false);
    });

    it('does nothing if request already pending', async () => {
      useFavoritesStore.setState({
        favorites: [mockProperty],
        favoriteIds: new Set([1]),
        pendingRequests: new Set([1]),
      });

      await useFavoritesStore.getState().removeFavorite(1);

      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  describe('checkFavorite', () => {
    it('returns true when property is favorite', async () => {
      (api.get as vi.Mock).mockResolvedValue({ is_favorite: true });

      const result = await useFavoritesStore.getState().checkFavorite(1);

      expect(result).toBe(true);
      expect(api.get).toHaveBeenCalledWith('/api/v1/favorites/check/1');
    });

    it('returns false when property is not favorite', async () => {
      (api.get as vi.Mock).mockResolvedValue({ is_favorite: false });

      const result = await useFavoritesStore.getState().checkFavorite(1);

      expect(result).toBe(false);
    });

    it('updates local favoriteIds cache', async () => {
      (api.get as vi.Mock).mockResolvedValue({ is_favorite: true });

      await useFavoritesStore.getState().checkFavorite(1);

      const state = useFavoritesStore.getState();
      expect(state.favoriteIds.has(1)).toBe(true);
    });

    it('removes from cache when not favorite', async () => {
      useFavoritesStore.setState({ favoriteIds: new Set([1]) });
      (api.get as vi.Mock).mockResolvedValue({ is_favorite: false });

      await useFavoritesStore.getState().checkFavorite(1);

      const state = useFavoritesStore.getState();
      expect(state.favoriteIds.has(1)).toBe(false);
    });

    it('returns false on error', async () => {
      (api.get as vi.Mock).mockRejectedValue(new Error('Network error'));

      const result = await useFavoritesStore.getState().checkFavorite(1);

      expect(result).toBe(false);
    });
  });

  describe('fetchFavoriteIds', () => {
    it('fetches and updates favoriteIds', async () => {
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [1, 2, 3] });

      await useFavoritesStore.getState().fetchFavoriteIds();

      const state = useFavoritesStore.getState();
      expect(state.favoriteIds).toEqual(new Set([1, 2, 3]));
    });

    it('does not throw on error', async () => {
      (api.get as vi.Mock).mockRejectedValue(new Error('Network error'));

      await useFavoritesStore.getState().fetchFavoriteIds();

      // Should not throw
      const state = useFavoritesStore.getState();
      expect(state.favoriteIds).toEqual(new Set());
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useFavoritesStore.setState({ error: 'Some error' });

      useFavoritesStore.getState().clearError();

      const state = useFavoritesStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('request deduplication', () => {
    it('prevents duplicate addFavorite calls', async () => {
      (api.post as vi.Mock).mockResolvedValue({});
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [1] });

      // Call addFavorite twice rapidly - the second should be deduplicated
      const promise1 = useFavoritesStore.getState().addFavorite(1);
      const promise2 = useFavoritesStore.getState().addFavorite(1);
      await Promise.all([promise1, promise2]);

      // API should only be called once due to deduplication
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('prevents duplicate removeFavorite calls', async () => {
      useFavoritesStore.setState({
        favorites: [mockProperty],
        favoriteIds: new Set([1]),
      });

      (api.delete as vi.Mock).mockResolvedValue({});
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [] });

      const promise1 = useFavoritesStore.getState().removeFavorite(1);
      const promise2 = useFavoritesStore.getState().removeFavorite(1);
      await Promise.all([promise1, promise2]);

      expect(api.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('optimistic updates with rollback', () => {
    it('adds to favoriteIds immediately before API call', async () => {
      let apiCallCount = 0;
      (api.post as vi.Mock).mockImplementation(async () => {
        apiCallCount++;
        // Check state during API call
        const state = useFavoritesStore.getState();
        expect(state.favoriteIds.has(1)).toBe(true);
        return {};
      });
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [1] });

      await useFavoritesStore.getState().addFavorite(1);

      expect(apiCallCount).toBe(1);
    });

    it('removes from favoriteIds immediately before API call', async () => {
      useFavoritesStore.setState({
        favorites: [mockProperty],
        favoriteIds: new Set([1]),
      });

      let apiCallCount = 0;
      (api.delete as vi.Mock).mockImplementation(async () => {
        apiCallCount++;
        const state = useFavoritesStore.getState();
        expect(state.favoriteIds.has(1)).toBe(false);
        return {};
      });
      (api.get as vi.Mock).mockResolvedValue({ favorite_ids: [] });

      await useFavoritesStore.getState().removeFavorite(1);

      expect(apiCallCount).toBe(1);
    });
  });
});
