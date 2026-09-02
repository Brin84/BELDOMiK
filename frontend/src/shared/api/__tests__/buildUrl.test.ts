import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildUrl } from '../client';

describe('buildUrl', () => {
  const originalLocation = window.location;

  afterEach(() => {
    // Restore the real location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('resolves a relative path against window origin when no API base is set', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://app.example.com' },
      writable: true,
    });

    const url = buildUrl('/api/v1/auth/telegram');
    expect(url).toBe('https://app.example.com/api/v1/auth/telegram');
  });

  it('throws neither for a relative path with an empty base', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://app.example.com' },
      writable: true,
    });

    // Previously: new URL(path, '') threw "Invalid URL", breaking every API call.
    expect(() => buildUrl('/api/v1/auth/telegram')).not.toThrow();
  });

  it('appends query params', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://app.example.com' },
      writable: true,
    });

    const url = buildUrl('/api/v1/properties', { city_id: 5, page: 2 });
    expect(url).toBe('https://app.example.com/api/v1/properties?city_id=5&page=2');
  });

  it('skips null/undefined params', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://app.example.com' },
      writable: true,
    });

    const url = buildUrl('/api/v1/properties', { city_id: null, q: undefined, page: 1 });
    expect(url).toBe('https://app.example.com/api/v1/properties?page=1');
  });
});
