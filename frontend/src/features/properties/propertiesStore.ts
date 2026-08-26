import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { PropertyShort, PropertyDetail, PropertyFilterParams, PaginatedResponse } from '@/shared/api/types';

export interface PropertiesState {
  // Data
  properties: PropertyShort[];
  hotProperties: PropertyShort[];
  propertyDetail: PropertyDetail | null;

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
  isLoadingDetail: boolean;
  error: string | null;
  errorDetail: string | null;
  hasMore: boolean;

  // Request cancellation
  abortController: AbortController | null;
  abortControllerDetail: AbortController | null;

  // Actions
  fetchProperties: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchPropertyDetail: (id: number) => Promise<void>;
  setFilters: (filters: Partial<PropertyFilterParams>) => void;
  resetFilters: () => void;
  setOperation: (operationId: number | undefined) => void;
  setRegion: (regionId: number | undefined) => void;
  setCity: (cityId: number | undefined) => void;
  setDistrict: (districtId: number | undefined) => void;
  setNeighborhood: (neighborhoodId: number | undefined) => void;
  setStreet: (streetId: number | undefined) => void;
  setMetroStation: (metroStationId: number | undefined) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
  clearPropertyDetail: () => void;
}

const defaultFilters: PropertyFilterParams = {
  page: 1,
  page_size: 20,
  sort_by: 'created_at_desc',
  sort_order: 'desc',
};

// Helper to create updated filters with cascade reset
const withCascadeReset = (
  filters: PropertyFilterParams,
  updates: Partial<PropertyFilterParams>
): PropertyFilterParams => {
  const newFilters = { ...filters, ...updates };

  // Cascade reset logic
  // If region changes, reset everything below
  if (updates.region_id !== undefined && updates.region_id !== filters.region_id) {
    newFilters.city_id = undefined;
    newFilters.district_id = undefined;
    newFilters.neighborhood_id = undefined;
    newFilters.street_id = undefined;
    newFilters.metro_station_id = undefined;
  }

  // If city changes, reset everything below
  if (updates.city_id !== undefined && updates.city_id !== filters.city_id) {
    newFilters.district_id = undefined;
    newFilters.neighborhood_id = undefined;
    newFilters.street_id = undefined;
    newFilters.metro_station_id = undefined;
  }

  // If district changes, reset neighborhood and street
  if (updates.district_id !== undefined && updates.district_id !== filters.district_id) {
    newFilters.neighborhood_id = undefined;
    newFilters.street_id = undefined;
  }

  // If neighborhood changes, reset street
  if (updates.neighborhood_id !== undefined && updates.neighborhood_id !== filters.neighborhood_id) {
    newFilters.street_id = undefined;
  }

  // Metro station change does NOT reset other geography
  // (it's a parallel filter, not hierarchical)

  return newFilters;
};

export const usePropertiesStore = create<PropertiesState>((set, get) => ({
  properties: [],
  hotProperties: [],
  propertyDetail: null,

  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,

  filters: defaultFilters,

  isLoading: false,
  isLoadingMore: false,
  isLoadingDetail: false,
  error: null,
  errorDetail: null,
  hasMore: true,

  abortController: null,
  abortControllerDetail: null,

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
        set({ isLoading: false, isLoadingMore: false });
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
    const { filters } = get();
    const updatedFilters = withCascadeReset(filters, newFilters);
    set({ filters: { ...updatedFilters, page: 1 } });
    get().fetchProperties(true);
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
    get().fetchProperties(true);
  },

  setOperation: (operationId: number | undefined) => {
    const { filters } = get();
    const updatedFilters = withCascadeReset(filters, { operation_id: operationId });
    set({ filters: { ...updatedFilters, page: 1 } });
    get().fetchProperties(true);
  },

  setRegion: (regionId: number | undefined) => {
    const { filters } = get();
    const updatedFilters = withCascadeReset(filters, { region_id: regionId });
    set({ filters: { ...updatedFilters, page: 1 } });
    get().fetchProperties(true);
  },

  setCity: (cityId: number | undefined) => {
    const { filters } = get();
    const updatedFilters = withCascadeReset(filters, { city_id: cityId });
    set({ filters: { ...updatedFilters, page: 1 } });
    get().fetchProperties(true);
  },

  setDistrict: (districtId: number | undefined) => {
    const { filters } = get();
    const updatedFilters = withCascadeReset(filters, { district_id: districtId });
    set({ filters: { ...updatedFilters, page: 1 } });
    get().fetchProperties(true);
  },

  setNeighborhood: (neighborhoodId: number | undefined) => {
    const { filters } = get();
    const updatedFilters = withCascadeReset(filters, { neighborhood_id: neighborhoodId });
    set({ filters: { ...updatedFilters, page: 1 } });
    get().fetchProperties(true);
  },

  setStreet: (streetId: number | undefined) => {
    const { filters } = get();
    const updatedFilters = withCascadeReset(filters, { street_id: streetId });
    set({ filters: { ...updatedFilters, page: 1 } });
    get().fetchProperties(true);
  },

  setMetroStation: (metroStationId: number | undefined) => {
    const { filters } = get();
    // Metro station doesn't cascade reset other geography
    const updatedFilters = { ...filters, metro_station_id: metroStationId, page: 1 };
    set({ filters: updatedFilters });
    get().fetchProperties(true);
  },

  refresh: async () => {
    await get().fetchProperties(true);
  },

  clearError: () => set({ error: null }),

  fetchPropertyDetail: async (id: number) => {
    const { abortControllerDetail } = get();

    // Cancel any in-flight detail request
    if (abortControllerDetail) {
      abortControllerDetail.abort();
    }
    const controller = new AbortController();
    set({ abortControllerDetail: controller, isLoadingDetail: true, errorDetail: null, propertyDetail: null });

    try {
      const response = await api.get<PropertyDetail>(API_ENDPOINTS.properties.detail(id), undefined, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      set({ propertyDetail: response, isLoadingDetail: false });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        set({ isLoadingDetail: false });
        return;
      }
      const message = error instanceof Error ? error.message : 'Failed to load property details';
      set({ errorDetail: message, isLoadingDetail: false, propertyDetail: null });
    }
  },

  clearPropertyDetail: () => set({ propertyDetail: null, errorDetail: null, isLoadingDetail: false }),
}));