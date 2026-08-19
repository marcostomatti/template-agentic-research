export {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
export { QueryProvider } from './provider';
export { defaultQueryClient } from './queryClient';
export type { PaginatedResponse, PaginationMeta } from './types';

import type { UseCacheOptions, UseCacheResult } from './types';

import { useQuery } from '@tanstack/react-query';

/**
 * A thin wrapper around `useQuery` that enforces sensible read-only defaults
 * for stale-while-revalidate caching in browser contexts.
 *
 * ### Stale-while-revalidate semantics
 *
 * React Query serves cached data immediately (stale or not) while
 * conditionally triggering a background refetch:
 * - Data younger than `staleTime` is returned as-is with no network request.
 * - Data older than `staleTime` is returned immediately **and** a background
 *   refetch is started so the UI updates once fresh data arrives.
 * - Data that has been inactive for longer than `gcTime` is evicted from the
 *   in-memory cache entirely.
 *
 * ### Default option values
 *
 * | Option                | Default     | Description                                        |
 * |-----------------------|-------------|----------------------------------------------------|
 * | `staleTime`           | `60_000` ms | Data stays fresh for 1 minute.                     |
 * | `gcTime`              | `300_000` ms| Inactive data is garbage-collected after 5 minutes.|
 * | `enabled`             | `true`      | Set to `false` to skip the fetch entirely.         |
 * | `refetchOnWindowFocus`| `false`     | No automatic refetch when the tab regains focus.   |
 *
 * ### Read-only boundary
 *
 * This hook is intended **exclusively** for read-only data fetching.
 * It does not support mutations or optimistic updates. For mutations use
 * `useMutation` from `@tanstack/react-query` directly. For server-side
 * Redis-backed caching use `createServerCache` from
 * `components-library/cache/server`.
 *
 * @param key     - Unique query key array used for deduplication and caching.
 *                  Changing any element of the array triggers a fresh fetch.
 * @param fetcher - Async function that resolves to the data to cache.
 *                  Called on a cache miss or when stale data needs revalidation.
 * @param options - Optional overrides. See {@link UseCacheOptions} for the
 *                  full option set and their defaults.
 *
 * @returns A {@link UseCacheResult} containing `data`, loading/error state,
 *          and a `refetch` function for manual invalidation.
 *
 * @example
 * ```ts
 * const { data, isLoading } = useCache(['agents', id], () => fetchAgent(id))
 * ```
 *
 * @example Disable until a dependency is ready
 * ```ts
 * const { data } = useCache(
 *   ['agent', id],
 *   () => fetchAgent(id),
 *   { enabled: id !== undefined },
 * )
 * ```
 */
export function useCache<T>(
  key: string[],
  fetcher: () => Promise<T>,
  options?: UseCacheOptions<T>,
): UseCacheResult<T> {
  const { data, isLoading, isError, error, refetch } = useQuery<T>({
    queryKey: key,
    queryFn: fetcher,
    staleTime: options?.staleTime ?? 60_000,
    gcTime: options?.gcTime ?? 5 * 60_000,
    enabled: options?.enabled,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    select: options?.select,
  });

  return { data, isLoading, isError, error, refetch };
}
