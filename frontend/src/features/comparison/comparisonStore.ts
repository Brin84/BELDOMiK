import { create } from 'zustand';
import type { PropertyShort, PropertyDetail } from '@/shared/api/types';
import { usePropertiesStore } from '@/features/properties/propertiesStore';

export interface ComparisonState {
  // Selected property IDs (max 4 for comparison)
  selectedIds: number[];

  // Loaded property details for comparison
  properties: PropertyDetail[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  addToComparison: (property: PropertyShort) => boolean;
  removeFromComparison: (propertyId: number) => void;
  clearComparison: () => void;
  loadComparisonDetails: () => Promise<void>;
  isInComparison: (propertyId: number) => boolean;
  getSelectedCount: () => number;
  canAddMore: () => boolean;
}

const MAX_COMPARISON_ITEMS = 4;

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  selectedIds: [],
  properties: [],
  isLoading: false,
  error: null,

  addToComparison: (property: PropertyShort) => {
    const { selectedIds } = get();

    if (selectedIds.includes(property.id)) {
      return false; // Already in comparison
    }

    if (selectedIds.length >= MAX_COMPARISON_ITEMS) {
      return false; // Max reached
    }

    set({ selectedIds: [...selectedIds, property.id] });
    return true;
  },

  removeFromComparison: (propertyId: number) => {
    const { selectedIds } = get();
    set({
      selectedIds: selectedIds.filter(id => id !== propertyId),
      properties: get().properties.filter(p => p.id !== propertyId),
    });
  },

  clearComparison: () => {
    set({ selectedIds: [], properties: [], error: null });
  },

  isInComparison: (propertyId: number) => {
    return get().selectedIds.includes(propertyId);
  },

  getSelectedCount: () => {
    return get().selectedIds.length;
  },

  canAddMore: () => {
    return get().selectedIds.length < MAX_COMPARISON_ITEMS;
  },

  loadComparisonDetails: async () => {
    const { selectedIds, properties: currentProperties } = get();

    if (selectedIds.length === 0) {
      set({ properties: [], isLoading: false });
      return;
    }

    // Check if we already have all properties loaded
    const missingIds = selectedIds.filter(id =>
      !currentProperties.some(p => p.id === id)
    );

    if (missingIds.length === 0) {
      // Already have all, just ensure order matches selectedIds
      const orderedProperties = selectedIds
        .map(id => currentProperties.find(p => p.id === id))
        .filter((p): p is PropertyDetail => p !== undefined);
      set({ properties: orderedProperties, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const api = usePropertiesStore.getState().fetchPropertyDetail;

      // Fetch missing properties
      const newProperties: PropertyDetail[] = [];
      for (const id of missingIds) {
        try {
          await api(id);
          const detail = usePropertiesStore.getState().propertyDetail;
          if (detail) {
            newProperties.push(detail);
          }
        } catch (error) {
          console.error(`Failed to load property ${id}:`, error);
        }
      }

      // Combine with existing and order by selectedIds
      const allProperties = [...currentProperties, ...newProperties];
      const orderedProperties = selectedIds
        .map(id => allProperties.find(p => p.id === id))
        .filter((p): p is PropertyDetail => p !== undefined);

      set({ properties: orderedProperties, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка загрузки данных для сравнения';
      set({ error: message, isLoading: false });
    }
  },
}));

// Helper to check if a property is in comparison from anywhere
export const isInComparison = (propertyId: number): boolean => {
  return useComparisonStore.getState().isInComparison(propertyId);
};

export const getComparisonCount = (): number => {
  return useComparisonStore.getState().getSelectedCount();
};

export const canAddToComparison = (): boolean => {
  return useComparisonStore.getState().canAddMore();
};