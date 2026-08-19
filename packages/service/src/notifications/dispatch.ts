/**
 * @packageDocumentation
 * Preference-aware notification dispatch.
 *
 * `dispatch` never throws: notification delivery is fire-and-forget from the
 * caller's perspective. Every channel outcome (delivered, stubbed, skipped,
 * failed) is logged and returned so callers and tests can assert on it.
 */
import type { ChannelRegistry } from './registry.js';
import type { ChannelDispatchResult, ChannelPreferences, NotificationEvent } from './types.js';
import type { Logger } from '../../lib/logger/node.js';

import { channelRegistry } from './registry.js';

export interface DispatchOptions {
  /** The recipient's per-channel opt-in map. Only explicit `true` delivers. */
  preferences: ChannelPreferences;
  /** Service logger; channel outcomes are logged at info/warn. */
  logger: Logger;
  /** Registry override for tests — defaults to the global singleton. */
  registry?: ChannelRegistry;
}

/**
 * Dispatches one notification event across its channels.
 *
 * Per channel payload on the event, in order:
 * 1. preference off (or absent) → `skipped-preference`
 * 2. channel not registered → `skipped-unregistered` (warn — likely a typo)
 * 3. payload fails the channel schema → `invalid-payload` (warn)
 * 4. channel has no `deliver` → `stubbed` (info — the seam for future modules)
 * 5. `deliver()` resolves → `delivered`; rejects → `failed` (warn, not thrown)
 *
 * @param event - The notification event with per-channel payloads.
 * @param options - Preferences, logger, and optional registry override.
 * @returns One {@link ChannelDispatchResult} per channel payload on the event.
 */
export async function dispatch(
  event: NotificationEvent,
  options: DispatchOptions,
): Promise<ChannelDispatchResult[]> {
  const registry = options.registry ?? channelRegistry;
  const { preferences, logger } = options;

  const attempts = Object.entries(event.channels).map(
    async ([kind, payload]): Promise<ChannelDispatchResult> => {
      if (preferences[kind] !== true) {
        return { kind, status: 'skipped-preference' };
      }

      const channel = registry.get(kind);
      if (!channel) {
        logger.warn({ event: event.type, channel: kind }, 'notification channel not registered');
        return { kind, status: 'skipped-unregistered' };
      }

      const parsed = channel.payloadSchema.safeParse(payload);
      if (!parsed.success) {
        logger.warn(
          { event: event.type, channel: kind, issues: parsed.error.issues },
          'notification payload failed channel schema',
        );
        return { kind, status: 'invalid-payload' };
      }

      if (!channel.deliver) {
        logger.info(
          { event: event.type, channel: kind },
          'notification channel is a stub — delivery skipped',
        );
        return { kind, status: 'stubbed' };
      }

      try {
        await channel.deliver(parsed.data as Record<string, unknown>);
        logger.info({ event: event.type, channel: kind }, 'notification delivered');
        return { kind, status: 'delivered' };
      } catch (error) {
        logger.warn({ event: event.type, channel: kind, err: error }, 'notification delivery failed');
        return { kind, status: 'failed', error };
      }
    },
  );

  return Promise.all(attempts);
}
