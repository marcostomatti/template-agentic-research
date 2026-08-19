import type { ServerCache } from './types';
import type { Redis } from 'ioredis';

/**
 * How many keys `SCAN` is asked to examine per round trip. A hint, not a limit —
 * Redis may return more or fewer. Large enough to keep the number of round trips
 * sane, small enough that each round stays short on a single-threaded server.
 */
const SCAN_BATCH = 100;

/** Maximum keys per `DEL`, so one invalidation cannot issue an unbounded command. */
const DELETE_CHUNK = 100;

/**
 * Creates a Redis-backed {@link ServerCache} instance.
 *
 * All TTL values accepted by the returned cache are in **seconds**.
 *
 * @param redis - An `ioredis` client instance.  The caller is responsible for
 *                creating and configuring the client; `close()` will call
 *                `redis.quit()` during shutdown.
 * @returns A {@link ServerCache} bound to the provided Redis client.
 *
 * @example
 * ```ts
 * import Redis from 'ioredis'
 * import { createServerCache } from 'components-library/cache/server'
 *
 * const redis = new Redis(process.env.REDIS_URL!)
 * const cache = createServerCache(redis)
 *
 * const agents = await cache.get('agents:list', 300, () => db.select(...))
 * ```
 */
export function createServerCache(redis: Redis): ServerCache {
  return {
    /**
     * Cache-aside read: returns the cached value when present, otherwise
     * invokes `fetchFn`, persists the result with the given TTL, and returns it.
     *
     * @param key     - Redis key to look up.
     * @param ttl     - Time-to-live in **seconds** applied on a cache miss.
     * @param fetchFn - Async function invoked on a cache miss.
     * @returns The cached or freshly fetched value.
     */
    async get<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
      const cached = await redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }

      const result = await fetchFn();
      await redis.set(key, JSON.stringify(result), 'EX', ttl);
      return result;
    },

    /**
     * Unconditionally writes a value to the cache.
     *
     * @param key   - Redis key to write.
     * @param value - Value to serialise as JSON and store.
     * @param ttl   - Time-to-live in **seconds**.
     */
    async set<T>(key: string, value: T, ttl: number): Promise<void> {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    },

    /**
     * Removes a single key from the cache.
     *
     * @param key - Redis key to delete.
     */
    async invalidate(key: string): Promise<void> {
      await redis.del(key);
    },

    /**
     * Removes all keys matching a glob-style pattern (e.g. `"agents:*"`).
     * No-ops gracefully when no keys match the pattern.
     *
     * Uses `SCAN`, never `KEYS`. `KEYS` walks the ENTIRE keyspace in a single
     * operation, and Redis is single-threaded — so on a database of any real size it
     * blocks every other client for the duration, including the ones this cache is
     * meant to make faster. `SCAN` returns a cursor and does the same walk in small
     * batches, yielding between them.
     *
     * Matches are collected across the whole walk and deleted afterwards, in bounded
     * chunks, rather than deleted batch-by-batch as the cursor advances. Two reasons,
     * and the second is the load-bearing one:
     *
     *   - Chunking the deletes keeps any single `DEL` from taking an unbounded
     *     argument list, which would be the same "one huge operation stalls everyone"
     *     problem `KEYS` had, wearing a different hat.
     *   - Deleting mid-walk mutates the collection being iterated. Real Redis
     *     tolerates it — its cursor is keyed on hash-table buckets, so removing one
     *     key does not shift where the others live — but that is a guarantee no test
     *     here can exercise, and `ioredis-mock`'s cursor is a plain array index that
     *     it does NOT hold: deleting shrinks the array and the next cursor skips
     *     live entries, silently leaving keys cached. Not relying on the guarantee
     *     costs one array and makes the behaviour identical everywhere.
     *
     * `SCAN` gives a weaker guarantee than `KEYS`, and it is the right one here: keys
     * created *during* the walk may or may not be seen. For cache invalidation that
     * is harmless — a key written after invalidation started is newer than the
     * invalidation, so keeping it is correct.
     *
     * @param prefix - Glob-style pattern, e.g. `"agents:*"`.
     */
    async invalidatePattern(prefix: string): Promise<void> {
      const matched: string[] = [];
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', prefix, 'COUNT', SCAN_BATCH);
        cursor = next;
        matched.push(...keys);
      } while (cursor !== '0');

      for (let i = 0; i < matched.length; i += DELETE_CHUNK) {
        await redis.del(...matched.slice(i, i + DELETE_CHUNK));
      }
    },

    /**
     * Closes the underlying Redis connection.
     * Should be called during application shutdown.
     */
    async close(): Promise<void> {
      await redis.quit();
    },
  };
}
