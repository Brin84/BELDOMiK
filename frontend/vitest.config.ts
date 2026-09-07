import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    // React должен грузиться в development-сборке: иначе @testing-library/react
    // не может использовать act() (падает с "act(...) is not supported in
    // production builds of React") при NODE_ENV=production в окружении.
    env: {
      NODE_ENV: 'development',
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
  },
});