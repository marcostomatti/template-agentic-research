/**
 * @packageDocumentation
 * Thin notification layer — public surface.
 *
 * Wire-up (once, at service startup, before the HTTP server accepts
 * requests):
 *
 * ```ts
 * import { registerEmailChannel, registerPushChannel, registerWebhookChannel } from './notifications/index.js';
 *
 * registerEmailChannel();   // stub — validates + logs
 * registerPushChannel();    // stub — validates + logs
 * registerWebhookChannel(); // real delivery
 * ```
 *
 * Emitting (anywhere business logic decides something is notification-worthy):
 *
 * ```ts
 * await dispatch(
 *   {
 *     type: 'user.invited',
 *     channels: {
 *       email: { to: invitee.email, subject: 'You are invited', body: '…' },
 *       push: { deviceToken: invitee.deviceToken, title: 'Invited', body: '…' },
 *     },
 *   },
 *   { preferences: await loadPreferences(invitee.id), logger },
 * );
 * ```
 */
export { channelRegistry, ChannelRegistry } from './registry.js';
export { dispatch } from './dispatch.js';
export type { DispatchOptions } from './dispatch.js';
export type {
  ChannelDefinition,
  ChannelDispatchResult,
  ChannelPreferences,
  NotificationEvent,
} from './types.js';
export { registerEmailChannel, EmailPayloadSchema } from './channels/email.js';
export { registerPushChannel, PushPayloadSchema } from './channels/push.js';
export { registerWebhookChannel, WebhookPayloadSchema } from './channels/webhook.js';
