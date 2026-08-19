import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { dispatch } from './dispatch.js';
import { ChannelRegistry } from './registry.js';

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as never;
}

function makeRegistry() {
  const registry = new ChannelRegistry();
  registry.register({
    kind: 'email',
    payloadSchema: z.object({ to: z.string().email() }),
    // no deliver — stub
  });
  const deliver = vi.fn(async () => {});
  registry.register({
    kind: 'webhook',
    payloadSchema: z.object({ url: z.string().url() }),
    deliver,
  });
  return { registry, deliver };
}

describe('dispatch', () => {
  it('skips channels the preferences do not explicitly enable', async () => {
    const { registry, deliver } = makeRegistry();
    const results = await dispatch(
      { type: 't', channels: { webhook: { url: 'https://x.dev' }, email: { to: 'a@example.dev' } } },
      { preferences: { email: true }, logger: makeLogger(), registry },
    );

    expect(results).toContainEqual({ kind: 'webhook', status: 'skipped-preference' });
    expect(results).toContainEqual({ kind: 'email', status: 'stubbed' });
    expect(deliver).not.toHaveBeenCalled();
  });

  it('delivers through registered channels with deliver()', async () => {
    const { registry, deliver } = makeRegistry();
    const results = await dispatch(
      { type: 't', channels: { webhook: { url: 'https://x.dev' } } },
      { preferences: { webhook: true }, logger: makeLogger(), registry },
    );

    expect(results).toEqual([{ kind: 'webhook', status: 'delivered' }]);
    expect(deliver).toHaveBeenCalledWith({ url: 'https://x.dev' });
  });

  it('flags unregistered channels instead of throwing', async () => {
    const { registry } = makeRegistry();
    const results = await dispatch(
      { type: 't', channels: { sms: { to: '+123' } } },
      { preferences: { sms: true }, logger: makeLogger(), registry },
    );
    expect(results).toEqual([{ kind: 'sms', status: 'skipped-unregistered' }]);
  });

  it('rejects payloads that fail the channel schema', async () => {
    const { registry, deliver } = makeRegistry();
    const results = await dispatch(
      { type: 't', channels: { webhook: { url: 'not-a-url' } } },
      { preferences: { webhook: true }, logger: makeLogger(), registry },
    );
    expect(results).toEqual([{ kind: 'webhook', status: 'invalid-payload' }]);
    expect(deliver).not.toHaveBeenCalled();
  });

  it('contains delivery failures without rejecting', async () => {
    const registry = new ChannelRegistry();
    registry.register({
      kind: 'webhook',
      payloadSchema: z.object({}).passthrough(),
      deliver: async () => {
        throw new Error('downstream 500');
      },
    });
    const results = await dispatch(
      { type: 't', channels: { webhook: {} } },
      { preferences: { webhook: true }, logger: makeLogger(), registry },
    );
    expect(results[0]).toMatchObject({ kind: 'webhook', status: 'failed' });
  });
});

describe('ChannelRegistry', () => {
  it('rejects duplicate registrations', () => {
    const registry = new ChannelRegistry();
    registry.register({ kind: 'x', payloadSchema: z.object({}) });
    expect(() => registry.register({ kind: 'x', payloadSchema: z.object({}) })).toThrow(/already registered/);
  });
});
