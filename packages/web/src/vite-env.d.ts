/// <reference types="vite/client" />

/**
 * The build-time variables this app reads. Both are optional: an unset
 * `VITE_AR_API_URL` selects the fixture layer (see `src/data/source.ts`),
 * and an unset `VITE_AR_BASE_PATH` builds for the root base.
 */
interface ImportMetaEnv {
  /** The service base URL; `''` means same-origin, unset means fixtures. */
  readonly VITE_AR_API_URL?: string;
  /** The public path the SPA is built under, such as `/app/`. */
  readonly VITE_AR_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
