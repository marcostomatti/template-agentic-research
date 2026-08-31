/**
 * @packageDocumentation
 * The validator behind `operator_settings.settings`: what a write is
 * allowed to put in the one row this deployment configures itself
 * through.
 *
 * `OperatorSettings` in `src/db/schema/settings.ts` is a compile-time
 * claim and nothing more. `.$type<>()` generates no constraint,
 * drizzle validates no payload on the way in, and a `jsonb` column
 * carries no CHECK that could reach inside a payload anyway — so
 * the interface says what readers program against and says nothing
 * about what is stored. This module is the whole of the enforcement
 * for anything arriving over HTTP, and it is what lets `./service.ts`
 * hand a parsed payload to `SettingsStore` without a second look.
 *
 * EVERY OBJECT HERE IS `.strict()`, for the reason
 * `src/domains/settings-payload.ts` gives at greater length: zod's
 * default is to drop an undeclared key and report nothing, which is
 * the failure worth paying a refusal to avoid — `digestFormatt`
 * would validate, the row would be written, and the preference its
 * author expressed would be nowhere. The refusal reaching a caller is
 * safe to make loud because `src/http/validation.ts` builds the
 * detail: an `unrecognized_keys` issue names the object that refused
 * and never the key it refused, so strictness here costs no
 * containment there.
 *
 * ONE MEMBER IS OPEN BY KEY, AND THAT IS THE POINT OF IT. The keys of
 * `notificationChannels` name the channels this deployment has
 * registered, and a channel is added by registering a module rather
 * than by editing a union — `ChannelDefinition.kind` in
 * `src/notifications/types.ts` is a plain string for exactly that
 * reason, and `ChannelPreferences` beside it is the same open record
 * this member mirrors. So this module checks the record's VALUES and
 * takes no view of its keys: a preference is a boolean, and a channel
 * name is whatever the channel called itself.
 *
 * The consequence lands on the route rather than here. A key naming a
 * channel is submitted content in the sense a value is, and zod puts
 * it in `issue.path` verbatim, so a handler parsing a body through
 * this schema has to declare `notificationChannels` as an open path
 * — see `ParseOptions` in `src/http/validation.ts`, which owns the
 * masking, and the argument in `docs/architecture/08-http-api.md`.
 * Unprefixed, unlike the two open records of a domain body: the
 * settings payload IS the body it arrives in, where a domain nests
 * its own one segment down under `settings`.
 *
 * THE TWO CLOSED MEMBERS ARE EACH ONE DECLARATION READ TWICE rather
 * than a shape restated here. `digestFormat` takes `EXPORT_FORMATS`
 * from `src/db/schema/values.ts`, the same tuple
 * `export_subscriptions.format` is CHECKed against, so the formats an
 * operator may prefer and the formats a subscription may be written
 * with cannot drift apart. `defaultDomainSlug` takes
 * `slugParamSchema` from `src/http/schemas.ts`, the same shape a
 * domain is created under and addressed by, which is what makes this
 * refusal meaningful rather than merely early: a string that pattern
 * refuses can name no `domains.slug` at all, because it is the
 * pattern every slug was written under.
 *
 * WHAT IS NOT CHECKED HERE IS EXISTENCE. Whether the slug names a
 * domain that exists needs a store to answer, so it belongs to
 * `./service.ts` and this module takes no view of it.
 * `src/db/schema/settings.ts` carries why a slug left dangling by a
 * later domain delete is not corruption and is not repaired.
 */
import { z } from 'zod';

import { EXPORT_FORMATS } from '../db/schema/values.js';
import { slugParamSchema } from '../http/schemas.js';

/**
 * The `operator_settings.settings` payload as a request may supply
 * it.
 *
 * EVERY MEMBER IS OPTIONAL AND `{}` IS A COMPLETE VALUE, matching
 * `OperatorSettings`: an absent member means the deployment's own
 * default applies, so an operator configures only what they want to
 * differ. That is what makes the column's `{}` default a real default
 * rather than a placeholder, and it is the value a read before any
 * write is answered with.
 *
 * The empty object being ACCEPTED is also what makes the whole-unit
 * write expressible. `SettingsStore.writeSettings` in `./store.ts`
 * replaces the stored payload rather than merging into it, so
 * omitting a member is the only way a member is CLEARED — and the
 * write that clears the last of them sends `{}`, which has to get
 * past this schema to mean anything at all.
 *
 * The `z.string()` in the record's key slot is the openness spelled
 * out rather than a check on it — zod requires a key schema and a
 * value schema, and a string key is the one constraint no key of a
 * JSON object can violate.
 *
 * One key is the exception, and it is zod's rather than this
 * module's: an own `__proto__` inside the record is DROPPED before
 * its value is ever seen, so `{"__proto__": "yes"}` is accepted and
 * stored as `{}` rather than refused (measured under the zod 4.5.1 in
 * this tree, against a body that came through `JSON.parse` as
 * body-parser hands one over, where `__proto__` is a real own key).
 * Nothing is polluted and the parsed record's prototype is
 * `Object.prototype`, which is the half that matters; what a reader
 * should not conclude is that strictness here refuses everything it
 * does not declare. The colocated case pins the behaviour so a zod
 * version that starts refusing instead is a red test rather than a
 * route that quietly changed status.
 */
export const operatorSettingsSchema = z.object({
  defaultDomainSlug: slugParamSchema.optional(),
  digestFormat: z.enum(EXPORT_FORMATS).optional(),
  notificationChannels: z.record(z.string(), z.boolean()).optional(),
}).strict();
