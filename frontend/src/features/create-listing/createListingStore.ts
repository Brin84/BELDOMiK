import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { PropertyCreate, PropertyShort, OperationType } from '@/shared/api/types';

export type CreateListingStep = 1 | 2 | 3 | 4 | 5;

export interface CreateListingState {
  // Wizard state
  currentStep: CreateListingStep;
  totalSteps: 5;

  // Form data
  formData: PropertyCreate;

  // Photos (stored locally during wizard, uploaded after property creation)
  photos: File[];

  // Validation errors
  errors: Record<string, string>;

  // UI state
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;

  // Draft
  draftId: number | null;

  // Computed
  canProceed: boolean;
  completionPercentage: number;

  // Actions
  setStep: (step: CreateListingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<PropertyCreate>) => void;
  setPhotos: (photos: File[]) => void;
  addPhotos: (photos: File[]) => void;
  removePhoto: (index: number) => void;
  reorderPhotos: (fromIndex: number, toIndex: number) => void;
  validateStep: (step: CreateListingStep) => boolean;
  validateAll: () => boolean;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
  submit: () => Promise<PropertyShort | null>;
  submitForModeration: () => Promise<PropertyShort | null>;
  saveDraft: () => Promise<void>;
  loadDraft: (id: number) => Promise<void>;
  reset: () => void;
}

const defaultFormData: PropertyCreate = {
  title: '',
  description: '',
  operation: 'sale',
  property_type_id: 0,
  region_id: 0,
  city_id: 0,
  district_id: undefined,
  neighborhood_id: undefined,
  street_id: undefined,
  address: '',
  latitude: undefined,
  longitude: undefined,
  price_byn: 0,
  price_usd: undefined,
  area: undefined,
  rooms: undefined,
  floor: undefined,
  floors_total: undefined,
  build_year: undefined,
  repair_type: '',
  has_balcony: false,
  has_furniture: false,
  has_elevator: false,
  has_parking: false,
};

const stepFields: Record<CreateListingStep, string[]> = {
  1: ['operation', 'property_type_id'],
  2: ['region_id', 'city_id'],
  3: ['title', 'description', 'price_byn', 'area', 'rooms', 'floor', 'floors_total', 'build_year', 'repair_type', 'has_balcony', 'has_furniture', 'has_elevator', 'has_parking', 'district_id', 'neighborhood_id', 'street_id', 'address'],
  4: ['title', 'description', 'price_byn', 'area', 'rooms', 'floor', 'floors_total', 'build_year', 'repair_type', 'has_balcony', 'has_furniture', 'has_elevator', 'has_parking', 'district_id', 'neighborhood_id', 'street_id', 'address', 'latitude', 'longitude'],
  5: [], // Preview step - no required fields
};

const stepValidationRules: Record<string, (data: PropertyCreate) => string | null> = {
  title: (data) => data.title.trim().length < 10 ? 'Название должно содержать минимум 10 символов' : data.title.trim().length > 100 ? 'Название не должно превышать 100 символов' : null,
  description: (data) => data.description && data.description.length > 5000 ? 'Описание не должно превышать 5000 символов' : null,
  price_byn: (data) => data.price_byn <= 0 ? 'Укажите цену' : data.price_byn > 100000000 ? 'Цена слишком высокая' : null,
  area: (data) => data.area !== undefined && (data.area <= 0 || data.area > 10000) ? 'Некорректная площадь' : null,
  rooms: (data) => data.rooms !== undefined && (data.rooms < 0 || data.rooms > 50) ? 'Некорректное количество комнат' : null,
  floor: (data) => data.floor !== undefined && (data.floor < 1 || data.floor > 100) ? 'Некорректный этаж' : null,
  floors_total: (data) => data.floors_total !== undefined && (data.floors_total < 1 || data.floors_total > 100) ? 'Некорректная этажность' : null,
  build_year: (data) => data.build_year !== undefined && (data.build_year < 1800 || data.build_year > new Date().getFullYear() + 5) ? 'Некорректный год постройки' : null,
  operation: (data) => !data.operation ? 'Выберите тип сделки' : null,
  property_type_id: (data) => data.property_type_id <= 0 ? 'Выберите тип недвижимости' : null,
  region_id: (data) => data.region_id <= 0 ? 'Выберите область' : null,
  city_id: (data) => data.city_id <= 0 ? 'Выберите город' : null,
};

export const useCreateListingStore = create<CreateListingState>((set, get) => ({
  currentStep: 1,
  totalSteps: 5,
  formData: defaultFormData,
  photos: [],
  errors: {},
  isSubmitting: false,
  isLoading: false,
  error: null,
  draftId: null,

  get canProceed() {
    return get().validateStep(get().currentStep);
  },

  get completionPercentage() {
    const completedSteps = Array.from({ length: get().totalSteps }, (_, i) => i + 1)
      .filter(step => step <= get().currentStep && get().validateStep(step as CreateListingStep))
      .length;
    return Math.round((completedSteps / get().totalSteps) * 100);
  },

  setStep: (step: CreateListingStep) => {
    if (step < 1 || step > 5) return;
    // Allow going back always, but only go forward if current step is valid
    if (step > get().currentStep && !get().validateStep(get().currentStep)) return;
    set({ currentStep: step });
  },

  nextStep: () => {
    const { currentStep, totalSteps, validateStep } = get();
    if (currentStep < totalSteps && validateStep(currentStep)) {
      set({ currentStep: (currentStep + 1) as CreateListingStep });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 1) {
      set({ currentStep: (currentStep - 1) as CreateListingStep });
    }
  },

  updateFormData: (data: Partial<PropertyCreate>) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
    // Clear errors for updated fields
    const fields = Object.keys(data);
    fields.forEach(field => {
      if (get().errors[field]) {
        set((state) => {
          const newErrors = { ...state.errors };
          delete newErrors[field];
          return { errors: newErrors };
        });
      }
    });
  },

  setPhotos: (photos: File[]) => set({ photos }),

  addPhotos: (newPhotos: File[]) => {
    set((state) => ({ photos: [...state.photos, ...newPhotos] }));
  },

  removePhoto: (index: number) => {
    set((state) => ({ photos: state.photos.filter((_, i) => i !== index) }));
  },

  reorderPhotos: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newPhotos = [...state.photos];
      const [removed] = newPhotos.splice(fromIndex, 1);
      newPhotos.splice(toIndex, 0, removed);
      return { photos: newPhotos };
    });
  },

  validateStep: (step: CreateListingStep) => {
    const { formData } = get();
    const fields = stepFields[step] || [];

    for (const field of fields) {
      const validator = stepValidationRules[field];
      if (validator) {
        const error = validator(formData);
        if (error) return false;
      }
    }
    return true;
  },

  validateAll: () => {
    const { formData } = get();
    let isValid = true;

    for (const [field, validator] of Object.entries(stepValidationRules)) {
      const error = validator(formData);
      if (error) {
        set((state) => ({ errors: { ...state.errors, [field]: error } }));
        isValid = false;
      }
    }

    return isValid;
  },

  setError: (field: string, error: string) => {
    set((state) => ({ errors: { ...state.errors, [field]: error } }));
  },

  clearError: (field: string) => {
    set((state) => {
      const newErrors = { ...state.errors };
      delete newErrors[field];
      return { errors: newErrors };
    });
  },

  clearAllErrors: () => set({ errors: {} }),

  submit: async () => {
    const { formData, photos, draftId, validateAll } = get();

    if (!validateAll()) {
      set({ error: 'Пожалуйста, исправьте ошибки в форме' });
      return null;
    }

    set({ isSubmitting: true, error: null });

    try {
      // Step 1: Create or update the property - map frontend fields to backend schema
      const backendData = {
        type_id: formData.property_type_id,
        operation_id: formData.operation === 'sale' ? 1 : formData.operation === 'rent' ? 2 : formData.operation === 'daily_rent' ? 3 : 4,
        city_id: formData.city_id,
        district_id: formData.district_id,
        neighborhood_id: formData.neighborhood_id,
        street_id: formData.street_id,
        metro_station_id: undefined,
        metro_distance: undefined,
        address: formData.address,
        lat: formData.latitude,
        lng: formData.longitude,
        floor: formData.floor,
        total_floors: formData.floors_total,
        build_year: formData.build_year,
        total_area: formData.area,
        living_area: undefined,
        kitchen_area: undefined,
        rooms_count: formData.rooms,
        renovation: formData.repair_type,
        furniture: formData.has_furniture,
        balcony: formData.has_balcony,
        parking: formData.has_parking,
        elevator: formData.has_elevator,
        description: formData.description,
        price_byn: formData.price_byn,
        price_usd: formData.price_usd,
        photos: [], // Photos uploaded separately
        features: [],
      };

      let response: PropertyShort;

      if (draftId) {
        // Update existing property
        response = await api.patch<PropertyShort>(API_ENDPOINTS.properties.update(draftId), backendData);
      } else {
        // Create new property
        response = await api.post<PropertyShort>(API_ENDPOINTS.properties.create, backendData);
      }

      // Step 2: Upload photos if any
      if (photos.length > 0) {
        const formDataUpload = new FormData();
        photos.forEach((photo) => {
          formDataUpload.append('files', photo);
        });

        await api.postFormData(API_ENDPOINTS.properties.photosUpload(response.id), formDataUpload);
      }

      set({ isSubmitting: false, draftId: null, photos: [] });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка при создании объявления';
      set({ isSubmitting: false, error: message });
      return null;
    }
  },

  submitForModeration: async () => {
    const { draftId, formData, photos, validateAll } = get();
    if (!draftId) return null;

    if (!validateAll()) {
      set({ error: 'Пожалуйста, исправьте ошибки в форме' });
      return null;
    }

    set({ isSubmitting: true, error: null });

    try {
      // First update the property with any changes
      const backendData = {
        type_id: formData.property_type_id,
        operation_id: formData.operation === 'sale' ? 1 : formData.operation === 'rent' ? 2 : formData.operation === 'daily_rent' ? 3 : 4,
        city_id: formData.city_id,
        district_id: formData.district_id,
        neighborhood_id: formData.neighborhood_id,
        street_id: formData.street_id,
        metro_station_id: undefined,
        metro_distance: undefined,
        address: formData.address,
        lat: formData.latitude,
        lng: formData.longitude,
        floor: formData.floor,
        total_floors: formData.floors_total,
        build_year: formData.build_year,
        total_area: formData.area,
        living_area: undefined,
        kitchen_area: undefined,
        rooms_count: formData.rooms,
        renovation: formData.repair_type,
        furniture: formData.has_furniture,
        balcony: formData.has_balcony,
        parking: formData.has_parking,
        elevator: formData.has_elevator,
        description: formData.description,
        price_byn: formData.price_byn,
        price_usd: formData.price_usd,
        photos: [], // Photos uploaded separately
        features: [],
      };

      await api.patch<PropertyShort>(API_ENDPOINTS.properties.update(draftId), backendData);

      // Then submit for moderation
      const response = await api.post<PropertyShort>(`/api/v1/properties/${draftId}/submit`, {});

      // Upload photos if any
      if (photos.length > 0) {
        const formDataUpload = new FormData();
        photos.forEach((photo) => {
          formDataUpload.append('files', photo);
        });

        await api.postFormData(API_ENDPOINTS.properties.photosUpload(draftId), formDataUpload);
      }

      set({ isSubmitting: false, draftId: null, photos: [] });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка при отправке на модерацию';
      set({ isSubmitting: false, error: message });
      return null;
    }
  },

  saveDraft: async () => {
    const { formData, draftId } = get();
    set({ isLoading: true });

    try {
      const backendData = {
        type_id: formData.property_type_id,
        operation_id: formData.operation === 'sale' ? 1 : formData.operation === 'rent' ? 2 : formData.operation === 'daily_rent' ? 3 : 4,
        city_id: formData.city_id,
        district_id: formData.district_id,
        neighborhood_id: formData.neighborhood_id,
        street_id: formData.street_id,
        metro_station_id: undefined,
        metro_distance: undefined,
        address: formData.address,
        lat: formData.latitude,
        lng: formData.longitude,
        floor: formData.floor,
        total_floors: formData.floors_total,
        build_year: formData.build_year,
        total_area: formData.area,
        living_area: undefined,
        kitchen_area: undefined,
        rooms_count: formData.rooms,
        renovation: formData.repair_type,
        furniture: formData.has_furniture,
        balcony: formData.has_balcony,
        parking: formData.has_parking,
        elevator: formData.has_elevator,
        description: formData.description,
        price_byn: formData.price_byn,
        price_usd: formData.price_usd,
        photos: [],
        features: [],
      };

      if (draftId) {
        await api.patch(API_ENDPOINTS.properties.update(draftId), backendData);
      } else {
        const response = await api.post<PropertyShort>(API_ENDPOINTS.properties.create, {
          ...backendData,
          title: formData.title || 'Черновик',
        });
        set({ draftId: response.id });
      }
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  loadDraft: async (id: number) => {
    set({ isLoading: true });
    try {
      const response = await api.get<PropertyShort>(API_ENDPOINTS.properties.detail(id));
      // Convert PropertyShort to PropertyCreate
      // Note: backend PropertyShort uses string fields for IDs (e.g., city, region, district)
      const draftData: PropertyCreate = {
        title: response.title || '',
        description: response.description || '',
        operation: response.operation as OperationType,
        property_type_id: Number(response.property_type) || 0,
        region_id: Number(response.region) || 1,
        city_id: Number(response.city) || 1,
        district_id: response.district ? Number(response.district) : undefined,
        neighborhood_id: response.neighborhood ? Number(response.neighborhood) : undefined,
        street_id: response.street ? Number(response.street) : undefined,
        address: response.address || '',
        latitude: response.latitude,
        longitude: response.longitude,
        price_byn: response.price_byn ?? 0,
        price_usd: response.price_usd ?? undefined,
        area: response.area,
        rooms: response.rooms,
        floor: response.floor,
        floors_total: response.floors_total,
        build_year: response.build_year,
        repair_type: response.renovation || '',
        has_balcony: response.balcony || false,
        has_furniture: response.furniture || false,
        has_elevator: response.elevator || false,
        has_parking: response.parking || false,
      };
      set({ formData: draftData, draftId: id, currentStep: 1, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  reset: () => set({
    currentStep: 1,
    formData: defaultFormData,
    photos: [],
    errors: {},
    isSubmitting: false,
    isLoading: false,
    error: null,
    draftId: null,
  }),
}));