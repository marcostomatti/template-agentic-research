/** Metadata describing a paginated result set. */
export interface PaginationMeta {
  /** Current page number (1-based). */
  page: number;
  /** Number of items per page. */
  perPage: number;
  /** Total number of items across all pages. */
  total: number;
  /** Total number of pages. */
  totalPages: number;
}

/** A paginated API response wrapping an array of items with pagination metadata. */
export interface PaginatedResponse<T> {
  /** The items on the current page. */
  data: T[];
  /** Pagination metadata for the current result set. */
  pagination: PaginationMeta;
}

/**
 * Options forwarded to the underlying `useQuery` call inside `useCache`.
 *
 * All fields are optional; sensible defaults are applied when omitted.
 *
 * @typeParam T - The resolved data type returned by the fetcher.
 */
export interface UseCacheOptions<T> {
  /**
   * How long (in milliseconds) cached data is considered fresh before a
   * background refetch is triggered.
   *
   * @default 60_000
   */
  staleTime?: number;
  /**
   * How long (in milliseconds) inactive query data remains in the cache
   * before being garbage-collected.
   *
   * @default 300_000 (5 minutes)
   */
  gcTime?: number;
  /**
   * When `false`, the query is skipped entirely and no fetcher is invoked.
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * Whether the query should automatically refetch when the browser window
   * regains focus.
   *
   * @default false
   */
  refetchOnWindowFocus?: boolean;
  /**
   * Optional selector applied to the raw data before it is returned.
   * Useful for deriving a subset or transformed view without a separate
   * memoisation step.
   */
  select?: (data: T) => T;
}

/**
 * The value returned by `useCache`.
 *
 * @typeParam T - The resolved data type returned by the fetcher.
 */
export interface UseCacheResult<T> {
  /**
   * The cached or freshly fetched data.
   * `undefined` while the initial fetch is in flight or if it has errored.
   */
  data: T | undefined;
  /** `true` while the initial fetch is in flight (no cached data exists yet). */
  isLoading: boolean;
  /** `true` if the most recent fetch attempt threw an error. */
  isError: boolean;
  /** The error thrown by the fetcher, or `undefined` if there is none. */
  error: unknown;
  /** Manually trigger a refetch regardless of staleness. */
  refetch(): void;
}

/**
 * A Redis-backed cache abstraction for server-side use.
 *
 * Obtained by calling `createServerCache(redis)`.  All TTL values are
 * expressed in **seconds**.
 */
export interface ServerCache {
  /**
   * Cache-aside read: returns the cached value if present, otherwise calls
   * `fetchFn`, stores the result, and returns it.
   *
   * @param key    - Redis key to look up.
   * @param ttl    - Time-to-live in **seconds** applied on a cache miss.
   * @param fetchFn - Async function invoked on a cache miss to produce the value.
   * @returns The cached or freshly fetched value.
   */
  get<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T>;

  /**
   * Unconditionally writes a value to the cache.
   *
   * @param key   - Redis key to write.
   * @param value - Value to serialise as JSON and store.
   * @param ttl   - Time-to-live in **seconds**.
   */
  set<T>(key: string, value: T, ttl: number): Promise<void>;

  /**
   * Removes a single key from the cache.
   *
   * @param key - Redis key to delete.
   */
  invalidate(key: string): Promise<void>;

  /**
   * Removes all keys matching a glob-style prefix pattern (e.g. `"agents:*"`).
   * No-ops gracefully when no keys match.
   *
   * Implementations must iterate with a cursor (`SCAN`) rather than `KEYS`, which
   * walks the whole keyspace in one blocking operation on a single-threaded server.
   *
   * @param prefix - Glob-style pattern, e.g. `"agents:*"`.
   */
  invalidatePattern(prefix: string): Promise<void>;

  /**
   * Closes the underlying Redis connection.
   * Should be called during application shutdown.
   */
  close(): Promise<void>;
}
