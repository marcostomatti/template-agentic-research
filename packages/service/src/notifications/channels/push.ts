/**
 * @packageDocumentation
 * Push channel — STUB.
 *
 * Registered with a typed schema and no delivery logic: dispatch validates
 * the payload and logs, nothing leaves the process. Promote to a full module
 * by adding a `deliver()` that calls FCM/APNs — call sites don't change.
 */
import { z } from 'zod';

import { channelRegistry } from '../registry.js';

export const PushPayloadSchema = z.object({
  deviceToken: z.string(),
  title: z.string(),
  body: z.string(),
});

export type PushPayload = z.infer<typeof PushPayloadSchema>;

/** Registers the push channel stub with the global registry. */
export function registerPushChannel(): void {
  channelRegistry.register({
    kind: 'push',
    payloadSchema: PushPayloadSchema,
    // deliver: intentionally absent — this is the stub seam.
  });
}
