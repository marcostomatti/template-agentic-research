import Redis from 'ioredis-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createServerCache } from '../server.js';

describe('createServerCache', () => {
  let redis: InstanceType<typeof Redis>;
  let cache: ReturnType<typeof createServerCache>;

  beforeEach(() => {
    redis = new Redis();
    cache = createServerCache(redis as never);
  });

  describe('get', () => {
    it('calls fetchFn on a cache miss and stores the result with the correct TTL', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ name: 'agent' });
      const setSpy = vi.spyOn(redis, 'set');

      const result = await cache.get('agents:1', 300, fetchFn);

      expect(fetchFn).toHaveBeenCalledOnce();
      expect(result).toEqual({ name: 'agent' });
      expect(setSpy).toHaveBeenCalledWith(
        'agents:1',
        JSON.stringify({ name: 'agent' }),
        'EX',
        300,
      );
    });

    it('returns the cached value on a hit without calling fetchFn', async () => {
      await redis.set('agents:1', JSON.stringify({ name: 'cached' }), 'EX', 300);
      const fetchFn = vi.fn();

      const result = await cache.get('agents:1', 300, fetchFn);

      expect(fetchFn).not.toHaveBeenCalled();
      expect(result).toEqual({ name: 'cached' });
    });
  });

  describe('set', () => {
    it('stores a value serialized as JSON with the given TTL', async () => {
      const setSpy = vi.spyOn(redis, 'set');

      await cache.set('key:1', { foo: 'bar' }, 60);

      expect(setSpy).toHaveBeenCalledWith('key:1', JSON.stringify({ foo: 'bar' }), 'EX', 60);
      const stored = await redis.get('key:1');
      expect(JSON.parse(stored!)).toEqual({ foo: 'bar' });
    });
  });

  describe('invalidate', () => {
    it('removes the specified key from Redis', async () => {
      await redis.set('to-delete', 'value', 'EX', 60);

      await cache.invalidate('to-delete');

      const val = await redis.get('to-delete');
      expect(val).toBeNull();
    });
  });

  describe('invalidatePattern', () => {
    it('removes all keys matching the pattern', async () => {
      await redis.set('agents:1', 'a', 'EX', 60);
      await redis.set('agents:2', 'b', 'EX', 60);
      await redis.set('other:1', 'c', 'EX', 60);

      await cache.invalidatePattern('agents:*');

      expect(await redis.get('agents:1')).toBeNull();
      expect(await redis.get('agents:2')).toBeNull();
      expect(await redis.get('other:1')).toBe('c');
    });

    it('does not throw when no keys match the pattern', async () => {
      await expect(cache.invalidatePattern('nonexistent:*')).resolves.toBeUndefined();
    });

    it('uses SCAN and never KEYS', async () => {
      const scanSpy = vi.spyOn(redis, 'scan');
      const keysSpy = vi.spyOn(redis, 'keys');
      await redis.set('agents:1', 'a', 'EX', 60);

      await cache.invalidatePattern('agents:*');

      // `KEYS` walks the whole keyspace in one blocking operation on a
      // single-threaded server, stalling every other client. It is the reason this
      // method was rewritten, so a revert has to fail here rather than merely look
      // equivalent — both implementations delete the same keys.
      expect(keysSpy).not.toHaveBeenCalled();
      expect(scanSpy).toHaveBeenCalled();
    });

    it('follows the cursor to completion instead of stopping after one batch', async () => {
      // More keys than the COUNT hint, so a real server would need several
      // round trips. An implementation that ignored the returned cursor would
      // delete the first batch and silently leave the rest cached — the kind of
      // partial invalidation that surfaces later as stale reads.
      const total = 250;
      for (let i = 0; i < total; i += 1) {
        await redis.set(`bulk:${i}`, String(i), 'EX', 60);
      }
      await redis.set('keep:1', 'x', 'EX', 60);

      await cache.invalidatePattern('bulk:*');

      const remaining = await redis.keys('bulk:*');
      expect(remaining).toEqual([]);
      expect(await redis.get('keep:1')).toBe('x');
    });
  });

  describe('close', () => {
    it('resolves without throwing', async () => {
      await expect(cache.close()).resolves.toBeUndefined();
    });
  });
});
