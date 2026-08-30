/**
 * @packageDocumentation
 * The operator settings rules: reading what this deployment is
 * configured with, and replacing it whole. What `GET /settings`
 * and `PUT /settings` reduce to once HTTP is subtracted from
 * them.
 *
 * TWO FUNCTIONS AND NOTHING ELSE, and the pair is shorter than
 * every sibling group's for a reason that lives in the schema
 * rather than in this module. `operator_settings` holds one row
 * whose id the database pins, so there is no collection to list,
 * no address to resolve and nothing to delete: a configuration is
 * replaced, and the empty payload is how it is emptied.
 * `src/domains/service.ts` gives the argument for keeping the
 * rules in a module a router imports — wave 3 exposes these
 * same two as MCP tools, one implementation behind two protocols
 * — and it holds here unchanged.
 *
 * THE BODY IS PARSED HERE RATHER THAN ABOVE, exactly as all three
 * sibling services argue. An operation handed an already
 * validated payload would have two callers validating it, the
 * router today and the MCP tool tomorrow, from a second schema
 * nobody would notice drifting. So {@link putSettings} takes an
 * `unknown` and runs it through `parseBody` in
 * `src/http/validation.ts`, and its refusal is the sanitised
 * `ValidationError` every route on this surface answers with.
 *
 * NO WINDOW ARRIVES, AND NONE COULD. `?page` and `?perPage` are
 * how a caller asks for part of a collection, and there is no
 * collection here — which is why `StoreWindow` is named
 * nowhere in this module, where every sibling that lists
 * something takes one already derived. The asymmetry those
 * siblings document, a body checked here against a window that
 * arrives checked, has only one side on this surface.
 *
 * AN ABSENT ROW AND AN EMPTY PAYLOAD BECOME ONE ANSWER HERE, AND
 * ONLY HERE. `SettingsStore.readSettings` answers null for a
 * table with no row, because whether a row exists is a fact and
 * `./store.ts` keeps facts on the port; treating the two as one
 * state is a decision, and {@link getSettings} is the single line
 * that takes it. A read before any write is `{}` rather than a
 * 404: absent settings mean the defaults apply, which is exactly
 * what an empty payload means once one has been written, and
 * there is nothing an operator has to create before they can
 * configure something.
 *
 * ONE RULE NEEDS A SECOND PORT, AND IT IS A 422 RATHER THAN A
 * 404. `defaultDomainSlug` names a `domains.slug` from inside a
 * JSONB payload, where no foreign key reaches, so the app layer
 * is the whole of the enforcement, and the argument is in
 * `src/db/schema/settings.ts` and `./store.ts`. The slug is a
 * MEMBER OF THE BODY and never the address: `PUT /settings`
 * addresses the settings row, and a body naming a domain that is
 * not there is a body this endpoint cannot accept rather than a
 * resource that is missing. So the refusal is a
 * `ValidationError` whose one detail names
 * {@link DEFAULT_DOMAIN_FIELD}, which is where a caller has to
 * look. The three sibling services answering 404 for a slug are
 * not being contradicted: theirs arrives in the path.
 *
 * THE CHECK IS ON THE WAY IN AND IS NOT MAINTAINED AFTERWARDS. A
 * domain deleted later leaves the slug pointing at nothing and
 * nothing here repairs it — `src/db/schema/settings.ts`
 * records that it reads as no default being set, which is the
 * state the operator is one write away from either way. So this
 * is a guard against a typo rather than a referential guarantee,
 * and calling it the second would promise something no column
 * enforces.
 *
 * NO REFUSAL CROSSES THE SETTINGS PORT, so there is no translator
 * here and the absence is measured rather than assumed.
 * `./store.ts` records both mechanisms `operator_settings`
 * carries seen firing against the live server — a second row
 * at the singleton id is 23505, and any id but 1 is 23514 —
 * and records why neither is reachable from a port that writes
 * one id it chose itself. A `StoreRefusal` arriving out of
 * `writeSettings` would be a store doing something its port does
 * not describe, so it is left to answer 500 rather than given a
 * plausible status no rule authorised. The only refusal below is
 * this module's own.
 *
 * THE WHOLE-UNIT WRITE IS THE PORT'S RULE AND NEEDS NOTHING HERE.
 * `SettingsStore.writeSettings` replaces the stored payload
 * rather than merging into it, which is the only way a member is
 * ever cleared: under a merge, the request that omits a
 * preference and the request that removes it would be the same
 * bytes. {@link putSettings} hands the parsed payload over
 * unaltered and adds no member of its own, and that is the whole
 * of what it has to do for the rule to hold.
 *
 * NOTHING SUBMITTED REACHES A MESSAGE OR A DETAIL BUILT HERE. The
 * two sentences below are constants and the slug is interpolated
 * into neither, though it is the value most tempting to quote
 * back — the containment rule is about closing the channel
 * rather than about how harmless one value looks, and the
 * exception would be the line a later edit widens.
 * `src/http/validation.ts` holds the same rule for the details a
 * parse builds, and {@link SETTINGS_OPEN_PATHS} is what extends
 * it to the operator-chosen keys of `notificationChannels`.
 *
 * THE STORE IS A PARAMETER, so both rules here are exercisable
 * with no database. `tests/helpers/memory-research-store.ts`
 * stands behind both ports over one dataset, which is what lets a
 * domain written through one of them be resolved through the
 * other.
 */
import type { SettingsStore } from './store.js';
import type { OperatorSettings } from '../db/schema/settings.js';
import type { DomainStore } from '../domains/store.js';

import { ValidationError } from '../../lib/errors/index.js';
import { parseBody } from '../http/validation.js';

import { operatorSettingsSchema } from './payload.js';

/**
 * Exactly the port methods these two functions reach, across both
 * ports they reach them on.
 *
 * A `Pick` OF TWO PORTS RATHER THAN EITHER ONE WHOLE, for the
 * reason `PersonaServiceStore` in `src/personas/service.ts`
 * gives: resolving a slug is one method of `DomainStore`, and
 * asking for that port whole would have this module claim to need
 * the domain writes it never issues.
 *
 * The settings half happens to name every method its port
 * declares, and it is still written as a `Pick`. What is spelled
 * here is what is REACHED, so a third method added to
 * `SettingsStore` later cannot silently widen what these two
 * functions claim to need.
 *
 * Built with `Pick` rather than by listing signatures, so a
 * method here cannot drift from the thing it names: a hand-copied
 * signature would go on type-checking against a port that had
 * moved under it.
 */
export type SettingsServiceStore =
  Pick<DomainStore, 'findDomainBySlug'>
  & Pick<SettingsStore, 'readSettings' | 'writeSettings'>;

/**
 * The prefixes of a settings body below which a key is the
 * operator's own rather than this service's. The declaring type
 * is `ParseOptions` in `src/http/validation.ts`.
 *
 * UNPREFIXED, unlike the two open records of a domain body. A
 * prefix is matched segment-wise against the path of the value
 * BEING PARSED, and this payload IS the body it arrives in, where
 * a domain nests its own records one segment down under
 * `settings`. So the same masking rule needs a different
 * declaration per call site, which is why the list is here rather
 * than beside the schema that declares the record.
 */
const SETTINGS_OPEN_PATHS = ['notificationChannels'] as const;

/**
 * The message a 422 built here carries.
 *
 * The parser's own wording, spelled again rather than imported,
 * for the reason `src/taxonomy/categories-service.ts` gives: a
 * caller reading a 422 off this surface gets the same sentence
 * whether a schema refused the body or a store refused the row,
 * and reads the details for which. Importing a private constant
 * out of `src/http/validation.ts` would make the agreement look
 * like a dependency.
 */
const VALIDATION_FAILED = 'Validation failed';

/**
 * The body member a default-domain refusal is reported against.
 *
 * The member's own name, so the detail names the same path a
 * schema refusal of that member would have named and a caller
 * reads one vocabulary. The two are still told apart, by the
 * `code` beside it: {@link UNKNOWN_DOMAIN_CODE} where the slug is
 * well-formed and names nothing, and zod's `invalid_format` where
 * `slugParamSchema` refused its shape.
 */
const DEFAULT_DOMAIN_FIELD = 'defaultDomainSlug';

/**
 * What a detail says when the default names no domain.
 *
 * The slug is not in it, per this module's header.
 */
const DOMAIN_MUST_EXIST
  = 'No domain carries the slug named as the default';

/**
 * The code that detail carries.
 *
 * THIS SERVICE'S OWN, not zod's, and it has to be: no schema can
 * raise it, because the rule it reports is about rows and is
 * unreachable from a body alone. Spelled in the same snake_case
 * register the zod codes on this surface use, so a wave-3
 * consumer switching on `code` reads one vocabulary rather than
 * two. The same decision `DEPTH_VIOLATION_CODE` in
 * `src/taxonomy/categories-service.ts` records for its own
 * database-shaped rule.
 */
const UNKNOWN_DOMAIN_CODE = 'unknown_domain';

/**
 * Refuses a `defaultDomainSlug` that names no domain.
 *
 * @param store - Where the domain is looked for.
 * @param slug - The member as the body supplied it, or undefined
 *   when the body supplied none.
 * @returns Nothing. The check has no value to hand on: the id the
 *   lookup resolves is of no use here, because the slug and not
 *   the id is what is stored.
 * @throws ValidationError - When a slug was supplied and no
 *   domain carries it.
 *
 * @remarks
 * AN ABSENT MEMBER SKIPS THE LOOKUP ENTIRELY rather than issuing
 * one and discarding the answer, which is what keeps the ordinary
 * write a single statement. It is also the only reading of an
 * omission that agrees with the write: an omitted member is a
 * member being cleared, and there is nothing to check about a
 * default nobody is setting.
 *
 * Private, and its detail is this module's own. The sibling
 * services keep the equivalent helper unexported for the same
 * reason: a shared one would put one route group's wording on
 * another's refusals.
 */
async function requireDefaultDomain(
  store: SettingsServiceStore,
  slug: string | undefined,
): Promise<void> {
  if (slug === undefined) {
    return;
  }

  const domain = await store.findDomainBySlug(slug);

  if (domain === null) {
    // Built per call rather than shared from a module constant,
    // so nothing a handler or a serialiser does to one refusal's
    // details can reach the next one's.
    throw new ValidationError(VALIDATION_FAILED, [{
      field: DEFAULT_DOMAIN_FIELD,
      message: DOMAIN_MUST_EXIST,
      code: UNKNOWN_DOMAIN_CODE,
    }]);
  }
}

/**
 * Reads what this deployment is configured with.
 *
 * @param store - Where the row is read.
 * @returns The stored payload, or `{}` when no row has been
 *   written yet.
 * @throws Nothing. There is no address to get wrong and no rule a
 *   read can break, so this operation has no refusal of its own
 *   and the router answers 200 unconditionally.
 *
 * @remarks
 * THE COLLAPSE OF NULL INTO `{}` IS THE LINE BELOW, and the
 * module header carries why it belongs here rather than on the
 * port. A caller reading this answer cannot tell a
 * never-configured deployment from a configured-to-nothing one,
 * and has no reason to: the defaults apply under both.
 *
 * Anything that DOES need them apart — a diagnostic, a live
 * case — asks `SettingsStore.readSettings` directly, which
 * is why the port keeps the distinction instead of spending it
 * here.
 *
 * The payload is handed straight on. There is no window to apply,
 * no envelope to build and no member to derive, so a body-shaping
 * step here would be inventing work the router already owns.
 */
export async function getSettings(
  store: SettingsServiceStore,
): Promise<OperatorSettings> {
  const stored = await store.readSettings();

  return stored ?? {};
}

/**
 * Replaces what this deployment is configured with.
 *
 * @param store - Where the default domain is resolved and the
 *   payload written.
 * @param body - The unvalidated request body, or the arguments an
 *   MCP tool was called with.
 * @returns The stored payload, read back rather than echoed from
 *   the argument, so a caller sees what is held.
 * @throws ValidationError - When the body does not satisfy
 *   `operatorSettingsSchema` in `./payload.ts`, with one detail
 *   per fault; and when a supplied `defaultDomainSlug` names no
 *   domain, with one detail naming that member.
 *
 * @remarks
 * A PUT RATHER THAN A PATCH, AND THE TWO WOULD NOT BE THE SAME
 * OPERATION. The payload IS the request here, so omitting a
 * member is how it is cleared and there is no third state to
 * express — where a domain's `settings` is one member of a
 * larger body, and omitting the member and emptying it are two
 * different requests there.
 *
 * THE BODY IS PARSED BEFORE THE SLUG IS RESOLVED, so a malformed
 * body is refused whether or not any domain exists and that
 * refusal costs no read at all. Answering the same body a 422 or
 * something else depending on what happens to be stored would
 * make a caller's error depend on rows it never asked about.
 *
 * BOTH REFUSALS ARE 422 AND THEY ARE TOLD APART BY THE DETAIL. A
 * body whose `defaultDomainSlug` is not slug-shaped is refused by
 * the schema and a body whose slug is well-formed but names
 * nothing is refused here, and the two answer the same status at
 * the same field — so {@link UNKNOWN_DOMAIN_CODE} beside
 * zod's own code is what a caller reads to know whether to fix
 * the spelling or create the domain.
 *
 * NOTHING IS WRITTEN WHEN THE SLUG IS REFUSED. The check sits
 * ahead of the write rather than after it, so a settings row is
 * not left holding a default that names nothing while a caller is
 * told the request failed.
 */
export async function putSettings(
  store: SettingsServiceStore,
  body: unknown,
): Promise<OperatorSettings> {
  const settings = parseBody(operatorSettingsSchema, body, {
    openPaths: SETTINGS_OPEN_PATHS,
  });

  await requireDefaultDomain(store, settings.defaultDomainSlug);

  return store.writeSettings(settings);
}
