import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Идентификатор сборки — виден в конце «Настроек» приложения. Нужен, чтобы
// отличить «код не работает» от «клиент показывает старый кэшированный
// бандл»: Telegram WebView на iOS умеет держать ассеты в своём кэше дольше,
// чем хотелось бы, и без маркера это неотличимо от регрессии.
const buildId = `${(process.env.GITHUB_SHA || 'local').slice(0, 7)}-${Date.now().toString(36)}`;

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});