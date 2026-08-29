/**
 * @packageDocumentation
 * The seed pipeline: the path that takes the seed files in `data/`
 * and applies them to the database.
 *
 * The reading half is here: the underscore stripping that clears a
 * seed's commentary, and `loadSeedBundle`, which reads the roster,
 * refuses the whole bundle when any file fails, and then holds the
 * rows that survived against each other. `formatSeedSummary` sits
 * here too and belongs to neither half — it renders what an apply
 * pass reported — and below both is the entry point that runs a pass,
 * which is why `bun scripts/seed.ts` seeds while importing this
 * module hands over its exports and does nothing else.
 *
 * Two sibling modules carry the rest, and this one re-exports both
 * whole, so importing any of it from here works as it did when all
 * three were one file. `./seed-schemas.ts` holds the per-file schemas
 * a stripped file is validated against; `./seed-apply.ts` holds
 * `applySeedBundle` and the per-concern writers beneath it. What a
 * seed looks like, what reads one and what writes one are separate
 * enough to follow apart.
 *
 * This is the only code path permitted to read `data/`. The rule is
 * `data/README.md`'s and it is absolute rather than a default: a file
 * read at runtime is a second source of truth, and the two drift the
 * moment somebody edits a row a file also declares. Whatever wants a
 * value out of one of those files reads it from the database a pass
 * wrote it into, so a second reader is a change to that rule and not
 * a file added beside this one.
 *
 * Two things scope that claim. The whole of the reading is
 * `SEED_DATA_DIR` and the roster under it, so what opens the
 * directory is greppable from two names rather than spread across the
 * module. And the naming invariant walks the same directory, `data/`
 * being one of its scan roots, which is not the exception it looks
 * like: it reads those files as bytes to check the names in them and
 * takes no value out of one.
 *
 * Validation completes before any connection is opened, and the split
 * above is what makes that structural rather than an order somebody
 * remembered: `loadSeedBundle` is handed no database and opens none,
 * so there is nothing to write through until it has returned a whole
 * bundle. A malformed seed cannot half-apply, because the pass that
 * would apply it never begins — `runSeedCli` records that at the
 * point the two meet.
 *
 * That covers what this module can refuse and nothing past it. A
 * bundle that validates and the database then refuses — the depth
 * trigger, a foreign key, a constraint — is held by the other guard,
 * `applySeedBundle` writing in one transaction and rolling back the
 * concerns already written. Two failures, two mechanisms, and neither
 * stands in for the other.
 */
import type { SeedCounts, SeedRowCounts } from './seed-apply.js';
import type {
  CategorySeed,
  DomainSeed,
  PersonaSeed,
  TermSeed,
  TopicSeed,
} from './seed-schemas.js';
import type { Db } from '../src/db/index.js';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';

import { config } from '../src/config.js';
import * as schema from '../src/db/schema.js';

import { applySeedBundle } from './seed-apply.js';
import {
  CategoriesFileSchema,
  DomainsFileSchema,
  PersonasFileSchema,
  TermsFileSchema,
  TopicsFileSchema,
} from './seed-schemas.js';

export * from './seed-apply.js';
export * from './seed-schemas.js';

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
  path: readonly PropertyKey[],
): string | null {
  if (path.length === 0) {
    return null;
  }

  return path.reduce<string>((rendered, segment) => {
    if (typeof segment === 'number') {
      return `${rendered}[${segment}]`;
    }

    const name = String(segment);
    return rendered === ''
      ? name
      : `${rendered}.${name}`;
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
 * What a failure says about a member naming a domain the bundle does
 * not carry.
 *
 * Built from {@link SEED_ROSTER} rather than written out, so a seed
 * file renamed there is renamed in the message a reader is sent to
 * open. Its counterpart for a category is
 * {@link UNRESOLVED_CATEGORY_MESSAGE}, and both are phrased to read
 * after the field {@link formatSeedFailure} puts in front of them.
 */
const UNRESOLVED_DOMAIN_MESSAGE =
  `names a domain slug no row in ${SEED_ROSTER.domains.file} declares`;

/**
 * What a failure says about a member naming a category the bundle
 * does not declare. Built from the roster for the reason
 * {@link UNRESOLVED_DOMAIN_MESSAGE} gives.
 */
const UNRESOLVED_CATEGORY_MESSAGE =
  `names a category key no row in ${SEED_ROSTER.categories.file} declares`;

/**
 * Every row of one concern whose reference names no key the bundle
 * carries.
 *
 * One failure per ROW rather than one per unresolved value: two
 * personas naming a single absent domain are two rows to correct, and
 * folding them together would leave the second to be found by hand.
 *
 * Field paths come from {@link formatFieldPath}, the renderer the
 * schema refusals already use, so `terms[3].categoryKey` reads off
 * the file the same way whichever pass refused it.
 *
 * @param concern - Roster key of the concern the rows belong to,
 * which names both the file the failures are reported against and the
 * root of every field path.
 * @param member - The referring member, spelled as the seed file
 * spells it.
 * @param values - That member's value for every row, in row order.
 * @param known - Every key the referenced concern declares.
 * @param message - What an unresolved value is reported as, ahead of
 * the value itself.
 * @returns One failure per row that resolved to nothing, in row
 * order.
 */
function unresolvedReferences(
  concern: keyof typeof SEED_ROSTER,
  member: string,
  values: readonly string[],
  known: ReadonlySet<string>,
  message: string,
): readonly SeedFailure[] {
  return values.flatMap((value, index): readonly SeedFailure[] => {
    if (known.has(value)) {
      return [];
    }

    return [{
      file: SEED_ROSTER[concern].file,
      field: formatFieldPath([concern, index, member]),
      message: `${message}: '${value}'`,
    }];
  });
}

/**
 * Every reference across the bundle's files that resolves to nothing.
 *
 * Four of them, swept in roster order so two runs over one broken
 * bundle print the same list: a persona, a category and a topic each
 * name a domain by its `slug`, and a term names a category by its
 * `key`. Those are the members no seed can spell as an id, since the
 * id does not exist until the parent row is written.
 *
 * A reference resolves against the rows the BUNDLE carries and never
 * against the database, which is forced rather than chosen — the
 * loader is handed no connection and opens none, so a parent already
 * stored is not something it can see. The cost is that a bundle has
 * to be self-contained: a persona whose domain was seeded by an
 * earlier pass and has since been dropped from `domains.json` is
 * refused, though the row it names is sitting in the database.
 *
 * @param bundle - Every concern's rows, each already validated
 * against its own file's schema.
 * @returns Every unresolved reference, and an empty list when the
 * bundle agrees with itself.
 */
function crossFileFailures(bundle: SeedBundle): readonly SeedFailure[] {
  const domainSlugs = new Set(bundle.domains.map((row) => row.slug));
  const categoryKeys = new Set(bundle.categories.map((row) => row.key));

  return [
    ...unresolvedReferences(
      'personas',
      'domainSlug',
      bundle.personas.map((row) => row.domainSlug),
      domainSlugs,
      UNRESOLVED_DOMAIN_MESSAGE,
    ),
    ...unresolvedReferences(
      'categories',
      'domainSlug',
      bundle.categories.map((row) => row.domainSlug),
      domainSlugs,
      UNRESOLVED_DOMAIN_MESSAGE,
    ),
    ...unresolvedReferences(
      'terms',
      'categoryKey',
      bundle.terms.map((row) => row.categoryKey),
      categoryKeys,
      UNRESOLVED_CATEGORY_MESSAGE,
    ),
    ...unresolvedReferences(
      'topics',
      'domainSlug',
      bundle.topics.map((row) => row.domainSlug),
      domainSlugs,
      UNRESOLVED_DOMAIN_MESSAGE,
    ),
  ];
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
 * {@link runSeedCli} validate before it opens a connection: a bundle
 * that cannot be applied whole is refused before anything is applied
 * at all.
 *
 * Once every file has validated, the rows are held against each
 * other: a persona, a category and a topic each name a domain the
 * bundle must carry, and a term names a category it must declare.
 * That pass runs after the per-file one rather than beside it, and
 * the order is what keeps its report readable — a `domains.json`
 * refused for one mistyped key declares no slug at all, so every
 * persona, category and topic in the bundle would be reported as
 * naming a domain that is not there.
 *
 * What it resolves is presence and nothing past it. A `categoryKey`
 * names one half of a category's (domain, key) natural key, so it is
 * held against every key the bundle declares: with one domain seeded
 * that names one row, and a second domain reusing a key would make
 * the member ambiguous without making it unresolved. `parentKey` is
 * not resolved here at all, so a category naming a parent the bundle
 * does not carry reaches the apply pass, which is where such a key
 * becomes an id.
 *
 * @param dataDir - Directory holding the roster's files. Defaults to
 * {@link SEED_DATA_DIR}, the seeds this package ships.
 * @returns Every concern's validated rows.
 * @throws SeedValidationError When any file fails to read or
 * validate, or — once every file has — when any reference across
 * them resolves to nothing. Either refusal carries every failure its
 * own pass found rather than the first.
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

  const bundle: SeedBundle = {
    domains: domains.value.domains,
    personas: personas.value.personas,
    categories: categories.value.categories,
    terms: terms.value.terms,
    topics: topics.value.topics,
  };
  const unresolved = crossFileFailures(bundle);

  // A count is the right test here where a discriminant one was the
  // right test above, and the difference is what each guard is for:
  // that one had to narrow five outcomes before the rows below it
  // were reachable, while these rows are already in hand and the
  // only question left is whether anything was reported against
  // them.
  if (unresolved.length > 0) {
    throw new SeedValidationError(dataDir, unresolved);
  }

  return bundle;
}

/**
 * The tallies a summary prints, in the order it prints them. Each
 * name is both the member it reads and the heading it prints under.
 *
 * Held against {@link SeedRowCounts} rather than merely resembling
 * it, so a tally renamed there stops compiling here. The tie runs one
 * way: a tally added to that interface and left out of this list
 * would be left out of the block too. Not silently, though — the
 * total row below builds a `SeedRowCounts` as an annotated literal,
 * so a fourth member turns `check-types` red there, and this list is
 * the fix.
 */
const SUMMARY_TALLIES = [
  'created',
  'updated',
  'unchanged',
] as const satisfies readonly (keyof SeedRowCounts)[];

/** One of the tallies {@link SUMMARY_TALLIES} names. */
type SummaryTally = (typeof SUMMARY_TALLIES)[number];

/** What a summary block opens with, so it is greppable in a log. */
const SUMMARY_TITLE = 'seed summary';

/** The heading over a summary's leftmost column. */
const SUMMARY_LABEL_HEADING = 'concern';

/** What the row totalling every concern above it is labelled. */
const SUMMARY_TOTAL_LABEL = 'total';

/** One line of a summary block below its headings. */
interface SummaryRow {
  /** What the line is about — a concern, or the pass as a whole. */
  readonly label: string;

  /** The tallies that line prints. */
  readonly counts: SeedRowCounts;
}

/**
 * What one `applySeedBundle` pass did, as one block of text.
 *
 * A line per concern in {@link SEED_ROSTER} order, so the block lists
 * them in the order the pass wrote them and the loader reports
 * failures in — a parent above the rows naming it. The concerns are
 * read off the roster rather than written out again here, so there is
 * no second list to keep in step: a concern added to the roster is in
 * the block, and one added there with no tally of its own stops the
 * lookup below compiling rather than printing `undefined`.
 *
 * The numbers are right-aligned under their headings and the labels
 * padded to the widest, because what a summary is opened with is
 * whether anything is nonzero, and a column of digits answers that at
 * a glance where a run of prose does not. Every width is measured off
 * what is being printed, so a tally of five figures widens its column
 * rather than pushing its row out of line.
 *
 * A total row closes the block. It holds nothing the lines above do
 * not, but it holds the one thing they yield only to arithmetic:
 * whether the pass changed anything at all.
 *
 * What the block reports is what the pass reported and nothing
 * beside it. `applySeedBundle` records what each tally does and does
 * not count — an unchanged row is unchanged in the columns that pass
 * writes, not in every column it has.
 *
 * @param counts - What one pass reported, a concern at a time.
 * @returns The block: newline-separated, no trailing newline, every
 * line below the title indented, so a caller can print it under a
 * line of its own without the two running together.
 */
export function formatSeedSummary(counts: SeedCounts): string {
  // `Object.keys` is typed to `string[]`, since in general an object
  // carries keys its type does not name. This one is a `const`
  // literal in this file, so its keys are exactly the concerns named
  // there, and narrowing them is what lets the lookups below reach
  // `counts` by a key it declares.
  const concerns = Object.keys(SEED_ROSTER) as (keyof typeof SEED_ROSTER)[];
  const totals = concerns.reduce<SeedRowCounts>((running, concern) => ({
    created: running.created + counts[concern].created,
    updated: running.updated + counts[concern].updated,
    unchanged: running.unchanged + counts[concern].unchanged,
  }), { created: 0, updated: 0, unchanged: 0 });
  const rows: readonly SummaryRow[] = [
    ...concerns.map((concern) => ({
      label: concern,
      counts: counts[concern],
    })),
    { label: SUMMARY_TOTAL_LABEL, counts: totals },
  ];
  const labelWidth = Math.max(
    SUMMARY_LABEL_HEADING.length,
    ...rows.map((row) => row.label.length),
  );
  const columns = SUMMARY_TALLIES.map((tally) => ({
    tally,
    width: Math.max(
      tally.length,
      ...rows.map((row) => String(row.counts[tally]).length),
    ),
  }));
  const renderLine = (
    label: string,
    cell: (tally: SummaryTally) => string,
  ): string => `  ${label.padEnd(labelWidth)}` + columns
    .map((column) => `  ${cell(column.tally).padStart(column.width)}`)
    .join('');

  return [
    SUMMARY_TITLE,
    renderLine(SUMMARY_LABEL_HEADING, (tally) => tally),
    ...rows.map(
      (row) => renderLine(row.label, (tally) => String(row.counts[tally])),
    ),
  ].join('\n');
}

/**
 * An open database and the way to let go of it.
 *
 * A pair rather than `src/db/index.ts`'s dependency: that one carries
 * the eager probe and the managed stop a pool held for a service's
 * lifetime wants, where a seed pass opens one, writes one transaction
 * and closes it. It is also the seam a test drives
 * {@link runSeedCli} through, against a double rather than a server.
 */
export interface SeedConnection {
  /** What `applySeedBundle` writes through. */
  readonly db: Db;

  /** Releases it, whether or not the pass succeeded. */
  close(): Promise<void>;
}

/**
 * A pool over the database `DATABASE_URL` names.
 *
 * The URL is read through `src/config.ts` rather than off
 * `process.env`, so this command and the service resolve one setting
 * the same way and a malformed environment is refused once, at
 * import, by the schema that owns it. The pool is small because a
 * pass is one transaction on one connection.
 */
function openSeedConnection(): SeedConnection {
  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 2 });

  return {
    db: drizzle({ client: pool, schema }),
    close: () => pool.end(),
  };
}

/**
 * One seed pass end to end: read the bundle, apply it, report what it
 * did.
 *
 * The bundle is loaded before anything is opened, and that order is
 * the point rather than an accident of layout: `loadSeedBundle`
 * refuses a bundle whole, so a seed nobody can apply ends the run
 * with no connection made and not a row written.
 *
 * The connection is closed in a `finally`, so a pass that threw
 * releases it too — a pool nobody ended keeps the process alive, and
 * a command that printed its error and then hung reads as a worse
 * failure than the one it reported.
 *
 * @param connect - How to reach a database. Defaults to a pool over
 * `DATABASE_URL`; a caller handing over its own is what makes this
 * drivable with no server.
 * @param dataDir - Directory the roster is read from. Defaults to
 * {@link SEED_DATA_DIR}, the seeds this package ships.
 * @returns What the pass did, as `applySeedBundle` reported it.
 * @throws SeedValidationError When the bundle is refused, which is
 * before `connect` is called at all.
 */
export async function runSeedCli(
  connect: () => SeedConnection = openSeedConnection,
  dataDir: string = SEED_DATA_DIR,
): Promise<SeedCounts> {
  const bundle = loadSeedBundle(dataDir);
  const connection = connect();

  try {
    const counts = await applySeedBundle(connection.db, bundle);

    console.log(`seeded from ${dataDir}`);
    console.log(formatSeedSummary(counts));

    return counts;
  } finally {
    await connection.close();
  }
}

/**
 * Whether this file is what the process was started with, rather than
 * something another module imported.
 *
 * `import.meta.url` is a `file:` URL where `process.argv[1]` is a
 * path, so comparing the two as they come is false however the
 * process was started, and the block below would silently never run.
 * `fileURLToPath` is what makes the comparison able to hold at all.
 *
 * Worth asking because this module is both a command and a library:
 * `bun scripts/seed.ts` runs a pass, while a test importing
 * `loadSeedBundle` or {@link runSeedCli} gets the exports and no
 * pass.
 */
const INVOKED_AS_CLI = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (INVOKED_AS_CLI) {
  try {
    await runSeedCli();
  } catch (cause) {
    // A validation refusal is already a report — every failure, with
    // its file and its field — so a stack above it buries the thing
    // worth reading. Anything else is unexpected, and there the stack
    // is what a reader needs.
    process.exitCode = 1;
    console.error(
      cause instanceof SeedValidationError
        ? cause.message
        : cause,
    );
  }
}
