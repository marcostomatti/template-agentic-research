/**
 * @packageDocumentation
 * Email channel — STUB.
 *
 * Registered with a typed schema and no delivery logic: dispatch validates
 * the payload and logs, nothing leaves the process. Promote to a full module
 * by adding a `deliver()` that calls your provider (Resend, SendGrid, SES…)
 * — call sites don't change.
 */
import { z } from 'zod';

import { channelRegistry } from '../registry.js';

export const EmailPayloadSchema = z.object({
  to: z.email(),
  subject: z.string(),
  body: z.string(),
});

export type EmailPayload = z.infer<typeof EmailPayloadSchema>;

/** Registers the email channel stub with the global registry. */
export function registerEmailChannel(): void {
  channelRegistry.register({
    kind: 'email',
    payloadSchema: EmailPayloadSchema,
    // deliver: intentionally absent — this is the stub seam.
  });
}
