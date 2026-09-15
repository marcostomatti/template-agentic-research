import { describe, expect, it } from 'vitest';

import { resolveDataSource } from './source';

describe('resolveDataSource', () => {
  it('selects the fixture layer when the variable is unset', () => {
    expect(resolveDataSource(undefined)).toEqual({ kind: 'fixture' });
  });

  it('treats the empty string as defined and same-origin', () => {
    expect(resolveDataSource('')).toEqual({ kind: 'api', baseUrl: '' });
  });

  it('keeps a root-relative proxy prefix as the base', () => {
    expect(resolveDataSource('/api')).toEqual({ kind: 'api', baseUrl: '/api' });
  });

  it('trims the trailing slash from an absolute base', () => {
    expect(resolveDataSource('http://127.0.0.1:3100/')).toEqual({
      kind: 'api',
      baseUrl: 'http://127.0.0.1:3100',
    });
  });

  it('reads a whitespace-only value as same-origin, not as fixture', () => {
    expect(resolveDataSource('  \t ')).toEqual({ kind: 'api', baseUrl: '' });
  });
});
