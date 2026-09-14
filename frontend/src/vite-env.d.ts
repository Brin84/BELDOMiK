/// <reference types="vite/client" />

/** Идентификатор сборки из vite.config.ts (git sha + время сборки). */
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_TG_BOT_USERNAME: string;
  readonly VITE_YANDEX_METRIKA_ID: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_SENTRY_DSN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}