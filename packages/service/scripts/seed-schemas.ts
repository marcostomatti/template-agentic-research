/**
 * @packageDocumentation
 * The shape every seed file is held to: one Zod schema per file in
 * `data/`, and the row types they yield.
 *
 * Split out of `seed.ts` rather than declared beside the loader that
 * reads them, so neither the shape of a seed nor the pass that
 * applies it has to be read whole to follow the other. `seed.ts`
 * re-exports every name here, so nothing outside these two files can
 * tell the two apart.
 *
 * Every object in every schema below is `.strict()`. Zod's default is
 * to STRIP an unknown key and report nothing, which is the failure
 * this module exists to avoid: a mistyped member validates, the row
 * is written, and the value its author wrote is nowhere. Strict makes
 * it an error naming the key that is wrong, which is a shorter walk
 * than a required-member failure naming the key that is missing. Zod
 * reports one against the path of the OBJECT that held it and puts
 * the offending names in the issue's own `keys`, so a message naming
 * the field wants both halves.
 *
 * That strictness is most of what these schemas buy, because nothing
 * else looks at `data/`. The package `lint` target is `eslint src lib
 * tests scripts` and never names the directory, JSON is not
 * TypeScript so `check-types` never opens it, and the naming
 * invariant reads it for forbidden strings and for nothing else.
 * Between an author's editor and a row in Postgres this module is the
 * only thing that sees a seed's shape at all.
 *
 * Validation runs after `stripUnderscoreKeys`, and the two are
 * ordered rather than merely adjacent: no schema names `_readme`, so
 * a header reaching one is an unrecognized key like any other. A
 * stripping step skipped is reported rather than assumed.
 *
 * Which members a row schema requires follows the column behind it. A
 * NOT NULL column with no default is required. A nullable column is
 * required AND nullable, so the member is written out with a `null`
 * rather than left off and a deliberate absence is distinguishable
 * from one somebody forgot — which is what the seed files already do
 * for `parentKey`, `notes` and the two interval bounds. A column
 * whose default means the same as absence is optional, which among
 * these row members is `settings` and `searchTerms` alone — the
 * settings payload's own members are optional under a different rule,
 * the one its interface states.
 *
 * What no schema names is as deliberate as what it does. Surrogate
 * ids, `created_at` and `updated_at` belong to the database;
 * `next_run_at` and `enabled` on a topic belong to the dispatcher and
 * the operator. A pass writes back whatever a seed file states, so
 * seeding `enabled` would switch a topic back on that somebody had
 * switched off, and seeding a due time would reset a schedule already
 * in flight. Leaving them unnamed under `.strict()` is what turns
 * writing one into an error rather than a quiet overwrite.
 *
 * `domainSlug`, `categoryKey` and `parentKey` are not columns. They
 * stand in for keys the database issues, which no seed can know
 * before the parent row is written. The schemas check their shape and
 * nothing more; whether one resolves to a row the bundle carries is
 * `loadSeedBundle`'s cross-file pass, which resolves the first two
 * and leaves the third to the apply pass, for the reason recorded
 * there.
 *
 * The limit of `.strict()` is that it covers the members a schema
 * NAMES. `scoringWeights` and `fieldContract` are open by key on
 * purpose — the keys are the domain's own signal and field names,
 * which nothing here is entitled to fix — so a mistyped signal name
 * is a weight nothing reads rather than an error, and no schema in
 * this module can tell the two apart. What is checked inside them is
 * the VALUE: a weight is a number, and a field spec is itself strict.
 */
import type { DomainFieldType } from '../src/db/schema.js';

import { z } from 'zod';

import { TERM_POLARITIES } from '../src/db/schema/values.js';

/**
 * The field types a domain's field contract may declare, mirroring
 * `DomainFieldType`.
 *
 * Written out rather than imported because there is no tuple to
 * import: `DomainFieldType` is a hand-written union in
 * `src/db/schema/domains.ts`, deliberately not one of
 * `src/db/schema/values.ts`'s `as const` tuples, because it
 * constrains a field inside a JSONB payload rather than the domain of
 * a column and so is generated into no CHECK.
 *
 * `satisfies` ties it in the direction that matters. A member here
 * the contract's own type does not have fails to compile, so a seed
 * cannot admit a field type the validator will later reject. The
 * other direction is unchecked and does not need to be: a seventh
 * member added to the union and not to this list makes the seed
 * refuse a contract naming it, by name and against the six it does
 * accept, which is a loud failure at the seed rather than a field
 * that quietly never validates.
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
 * One entry of a domain's field contract, mirroring
 * `DomainFieldSpec`.
 *
 * `required` is optional because the interface makes an absent one
 * mean the field may be missing: the permissive contract is the
 * cheapest to write, and a field a domain cannot do without has to
 * say so.
 */
const domainFieldSpecSchema = z.object({
  type: z.enum(DOMAIN_FIELD_TYPES),
  required: z.boolean().optional(),
}).strict();

/**
 * The `domains.settings` payload, mirroring `DomainSettings`.
 *
 * Every member is optional, matching the interface: an absent one
 * means the pipeline's own default applies, and `{}` is a complete
 * value rather than a placeholder. The column defaults to `{}` for
 * the same reason, so a domain that configures nothing and one that
 * was never configured are the same row.
 *
 * `verdictVocabulary` is a plain list of strings and is not held to
 * `DEFAULT_VERDICT_VOCABULARY`. The whole point of the setting is
 * that a domain names its own ladder, which is also why
 * `finding_labels.verdict` carries no CHECK — a schema fixing the
 * four defaults here would put back in the app layer the constraint
 * the DDL deliberately left out.
 *
 * The two records are the open-by-key case the module header names.
 * Their keys are the domain's own vocabulary and go unchecked; their
 * values do not.
 */
const domainSettingsSchema = z.object({
  scoringWeights: z.record(z.number()).optional(),
  verdictVocabulary: z.array(z.string()).optional(),
  fieldContract: z.record(domainFieldSpecSchema).optional(),
  findingsDisplayName: z.string().optional(),
}).strict();

/**
 * One row of `data/domains.json`: a domain and the settings that make
 * it one. Upserted by `slug`.
 *
 * `slug` carries a `.min(1)` floor, and so does every natural key
 * below it. An empty key is the mirror of a NULL one: NULL never
 * collides, so nothing dedupes, while `''` always collides, so every
 * row a writer could not name folds onto a single row and accumulates
 * whatever the pipeline then hangs off it. `name` is a label rather
 * than a key and carries no floor — an empty one costs legibility,
 * not correctness.
 */
const domainSeedSchema = z.object({
  slug: z.string().min(1),
  name: z.string(),
  settings: domainSettingsSchema.optional(),
}).strict();

/**
 * One row of `data/personas.json`: the standing instructions a domain
 * gives one role. Upserted by the (domain, role) pair
 * `personas_domain_id_role_unique` holds.
 *
 * `role` is held to the key floor and to nothing else.
 * `personas.role` carries no CHECK, so the three roles the pipeline
 * plays today are rows rather than a closed set, and a schema
 * enumerating them here would make a fourth one a code change.
 *
 * `systemText` carries no floor either. A persona seeded with an
 * empty one records that the role exists and has no instructions yet,
 * which is a state the column is entitled to hold and a reader can
 * act on.
 */
const personaSeedSchema = z.object({
  domainSlug: z.string().min(1),
  role: z.string().min(1),
  systemText: z.string(),
}).strict();

/**
 * One row of `data/categories.json`: one bucket of a domain's
 * taxonomy. Upserted by the (domain, key) pair
 * `categories_domain_id_key_unique` holds.
 *
 * `parentKey` is required and nullable, standing in for
 * `categories.parent_id`. A root is not a category missing a parent,
 * so the member states the absence rather than leaving a reader
 * unable to tell a deliberate root from a forgotten field.
 *
 * Nothing here enforces the one-level depth cap, and nothing here
 * could: the rule is about the row a parent key names, not about the
 * row being written, and this schema sees one row at a time. The cap
 * is a trigger on `categories`, shipped in a custom migration under
 * `drizzle/`, which binds every writer rather than the one path a
 * check like this would sit in.
 */
const categorySeedSchema = z.object({
  domainSlug: z.string().min(1),
  key: z.string().min(1),
  name: z.string(),
  parentKey: z.string().min(1)
    .nullable(),
}).strict();

/**
 * One row of `data/terms.json`: one pattern a category matches on,
 * and what a match is worth. Upserted by the (category, pattern) pair
 * `terms_category_id_pattern_unique` holds.
 *
 * `weight` is an integer and nothing more. Its sign is not consulted
 * — which way a match points is `polarity`'s to say — so a negative
 * weight means exactly what its positive means, and refusing one here
 * would refuse a row the database accepts and the matcher reads the
 * same way.
 *
 * `polarity` imports `TERM_POLARITIES` rather than restating its
 * three members. That tuple is the single declaration
 * `terms_polarity_check` is generated from, so widening it widens the
 * CHECK and this schema together and a seed can never name a polarity
 * the column would refuse.
 *
 * `notes` is required and nullable for the reason `parentKey` is: a
 * row with nothing recorded says so, rather than being
 * indistinguishable from a member left off.
 */
const termSeedSchema = z.object({
  categoryKey: z.string().min(1),
  pattern: z.string().min(1),
  weight: z.number().int(),
  polarity: z.enum(TERM_POLARITIES),
  notes: z.string().nullable(),
}).strict();

/**
 * One row of `data/topics.json`: a standing subject, the queries it
 * issues and how often it runs. Upserted by the (domain, name) pair
 * `topics_domain_id_name_unique` holds.
 *
 * The three interval members are positive integers. A non-positive
 * cadence is not a slow schedule: it is a row the dispatcher finds
 * due again the moment it finishes one, and the cost of that is paid
 * once per tick for as long as nobody notices.
 *
 * What is not checked is the three against each other. No CHECK
 * relates them, the clamp between the bounds is the writer's to
 * apply, and `data/topics.json`'s own header says the seeded row sits
 * inside its bounds because that is what the example means rather
 * than because anything would report it otherwise. A refinement here
 * would enforce at this one path a rule nothing enforces anywhere
 * else, and the first row written through hand-written SQL would pass
 * it by.
 *
 * `searchTerms` is optional because the column defaults to `[]`: a
 * topic that issues nothing and one whose terms have not been written
 * yet are the same row. `nextRunAt` and `enabled` are absent for the
 * reason the module header gives, so seeding either is an
 * unrecognized key rather than a quiet overwrite of state a runtime
 * writer owns.
 */
const topicSeedSchema = z.object({
  domainSlug: z.string().min(1),
  name: z.string().min(1),
  searchTerms: z.array(z.string()).optional(),
  intervalSeconds: z.number().int()
    .positive(),
  minIntervalSeconds: z.number().int()
    .positive()
    .nullable(),
  maxIntervalSeconds: z.number().int()
    .positive()
    .nullable(),
}).strict();

/**
 * The whole of `data/domains.json`, once `stripUnderscoreKeys` has
 * cleared its header.
 *
 * Strict at this level too. A top-level key other than `domains` is a
 * file whose rows would never be read, and an empty apply reporting
 * nothing created is a worse answer than an error naming the key.
 */
export const DomainsFileSchema = z.object({
  domains: z.array(domainSeedSchema),
}).strict();

/**
 * The whole of `data/personas.json`, once `stripUnderscoreKeys` has
 * cleared its header.
 *
 * Strict at this level for the reason {@link DomainsFileSchema}
 * gives.
 */
export const PersonasFileSchema = z.object({
  personas: z.array(personaSeedSchema),
}).strict();

/**
 * The whole of `data/categories.json`, once `stripUnderscoreKeys` has
 * cleared its header.
 *
 * Strict at this level for the reason {@link DomainsFileSchema}
 * gives.
 */
export const CategoriesFileSchema = z.object({
  categories: z.array(categorySeedSchema),
}).strict();

/**
 * The whole of `data/terms.json`, once `stripUnderscoreKeys` has
 * cleared its header.
 *
 * Strict at this level for the reason {@link DomainsFileSchema}
 * gives.
 */
export const TermsFileSchema = z.object({
  terms: z.array(termSeedSchema),
}).strict();

/**
 * The whole of `data/topics.json`, once `stripUnderscoreKeys` has
 * cleared its header.
 *
 * Strict at this level for the reason {@link DomainsFileSchema}
 * gives.
 */
export const TopicsFileSchema = z.object({
  topics: z.array(topicSeedSchema),
}).strict();

/**
 * One validated `data/domains.json` row, as {@link DomainsFileSchema}
 * yields it.
 */
export type DomainSeed = z.infer<typeof domainSeedSchema>;

/**
 * One validated `data/personas.json` row, as
 * {@link PersonasFileSchema} yields it.
 */
export type PersonaSeed = z.infer<typeof personaSeedSchema>;

/**
 * One validated `data/categories.json` row, as
 * {@link CategoriesFileSchema} yields it.
 */
export type CategorySeed = z.infer<typeof categorySeedSchema>;

/**
 * One validated `data/terms.json` row, as {@link TermsFileSchema}
 * yields it.
 */
export type TermSeed = z.infer<typeof termSeedSchema>;

/**
 * One validated `data/topics.json` row, as {@link TopicsFileSchema}
 * yields it.
 */
export type TopicSeed = z.infer<typeof topicSeedSchema>;
