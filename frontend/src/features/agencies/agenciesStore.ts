import { create } from 'zustand';
import { api, API_ENDPOINTS } from '@/shared/api';
import type {
  Agency,
  AgencyCreate,
  AgencyMember,
  AgencyUpdate,
  PaginatedResponse,
  PropertyShort,
} from '@/shared/api/types';

interface AgenciesState {
  // Public catalog
  agencies: Agency[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;

  // Detail
  agencyDetail: Agency | null;
  detailProperties: PropertyShort[];
  detailTotal: number;
  isLoadingDetail: boolean;
  isLoadingProperties: boolean;

  // My agency
  myAgency: Agency | null;
  myMembers: AgencyMember[];
  isLoadingMy: boolean;

  fetchAgencies: (page?: number) => Promise<void>;
  fetchAgency: (id: number) => Promise<void>;
  fetchAgencyProperties: (id: number, page?: number) => Promise<void>;
  fetchMyAgency: () => Promise<void>;
  createAgency: (data: AgencyCreate) => Promise<Agency>;
  updateAgency: (id: number, data: AgencyUpdate) => Promise<void>;
  addMember: (id: number, userId: number, role?: string) => Promise<void>;
  removeMember: (id: number, userId: number) => Promise<void>;
  clearError: () => void;
}

export const useAgenciesStore = create<AgenciesState>((set, get) => ({
  agencies: [],
  total: 0,
  page: 1,
  pageSize: 20,
  isLoading: false,
  error: null,

  agencyDetail: null,
  detailProperties: [],
  detailTotal: 0,
  isLoadingDetail: false,
  isLoadingProperties: false,

  myAgency: null,
  myMembers: [],
  isLoadingMy: false,

  fetchAgencies: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<PaginatedResponse<Agency>>(API_ENDPOINTS.agencies.list, {
        page,
        page_size: get().pageSize,
      });
      set({ agencies: data.items, total: data.total, page, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },

  fetchAgency: async (id) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const agency = await api.get<Agency>(API_ENDPOINTS.agencies.detail(id));
      set({ agencyDetail: agency, isLoadingDetail: false });
    } catch (e) {
      set({ isLoadingDetail: false, error: (e as Error).message });
    }
  },

  fetchAgencyProperties: async (id, page = 1) => {
    set({ isLoadingProperties: true });
    try {
      const data = await api.get<PaginatedResponse<PropertyShort>>(
        API_ENDPOINTS.agencies.properties(id),
        { page, page_size: 20 }
      );
      set({
        detailProperties: page === 1 ? data.items : [...get().detailProperties, ...data.items],
        detailTotal: data.total,
        isLoadingProperties: false,
      });
    } catch (e) {
      set({ isLoadingProperties: false, error: (e as Error).message });
    }
  },

  fetchMyAgency: async () => {
    set({ isLoadingMy: true, error: null });
    try {
      const myAgency = await api.get<Agency>(API_ENDPOINTS.agencies.me);
      const members = await api.get<AgencyMember[]>(API_ENDPOINTS.agencies.members(myAgency.id));
      set({ myAgency, myMembers: members, isLoadingMy: false });
    } catch (e) {
      set({ myAgency: null, myMembers: [], isLoadingMy: false, error: (e as Error).message });
    }
  },

  createAgency: async (data) => {
    const agency = await api.post<Agency>(API_ENDPOINTS.agencies.create, data);
    await get().fetchMyAgency();
    return agency;
  },

  updateAgency: async (id, data) => {
    await api.patch<Agency>(API_ENDPOINTS.agencies.update(id), data);
    await get().fetchMyAgency();
  },

  addMember: async (id, userId, role = 'agent') => {
    await api.post<AgencyMember>(API_ENDPOINTS.agencies.addMember(id), { user_id: userId, role });
    await get().fetchMyAgency();
  },

  removeMember: async (id, userId) => {
    await api.delete<void>(API_ENDPOINTS.agencies.removeMember(id, userId));
    await get().fetchMyAgency();
  },

  clearError: () => set({ error: null }),
}));
