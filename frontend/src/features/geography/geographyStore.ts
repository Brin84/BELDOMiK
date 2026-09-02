import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { Region, City, District, Neighborhood, Street, MetroLine, MetroStation, PropertyType, OperationTypeData } from '@/shared/api';

export interface GeographyState {
  regions: Region[];
  cities: City[];
  districts: District[];
  neighborhoods: Neighborhood[];
  streets: Street[];
  metroLines: MetroLine[];
  metroStations: MetroStation[];
  propertyTypes: PropertyType[];
  operationTypes: OperationTypeData[];

  loadedRegions: boolean;
  loadedCities: boolean;
  loadedAllCities: boolean;
  loadedDistricts: boolean;
  loadedNeighborhoods: boolean;
  loadedStreets: boolean;
  loadedMetro: boolean;
  loadedPropertyTypes: boolean;
  loadedOperationTypes: boolean;

  fetchRegions: () => Promise<void>;
  fetchCities: (regionId: number) => Promise<void>;
  fetchAllCities: () => Promise<void>;
  fetchDistricts: (cityId: number) => Promise<void>;
  fetchNeighborhoods: (cityId: number) => Promise<void>;
  fetchStreets: (cityId: number) => Promise<void>;
  fetchMetroLines: (cityId: number) => Promise<void>;
  fetchMetroStations: (lineId: number) => Promise<void>;
  fetchPropertyTypes: () => Promise<void>;
  fetchOperationTypes: () => Promise<void>;

  getRegionById: (id: number) => Region | undefined;
  getCityById: (id: number) => City | undefined;
  getDistrictById: (id: number) => District | undefined;
  getNeighborhoodById: (id: number) => Neighborhood | undefined;
  getStreetById: (id: number) => Street | undefined;
  getMetroStationById: (id: number) => MetroStation | undefined;
  getPropertyTypeById: (id: number) => PropertyType | undefined;
  getOperationTypeById: (id: number) => OperationTypeData | undefined;
}

export const useGeographyStore = create<GeographyState>((set, get) => ({
  regions: [],
  cities: [],
  districts: [],
  neighborhoods: [],
  streets: [],
  metroLines: [],
  metroStations: [],
  propertyTypes: [],
  operationTypes: [],

  loadedRegions: false,
  loadedCities: false,
  loadedAllCities: false,
  loadedDistricts: false,
  loadedNeighborhoods: false,
  loadedStreets: false,
  loadedMetro: false,
  loadedPropertyTypes: false,
  loadedOperationTypes: false,

  fetchRegions: async () => {
    if (get().loadedRegions) return;
    try {
      const data = await api.get<Region[]>(API_ENDPOINTS.geography.regions);
      set({ regions: data, loadedRegions: true });
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    }
  },

  fetchCities: async (regionId: number) => {
    try {
      const data = await api.get<City[]>(API_ENDPOINTS.geography.cities, { region_id: regionId });
      set({ cities: data, loadedCities: true });
    } catch (error) {
      console.error('Failed to fetch cities:', error);
    }
  },

  fetchAllCities: async () => {
    if (get().loadedAllCities) return;
    await get().fetchRegions();
    const all: City[] = [];
    for (const region of get().regions) {
      try {
        const data = await api.get<City[]>(API_ENDPOINTS.geography.cities, { region_id: region.id });
        all.push(...data);
      } catch (error) {
        console.error('Failed to fetch cities:', error);
      }
    }
    set({ cities: all, loadedCities: true, loadedAllCities: true });
  },

  fetchDistricts: async (cityId: number) => {
    try {
      const data = await api.get<District[]>(API_ENDPOINTS.geography.districts, { city_id: cityId });
      set({ districts: data, loadedDistricts: true });
    } catch (error) {
      console.error('Failed to fetch districts:', error);
    }
  },

  fetchNeighborhoods: async (cityId: number) => {
    try {
      const data = await api.get<Neighborhood[]>(API_ENDPOINTS.geography.neighborhoods, { city_id: cityId });
      set({ neighborhoods: data, loadedNeighborhoods: true });
    } catch (error) {
      console.error('Failed to fetch neighborhoods:', error);
    }
  },

  fetchStreets: async (cityId: number) => {
    try {
      const data = await api.get<Street[]>(API_ENDPOINTS.geography.streets, { city_id: cityId });
      set({ streets: data, loadedStreets: true });
    } catch (error) {
      console.error('Failed to fetch streets:', error);
    }
  },

  fetchMetroLines: async (cityId: number) => {
    try {
      const data = await api.get<MetroLine[]>(API_ENDPOINTS.geography.metroLines, { city_id: cityId });
      set({ metroLines: data, loadedMetro: true });
    } catch (error) {
      console.error('Failed to fetch metro lines:', error);
    }
  },

  fetchMetroStations: async (lineId: number) => {
    try {
      const data = await api.get<MetroStation[]>(API_ENDPOINTS.geography.metroStations, { line_id: lineId });
      set({ metroStations: data });
    } catch (error) {
      console.error('Failed to fetch metro stations:', error);
    }
  },

  fetchPropertyTypes: async () => {
    if (get().loadedPropertyTypes) return;
    try {
      const data = await api.get<PropertyType[]>(API_ENDPOINTS.propertyTypes.list);
      set({ propertyTypes: data, loadedPropertyTypes: true });
    } catch (error) {
      console.error('Failed to fetch property types:', error);
    }
  },

  fetchOperationTypes: async () => {
    if (get().loadedOperationTypes) return;
    try {
      const data = await api.get<OperationTypeData[]>(API_ENDPOINTS.propertyTypes.operations);
      set({ operationTypes: data, loadedOperationTypes: true });
    } catch (error) {
      console.error('Failed to fetch operation types:', error);
    }
  },

  getRegionById: (id: number) => get().regions.find((r) => r.id === id),
  getCityById: (id: number) => get().cities.find((c) => c.id === id),
  getDistrictById: (id: number) => get().districts.find((d) => d.id === id),
  getNeighborhoodById: (id: number) => get().neighborhoods.find((n) => n.id === id),
  getStreetById: (id: number) => get().streets.find((s) => s.id === id),
  getMetroStationById: (id: number) => get().metroStations.find((s) => s.id === id),
  getPropertyTypeById: (id: number) => get().propertyTypes.find((t) => t.id === id),
  getOperationTypeById: (id: number) => get().operationTypes.find((t) => t.id === id),
}));