/**
 * @packageDocumentation
 * Redis (ioredis), wired as a managed service dependency.
 *
 * OFF BY DEFAULT: the service only registers this dependency when
 * `REDIS_URL` is set (see `src/index.ts`) — Redis tends to be the most
 * expensive and least used piece of the stack, so it is opt-in.
 *
 * `lazyConnect` keeps construction side-effect free; the connection is
 * established (and fails fast) in `onStart`, mirroring the Postgres probe.
 */
import type { TypedDependency } from '../../lib/service-core/index.js';

import { Redis } from 'ioredis';

import { createDependency } from '../../lib/service-core/index.js';

/**
 * Creates the Redis dependency.
 *
 * @param url - Redis connection URL (see `REDIS_URL`).
 * @returns A `TypedDependency<Redis>` for `createService({ dependencies })`.
 */
export function createRedisDependency(url: string): TypedDependency<Redis> {
  const redis = new Redis(url, {
    lazyConnect: true,
    // Fail fast on start instead of retrying forever behind the scenes;
    // once connected, ioredis' default reconnect behaviour applies.
    maxRetriesPerRequest: 2,
  });

  return createDependency({
    name: 'redis',
    client: redis,
    async onStart() {
      await redis.connect();
      await redis.ping();
    },
    async onStop() {
      await redis.quit();
    },
  });
}
