import { vi } from 'vitest';
import React from 'react';
import { act as reactAct } from 'react';

// Set NODE_ENV to development for React act() support
process.env.NODE_ENV = 'development';

// Mock global fetch
global.fetch = vi.fn();

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Suppress console.error for expected errors in tests
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) {
    return;
  }
  originalError.apply(console, args);
};

// Re-export act from react for tests
global.act = reactAct;