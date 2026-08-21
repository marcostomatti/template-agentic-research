/**
 * @packageDocumentation
 * The seed pipeline: the path that takes the seed files in `data/`
 * and applies them to the database.
 *
 * Three parts are here today: the underscore stripping that clears a
 * seed's commentary, the per-file schemas each stripped file is then
 * validated against, and `loadSeedBundle`, which reads the roster and
 * refuses the whole bundle when any file fails. The idempotent apply
 * and the CLI entry point arrive later in this stage.
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
 * the operator. A seed file upserts on every pass, so seeding
 * `enabled` would switch a topic back on that somebody had switched
 * off, and seeding a due time would reset a schedule already in
 * flight. Leaving them unnamed under `.strict()` is what turns
 * writing one into an error rather than a quiet overwrite.
 *
 * `domainSlug`, `categoryKey` and `parentKey` are not columns. They
 * stand in for keys the database issues, which no seed can know
 * before the parent row is written. The schemas check their shape and
 * nothing more; whether one resolves to a row the bundle carries is
 * the loader's cross-file check, arriving next.
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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { TERM_POLARITIES } from '../src/db/schema/values.js';

/**
 * A copy of `value` with every object key beginning with an
 * underscore removed, at every depth.
 *
 * `data/README.md` requires each seed file to open with a `"_readme"`
 * header repeating that the file is a seed, that this script applies
 * it, and that nothing in the directory is read at runtime. The
 * leading underscore is what marks a key as that commentary rather
 * than a value bound for a column, so it is dropped here — ahead of
 * the per-file schemas, which reject an unknown key so that a
 * mistyped member is an error rather than a field that silently never
 * applies. A header key would be exactly such an unknown, and naming
 * each one in those schemas would spend that strictness on the
 * convention.
 *
 * Recursive rather than top-level because a header belongs wherever a
 * reader meets the thing it describes. Today that is only the
 * outermost object of each file, but a note about one row belongs on
 * that row, and a note carried into an insert is a key no column
 * answers to.
 *
 * An array and a scalar are unchanged in themselves: an array has no
 * keys to drop, so its length and order survive, and a string,
 * number, boolean or `null` comes back as it arrived. The walk still
 * descends through an array, since a seed's rows are the objects
 * inside one.
 *
 * Nothing is mutated — every object and array is rebuilt — so the
 * parsed value a caller still holds keeps its header.
 *
 * Two limits. The filter reads a key's name and nothing else, so
 * commentary under a key without the prefix is carried through, to be
 * reported by the schema that meets it. And the input this is written
 * for is parsed JSON: a `Date`, a `Map` or a class instance reaching
 * it comes back as a plain object with its underscore-prefixed
 * properties gone.
 *
 * `__proto__` is dropped by the same rule, `JSON.parse` having made
 * it an own key rather than a prototype write. It would not reach a
 * prototype here in any case: `Object.fromEntries` defines the
 * properties it is given instead of assigning them, unlike the
 * `object[key] = value` form.
 *
 * @param value - Parsed JSON, or any part of it.
 * @returns The same value with every leading-underscore key removed.
 */
export function stripUnderscoreKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((member) => stripUnderscoreKeys(member));
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, member]): [string, unknown] => [
        key,
        stripUnderscoreKeys(member),
      ]),
  );
}

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

/**
 * The seed directory this package ships, resolved from this file's
 * own location rather than from the working directory: a path built
 * from the working directory would name these files only while the
 * process was started from the package, and resolve nowhere from the
 * repo root, which is where a `vitest --root packages/service` run is
 * launched. `tests/invariants/schema-sql.ts` resolves the migrations
 * it reads the same way and for the same reason.
 */
export const SEED_DATA_DIR = fileURLToPath(
  new URL('../data', import.meta.url),
);

/**
 * Every seed file this package ships, keyed by the concern it seeds.
 *
 * The roster is the loader's whole notion of what `data/` holds: a
 * file not named here is never read, and a file named here and absent
 * is a failure rather than an empty concern. Reading the directory
 * instead would turn dropping a file into it into applying it, and
 * which rows reach the database is a decision worth a diff.
 *
 * Declaration order is parent before child, which is the order the
 * rows have to be written in and the order failures are reported in,
 * so two runs over one broken bundle print the same list.
 */
export const SEED_ROSTER = {
  domains: { file: 'domains.json', schema: DomainsFileSchema },
  personas: { file: 'personas.json', schema: PersonasFileSchema },
  categories: { file: 'categories.json', schema: CategoriesFileSchema },
  terms: { file: 'terms.json', schema: TermsFileSchema },
  topics: { file: 'topics.json', schema: TopicsFileSchema },
} as const;

/**
 * Every seed file's rows, validated, in one value.
 *
 * One member per {@link SEED_ROSTER} entry, carrying that file's rows
 * and named for the concern rather than for the file. A bundle only
 * ever exists whole — {@link loadSeedBundle} returns one or throws —
 * so no member is optional and none stands in for a file that could
 * not be read.
 */
export interface SeedBundle {
  readonly domains: readonly DomainSeed[];
  readonly personas: readonly PersonaSeed[];
  readonly categories: readonly CategorySeed[];
  readonly terms: readonly TermSeed[];
  readonly topics: readonly TopicSeed[];
}

/**
 * One thing wrong with one seed file.
 *
 * Granular by design: a file carrying four mistyped members yields
 * four of these, not one reporting the file as invalid. An aggregate
 * collapsing them into a line per file would spend the strictness the
 * schemas above buy.
 */
export interface SeedFailure {
  /** File the problem is in, relative to the seed directory. */
  readonly file: string;

  /**
   * The member at fault, as a path from the file's own root
   * (`terms[3].polarity`, an index bracketed so a position is
   * distinguishable from a key named for a number), or `null` when
   * the whole file is the problem — missing, holding no JSON, or
   * opening with something other than an object.
   */
  readonly field: string | null;

  /** What is wrong, in Zod's words wherever Zod is the refuser. */
  readonly message: string;
}

/**
 * What a failure says about a key no schema names.
 *
 * Written here rather than taken from Zod, which names every
 * unrecognized key of one object in a single message: each key
 * becomes its own failure, and repeating the list beside each would
 * read as though every one were wrong once per sibling.
 */
const UNRECOGNIZED_KEY_MESSAGE =
  'unrecognized key: the schema for this file names no such member';

/**
 * Thrown when any seed file fails to read or to validate.
 *
 * Carries every failure across every file rather than the first one:
 * reading all five costs five opens, while stopping at the first
 * turns a bundle with one mistake per file into five edits and five
 * runs.
 *
 * A distinct class rather than a bare `Error`, so a caller can pin
 * the refusal to this cause — a `TypeError` from a bad call reaches a
 * catch as an `Error` too.
 */
export class SeedValidationError extends Error {
  /** Directory that was read, exactly as the caller named it. */
  readonly directory: string;

  /** Every problem found, in roster then Zod issue order. */
  readonly failures: readonly SeedFailure[];

  /**
   * @param directory - Seed directory that was read.
   * @param failures - Every problem found across every file in it.
   */
  constructor(directory: string, failures: readonly SeedFailure[]) {
    const files = new Set(failures.map((failure) => failure.file));

    super(
      `${failures.length} problem(s) in ${files.size} seed file(s) ` +
      `under ${directory}. Nothing was applied.\n` +
      failures.map(formatSeedFailure)
        .join('\n'),
    );
    this.name = this.constructor.name;
    this.directory = directory;
    this.failures = failures;
  }
}

/**
 * One failure as an indented line of the aggregate's message, naming
 * the file, the field where there is one, and what is wrong.
 *
 * @param failure - The failure to render.
 */
function formatSeedFailure(failure: SeedFailure): string {
  if (failure.field === null) {
    return `  ${failure.file}: ${failure.message}`;
  }

  return `  ${failure.file} (${failure.field}): ${failure.message}`;
}

/**
 * A Zod issue path rendered as a field a reader can find in the file:
 * `['terms', 3, 'polarity']` becomes `terms[3].polarity`. An empty
 * path is the file itself and comes back `null`, which is what
 * {@link SeedFailure.field} carries for a problem no member owns.
 *
 * @param path - Zod's own path for the issue.
 */
function formatFieldPath(
  path: readonly (string | number)[],
): string | null {
  if (path.length === 0) {
    return null;
  }

  return path.reduce<string>((rendered, segment) => {
    if (typeof segment === 'number') {
      return `${rendered}[${segment}]`;
    }

    return rendered === ''
      ? segment
      : `${rendered}.${segment}`;
  }, '');
}

/**
 * Every issue in a Zod refusal, as failures naming file and field.
 *
 * An `unrecognized_keys` issue is split into one failure per key. Zod
 * reports it against the path of the object that HELD the keys, so an
 * aggregate keyed on `path` alone names the row and never the typo —
 * which is the half of the strictness above that shortens the walk.
 *
 * @param file - File the refusal came from.
 * @param error - Zod's refusal.
 */
function toSeedFailures(
  file: string,
  error: z.ZodError,
): readonly SeedFailure[] {
  return error.issues.flatMap((issue): readonly SeedFailure[] => {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      return issue.keys.map((key) => ({
        file,
        field: formatFieldPath([...issue.path, key]),
        message: UNRECOGNIZED_KEY_MESSAGE,
      }));
    }

    return [{
      file,
      field: formatFieldPath(issue.path),
      message: issue.message,
    }];
  });
}

/** One seed file's parsed JSON, or the reason there is none. */
type SeedJsonRead =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly reason: string };

/**
 * One seed file read from disk and parsed.
 *
 * An absent file and one holding text no parser accepts fail the same
 * way for a caller: there is nothing to validate. Both come back as a
 * reason rather than as a thrown error, so the loader can carry them
 * into the same aggregate as a schema refusal instead of ending the
 * run at the first file it cannot open. They are told apart by the
 * error class rather than by its text, because an absent file and a
 * mistyped comma send a reader to different places.
 *
 * @param path - Path to the file.
 */
function readSeedJson(path: string): SeedJsonRead {
  try {
    const raw = readFileSync(path, 'utf8');

    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch (cause) {
    const detail = cause instanceof Error
      ? cause.message
      : String(cause);

    return {
      ok: false,
      reason: cause instanceof SyntaxError
        ? `holds no valid JSON (${detail})`
        : `could not be read (${detail})`,
    };
  }
}

/**
 * One roster entry's rows, or every reason it was refused. `Payload`
 * is what the entry's schema yields.
 */
type SeedFileOutcome<Payload> =
  | { readonly ok: true; readonly value: Payload }
  | { readonly ok: false; readonly failures: readonly SeedFailure[] };

/**
 * One roster entry read, stripped and validated.
 *
 * The three steps are ordered rather than merely adjacent, for the
 * reason the module header gives at length.
 *
 * @param directory - Seed directory to read the file from.
 * @param entry - A {@link SEED_ROSTER} entry, naming the file and the
 * schema it is held to.
 * @returns The file's rows, or its failures.
 */
function readSeedFile<Schema extends z.ZodTypeAny>(
  directory: string,
  entry: { readonly file: string; readonly schema: Schema },
): SeedFileOutcome<z.infer<Schema>> {
  const read = readSeedJson(join(directory, entry.file));

  if (!read.ok) {
    return {
      ok: false,
      failures: [
        { file: entry.file, field: null, message: read.reason },
      ],
    };
  }

  const stripped = stripUnderscoreKeys(read.value);
  const validated = entry.schema.safeParse(stripped);

  if (!validated.success) {
    return {
      ok: false,
      failures: toSeedFailures(entry.file, validated.error),
    };
  }

  return { ok: true, value: validated.data };
}

/**
 * An outcome's failures, and an empty list when it carries rows.
 *
 * @param outcome - Any roster entry's outcome.
 */
function failuresOf(
  outcome: SeedFileOutcome<unknown>,
): readonly SeedFailure[] {
  if (outcome.ok) {
    return [];
  }

  return outcome.failures;
}

/**
 * Every seed file under `dataDir`, read, stripped and validated.
 *
 * The whole roster is read before anything is decided. A file that is
 * missing, that holds no JSON, or that its schema refuses contributes
 * its failures and does not end the run, so one pass reports
 * everything wrong with the bundle rather than the first thing wrong
 * with it. A directory that is not there needs no case of its own:
 * every file then fails to be read and each failure names the path.
 *
 * Either every concern comes back or none does, which is what lets
 * the CLI arriving later in this stage validate before it opens a
 * connection: a bundle that cannot be applied whole is refused before
 * anything is applied at all.
 *
 * What this does not check is whether the rows agree with EACH OTHER
 * — that a persona names a domain the bundle carries, that a term
 * names a category it declares. Every file is held to its own schema
 * and to nothing else; the cross-file check arrives next in this
 * stage.
 *
 * @param dataDir - Directory holding the roster's files. Defaults to
 * {@link SEED_DATA_DIR}, the seeds this package ships.
 * @returns Every concern's validated rows.
 * @throws SeedValidationError When any file fails, carrying every
 * failure across every file rather than the first.
 */
export function loadSeedBundle(
  dataDir: string = SEED_DATA_DIR,
): SeedBundle {
  const domains = readSeedFile(dataDir, SEED_ROSTER.domains);
  const personas = readSeedFile(dataDir, SEED_ROSTER.personas);
  const categories = readSeedFile(dataDir, SEED_ROSTER.categories);
  const terms = readSeedFile(dataDir, SEED_ROSTER.terms);
  const topics = readSeedFile(dataDir, SEED_ROSTER.topics);

  // Tested outcome by outcome rather than on a collected failure
  // count, because a count narrows nothing: only a discriminant test
  // each proves to the compiler that the rows below exist. The two
  // can never disagree — an outcome carries failures exactly when it
  // carries no rows.
  if (
    !domains.ok
    || !personas.ok
    || !categories.ok
    || !terms.ok
    || !topics.ok
  ) {
    throw new SeedValidationError(dataDir, [
      ...failuresOf(domains),
      ...failuresOf(personas),
      ...failuresOf(categories),
      ...failuresOf(terms),
      ...failuresOf(topics),
    ]);
  }

  return {
    domains: domains.value.domains,
    personas: personas.value.personas,
    categories: categories.value.categories,
    terms: terms.value.terms,
    topics: topics.value.topics,
  };
}
