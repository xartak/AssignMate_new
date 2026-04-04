/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly FRONTEND_VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
