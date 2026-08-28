/**
 * @packageDocumentation
 * The operator's own preferences — what the settings surface renders,
 * and the one fixture module in this directory with nothing behind it.
 *
 * Every other module here has a source: `./domains.ts`, `./lexicon.ts`
 * and `./personas.ts` transcribe seed files that ship with the
 * service, and `./digest.ts`, `./sources.ts` and `./connectors.ts`
 * narrow tables that exist. This one has neither, and `./types.ts`
 * says so on {@link Settings} itself — schema v2 keeps per-DOMAIN
 * configuration in `domains.settings` and keeps nothing per operator.
 * So there is no seed to transcribe, no column to narrow, and no
 * endpoint for the q15 swap to point at until somewhere to persist
 * this has been decided. That is why the settings surface renders its
 * controls disabled rather than live: a switch that flips and forgets
 * is a worse answer than one that says it cannot flip yet.
 *
 * What the fixture is for, then, is the SHAPE of that decision. Each
 * member below is written against what it would be stored as, so the
 * schema question is legible from the page instead of from a spec.
 *
 * There is ONE preference set, not one per domain — an operator is a
 * person and not a workspace — so {@link getSettings} takes no domain
 * argument. That makes it the second exception to the rule `./api.ts`
 * otherwise holds to, alongside `listConnectors` in `./connectors.ts`:
 * two accessors out of that barrel are not domain-scoped and cannot
 * reject an unknown slug, because there is no slug to reject. The
 * shell-visible consequence is that switching domain leaves this
 * surface entirely unchanged, which is the correct reading of a
 * preference that spans domains rather than a bug in the switcher.
 *
 * {@link Settings.defaultDomainSlug} and `resolveDomainSlug` in
 * `./domains.ts` are two different things that agree today, and the
 * difference is worth keeping straight. `resolveDomainSlug` is what
 * the ROUTER does with an absent `:domainSlug`, and it answers
 * `DEFAULT_DOMAIN_SLUG` unconditionally; this member is what the
 * OPERATOR would like the single-domain base to mean. The fixture pins
 * them equal so nothing in the shell can tell them apart, and
 * `./settings.test.ts` asserts the pin — the alternative is a settings
 * page reporting one domain while `/` quietly loads another, which
 * neither surface could detect on its own. Whether `resolveDomainSlug`
 * should start reading a stored preference is q15's call, and it needs
 * somewhere to store one first.
 *
 * The whole fixture is frozen, and both halves matter: it is a SINGLE
 * object handed to every caller rather than a table each accessor
 * filters a fresh array out of, so a page toggling a switch in place
 * would change what every later reader sees for the life of the tab
 * and lose it on reload. `readonly` says that at compile time;
 * `Object.freeze` is what says it to a caller that has cast the claim
 * away. Same reasoning as `EMPTY_FIELD_CONTRACT` in `./domains.ts`,
 * and the freeze is applied to the nested payloads too — a shallow
 * freeze over an object whose interesting members are objects protects
 * nothing worth protecting.
 */

import type {
  DigestDefaults,
  NotificationChannel,
  Settings,
} from './types';

import { DEFAULT_DOMAIN_SLUG, getDomain } from './domains';

/**
 * One day, in seconds.
 *
 * Named rather than written into the payload because the unit is not
 * visible in the number. `intervalSeconds` counts seconds for the
 * reason `./types.ts` gives — `interval` is a type name in Postgres —
 * and 86400 misread as minutes or milliseconds is a two-month or a
 * one-minute digest, both of which look like a plausible cadence in a
 * cell rendering a duration.
 */
const DAILY_INTERVAL_SECONDS = 86400;

/**
 * The slug {@link SETTINGS} carries, resolved through the domain table
 * rather than written as the constant alone.
 *
 * The round trip IS the check: `getDomain` throws on a slug no fixture
 * carries, so a domain removed from `./domains.ts` fails at import
 * here instead of reaching the settings page as a `Select` whose value
 * matches no option — a control that renders blank and drops the
 * preference it was supposed to be showing. Same bargain
 * `./personas.ts` makes reading its `SEEDED_DOMAIN_ID` off the table
 * instead of writing `1`.
 */
const RESOLVED_DEFAULT_DOMAIN_SLUG = getDomain(DEFAULT_DOMAIN_SLUG).slug;

/**
 * What a new digest subscription starts from.
 *
 * Not a row: these are the values the settings surface offers and the
 * subscribe control would create an `export_subscriptions` row with,
 * which is why they live in a preference rather than in
 * `./connectors.ts` beside the subscriptions themselves. Daily
 * markdown is deliberately the same shape as the ordinary subscription
 * that module already carries, so what this page promises and what the
 * tools page lists agree on sight. Nothing joins the two, so that is a
 * fixture-authoring choice rather than a rule either file enforces.
 *
 * Declared as its own typed constant rather than inlined below because
 * the annotation is what keeps `format` an `ExportFormat`: an
 * inline literal handed straight to `Object.freeze` infers `string`
 * and would take any spelling.
 */
const DIGEST_DEFAULTS: DigestDefaults = {
  format: 'obsidian_md',
  intervalSeconds: DAILY_INTERVAL_SECONDS,
};

/**
 * The channels the settings surface renders a switch for, in the order
 * it renders them.
 *
 * A `Record` has no order a page may rely on, and the switches have to
 * come out the same way every render — a list that reshuffles is a
 * control an operator hits by muscle memory and gets wrong. So the
 * order lives here rather than in the page, next to the toggles it
 * orders.
 *
 * Exhaustiveness over {@link NotificationChannel} is a CHAIN across
 * two files rather than a single annotation, and it only closes if
 * both halves stay: `Settings.notificationChannels` is a record over
 * the whole union, so a fourth channel is a compile error until
 * {@link SETTINGS} gains a toggle for it, and `./settings.test.ts`
 * holds this list set-equal to that record's keys, so it is a test
 * failure until this list gains it too. Neither half catches the
 * omission the other one does.
 */
export const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = [
  'email',
  'push',
  'webhook',
];

/**
 * The operator's preferences, as this deployment finds them.
 *
 * Frozen through, for the reason the module docblock gives: one shared
 * object, no accessor copying it, and `readonly` alone is a claim a
 * cast can drop.
 */
export const SETTINGS: Settings = Object.freeze({
  defaultDomainSlug: RESOLVED_DEFAULT_DOMAIN_SLUG,
  digest: Object.freeze(DIGEST_DEFAULTS),
  // A record over the WHOLE union rather than a list of the enabled
  // ones, which is the distinction `./types.ts` makes on the member: a
  // channel that exists and is switched off has to be tellable from a
  // channel this deployment has never heard of, and a list of enabled
  // names collapses the two.
  notificationChannels: Object.freeze({
    // Two on and one off on purpose. A set with every channel on never
    // renders an off switch, so the control's other half goes
    // unrehearsed and a page that lost the `checked` binding still
    // looks right; a set with only one on never renders a list.
    email: true,
    // Off, and the plausible one to find off: push is the channel that
    // needs a device registered before it can carry anything, so an
    // operator who has not done that has it switched off rather than
    // missing.
    push: false,
    webhook: true,
  }),
});

/**
 * The operator's preferences.
 *
 * Takes no domain argument, and that is the point rather than an
 * omission — see the module docblock for what it means for `./api.ts`
 * and for the domain switcher.
 *
 * Hands back the shared frozen object rather than a copy. A copy would
 * be a fresh unfrozen one, which is exactly the object a caller can
 * toggle in place and believe the toggle took; handing over the frozen
 * original makes that attempt throw where it is written.
 *
 * @returns The settings fixture. Always the same object.
 */
export function getSettings(): Settings {
  return SETTINGS;
}
