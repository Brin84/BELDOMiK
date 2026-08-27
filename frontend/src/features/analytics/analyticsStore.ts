import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';

export interface MarketOverview {
  total_properties: number;
  for_sale: number;
  for_rent: number;
  avg_price_byn: number;
  total_views: number;
}

export interface CityStats {
  city_id: number;
  city_name: string;
  property_count: number;
  avg_price_byn: number;
}

export interface PopularProperty {
  property_id: number;
  title: string;
  view_count: number;
}

export interface PriceDistribution {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface TypeDistribution {
  type_id: number;
  type_name: string;
  count: number;
}

export interface AnalyticsState {
  // Market overview
  marketOverview: MarketOverview | null;

  // City stats
  cityStats: CityStats[];

  // Popular properties
  popularProperties: PopularProperty[];

  // Price distribution
  priceDistribution: PriceDistribution | null;

  // Type distribution
  typeDistribution: TypeDistribution[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMarketOverview: () => Promise<void>;
  fetchCityStats: (cityId?: number) => Promise<void>;
  fetchPopularProperties: (limit?: number, periodDays?: number) => Promise<void>;
  fetchPriceDistribution: (cityId?: number, typeId?: number) => Promise<void>;
  fetchTypeDistribution: () => Promise<void>;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  marketOverview: null,
  cityStats: [],
  popularProperties: [],
  priceDistribution: null,
  typeDistribution: [],

  isLoading: false,
  error: null,

  fetchMarketOverview: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<MarketOverview>(API_ENDPOINTS.analytics.overview);
      set({ marketOverview: data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load market overview';
      set({ error: message, isLoading: false });
    }
  },

  fetchCityStats: async (cityId?: number) => {
    set({ isLoading: true, error: null });
    try {
      const params = cityId ? { city_id: cityId } : undefined;
      const data = await api.get<CityStats[]>(API_ENDPOINTS.analytics.cityStats, params);
      set({ cityStats: data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load city stats';
      set({ error: message, isLoading: false });
    }
  },

  fetchPopularProperties: async (limit = 10, periodDays = 30) => {
    set({ isLoading: true, error: null });
    try {
      const params = { limit, period_days: periodDays };
      const data = await api.get<PopularProperty[]>(API_ENDPOINTS.analytics.popular, params);
      set({ popularProperties: data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load popular properties';
      set({ error: message, isLoading: false });
    }
  },

  fetchPriceDistribution: async (cityId?: number, typeId?: number) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, number> = {};
      if (cityId) params.city_id = cityId;
      if (typeId) params.type_id = typeId;
      const data = await api.get<PriceDistribution>(API_ENDPOINTS.analytics.priceDistribution, Object.keys(params).length > 0 ? params : undefined);
      set({ priceDistribution: data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load price distribution';
      set({ error: message, isLoading: false });
    }
  },

  fetchTypeDistribution: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<TypeDistribution[]>(API_ENDPOINTS.analytics.typeDistribution);
      set({ typeDistribution: data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load type distribution';
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));