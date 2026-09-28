/// <reference types="vite/client" />

declare global {
  interface Window {
    APP_CONFIG?: Record<string, unknown> & { VITE_BASE_API?: string }
  }
}

export {}
