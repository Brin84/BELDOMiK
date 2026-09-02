import { create } from 'zustand';
import { api } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/api/endpoints';
import type {
  AdminDashboard,
  AdminUserListItem,
  AdminPropertyListItem,
  AdminReport,
  UserRole,
} from '@/shared/api';

interface AdminState {
  // Dashboard
  dashboard: AdminDashboard | null;
  dashboardLoading: boolean;

  // Users
  users: AdminUserListItem[];
  usersLoading: boolean;

  // Properties
  properties: AdminPropertyListItem[];
  propertiesLoading: boolean;

  // Reports
  reports: AdminReport[];
  reportsTotal: number;
  reportsLoading: boolean;

  // Actions
  fetchDashboard: () => Promise<void>;
  fetchUsers: (params?: { search?: string; role?: string }) => Promise<void>;
  fetchProperties: (params?: { status?: string; search?: string }) => Promise<void>;
  fetchReports: (params?: { status?: string }) => Promise<void>;
  updateUserRole: (userId: number, role: UserRole) => Promise<void>;
  blockUser: (userId: number, blocked: boolean) => Promise<void>;
  updatePropertyStatus: (propertyId: number, status: string, reason?: string) => Promise<void>;
  resolveReport: (reportId: number) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  dashboard: null,
  dashboardLoading: false,
  users: [],
  usersLoading: false,
  properties: [],
  propertiesLoading: false,
  reports: [],
  reportsTotal: 0,
  reportsLoading: false,

  fetchDashboard: async () => {
    set({ dashboardLoading: true });
    try {
      const data = await api.get<AdminDashboard>(API_ENDPOINTS.admin.dashboard);
      set({ dashboard: data, dashboardLoading: false });
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err);
      set({ dashboardLoading: false });
    }
  },

  fetchUsers: async (params) => {
    set({ usersLoading: true });
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.role) searchParams.set('role', params.role);
      const qs = searchParams.toString();
      const url = qs ? `${API_ENDPOINTS.admin.users}?${qs}` : API_ENDPOINTS.admin.users;
      const data = await api.get<AdminUserListItem[]>(url);
      set({ users: data, usersLoading: false });
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
      set({ usersLoading: false });
    }
  },

  fetchProperties: async (params) => {
    set({ propertiesLoading: true });
    try {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);
      const qs = searchParams.toString();
      const url = qs ? `${API_ENDPOINTS.admin.properties}?${qs}` : API_ENDPOINTS.admin.properties;
      const data = await api.get<AdminPropertyListItem[]>(url);
      set({ properties: data, propertiesLoading: false });
    } catch (err) {
      console.error('Failed to fetch admin properties:', err);
      set({ propertiesLoading: false });
    }
  },

  fetchReports: async (params) => {
    set({ reportsLoading: true });
    try {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      const qs = searchParams.toString();
      const url = qs ? `${API_ENDPOINTS.admin.reports}?${qs}` : API_ENDPOINTS.admin.reports;
      const data = await api.get<{ items: AdminReport[]; total: number }>(url);
      set({ reports: data.items, reportsTotal: data.total, reportsLoading: false });
    } catch (err) {
      console.error('Failed to fetch admin reports:', err);
      set({ reportsLoading: false });
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      await api.patch(API_ENDPOINTS.admin.userRole(userId), { role });
      // Refresh users list
      const { users } = get();
      set({
        users: users.map((u) =>
          u.id === userId ? { ...u, role } : u
        ),
      });
    } catch (err) {
      console.error('Failed to update user role:', err);
    }
  },

  blockUser: async (userId, blocked) => {
    try {
      await api.patch(API_ENDPOINTS.admin.userBlock(userId), { is_blocked: blocked });
      // Refresh users list
      const { users } = get();
      set({
        users: users.map((u) =>
          u.id === userId ? { ...u, is_blocked: blocked, is_active: !blocked } : u
        ),
      });
    } catch (err) {
      console.error('Failed to block user:', err);
    }
  },

  updatePropertyStatus: async (propertyId, status, reason) => {
    try {
      await api.patch(API_ENDPOINTS.admin.propertyStatus(propertyId), { status, reason });
      // Refresh properties list
      const { properties } = get();
      set({
        properties: properties.map((p) =>
          p.id === propertyId ? { ...p, status: status as AdminPropertyListItem['status'] } : p
        ),
      });
    } catch (err) {
      console.error('Failed to update property status:', err);
    }
  },

  resolveReport: async (reportId) => {
    try {
      await api.post(API_ENDPOINTS.admin.resolveReport(reportId));
      // Refresh reports list
      const { reports } = get();
      set({
        reports: reports.map((r) =>
          r.id === reportId ? { ...r, status: 'resolved' } : r
        ),
      });
    } catch (err) {
      console.error('Failed to resolve report:', err);
    }
  },
}));
