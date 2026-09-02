import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../authStore';
import { api, API_ENDPOINTS } from '@/shared/api';
import type { User, TokenResponse } from '@/shared/api/types';

// Mock the api module
vi.mock('@/shared/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
  API_ENDPOINTS: {
    auth: {
      telegram: '/api/v1/auth/telegram',
      refresh: '/api/v1/auth/refresh',
      me: '/api/v1/auth/me',
      logout: '/api/v1/auth/logout',
    },
  },
}));

const mockUser: User = {
  id: 1,
  telegram_id: 123456789,
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  role: 'owner',
  is_admin: false,
  is_moderator: false,
  is_verified: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTokenResponse: TokenResponse = {
  access_token: 'access-token-123',
  refresh_token: 'refresh-token-123',
  token_type: 'bearer',
  user: mockUser,
};

const initialState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  status: 'idle' as const,
  error: null,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useAuthStore.setState({ ...initialState });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const s = useAuthStore.getState();
      expect(s.accessToken).toBeNull();
      expect(s.refreshToken).toBeNull();
      expect(s.user).toBeNull();
      expect(s.status).toBe('idle');
      expect(s.error).toBeNull();
    });
  });

  describe('login', () => {
    it('sets status to authenticating on start', async () => {
      (api.post as vi.Mock).mockResolvedValue(mockTokenResponse);

      const promise = useAuthStore.getState().login('test-init-data');
      expect(useAuthStore.getState().status).toBe('authenticating');
      expect(useAuthStore.getState().error).toBeNull();

      await promise;
    });

    it('stores tokens and user on successful login', async () => {
      (api.post as vi.Mock).mockResolvedValue(mockTokenResponse);

      await useAuthStore.getState().login('test-init-data');

      const s = useAuthStore.getState();
      expect(s.accessToken).toBe('access-token-123');
      expect(s.refreshToken).toBe('refresh-token-123');
      expect(s.user).toEqual(mockUser);
      expect(s.status).toBe('authenticated');
      expect(s.error).toBeNull();
    });

    it('calls API with correct endpoint and init_data', async () => {
      (api.post as vi.Mock).mockResolvedValue(mockTokenResponse);

      await useAuthStore.getState().login('my-init-data-string');

      expect(api.post).toHaveBeenCalledWith(
        API_ENDPOINTS.auth.telegram,
        { init_data: 'my-init-data-string' }
      );
    });

    it('sets error state and clears tokens on login failure', async () => {
      (api.post as vi.Mock).mockRejectedValue(new Error('Invalid init data'));

      await expect(useAuthStore.getState().login('bad-data')).rejects.toThrow('Invalid init data');

      const s = useAuthStore.getState();
      expect(s.status).toBe('error');
      expect(s.error).toBe('Invalid init data');
      expect(s.accessToken).toBeNull();
      expect(s.refreshToken).toBeNull();
      expect(s.user).toBeNull();
    });

    it('throws the original error on login failure', async () => {
      const originalError = new Error('Network error');
      (api.post as vi.Mock).mockRejectedValue(originalError);

      await expect(useAuthStore.getState().login('test')).rejects.toThrow('Network error');
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      // Mock logout endpoint to return a resolved promise by default
      (api.post as vi.Mock).mockImplementation((url: string) => {
        if (url === API_ENDPOINTS.auth.logout) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });
    });

    it('clears all auth state', () => {
      useAuthStore.setState({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
        status: 'authenticated',
        error: 'some error',
      });

      useAuthStore.getState().logout();

      const s = useAuthStore.getState();
      expect(s.accessToken).toBeNull();
      expect(s.refreshToken).toBeNull();
      expect(s.user).toBeNull();
      expect(s.status).toBe('idle');
    });

    it('calls logout endpoint (fire and forget)', () => {
      useAuthStore.getState().logout();

      expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.auth.logout);
    });

    it('does not throw if logout endpoint fails', async () => {
      (api.post as vi.Mock).mockImplementation((url: string) => {
        if (url === API_ENDPOINTS.auth.logout) {
          return Promise.reject(new Error('Server error'));
        }
        return Promise.resolve({});
      });

      // Should not throw
      expect(() => useAuthStore.getState().logout()).not.toThrow();

      const s = useAuthStore.getState();
      expect(s.accessToken).toBeNull();
      expect(s.user).toBeNull();
    });
  });

  describe('setTokens', () => {
    it('sets access and refresh tokens', () => {
      useAuthStore.getState().setTokens('new-access', 'new-refresh');

      const s = useAuthStore.getState();
      expect(s.accessToken).toBe('new-access');
      expect(s.refreshToken).toBe('new-refresh');
      // User and status unchanged
      expect(s.user).toBeNull();
      expect(s.status).toBe('idle');
    });
  });

  describe('refresh', () => {
    it('returns false if no refresh token', async () => {
      useAuthStore.setState({ refreshToken: null });

      const result = await useAuthStore.getState().refresh();

      expect(result).toBe(false);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('calls refresh endpoint with current refresh token', async () => {
      useAuthStore.setState({ refreshToken: 'old-refresh-token' });
      const newTokenResponse: TokenResponse = {
        ...mockTokenResponse,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };
      (api.post as vi.Mock).mockResolvedValue(newTokenResponse);

      const result = await useAuthStore.getState().refresh();

      expect(api.post).toHaveBeenCalledWith(
        API_ENDPOINTS.auth.refresh,
        { refresh_token: 'old-refresh-token' }
      );
      expect(result).toBe(true);
    });

    it('updates tokens and user on successful refresh', async () => {
      useAuthStore.setState({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        user: mockUser,
        status: 'authenticated',
      });
      const newTokenResponse: TokenResponse = {
        ...mockTokenResponse,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };
      (api.post as vi.Mock).mockResolvedValue(newTokenResponse);
      // refresh() re-fetches the user via /auth/me
      (api.get as vi.Mock).mockResolvedValue(mockUser);

      const result = await useAuthStore.getState().refresh();

      const s = useAuthStore.getState();
      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.auth.me);
      expect(result).toBe(true);
      expect(s.accessToken).toBe('new-access-token');
      expect(s.refreshToken).toBe('new-refresh-token');
      expect(s.user).toEqual(mockUser);
      expect(s.status).toBe('authenticated');
    });

    it('clears auth state and returns false on refresh failure', async () => {
      useAuthStore.setState({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        user: mockUser,
        status: 'authenticated',
      });
      (api.post as vi.Mock).mockRejectedValue(new Error('Refresh failed'));

      const result = await useAuthStore.getState().refresh();

      const s = useAuthStore.getState();
      expect(result).toBe(false);
      expect(s.accessToken).toBeNull();
      expect(s.refreshToken).toBeNull();
      expect(s.user).toBeNull();
      expect(s.status).toBe('idle');
    });
  });

  describe('fetchUser', () => {
    it('fetches and sets user on success', async () => {
      (api.get as vi.Mock).mockResolvedValue(mockUser);

      await useAuthStore.getState().fetchUser();

      expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.auth.me);
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('keeps current user on transient fetch failure', async () => {
      useAuthStore.setState({ user: mockUser });
      (api.get as vi.Mock).mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().fetchUser();

      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('does not throw on fetch failure', async () => {
      (api.get as vi.Mock).mockRejectedValue(new Error('Network error'));

      await expect(useAuthStore.getState().fetchUser()).resolves.not.toThrow();
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useAuthStore.setState({ error: 'Authentication failed', status: 'error' });

      useAuthStore.getState().clearError();

      const s = useAuthStore.getState();
      expect(s.error).toBeNull();
      // status should remain unchanged
      expect(s.status).toBe('error');
    });
  });

  describe('persistence (localStorage)', () => {
    it('persists accessToken, refreshToken, and user', () => {
      // The persist middleware stores to localStorage
      // We verify the partialize function includes correct fields
      const { partialize } = useAuthStore.persist.getOptions();

      const testState = {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: mockUser,
        status: 'authenticated' as const,
        error: 'some error',
        login: vi.fn(),
        logout: vi.fn(),
        setTokens: vi.fn(),
        refresh: vi.fn(),
        fetchUser: vi.fn(),
        clearError: vi.fn(),
      };

      const persisted = partialize(testState);

      expect(persisted.accessToken).toBe('access');
      expect(persisted.refreshToken).toBe('refresh');
      expect(persisted.user).toEqual(mockUser);
      expect('status' in persisted).toBe(false);
      expect('error' in persisted).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('status goes idle -> authenticating -> authenticated on login', async () => {
      (api.post as vi.Mock).mockResolvedValue(mockTokenResponse);

      expect(useAuthStore.getState().status).toBe('idle');

      const promise = useAuthStore.getState().login('init-data');
      expect(useAuthStore.getState().status).toBe('authenticating');

      await promise;
      expect(useAuthStore.getState().status).toBe('authenticated');
    });

    it('status goes authenticated -> idle on logout', () => {
      // Ensure logout endpoint is mocked
      (api.post as vi.Mock).mockImplementation((url: string) => {
        if (url === API_ENDPOINTS.auth.logout) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      useAuthStore.setState({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: mockUser,
        status: 'authenticated',
      });

      useAuthStore.getState().logout();

      expect(useAuthStore.getState().status).toBe('idle');
    });

    it('status goes authenticated -> idle on failed refresh', async () => {
      useAuthStore.setState({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: mockUser,
        status: 'authenticated',
      });
      (api.post as vi.Mock).mockRejectedValue(new Error('Failed'));

      await useAuthStore.getState().refresh();

      expect(useAuthStore.getState().status).toBe('idle');
    });
  });
});