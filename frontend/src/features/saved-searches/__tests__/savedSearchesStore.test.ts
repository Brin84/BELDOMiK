import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSavedSearchesStore } from '../savedSearchesStore';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { SavedSearch, SavedSearchCreate, SavedSearchUpdate } from '@/shared/api/types';

// Mock the api module
vi.mock('@/shared/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  API_ENDPOINTS: {
    savedSearches: {
      list: '/api/v1/saved-searches',
      create: '/api/v1/saved-searches',
      detail: (id: number) => `/api/v1/saved-searches/${id}`,
      update: (id: number) => `/api/v1/saved-searches/${id}`,
      delete: (id: number) => `/api/v1/saved-searches/${id}`,
      toggleNotify: (id: number) => `/api/v1/saved-searches/${id}/toggle-notify`,
    },
  },
}));

const mockSavedSearch: SavedSearch = {
  id: 1,
  user_id: 1,
  name: 'Test Search',
  filters_json: '{"city_id": 1, "price_byn_max": 100000}',
  notify_frequency: 'daily',
  is_active: true,
  last_notified_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('useSavedSearchesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useSavedSearchesStore.setState({
      savedSearches: [],
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchSavedSearches', () => {
    it('fetches saved searches', async () => {
      const mockResponse = [mockSavedSearch, { ...mockSavedSearch, id: 2, name: 'Second Search' }];
      (api.get as vi.Mock).mockResolvedValue(mockResponse);

      await useSavedSearchesStore.getState().fetchSavedSearches();

      expect(api.get).toHaveBeenCalledWith('/api/v1/saved-searches');
      const state = useSavedSearchesStore.getState();
      expect(state.savedSearches).toHaveLength(2);
      expect(state.isLoading).toBe(false);
    });

    it('handles fetch error', async () => {
      (api.get as vi.Mock).mockRejectedValue(new Error('Network error'));

      await useSavedSearchesStore.getState().fetchSavedSearches();

      const state = useSavedSearchesStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('createSavedSearch', () => {
    it('creates a saved search and adds to list', async () => {
      const newSearch: SavedSearchCreate = {
        name: 'New Search',
        filters_json: '{"city_id": 2}',
        notify_frequency: 'weekly',
      };
      const createdSearch: SavedSearch = {
        ...mockSavedSearch,
        id: 2,
        ...newSearch,
        is_active: true,
        last_notified_at: null,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      (api.post as vi.Mock).mockResolvedValue(createdSearch);

      const result = await useSavedSearchesStore.getState().createSavedSearch(newSearch);

      expect(api.post).toHaveBeenCalledWith('/api/v1/saved-searches', newSearch);
      expect(result).toEqual(createdSearch);
      const state = useSavedSearchesStore.getState();
      expect(state.savedSearches).toHaveLength(1);
      expect(state.savedSearches[0].id).toBe(2);
      expect(state.isLoading).toBe(false);
    });

    it('handles create error', async () => {
      const newSearch: SavedSearchCreate = {
        name: 'New Search',
        filters_json: '{"city_id": 2}',
      };
      (api.post as vi.Mock).mockRejectedValue(new Error('Server error'));

      try {
        await useSavedSearchesStore.getState().createSavedSearch(newSearch);
      } catch {
        // Expected to throw
      }

      const state = useSavedSearchesStore.getState();
      expect(state.error).toBe('Server error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('updateSavedSearch', () => {
    it('updates an existing saved search', async () => {
      useSavedSearchesStore.setState({ savedSearches: [mockSavedSearch] });

      const updateData: SavedSearchUpdate = {
        name: 'Updated Search',
        is_active: false,
      };
      const updatedSearch: SavedSearch = {
        ...mockSavedSearch,
        ...updateData,
        updated_at: '2024-01-03T00:00:00Z',
      };

      (api.put as vi.Mock).mockResolvedValue(updatedSearch);

      const result = await useSavedSearchesStore.getState().updateSavedSearch(1, updateData);

      expect(api.put).toHaveBeenCalledWith('/api/v1/saved-searches/1', updateData);
      expect(result).toEqual(updatedSearch);
      const state = useSavedSearchesStore.getState();
      expect(state.savedSearches[0].name).toBe('Updated Search');
      expect(state.savedSearches[0].is_active).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('handles update error', async () => {
      useSavedSearchesStore.setState({ savedSearches: [mockSavedSearch] });
      (api.put as vi.Mock).mockRejectedValue(new Error('Server error'));

      try {
        await useSavedSearchesStore.getState().updateSavedSearch(1, { name: 'Updated' });
      } catch {
        // Expected
      }

      const state = useSavedSearchesStore.getState();
      expect(state.error).toBe('Server error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('deleteSavedSearch', () => {
    it('deletes a saved search and removes from list', async () => {
      useSavedSearchesStore.setState({
        savedSearches: [mockSavedSearch, { ...mockSavedSearch, id: 2 }],
      });

      (api.delete as vi.Mock).mockResolvedValue({});

      await useSavedSearchesStore.getState().deleteSavedSearch(1);

      expect(api.delete).toHaveBeenCalledWith('/api/v1/saved-searches/1');
      const state = useSavedSearchesStore.getState();
      expect(state.savedSearches).toHaveLength(1);
      expect(state.savedSearches[0].id).toBe(2);
      expect(state.isLoading).toBe(false);
    });

    it('handles delete error', async () => {
      useSavedSearchesStore.setState({ savedSearches: [mockSavedSearch] });
      (api.delete as vi.Mock).mockRejectedValue(new Error('Server error'));

      try {
        await useSavedSearchesStore.getState().deleteSavedSearch(1);
      } catch {
        // Expected
      }

      const state = useSavedSearchesStore.getState();
      expect(state.error).toBe('Server error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('toggleNotifications', () => {
    it('toggles notifications for a saved search', async () => {
      useSavedSearchesStore.setState({ savedSearches: [mockSavedSearch] });

      const toggledSearch: SavedSearch = {
        ...mockSavedSearch,
        is_active: false,
        updated_at: '2024-01-03T00:00:00Z',
      };

      (api.post as vi.Mock).mockResolvedValue(toggledSearch);

      const result = await useSavedSearchesStore.getState().toggleNotifications(1);

      expect(api.post).toHaveBeenCalledWith('/api/v1/saved-searches/1/toggle-notify');
      expect(result).toEqual(toggledSearch);
      const state = useSavedSearchesStore.getState();
      expect(state.savedSearches[0].is_active).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('handles toggle error', async () => {
      useSavedSearchesStore.setState({ savedSearches: [mockSavedSearch] });
      (api.post as vi.Mock).mockRejectedValue(new Error('Server error'));

      try {
        await useSavedSearchesStore.getState().toggleNotifications(1);
      } catch {
        // Expected
      }

      const state = useSavedSearchesStore.getState();
      expect(state.error).toBe('Server error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useSavedSearchesStore.setState({ error: 'Some error' });

      useSavedSearchesStore.getState().clearError();

      const state = useSavedSearchesStore.getState();
      expect(state.error).toBeNull();
    });
  });
});