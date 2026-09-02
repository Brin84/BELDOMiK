import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePropertiesStore } from '../propertiesStore';
import { api, API_ENDPOINTS } from '@/shared/api';

// Mock the api module (only what propertiesStore uses)
vi.mock('@/shared/api', () => ({
  api: {
    get: vi.fn(),
  },
  API_ENDPOINTS: {
    properties: {
      list: '/api/v1/properties',
      detail: (id: number) => `/api/v1/properties/${id}`,
    },
  },
}));

const defaultFilters = {
  page: 1,
  page_size: 500,
  sort_by: 'created_at_desc',
  sort_order: 'desc',
};

const initialState = {
  properties: [] as any[],
  hotProperties: [] as any[],
  propertyDetail: null,
  page: 1,
  pageSize: 500,
  total: 0,
  totalPages: 0,
  filters: { ...defaultFilters },
  isLoading: false,
  isLoadingMore: false,
  isLoadingDetail: false,
  error: null as string | null,
  errorDetail: null as string | null,
  hasMore: true,
  abortController: null as AbortController | null,
  abortControllerDetail: null as AbortController | null,
};

function makeProperty(id: number): any {
  return {
    id,
    price_byn: 100000 + id,
    price_usd: 30000 + id,
    price_per_m2_byn: 2000 + id,
    currency: 'BYN',
    operation: 'sale',
    operation_name: 'Sale',
    property_type: 'apartment',
    type_name: 'Apartment',
    city: 'Minsk',
    city_name: 'Minsk',
    photo_count: 0,
    status: 'published',
    is_favorite: false,
    favorites_count: 0,
    views_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    owner_id: 1,
  };
}

const emptyPage = { items: [], total: 0, page: 1, page_size: 20, pages: 1 };

describe('usePropertiesStore', () => {
  beforeEach(() => {
    usePropertiesStore.setState({ ...initialState });
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({ ...emptyPage });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const s = usePropertiesStore.getState();
      expect(s.properties).toEqual([]);
      expect(s.hotProperties).toEqual([]);
      expect(s.propertyDetail).toBeNull();
      expect(s.page).toBe(1);
      expect(s.pageSize).toBe(500);
      expect(s.total).toBe(0);
      expect(s.totalPages).toBe(0);
      expect(s.filters).toEqual(defaultFilters);
      expect(s.isLoading).toBe(false);
      expect(s.isLoadingMore).toBe(false);
      expect(s.isLoadingDetail).toBe(false);
      expect(s.error).toBeNull();
      expect(s.errorDetail).toBeNull();
      expect(s.hasMore).toBe(true);
      expect(s.abortController).toBeNull();
      expect(s.abortControllerDetail).toBeNull();
    });
  });

  describe('fetchProperties', () => {
    it('loads first page and updates pagination', async () => {
      const items = [makeProperty(1), makeProperty(2)];
      (api.get as any).mockResolvedValue({
        items,
        total: 2,
        page: 1,
        page_size: 20,
        pages: 1,
      });

      await usePropertiesStore.getState().fetchProperties(true);

      const s = usePropertiesStore.getState();
      expect(s.properties).toHaveLength(2);
      expect(s.properties[0].id).toBe(1);
      expect(s.total).toBe(2);
      expect(s.page).toBe(1);
      expect(s.totalPages).toBe(1);
      expect(s.hasMore).toBe(false);
      expect(s.isLoading).toBe(false);
      expect(s.error).toBeNull();
    });

    it('populates hotProperties from first page results', async () => {
      const items = [makeProperty(1), makeProperty(2), makeProperty(3), makeProperty(4)];
      (api.get as any).mockResolvedValue({
        items,
        total: 4,
        page: 1,
        page_size: 20,
        pages: 1,
      });

      await usePropertiesStore.getState().fetchProperties(true);

      const s = usePropertiesStore.getState();
      expect(s.hotProperties).toHaveLength(3);
      expect(s.hotProperties[0].id).toBe(1);
    });

    it('clears properties on reset', async () => {
      (api.get as any).mockResolvedValue({
        items: [makeProperty(1)],
        total: 1,
        page: 1,
        page_size: 20,
        pages: 1,
      });
      await usePropertiesStore.getState().fetchProperties(true);
      expect(usePropertiesStore.getState().properties).toHaveLength(1);

      (api.get as any).mockResolvedValue({ ...emptyPage });
      await usePropertiesStore.getState().fetchProperties(true);
      expect(usePropertiesStore.getState().properties).toHaveLength(0);
    });

    it('sets isLoading while fetching first page', async () => {
      let resolve!: (v: any) => void;
      (api.get as any).mockReturnValue(
        new Promise((r) => {
          resolve = r;
        })
      );

      const promise = usePropertiesStore.getState().fetchProperties(true);
      expect(usePropertiesStore.getState().isLoading).toBe(true);

      resolve({ items: [], total: 0, page: 1, page_size: 20, pages: 1 });
      await promise;
      expect(usePropertiesStore.getState().isLoading).toBe(false);
    });

    it('handles fetch error', async () => {
      (api.get as any).mockRejectedValue(new Error('Network error'));

      await usePropertiesStore.getState().fetchProperties(true);

      const s = usePropertiesStore.getState();
      expect(s.error).toBe('Network error');
      expect(s.isLoading).toBe(false);
      expect(s.properties).toHaveLength(0);
    });

    it('ignores AbortError', async () => {
      (api.get as any).mockRejectedValue(new DOMException('aborted', 'AbortError'));

      await usePropertiesStore.getState().fetchProperties(true);

      const s = usePropertiesStore.getState();
      expect(s.error).toBeNull();
      expect(s.isLoading).toBe(false);
    });

    it('aborts previous request when a new fetch starts', async () => {
      (api.get as any).mockResolvedValue({ ...emptyPage });
      await usePropertiesStore.getState().fetchProperties(true);
      const firstController = usePropertiesStore.getState().abortController;
      expect(firstController).not.toBeNull();

      await usePropertiesStore.getState().fetchProperties(true);
      expect(firstController!.signal.aborted).toBe(true);
    });

    it('does not fetch when already loading and not resetting', async () => {
      let resolve!: (v: any) => void;
      (api.get as any).mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        })
      );

      const p1 = usePropertiesStore.getState().fetchProperties(true);
      expect(usePropertiesStore.getState().isLoading).toBe(true);

      // Second call without reset should be a no-op
      await usePropertiesStore.getState().fetchProperties(false);
      expect((api.get as any).mock.calls.length).toBe(1);

      resolve({ items: [], total: 0, page: 1, page_size: 20, pages: 1 });
      await p1;
    });

    it('does not fetch next page when hasMore is false', async () => {
      (api.get as any).mockResolvedValue({
        items: [makeProperty(1)],
        total: 1,
        page: 1,
        page_size: 20,
        pages: 1,
      });
      await usePropertiesStore.getState().fetchProperties(true);
      expect(usePropertiesStore.getState().hasMore).toBe(false);

      await usePropertiesStore.getState().loadMore();
      // Only the first fetch should have been made
      expect((api.get as any).mock.calls.length).toBe(1);
    });
  });

  describe('pagination / loadMore', () => {
    it('appends next page and updates page/hasMore', async () => {
      (api.get as any)
        .mockResolvedValueOnce({
          items: [makeProperty(1)],
          total: 2,
          page: 1,
          page_size: 1,
          pages: 2,
        })
        .mockResolvedValueOnce({
          items: [makeProperty(2)],
          total: 2,
          page: 2,
          page_size: 1,
          pages: 2,
        });

      await usePropertiesStore.getState().fetchProperties(true);
      expect(usePropertiesStore.getState().properties).toHaveLength(1);
      expect(usePropertiesStore.getState().hasMore).toBe(true);

      await usePropertiesStore.getState().loadMore();

      const s = usePropertiesStore.getState();
      expect(s.properties).toHaveLength(2);
      expect(s.properties[1].id).toBe(2);
      expect(s.page).toBe(2);
      expect(s.hasMore).toBe(false);
    });

    it('sets isLoadingMore during loadMore', async () => {
      let resolve!: (v: any) => void;
      (api.get as any)
        .mockResolvedValueOnce({
          items: [makeProperty(1)],
          total: 2,
          page: 1,
          page_size: 1,
          pages: 2,
        })
        .mockReturnValueOnce(
          new Promise((r) => {
            resolve = r;
          })
        );

      await usePropertiesStore.getState().fetchProperties(true);
      const p = usePropertiesStore.getState().loadMore();
      expect(usePropertiesStore.getState().isLoadingMore).toBe(true);

      resolve({ items: [makeProperty(2)], total: 2, page: 2, page_size: 1, pages: 2 });
      await p;
      expect(usePropertiesStore.getState().isLoadingMore).toBe(false);
    });

    it('loadMore is a no-op while loading more', async () => {
      let resolve!: (v: any) => void;
      (api.get as any)
        .mockResolvedValueOnce({
          items: [makeProperty(1)],
          total: 3,
          page: 1,
          page_size: 1,
          pages: 3,
        })
        .mockReturnValueOnce(
          new Promise((r) => {
            resolve = r;
          })
        );

      await usePropertiesStore.getState().fetchProperties(true);
      const p = usePropertiesStore.getState().loadMore();
      // Second loadMore while first is in flight
      await usePropertiesStore.getState().loadMore();

      resolve({ items: [makeProperty(2)], total: 3, page: 2, page_size: 1, pages: 3 });
      await p;
      expect((api.get as any).mock.calls.length).toBe(2);
    });
  });

  describe('filters & cascade reset', () => {
    it('setFilters merges params and resets page to 1', () => {
      usePropertiesStore.getState().setFilters({ price_byn_min: 1000 });
      const f = usePropertiesStore.getState().filters;
      expect(f.price_byn_min).toBe(1000);
      expect(f.page).toBe(1);
    });

    it('setFilters triggers a fetch', () => {
      usePropertiesStore.getState().setFilters({ type_id: 5 });
      expect(api.get).toHaveBeenCalled();
    });

    it('resetFilters restores default filters', () => {
      usePropertiesStore.setState({
        filters: { ...defaultFilters, price_byn_min: 5000, region_id: 2, city_id: 3 },
      });
      usePropertiesStore.getState().resetFilters();
      expect(usePropertiesStore.getState().filters).toEqual(defaultFilters);
    });

    it('cascade resets all geography when region changes', () => {
      usePropertiesStore.setState({
        filters: {
          ...defaultFilters,
          region_id: 1,
          city_id: 3,
          district_id: 4,
          neighborhood_id: 5,
          street_id: 6,
          metro_station_id: 7,
        },
      });

      usePropertiesStore.getState().setRegion(2);

      const f = usePropertiesStore.getState().filters;
      expect(f.region_id).toBe(2);
      expect(f.city_id).toBeUndefined();
      expect(f.district_id).toBeUndefined();
      expect(f.neighborhood_id).toBeUndefined();
      expect(f.street_id).toBeUndefined();
      expect(f.metro_station_id).toBeUndefined();
    });

    it('cascade resets district/neighborhood/street when city changes', () => {
      usePropertiesStore.setState({
        filters: {
          ...defaultFilters,
          region_id: 1,
          city_id: 3,
          district_id: 4,
          neighborhood_id: 5,
          street_id: 6,
          metro_station_id: 7,
        },
      });

      usePropertiesStore.getState().setCity(9);

      const f = usePropertiesStore.getState().filters;
      expect(f.city_id).toBe(9);
      expect(f.region_id).toBe(1); // region preserved
      expect(f.district_id).toBeUndefined();
      expect(f.neighborhood_id).toBeUndefined();
      expect(f.street_id).toBeUndefined();
      expect(f.metro_station_id).toBeUndefined(); // metro reset when city changes (cascade)
    });

    it('cascade resets neighborhood/street when district changes', () => {
      usePropertiesStore.setState({
        filters: {
          ...defaultFilters,
          city_id: 3,
          district_id: 4,
          neighborhood_id: 5,
          street_id: 6,
        },
      });

      usePropertiesStore.getState().setDistrict(8);

      const f = usePropertiesStore.getState().filters;
      expect(f.district_id).toBe(8);
      expect(f.neighborhood_id).toBeUndefined();
      expect(f.street_id).toBeUndefined();
      expect(f.city_id).toBe(3);
    });

    it('cascade resets street when neighborhood changes', () => {
      usePropertiesStore.setState({
        filters: { ...defaultFilters, district_id: 4, neighborhood_id: 5, street_id: 6 },
      });

      usePropertiesStore.getState().setNeighborhood(10);

      const f = usePropertiesStore.getState().filters;
      expect(f.neighborhood_id).toBe(10);
      expect(f.street_id).toBeUndefined();
      expect(f.district_id).toBe(4);
    });

    it('metro station change does NOT reset other geography', () => {
      usePropertiesStore.setState({
        filters: { ...defaultFilters, city_id: 3, district_id: 4, region_id: 1 },
      });

      usePropertiesStore.getState().setMetroStation(11);

      const f = usePropertiesStore.getState().filters;
      expect(f.metro_station_id).toBe(11);
      expect(f.city_id).toBe(3);
      expect(f.district_id).toBe(4);
      expect(f.region_id).toBe(1);
    });

    it('setOperation updates operation filter', () => {
      usePropertiesStore.getState().setOperation(2);
      const f = usePropertiesStore.getState().filters;
      expect(f.operation_id).toBe(2);
      expect(f.page).toBe(1);
    });

    it('setStreet does not reset district/neighborhood', () => {
      usePropertiesStore.setState({
        filters: { ...defaultFilters, district_id: 4, neighborhood_id: 5 },
      });
      usePropertiesStore.getState().setStreet(12);
      const f = usePropertiesStore.getState().filters;
      expect(f.street_id).toBe(12);
      expect(f.district_id).toBe(4);
      expect(f.neighborhood_id).toBe(5);
    });
  });

  describe('sorting', () => {
    it('setFilters applies sort params', () => {
      usePropertiesStore.getState().setFilters({ sort_by: 'price_byn', sort_order: 'asc' });
      const f = usePropertiesStore.getState().filters;
      expect(f.sort_by).toBe('price_byn');
      expect(f.sort_order).toBe('asc');
    });

    it('setFilters passes sort params to API', async () => {
      usePropertiesStore.getState().setFilters({ sort_by: 'total_area', sort_order: 'asc' });
      expect(api.get).toHaveBeenCalledWith(
        API_ENDPOINTS.properties.list,
        expect.objectContaining({ sort_by: 'total_area', sort_order: 'asc', page: 1, page_size: 500 }),
        expect.anything()
      );
    });
  });

  describe('fetchPropertyDetail', () => {
    it('loads property detail', async () => {
      const detail = { ...makeProperty(1), photos: [], features: [], price_history: [] };
      (api.get as any).mockResolvedValue(detail);

      await usePropertiesStore.getState().fetchPropertyDetail(1);

      const s = usePropertiesStore.getState();
      expect(s.propertyDetail).toEqual(detail);
      expect(s.isLoadingDetail).toBe(false);
      expect(s.errorDetail).toBeNull();
    });

    it('handles detail fetch error', async () => {
      (api.get as any).mockRejectedValue(new Error('Not found'));

      await usePropertiesStore.getState().fetchPropertyDetail(1);

      const s = usePropertiesStore.getState();
      expect(s.errorDetail).toBe('Not found');
      expect(s.isLoadingDetail).toBe(false);
      expect(s.propertyDetail).toBeNull();
    });

    it('ignores AbortError on detail fetch', async () => {
      (api.get as any).mockRejectedValue(new DOMException('aborted', 'AbortError'));

      await usePropertiesStore.getState().fetchPropertyDetail(1);

      const s = usePropertiesStore.getState();
      expect(s.errorDetail).toBeNull();
      expect(s.isLoadingDetail).toBe(false);
    });

    it('aborts previous detail request when a new one starts', async () => {
      const detail = { ...makeProperty(1) };
      (api.get as any).mockResolvedValue(detail);

      await usePropertiesStore.getState().fetchPropertyDetail(1);
      const firstController = usePropertiesStore.getState().abortControllerDetail;
      expect(firstController).not.toBeNull();

      await usePropertiesStore.getState().fetchPropertyDetail(2);
      expect(firstController!.signal.aborted).toBe(true);
    });

    it('clears detail state on fetch start', async () => {
      usePropertiesStore.setState({ propertyDetail: makeProperty(1) });
      const detail = { ...makeProperty(2), photos: [], features: [], price_history: [] };
      (api.get as any).mockResolvedValue(detail);

      await usePropertiesStore.getState().fetchPropertyDetail(2);
      expect(usePropertiesStore.getState().propertyDetail!.id).toBe(2);
    });
  });

  describe('clear helpers', () => {
    it('clearError resets error', () => {
      usePropertiesStore.setState({ error: 'boom' });
      usePropertiesStore.getState().clearError();
      expect(usePropertiesStore.getState().error).toBeNull();
    });

    it('clearPropertyDetail resets detail state', () => {
      usePropertiesStore.setState({
        propertyDetail: makeProperty(1),
        errorDetail: 'x',
        isLoadingDetail: true,
      });
      usePropertiesStore.getState().clearPropertyDetail();
      const s = usePropertiesStore.getState();
      expect(s.propertyDetail).toBeNull();
      expect(s.errorDetail).toBeNull();
      expect(s.isLoadingDetail).toBe(false);
    });
  });

  describe('refresh', () => {
    it('refetches first page', async () => {
      (api.get as any).mockResolvedValue({
        items: [makeProperty(1)],
        total: 1,
        page: 1,
        page_size: 20,
        pages: 1,
      });
      await usePropertiesStore.getState().refresh();
      expect(api.get).toHaveBeenCalled();
      expect(usePropertiesStore.getState().properties).toHaveLength(1);
    });
  });
});
