import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { User, TokenResponse } from '@/shared/api/types';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  status: 'idle' | 'authenticating' | 'authenticated' | 'error';
  error: string | null;

  login: (initData: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  refresh: () => Promise<boolean>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      status: 'idle',
      error: null,

      login: async (initData: string) => {
        set({ status: 'authenticating', error: null });
        try {
          const response = await api.post<TokenResponse>(API_ENDPOINTS.auth.telegram, {
            init_data: initData,
          });
          set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            user: response.user,
            status: 'authenticated',
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Authentication failed';
          set({ status: 'error', error: message, accessToken: null, refreshToken: null, user: null });
          throw error;
        }
      },

      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null, status: 'idle' });
        // Optionally call logout endpoint
        api.post(API_ENDPOINTS.auth.logout).catch(() => {});
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      refresh: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) return false;

        try {
          const response = await api.post<TokenResponse>(API_ENDPOINTS.auth.refresh, {
            refresh_token: refreshToken,
          });
          set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            user: response.user,
            status: 'authenticated',
          });
          return true;
        } catch {
          set({ accessToken: null, refreshToken: null, user: null, status: 'idle' });
          return false;
        }
      },

      fetchUser: async () => {
        try {
          const user = await api.get<User>(API_ENDPOINTS.auth.me);
          set({ user });
        } catch {
          // If fetch fails, token might be invalid
          set({ user: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'beldomik-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);