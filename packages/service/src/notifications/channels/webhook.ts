/**
 * @packageDocumentation
 * Webhook channel — full implementation, and the reference for promoting the
 * stub channels: same registration shape, plus a real `deliver()`.
 *
 * Payload fields:
 *   url     — destination URL (required)
 *   method  — HTTP verb (default: POST)
 *   headers — optional key/value request headers
 *   body    — optional request body (JSON-serialised)
 *
 * Delivery is fire-and-forget from the caller's perspective. Non-2xx
 * responses and network errors are surfaced through dispatch's `failed`
 * result and warn log — there is no retry / dead-letter queue yet.
 */
import { z } from 'zod';

import { channelRegistry } from '../registry.js';

export const WebhookPayloadSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

/** Registers the webhook channel with the global registry. */
export function registerWebhookChannel(): void {
  channelRegistry.register({
    kind: 'webhook',
    payloadSchema: WebhookPayloadSchema,

    async deliver(payload: Record<string, unknown>): Promise<void> {
      const parsed = WebhookPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(`[webhook] invalid payload: ${JSON.stringify(parsed.error.issues)}`);
      }

      const { url, method, headers, body }: WebhookPayload = parsed.data;

      const hasBody = body !== undefined && method !== 'GET';
      const res = await fetch(url, {
        method,
        headers: {
          ...(hasBody
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...(headers ?? {}),
        },
        body: hasBody
          ? JSON.stringify(body)
          : undefined,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `[webhook] delivery failed: ${method} ${url} → HTTP ${res.status} ${text.slice(0, 200)}`,
        );
      }
    },
  });
}
