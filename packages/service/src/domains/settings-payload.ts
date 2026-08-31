/**
 * @packageDocumentation
 * The validator behind `domains.settings`: what a create or a patch
 * is allowed to put in the one column a domain configures itself
 * through.
 *
 * `DomainSettings` in `src/db/schema/domains.ts` is a compile-time
 * claim and nothing more. `.$type<>()` generates no constraint,
 * drizzle validates no payload on the way in, and a `jsonb` column
 * carries no CHECK that could reach inside a payload anyway — so
 * the interface says what readers program against and says nothing
 * about what is stored. This module is the whole of the enforcement
 * for anything arriving over HTTP, and it is the reason the service
 * above it can hand a parsed payload to a store without a second
 * look.
 *
 * EVERY OBJECT HERE IS `.strict()`, so a mistyped member is refused
 * rather than stripped. Zod's default is to drop an undeclared key
 * and report nothing, which is the failure worth paying a refusal to
 * avoid: `scoringWeigths` would validate, the domain would be
 * written, and the weights their author wrote would be nowhere. The
 * refusal reaching a caller is safe to make loud because
 * `src/http/validation.ts` builds the detail — an
 * `unrecognized_keys` issue names the object that refused and never
 * the key it refused, so strictness here costs no containment there.
 *
 * TWO OF THE FOUR MEMBERS ARE OPEN BY KEY, AND THAT IS THE POINT OF
 * THEM. The keys of `scoringWeights` are the signals one domain
 * scores on and the keys of `fieldContract` are the fields its
 * findings carry; both are the domain's own vocabulary, which is
 * exactly what would otherwise be per-subject code. So this module
 * checks their VALUES and takes no view of their keys: a weight is a
 * number, a field spec is itself strict, and a signal name is
 * whatever the operator called it.
 *
 * The consequence lands on the route rather than here. A key an
 * operator chose is submitted content in the sense a value is, and
 * zod puts it in `issue.path` verbatim, so a handler parsing a body
 * that nests this schema under `settings` has to declare
 * `settings.scoringWeights` and `settings.fieldContract` as
 * `openPaths` — see `ParseOptions` in `src/http/validation.ts`,
 * which owns the masking, and `docs/architecture/08-http-api.md`,
 * which owns the argument.
 *
 * `scripts/seed-schemas.ts` holds a second declaration of this same
 * payload for `data/domains.json`, and nothing ties the two
 * together: neither is generated from the other and no gate compares
 * them. The drift that costs is a member added to one surface and
 * not the other, so the colocated drift case here pins THIS schema
 * to the interface both of them mirror, which is the shared thing
 * either one can be held against.
 */
import type { DomainFieldType } from '../db/schema/domains.js';

import { z } from 'zod';

/**
 * The field types a domain's field contract may declare.
 *
 * Written out rather than imported, because there is no tuple to
 * import: `DomainFieldType` is a hand-written union, deliberately
 * not one of `src/db/schema/values.ts`'s `as const` tuples, because
 * it constrains a field inside a JSONB payload rather than the
 * domain of a column and so is generated into no CHECK.
 *
 * `satisfies` ties the list to the union in the direction that
 * fails loudly. A member here the union does not carry fails to
 * compile, so this endpoint cannot accept a field type the rest of
 * the code will later reject.
 * The other direction is deliberately unchecked: a seventh member
 * added to the union and not to this list makes a contract naming it
 * a 422 whose detail points at the field's own `type`, which is a
 * refusal an operator can read rather than a field that silently
 * never validates.
 *
 * The same six are listed a second time in `scripts/seed-schemas.ts`
 * under the same `satisfies`, for the seed's own copy of this
 * payload.
 */
const DOMAIN_FIELD_TYPES = [
  'string',
  'boolean',
  'number',
  'datetime',
  'list',
  'object',
] as const satisfies readonly DomainFieldType[];

/**
 * One entry of a domain's field contract: what a `findings.fields`
 * key holds, and whether a finding has to carry it.
 *
 * `required` is optional because `DomainFieldSpec` makes an absent
 * one mean the field may be missing — the cheapest contract to
 * write is the permissive one, and a field a domain cannot do
 * without has to say so.
 */
const domainFieldSpecSchema = z.object({
  type: z.enum(DOMAIN_FIELD_TYPES),
  required: z.boolean().optional(),
}).strict();

/**
 * The `domains.settings` payload as a request may supply it.
 *
 * EVERY MEMBER IS OPTIONAL AND `{}` IS A COMPLETE VALUE, matching
 * `DomainSettings`: an absent member means the pipeline's own
 * default applies, so a domain configures only what it wants to
 * differ. That is also what makes the column's `{}` default a real
 * default rather than a placeholder, and what lets a create that
 * omitted settings entirely be stored as the same row a create that
 * sent `{}` produces.
 *
 * The empty object being ACCEPTED is what makes the whole-unit patch
 * rule expressible. `DomainPatch` in `./store.ts` distinguishes an
 * absent `settings` (leave the stored payload alone) from a present
 * empty one (replace it with nothing, clearing every weight, the
 * vocabulary and the contract in one write), and the second of those
 * two requests has to get past this schema to mean anything.
 *
 * `verdictVocabulary` is a plain list of strings and is NOT held to
 * `DEFAULT_VERDICT_VOCABULARY`. The whole point of the setting is
 * that a domain names its own ladder, which is also why
 * `finding_labels.verdict` carries no CHECK: a schema fixing the
 * four defaults here would put back in the app layer the constraint
 * the DDL deliberately left out.
 *
 * The `z.string()` in each record's key slot is the openness spelled
 * out rather than a check on it — zod requires a key schema and a
 * value schema, and a string key is the one constraint no key of a
 * JSON object can violate.
 *
 * One key is the exception, and it is zod's rather than this
 * module's: an own `__proto__` inside either record is DROPPED
 * before its value is ever seen, so `{"__proto__": "not a number"}`
 * is accepted and stored as `{}` rather than refused (measured under
 * the zod 4.5.1 in this tree, against a body that came through
 * `JSON.parse` as body-parser hands one over, where `__proto__` is a
 * real own key). Nothing is polluted and the parsed record's
 * prototype is `Object.prototype`, which is the half that matters;
 * what a reader should not conclude is that strictness here refuses
 * everything it does not declare. The colocated case pins the
 * behaviour so a zod version that starts refusing instead is a red
 * test rather than a route that quietly changed status.
 */
export const domainSettingsSchema = z.object({
  scoringWeights: z.record(z.string(), z.number()).optional(),
  verdictVocabulary: z.array(z.string()).optional(),
  fieldContract: z.record(z.string(), domainFieldSpecSchema).optional(),
  findingsDisplayName: z.string().optional(),
}).strict();
