import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCache } from '../browser.js';

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('browser entry — static import analysis', () => {
  const browserSrc = readFileSync(
    resolve(import.meta.dirname, '../browser.ts'),
    'utf-8',
  );

  it('contains no import of ioredis', () => {
    expect(browserSrc).not.toMatch('ioredis');
  });

  it('contains no node:* built-in imports', () => {
    expect(browserSrc).not.toMatch(/['"]node:[a-z]/);
  });
});

describe('browser bundle — dist integrity', () => {
  const bundlePath = resolve(import.meta.dirname, '../../../dist/cache.js');

  it('dist/cache.js exists', () => {
    expect(() => readFileSync(bundlePath, 'utf-8')).not.toThrow();
  });

  it('dist/cache.js contains no reference to ioredis', () => {
    const bundle = readFileSync(bundlePath, 'utf-8');
    expect(bundle).not.toMatch('ioredis');
  });
});

describe('useCache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('returns data after the async fetcher resolves', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1, name: 'test' });
    const { result } = renderHook(
      () => useCache(['test-data'], fetcher),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ id: 1, name: 'test' });
    expect(result.current.isError).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('does not invoke the fetcher when enabled is false', () => {
    const fetcher = vi.fn().mockResolvedValue('should not be called');
    renderHook(
      () => useCache(['disabled-query'], fetcher, { enabled: false }),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(fetcher).not.toHaveBeenCalled();
  });

  it('applies default staleTime of 60_000 when no option is provided', async () => {
    const fetcher = vi.fn().mockResolvedValue('value');
    const { result } = renderHook(
      () => useCache(['stale-default'], fetcher),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const queryState = queryClient.getQueryState(['stale-default']);
    expect(queryState).toBeDefined();
    // React Query does not store staleTime on query state directly, but we can
    // confirm data was cached by checking it exists and dataUpdatedAt is set.
    expect(queryState?.dataUpdatedAt).toBeGreaterThan(0);

    // Verify the effective staleTime by checking the query options applied.
    // Query['options'] no longer surfaces observer options at the type level
    // (since ~v5.9x), but the observer still writes them onto the query.
    const query = queryClient.getQueryCache().find({ queryKey: ['stale-default'] });
    expect((query?.options as { staleTime?: number } | undefined)?.staleTime).toBe(60_000);
  });

  it('applies a custom staleTime when provided', async () => {
    const fetcher = vi.fn().mockResolvedValue('value');
    const { result } = renderHook(
      () => useCache(['stale-custom'], fetcher, { staleTime: 5_000 }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const query = queryClient.getQueryCache().find({ queryKey: ['stale-custom'] });
    expect((query?.options as { staleTime?: number } | undefined)?.staleTime).toBe(5_000);
  });

  it('isLoading is true while fetcher is pending and false after resolution', async () => {
    let resolvePromise!: (value: string) => void;
    const pendingPromise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    const fetcher = vi.fn().mockReturnValue(pendingPromise);

    const { result } = renderHook(
      () => useCache(['loading-state'], fetcher),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.isLoading).toBe(true);

    resolvePromise('done');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe('done');
  });
});
