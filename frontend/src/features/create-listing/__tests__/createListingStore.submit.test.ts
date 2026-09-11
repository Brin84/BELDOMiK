import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateListingStore } from '../createListingStore';
import { useAuthStore } from '@/features/auth';

// Мокаем весь API-модуль: визард-сторе импортирует { api, API_ENDPOINTS }.
// Проверяем саму последовательность вызовов submitForModeration.
const { createMock, updateMock, submitMock, uploadMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  submitMock: vi.fn(),
  uploadMock: vi.fn(),
}));

vi.mock('@/shared/api', () => ({
  api: {
    post: (path: string) => {
      if (String(path).endsWith('/submit')) return submitMock();
      return createMock(); // POST /api/v1/properties
    },
    put: updateMock,
    postFormData: uploadMock,
  },
  API_ENDPOINTS: {
    properties: {
      create: '/api/v1/properties',
      update: (id: number) => `/api/v1/properties/${id}`,
      photosUpload: (id: number) => `/api/v1/properties/${id}/photos/upload`,
    },
  },
  buildUrl: (path: string) => path,
}));

const CREATED = { id: 42, status: 'draft' };
const SUBMITTED = { id: 42, status: 'pending_moderation' };

function validFormData() {
  return {
    title: 'Двухкомнатная квартира в центре Минска',
    description: 'Отличная квартира в хорошем состоянии',
    operation: 'sale' as const,
    property_type_id: 1,
    region_id: 1,
    city_id: 1,
    price_byn: 150000,
    area: 60,
    rooms: 2,
    floor: 5,
    floors_total: 12,
    build_year: 2010,
    repair_type: 'euro',
    // Шаг 4 «Контакты» (Kufar-модель) обязателен для автомодерации.
    contact_name: 'Иван Петров',
    contact_phone: '+375291234567',
  };
}

describe('createListingStore.submitForModeration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockReset().mockResolvedValue(CREATED);
    submitMock.mockReset().mockResolvedValue(SUBMITTED);
    useCreateListingStore.getState().reset();
    useAuthStore.setState({ status: 'authenticated', accessToken: 't', refreshToken: 'r' });
  });

  it('свежая подача (без черновика): создаёт объявление → отправляет на модерацию', async () => {
    useCreateListingStore.getState().updateFormData(validFormData());

    const result = await useCreateListingStore.getState().submitForModeration();

    expect(createMock).toHaveBeenCalledTimes(1); // POST /api/v1/properties
    expect(updateMock).not.toHaveBeenCalled();
    expect(submitMock).toHaveBeenCalledTimes(1); // POST /api/v1/properties/42/submit
    expect(result).toEqual(SUBMITTED);
    // После успеха черновик/фото сбрасываются.
    expect(useCreateListingStore.getState().draftId).toBeNull();
    expect(useCreateListingStore.getState().isSubmitting).toBe(false);
    expect(useCreateListingStore.getState().error).toBeNull();
  });

  it('редактирование черновика (есть draftId): обновляет → отправляет на модерацию', async () => {
    useCreateListingStore.setState({ draftId: 7 });
    useCreateListingStore.getState().updateFormData(validFormData());

    const result = await useCreateListingStore.getState().submitForModeration();

    expect(updateMock).toHaveBeenCalledTimes(1); // PUT /api/v1/properties/7
    expect(createMock).not.toHaveBeenCalled();
    expect(submitMock).toHaveBeenCalledTimes(1); // POST /api/v1/properties/7/submit
    expect(result).toEqual(SUBMITTED);
  });
});