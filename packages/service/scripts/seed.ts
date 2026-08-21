/**
 * @packageDocumentation
 * The seed pipeline: the path that takes the seed files in `data/`
 * and applies them to the database.
 *
 * Three parts are here today: the underscore stripping that clears a
 * seed's commentary, `loadSeedBundle`, which reads the roster,
 * refuses the whole bundle when any file fails, and then holds the
 * rows that survived against each other, and `applySeedBundle`, which
 * upserts them on their natural keys inside one transaction. The
 * summary a pass reports and the CLI entry point arrive later in this
 * stage.
 *
 * The per-file schemas a stripped file is validated against are in
 * `./seed-schemas.ts`, which this module re-exports whole: the shape
 * of a seed and the pass that reads it are separate enough to follow
 * apart, and importing either from here works as it did when both
 * were one file.
 */
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
import { fileURLToPath } from 'node:url';

import { sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  categories,
  domains,
  personas,
  terms,
  topics,
} from '../src/db/schema.js';

import {
  CategoriesFileSchema,
  DomainsFileSchema,
  PersonasFileSchema,
  TermsFileSchema,
  TopicsFileSchema,
} from './seed-schemas.js';

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
 * the CLI arriving later in this stage validate before it opens a
 * connection: a bundle that cannot be applied whole is refused before
 * anything is applied at all.
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
 * The transaction every write in the apply pass runs inside, as
 * drizzle types it.
 *
 * Derived from {@link Db} rather than written out: naming the type
 * means restating `PgTransaction`'s arguments, and an annotation that
 * drifts from what `db.transaction` actually hands over is a cast
 * waiting to be added.
 */
type SeedTx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * What every refusal from the apply pass opens with, so a failure
 * raised while writing is greppable and reads apart from one
 * {@link SeedValidationError} raised before anything was opened.
 */
const APPLY_ERROR_PREFIX = 'seed apply:';

/**
 * The id an upsert returned.
 *
 * The empty case cannot arise as this module calls it: `ON CONFLICT
 * … DO UPDATE` writes the row whichever branch it takes, so
 * `RETURNING` yields exactly one. It is written out rather than
 * asserted away because `onConflictDoNothing` is one word from
 * `onConflictDoUpdate` and DOES return nothing on a conflict — under
 * an assertion that edit would put an `undefined` id into the next
 * concern's foreign key rather than raise anything here.
 *
 * @param rows - What the upsert's `RETURNING` came back with.
 * @param what - The row being written, for the message.
 * @throws Error When the upsert returned no row.
 */
function upsertedId(
  rows: readonly { readonly id: number }[],
  what: string,
): number {
  const [row] = rows;

  if (row === undefined) {
    throw new Error(`${APPLY_ERROR_PREFIX} upserting ${what} returned no row`);
  }

  return row.id;
}

/**
 * The id a natural key names, among the ids an earlier concern of the
 * same pass wrote.
 *
 * {@link loadSeedBundle} already refuses a bundle whose personas,
 * categories or topics name a domain it does not carry, or whose
 * terms name a category it does not declare, so every lookup here
 * resolves for a bundle that came from there. This covers the other
 * caller: a {@link SeedBundle} assembled by hand type checks without
 * going through that pass, and an unresolved key would otherwise
 * reach a foreign key as `undefined`.
 *
 * @param ids - Keys an earlier concern wrote, against the ids the
 * database issued for them.
 * @param key - The key to resolve.
 * @param reference - The referring row and the thing it names, read
 * ahead of the key itself.
 * @throws Error When the key names no row this bundle declares.
 */
function resolvedId(
  ids: ReadonlyMap<string, number>,
  key: string,
  reference: string,
): number {
  const id = ids.get(key);

  if (id === undefined) {
    throw new Error(
      `${APPLY_ERROR_PREFIX} ${reference} '${key}', ` +
      'which this bundle does not declare',
    );
  }

  return id;
}

/**
 * Every domain the bundle carries, upserted by `slug`.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/domains.json` row.
 * @returns Each slug against the id the database holds that domain
 * under, which is what every concern below resolves `domainSlug`
 * against.
 */
async function applyDomains(
  tx: SeedTx,
  rows: readonly DomainSeed[],
): Promise<ReadonlyMap<string, number>> {
  const ids = new Map<string, number>();

  for (const row of rows) {
    const settings = row.settings ?? {};
    const returned = await tx.insert(domains)
      .values({ slug: row.slug, name: row.name, settings })
      .onConflictDoUpdate({
        target: domains.slug,
        set: { name: row.name, settings, updatedAt: sql`now()` },
      })
      .returning({ id: domains.id });

    ids.set(row.slug, upsertedId(returned, `domain '${row.slug}'`));
  }

  return ids;
}

/**
 * Every persona the bundle carries, upserted by the (domain, role)
 * pair `personas_domain_id_role_unique` holds.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/personas.json` row.
 * @param domainIds - What {@link applyDomains} returned.
 */
async function applyPersonas(
  tx: SeedTx,
  rows: readonly PersonaSeed[],
  domainIds: ReadonlyMap<string, number>,
): Promise<void> {
  for (const row of rows) {
    const domainId = resolvedId(
      domainIds,
      row.domainSlug,
      `persona '${row.role}' names domain`,
    );

    await tx.insert(personas)
      .values({ domainId, role: row.role, systemText: row.systemText })
      .onConflictDoUpdate({
        target: [personas.domainId, personas.role],
        set: { systemText: row.systemText },
      });
  }
}

/**
 * The id a category's `parentKey` names, or `null` for a root.
 *
 * Resolved against the ROOTS of this bundle alone, which is what
 * makes the refusal say something true: nesting is capped at one
 * level by the trigger on `categories`, so the only row a parent key
 * can legitimately name is a root, and a key naming a child would
 * otherwise be reported as absent from a bundle that declares it.
 *
 * @param rootIds - The keys of every root category written by this
 * pass, against their ids.
 * @param row - The category whose parent is being resolved.
 * @throws Error When the row names a parent that is no root of this
 * bundle's taxonomy.
 */
function resolveParentId(
  rootIds: ReadonlyMap<string, number>,
  row: CategorySeed,
): number | null {
  if (row.parentKey === null) {
    return null;
  }

  const parentId = rootIds.get(row.parentKey);

  if (parentId === undefined) {
    throw new Error(
      `${APPLY_ERROR_PREFIX} category '${row.key}' names parent ` +
      `'${row.parentKey}', which is no root of this bundle's taxonomy`,
    );
  }

  return parentId;
}

/**
 * Every category the bundle carries, upserted by the (domain, key)
 * pair `categories_domain_id_key_unique` holds.
 *
 * Roots are written before the rows naming one, because a parent has
 * to exist as a row before a child can point at it. That ordering is
 * not the depth cap and does not stand in for it: a category naming a
 * child rather than a root is refused here for naming no root, and a
 * row that reached the database another way is refused by the
 * trigger, which is where the rule lives.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/categories.json` row.
 * @param domainIds - What {@link applyDomains} returned.
 * @returns Each category key against its id — roots and children
 * together, since a term names either.
 */
async function applyCategories(
  tx: SeedTx,
  rows: readonly CategorySeed[],
  domainIds: ReadonlyMap<string, number>,
): Promise<ReadonlyMap<string, number>> {
  const ids = new Map<string, number>();
  const rootIds = new Map<string, number>();
  const roots = rows.filter((row) => row.parentKey === null);
  const children = rows.filter((row) => row.parentKey !== null);

  for (const row of [...roots, ...children]) {
    const domainId = resolvedId(
      domainIds,
      row.domainSlug,
      `category '${row.key}' names domain`,
    );
    const parentId = resolveParentId(rootIds, row);
    const returned = await tx.insert(categories)
      .values({ domainId, key: row.key, name: row.name, parentId })
      .onConflictDoUpdate({
        target: [categories.domainId, categories.key],
        set: { name: row.name, parentId },
      })
      .returning({ id: categories.id });
    const id = upsertedId(returned, `category '${row.key}'`);

    ids.set(row.key, id);

    if (parentId === null) {
      rootIds.set(row.key, id);
    }
  }

  return ids;
}

/**
 * Every term the bundle carries, upserted by the (category, pattern)
 * pair `terms_category_id_pattern_unique` holds.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/terms.json` row.
 * @param categoryIds - What {@link applyCategories} returned.
 */
async function applyTerms(
  tx: SeedTx,
  rows: readonly TermSeed[],
  categoryIds: ReadonlyMap<string, number>,
): Promise<void> {
  for (const row of rows) {
    const categoryId = resolvedId(
      categoryIds,
      row.categoryKey,
      `term '${row.pattern}' names category`,
    );

    await tx.insert(terms)
      .values({
        categoryId,
        pattern: row.pattern,
        weight: row.weight,
        polarity: row.polarity,
        notes: row.notes,
      })
      .onConflictDoUpdate({
        target: [terms.categoryId, terms.pattern],
        set: {
          weight: row.weight,
          polarity: row.polarity,
          notes: row.notes,
        },
      });
  }
}

/**
 * Every topic the bundle carries, upserted by the (domain, name) pair
 * `topics_domain_id_name_unique` holds.
 *
 * The same object supplies the inserted values and the DO UPDATE set,
 * so what a first pass writes and what a second rewrites cannot be
 * edited apart. `next_run_at` and `enabled` are in neither: they are
 * the dispatcher's and the operator's, and `data/topics.json`'s
 * header states the consequence a seeded topic then has — configured
 * and not yet due.
 *
 * @param tx - The transaction the whole pass runs in.
 * @param rows - Every `data/topics.json` row.
 * @param domainIds - What {@link applyDomains} returned.
 */
async function applyTopics(
  tx: SeedTx,
  rows: readonly TopicSeed[],
  domainIds: ReadonlyMap<string, number>,
): Promise<void> {
  for (const row of rows) {
    const domainId = resolvedId(
      domainIds,
      row.domainSlug,
      `topic '${row.name}' names domain`,
    );
    const configured = {
      searchTerms: row.searchTerms ?? [],
      intervalSeconds: row.intervalSeconds,
      minIntervalSeconds: row.minIntervalSeconds,
      maxIntervalSeconds: row.maxIntervalSeconds,
    };

    await tx.insert(topics)
      .values({ domainId, name: row.name, ...configured })
      .onConflictDoUpdate({
        target: [topics.domainId, topics.name],
        set: configured,
      });
  }
}

/**
 * Every row the bundle carries, written to the database.
 *
 * One pass is an upsert per row keyed on that concern's natural key —
 * a domain by `slug`, a persona by (domain, role), a category by
 * (domain, key), a term by (category, pattern), a topic by (domain,
 * name) — so a second pass over the same files leaves the same rows
 * rather than a second set beside the first. Those keys are the only
 * ones a seed can spell, an id being the database's to issue, and
 * they are also the only ones it would be safe to key on: a delete
 * and re-insert would reissue every id and take the findings,
 * criteria and research citing the old ones with it.
 *
 * The order is the one the foreign keys force. Domains first, since
 * everything else names one; categories before terms, since a term
 * hangs off a category id; and roots before the categories naming
 * one, for the reason {@link applyCategories} records.
 *
 * The whole pass is one transaction. A refusal partway through — the
 * depth trigger, a foreign key, a reference the bundle does not carry
 * — rolls back the concerns already written rather than leaving them,
 * so a broken bundle is an edit and another run rather than an edit
 * and a reconciliation. What that does not buy is exclusion: the
 * locks are taken row by row as the pass reaches them, so two passes
 * at once serialize per row and either may end up the last writer of
 * any given one, while neither leaves a half-applied bundle.
 *
 * Each DO UPDATE clause writes what the seed file states and nothing
 * beside it. `next_run_at` and `enabled` on a topic are absent, and
 * so are `feature_version` and `embedding_model` on a domain, so a
 * pass neither re-enables a topic somebody switched off nor clears a
 * pin the feature port (phase 4) wrote. A member the schema makes
 * optional because the column's default means the same as absence —
 * `settings` and `searchTerms` — is written as that default rather
 * than left out of the update, so the file states the whole row and a
 * settings block deleted from `domains.json` is deleted from the
 * database by the next pass rather than surviving it.
 *
 * Three limits. The pass adds and rewrites and never deletes, so a
 * term dropped from `terms.json` stays: a row removed from a seed and
 * a row somebody added through another path are indistinguishable
 * from here. `domains.updated_at` is stamped on every domain the
 * bundle carries whether or not anything about it changed, until the
 * comparison arriving later in this stage gives an unchanged row a
 * write to skip. And a term names its category by `key` alone, half
 * of that table's (domain, key) natural key, so two domains reusing
 * one key would collapse onto whichever was written last —
 * `data/terms.json`'s header records that as belonging to whoever
 * adds the second domain.
 *
 * @param db - An open database. The caller owns it: nothing here
 * opens or closes a connection, which is what lets a live test and
 * the CLI arriving later in this stage each hand over one of their
 * own.
 * @param bundle - Every concern's rows, as {@link loadSeedBundle}
 * returns them.
 * @throws Error When a reference resolves to no row. A bundle from
 * {@link loadSeedBundle} has had every `domainSlug` and `categoryKey`
 * resolved already; `parentKey` is resolved here for the first time.
 */
export async function applySeedBundle(
  db: Db,
  bundle: SeedBundle,
): Promise<void> {
  await db.transaction(async (tx) => {
    const domainIds = await applyDomains(tx, bundle.domains);

    await applyPersonas(tx, bundle.personas, domainIds);

    const categoryIds = await applyCategories(
      tx,
      bundle.categories,
      domainIds,
    );

    await applyTerms(tx, bundle.terms, categoryIds);
    await applyTopics(tx, bundle.topics, domainIds);
  });
}
