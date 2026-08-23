import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { PropertyShort, PropertyFilterParams, PaginatedResponse } from '@/shared/api/types';

export interface PropertiesState {
  // Data
  properties: PropertyShort[];
  hotProperties: PropertyShort[];

  // Pagination
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;

  // Filters
  filters: PropertyFilterParams;

  // UI State
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;

  // Request cancellation
  abortController: AbortController | null;

  // Actions
  fetchProperties: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: Partial<PropertyFilterParams>) => void;
  resetFilters: () => void;
  setOperation: (operationId: number | undefined) => void;
  setCity: (cityId: number | undefined) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const defaultFilters: PropertyFilterParams = {
  page: 1,
  page_size: 20,
  sort_by: 'created_at_desc',
  sort_order: 'desc',
};

export const usePropertiesStore = create<PropertiesState>((set, get) => ({
  properties: [],
  hotProperties: [],

  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,

  filters: defaultFilters,

  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,

  abortController: null,

  fetchProperties: async (reset = false) => {
    const { filters, abortController } = get();

    // Cancel any in-flight request
    if (abortController) {
      abortController.abort();
    }
    const controller = new AbortController();
    set({ abortController: controller });

    if (reset) {
      set({ page: 1, properties: [], hasMore: true, error: null });
    } else if (get().isLoading || get().isLoadingMore || !get().hasMore) {
      return;
    }

    const isFirstPage = get().page === 1;
    if (isFirstPage) {
      set({ isLoading: true, error: null });
    } else {
      set({ isLoadingMore: true, error: null });
    }

    try {
      // const userId = useAuthStore.getState().user?.id; // Reserved for future authenticated requests
      const params = { ...filters, page: get().page, page_size: get().pageSize };

      const response = await api.get<PaginatedResponse<PropertyShort>>(API_ENDPOINTS.properties.list, params, {
        signal: controller.signal,
      });

      // If request was aborted, don't update state
      if (controller.signal.aborted) return;

      const newProperties = response.items;

      set((state) => ({
        properties: reset ? newProperties : [...state.properties, ...newProperties],
        page: response.page,
        pageSize: response.page_size,
        total: response.total,
        totalPages: response.pages,
        hasMore: response.page < response.pages,
        isLoading: false,
        isLoadingMore: false,
      }));

      // If first page, also fetch "hot" properties (could be promoted or just first few)
      if (reset || isFirstPage) {
        // Hot properties could be a separate endpoint or just first 3 of results
        set({ hotProperties: newProperties.slice(0, 3) });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      const message = error instanceof Error ? error.message : 'Failed to load properties';
      set({ error: message, isLoading: false, isLoadingMore: false });
    }
  },

  loadMore: async () => {
    const { hasMore, isLoadingMore, isLoading } = get();
    if (!hasMore || isLoadingMore || isLoading) return;

    const nextPage = get().page + 1;
    set({ page: nextPage });
    await get().fetchProperties(false);
  },

  setFilters: (newFilters: Partial<PropertyFilterParams>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters, page: 1 },
    }));
    get().fetchProperties(true);
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().fetchProperties(true);
  },

  setOperation: (operationId: number | undefined) => {
    get().setFilters({ operation_id: operationId });
  },

  setCity: (cityId: number | undefined) => {
    get().setFilters({ city_id: cityId, region_id: undefined });
  },

  refresh: async () => {
    await get().fetchProperties(true);
  },

  clearError: () => set({ error: null }),
}));