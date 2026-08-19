/**
 * @packageDocumentation
 * Thin notification layer — contract types.
 *
 * The model: business code emits ONE {@link NotificationEvent} carrying a
 * payload per channel it wants to reach. {@link dispatch} resolves the
 * recipient's {@link ChannelPreferences} and calls each enabled channel
 * module's `deliver()` — stub channels (no `deliver`) log and succeed, so
 * the flow can be wired end-to-end today and upgraded channel-by-channel
 * later without touching call sites.
 */
import type { z } from 'zod';

/**
 * A channel module definition. `kind` is a plain string on purpose —
 * adding a channel must not require touching a central union type.
 */
export interface ChannelDefinition {
  /** Unique channel identifier (e.g. `'email'`, `'push'`, `'webhook'`). */
  kind: string;
  /** Zod schema the channel payload is validated against before delivery. */
  payloadSchema: z.ZodTypeAny;
  /**
   * Optional delivery hook — the whole channel-module seam. Absent on stub
   * channels: dispatch validates and logs, but nothing leaves the process.
   *
   * @param payload - The validated channel payload.
   */
  deliver?(payload: Record<string, unknown>): Promise<void>;
}

/**
 * One notification: an event type plus a payload per target channel.
 * Channels without a payload entry are never considered for this event.
 */
export interface NotificationEvent {
  /** Free-form event type (e.g. `'user.invited'`) — used for logging only. */
  type: string;
  /** Per-channel payloads, keyed by channel kind. */
  channels: Record<string, Record<string, unknown>>;
}

/**
 * Per-channel opt-in map for the recipient of one event. Missing keys mean
 * "off" — dispatch only ever delivers on an explicit `true`.
 */
export type ChannelPreferences = Record<string, boolean>;

/** Outcome of one channel's dispatch attempt, for logging and tests. */
export interface ChannelDispatchResult {
  kind: string;
  status: 'delivered' | 'stubbed' | 'skipped-preference' | 'skipped-unregistered' | 'invalid-payload' | 'failed';
  error?: unknown;
}
