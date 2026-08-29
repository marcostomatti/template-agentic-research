/**
 * What `stripUnderscoreKeys` drops, what `loadSeedBundle` refuses,
 * what it says when it does, what it makes of the seeds this package
 * ships, what the shipped taxonomy has to be that no schema asks of
 * it, and what a run does with a refusal.
 *
 * The strip runs ahead of every schema and is asserted on its own
 * rather than through a fixture bundle. What it has to get right is
 * depth, and the files it was written for carry a header at one.
 *
 * The seeds this package ships are read too, beside the fixtures
 * rather than through one. The fixtures say what the loader does
 * with a file it is handed; only `data/` says whether the files it
 * was written for are ones it still accepts, and nothing else in
 * this package holds them to a schema at all.
 *
 * One of them is held to something past its schema. Nesting is
 * capped at one level by a trigger on `categories`, and the worked
 * example stays clear of that cap by carrying roots and nothing else
 * — a property nothing between the file and the database asks of it,
 * and one asked here rather than met partway through an apply pass.
 *
 * Four refusals, in the order the loader reaches them: a key no
 * schema names, a value outside a closed set, and — once every file
 * has validated — a persona and a term each naming a row the bundle
 * does not carry.
 *
 * The first two are the schemas under `scripts/seed-schemas.ts`
 * being strict at every level, and that is a decision about silence
 * rather than about correctness. Zod's default is to drop a key it
 * does not recognize and report nothing, so a member spelled wrong
 * reaches the apply pass as a member that was never written — the
 * row lands, missing whatever the key was carrying, and the pass
 * reports it created. What the refusal in its place has to say is
 * which file and which member, because that is the whole of what a
 * reader needs to find it.
 *
 * The other two are the pass that holds the validated rows against
 * each other. A member standing in for a key the database issues has
 * nothing but the bundle to resolve against, so a slug or a key
 * naming no row in it is a reference that would still be naming
 * nothing at the insert.
 *
 * The block at the end is about what a refusal is worth. It drives
 * `runSeedCli`, where the loader running before anything is opened
 * is the difference between a seed nobody can apply and a seed half
 * applied. That order is a decision inside one function and shows
 * from neither side of it, so the run is driven against a double
 * standing in for the database, and what the case reads is what the
 * run asked of it.
 *
 * The fixture bundles below are written to disk rather than handed
 * to a schema directly. What `loadSeedBundle` has to get right is
 * the roster it opens, the stripping that runs before validation,
 * and which file a failure is attributed to — none of which a call
 * into one schema ever reaches. The fixtures are written through
 * `SEED_ROSTER` itself, so their files are the files the loader
 * opens rather than five names typed out twice.
 *
 * Every refusal here rests on the control in front of it. A loader
 * that refused whatever it was handed would satisfy every assertion
 * here, so the sound fixture is read first: what these cases
 * establish, they establish about a loader that returns rows when
 * the rows are sound. The block driving `runSeedCli` carries the
 * same control turned around, since a call log that stayed empty is
 * worth nothing until a sound bundle is shown to fill it.
 */
import type { SeedConnection, SeedFailure } from '../../scripts/seed.js';
import type { Db } from '../../src/db/index.js';

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  SEED_ROSTER,
  SeedValidationError,
  loadSeedBundle,
  runSeedCli,
  stripUnderscoreKeys,
} from '../../scripts/seed.js';
import { TERM_POLARITIES } from '../../src/db/schema/values.js';

// ---------------------------------------------------------------------------
// Fixture material
// ---------------------------------------------------------------------------

/** The one domain every other fixture row names. */
const FIXTURE_DOMAIN_SLUG = 'fixture-domain';

/** The one category the fixture's terms are declared under. */
const FIXTURE_CATEGORY_KEY = 'fixture-category';

/**
 * The topic row the planted key goes into, held apart from the rows
 * below so the sound bundle and the mutated one differ in that key
 * and in nothing else.
 */
const FIXTURE_TOPIC = {
  domainSlug: FIXTURE_DOMAIN_SLUG,
  name: 'Fixture topic',
  intervalSeconds: 86400,
  minIntervalSeconds: 21600,
  maxIntervalSeconds: 604800,
};

/**
 * The term row two of the mutated bundles below plant into, held
 * apart for the reason {@link FIXTURE_TOPIC} gives. Each of them
 * differs from this row in one member, so anything either one is
 * refused for has that member alone to be about.
 */
const FIXTURE_TERM = {
  categoryKey: FIXTURE_CATEGORY_KEY,
  pattern: 'alpha',
  weight: 1,
  polarity: 'positive',
  notes: null,
};

/**
 * The persona row the absent domain slug goes into, held apart for
 * the reason {@link FIXTURE_TOPIC} gives.
 */
const FIXTURE_PERSONA = {
  domainSlug: FIXTURE_DOMAIN_SLUG,
  role: 'researcher',
  systemText: 'Placeholder.',
};

/**
 * One list of rows per roster concern, as a fixture states them.
 *
 * Typed loosely on purpose: a fixture has to be able to state a row
 * the schemas refuse, which is what the unknown-key and the polarity
 * bundles below do.
 */
type FixtureRows = Record<keyof typeof SEED_ROSTER, readonly unknown[]>;

/**
 * A bundle nothing is wrong with: one domain, and one row per other
 * concern naming it, so every reference held across files resolves.
 *
 * Minimal rather than realistic. The files in `data/` are this
 * package's worked example, and a fixture that tried to be a second
 * one would make a failure harder to attribute — one row per file
 * leaves anything reported with a single row to be about.
 */
const FIXTURE_ROWS: FixtureRows = {
  domains: [
    { slug: FIXTURE_DOMAIN_SLUG, name: 'Fixture domain' },
  ],
  personas: [FIXTURE_PERSONA],
  categories: [
    {
      domainSlug: FIXTURE_DOMAIN_SLUG,
      key: FIXTURE_CATEGORY_KEY,
      name: 'Fixture category',
      parentKey: null,
    },
  ],
  terms: [FIXTURE_TERM],
  topics: [FIXTURE_TOPIC],
};

/**
 * The key planted in a topic row, and the whole of what is wrong
 * with the bundle below.
 *
 * `topics.json` carries no `enabled` because a runtime writer owns
 * that column — a seed naming it would switch back on a topic
 * somebody had switched off — so this is a key the schema was
 * written to refuse rather than one invented here.
 *
 * It is also nothing's misspelling, which is what makes it the key
 * worth planting. A mistyped required member is reported twice, once
 * as the key nothing names and once as the member now missing, so a
 * case built on one would pass whether or not the schemas were
 * strict. Nothing but their strictness reports this one.
 */
const UNKNOWN_KEY = 'enabled';

/** The fixture above, with that key in its first topic row. */
const FIXTURE_ROWS_WITH_UNKNOWN_KEY: FixtureRows = {
  ...FIXTURE_ROWS,
  topics: [{ ...FIXTURE_TOPIC, [UNKNOWN_KEY]: true }],
};

/** The file a failure over that key has to name. */
const UNKNOWN_KEY_FILE = SEED_ROSTER.topics.file;

/**
 * The member it has to name: the concern's own key, the index of
 * the row in it, and the key that was planted.
 *
 * The last of those three is the loader's work rather than Zod's,
 * which reports an unrecognized key against the path of the object
 * that held it and leaves the key itself in a list beside the issue.
 * A failure keyed on that path alone names the row and never the
 * typo, which is a reader sent to the right row to find nothing.
 */
const UNKNOWN_KEY_FIELD = `topics[0].${UNKNOWN_KEY}`;

/**
 * What the loader says about such a key, as much of it as this file
 * pins. The sentence is the loader's own rather than Zod's, and
 * holding the whole of it here would make a rewording a failure.
 */
const UNKNOWN_KEY_REASON = 'unrecognized key';

/**
 * The polarity planted in a term row, and the whole of what is wrong
 * with the bundle below.
 *
 * `terms.polarity` is held to `TERM_POLARITIES`, the tuple
 * `terms_polarity_check` is generated from, so a value outside it is
 * one the column would refuse as well. What the case below settles
 * is which of the two does the refusing: the file turned back with a
 * field to correct, rather than the column refusing it partway
 * through an apply pass whose transaction then rolls the rest back.
 */
const POLARITY_OUTSIDE_TUPLE = 'sideways';

/** The fixture above, with that polarity on its term row. */
const FIXTURE_ROWS_WITH_UNKNOWN_POLARITY: FixtureRows = {
  ...FIXTURE_ROWS,
  terms: [{ ...FIXTURE_TERM, polarity: POLARITY_OUTSIDE_TUPLE }],
};

/**
 * The domain slug planted in a persona row: one no row of the
 * bundle's `domains.json` declares.
 *
 * A slug rather than an id, because a slug is the only half of the
 * reference a seed can spell — `personas.domain_id` holds a key the
 * database issues, and nothing knows it before the domain row is
 * written. Something has to resolve the one to the other, and this
 * fixture and the next are about the pass that does.
 */
const ABSENT_DOMAIN_SLUG = 'absent-domain';

/** The fixture above, with its persona naming that slug. */
const FIXTURE_ROWS_WITH_ABSENT_DOMAIN_SLUG: FixtureRows = {
  ...FIXTURE_ROWS,
  personas: [{ ...FIXTURE_PERSONA, domainSlug: ABSENT_DOMAIN_SLUG }],
};

/**
 * The category key planted in a term row: one no row of the bundle's
 * `categories.json` declares.
 */
const ABSENT_CATEGORY_KEY = 'absent-category';

/** The fixture above, with its term naming that key. */
const FIXTURE_ROWS_WITH_ABSENT_CATEGORY_KEY: FixtureRows = {
  ...FIXTURE_ROWS,
  terms: [{ ...FIXTURE_TERM, categoryKey: ABSENT_CATEGORY_KEY }],
};

// ---------------------------------------------------------------------------
// Fixture directories
// ---------------------------------------------------------------------------

/** Fixture trees created below, removed once this file finishes. */
const FIXTURE_DIRS: string[] = [];

afterAll(() => {
  for (const fixtureDir of FIXTURE_DIRS) {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

/**
 * Every concern the roster names, which is every file a fixture has
 * to write. Read off the roster rather than listed here, so a
 * concern added to it is a file these fixtures carry rather than one
 * the loader reports as missing.
 */
const ROSTER_CONCERNS = Object.keys(SEED_ROSTER) as (keyof typeof SEED_ROSTER)[];

/**
 * A fresh directory holding one file per roster entry, written from
 * `rows` and registered for removal.
 *
 * The files are named through `SEED_ROSTER`, so a fixture cannot
 * write to a name the loader does not open: a directory of five
 * files it never reads would fail every case here as five files it
 * could not find, which is a long way from what went wrong.
 *
 * One directory per call rather than one shared between the cases,
 * so a case that leaves a file behind can never decide what the next
 * one reads.
 *
 * @param rows - One list of rows per concern.
 * @returns The directory they were written to.
 */
function writeFixture(rows: FixtureRows): string {
  const directory = mkdtempSync(join(tmpdir(), 'ar-seed-validation-'));

  FIXTURE_DIRS.push(directory);

  for (const concern of ROSTER_CONCERNS) {
    writeFileSync(
      join(directory, SEED_ROSTER[concern].file),
      `${JSON.stringify({ [concern]: rows[concern] }, null, 2)}\n`,
    );
  }

  return directory;
}

// ---------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------

/**
 * Stands in for the failures when the bundle loaded through.
 *
 * A sentinel rather than an empty list, so a case expecting a
 * refusal and handed a bundle says which happened in its own diff
 * instead of reporting that nothing was reported.
 */
const NOT_REFUSED: SeedFailure = {
  file: '(nothing refused)',
  field: null,
  message: 'the bundle loaded',
};

/**
 * Every failure `loadSeedBundle` reported for `directory`, or
 * {@link NOT_REFUSED} when it returned a bundle.
 *
 * Only a `SeedValidationError` counts as a refusal and anything else
 * is rethrown. An error out of the middle of the read is a different
 * event from the loader naming what it will not accept, and folding
 * the two together would let a loader that had stopped working pass
 * every case below.
 *
 * @param directory - Fixture directory to load.
 * @returns The failures it refused with, or the sentinel.
 */
function refusedFailures(directory: string): readonly SeedFailure[] {
  try {
    loadSeedBundle(directory);
  } catch (thrown) {
    if (thrown instanceof SeedValidationError) {
      return thrown.failures;
    }

    throw thrown;
  }

  return [NOT_REFUSED];
}

/**
 * The message `loadSeedBundle` refused `directory` with, or the
 * sentinel's.
 *
 * Asserted apart from the failures it is rendered from because it is
 * the operator's whole view of a refusal — the command prints this
 * and nothing else — and the two surfaces could stop agreeing
 * without either one going quiet.
 *
 * @param directory - Fixture directory to load.
 * @returns The message it refused with, or the sentinel's.
 */
function refusedMessage(directory: string): string {
  try {
    loadSeedBundle(directory);
  } catch (thrown) {
    if (thrown instanceof SeedValidationError) {
      return thrown.message;
    }

    throw thrown;
  }

  return NOT_REFUSED.message;
}

// ---------------------------------------------------------------------------
// The header a seed file opens with
// ---------------------------------------------------------------------------

/**
 * A seed file's shape carrying a `_readme` at every depth the walk
 * reaches: the outermost object, a row in the list under it, and the
 * payload inside that row.
 *
 * Depth is the whole of what this fixture is for. The files under
 * `data/` carry a header on the outermost object and nowhere else,
 * so a bundle exercises one depth, and a walk that never descended
 * would read as correct against it — while the convention the header
 * serves puts a note wherever a reader meets what it describes, a
 * row included. The rows sit in an array because that is where a
 * seed's rows are, and an array is the member the walk descends
 * through while dropping nothing of its own.
 *
 * `time_to_read` is the key whose underscore does not lead, and it
 * is one a domain could really write rather than an invented
 * near-miss: the keys of `settings.scoringWeights` are that domain's
 * own vocabulary and go unchecked, so nothing spells them for it.
 * What decides a key here is its first character, and a filter
 * matching an underscore anywhere in the name would take this one
 * with the headers.
 *
 * Handed to `stripUnderscoreKeys` directly rather than written to a
 * fixture directory. No schema sees it, so it states what the walk
 * has to reach and nothing else.
 */
const VALUE_WITH_HEADERS = {
  _readme: ['A header on the file.'],
  domains: [
    {
      _readme: ['A header on the row.'],
      slug: 'fixture-domain',
      settings: {
        _readme: ['A header on the payload inside the row.'],
        scoringWeights: { time_to_read: 2 },
      },
    },
  ],
};

/** The same value with every one of those headers gone. */
const VALUE_WITHOUT_HEADERS = {
  domains: [
    {
      slug: 'fixture-domain',
      settings: {
        scoringWeights: { time_to_read: 2 },
      },
    },
  ],
};

describe('stripUnderscoreKeys — a header at every depth', () => {
  // One equality over the whole value rather than a lookup per key.
  // The expected shape states the result at every depth, so a walk
  // that stopped at the outermost object, one that never descended
  // through the array, and one that dropped a key it was meant to
  // keep each fail at the member they differ at.
  //
  // Strict equality, because a key left in place holding `undefined`
  // is not a key removed, and the looser comparison reads those two
  // as one value.
  it('drops the header at every depth and keeps an inner underscore', () => {
    expect(stripUnderscoreKeys(VALUE_WITH_HEADERS))
      .toStrictEqual(VALUE_WITHOUT_HEADERS);
  });
});

// ---------------------------------------------------------------------------
// A bundle nothing is wrong with
// ---------------------------------------------------------------------------

describe('loadSeedBundle — a sound fixture bundle', () => {
  // The control the refusal below rests on, and the only case here
  // that tells a loader refusing an unrecognized key from one
  // refusing whatever it is handed.
  //
  // Asserted against the rows the fixture wrote rather than on the
  // absence of a throw. What the loader hands back is what an apply
  // pass writes, so a read that returned a bundle it had emptied
  // would satisfy a case that only checked it had not refused.
  it('returns the rows of every concern', () => {
    const directory = writeFixture(FIXTURE_ROWS);

    expect(loadSeedBundle(directory)).toEqual(FIXTURE_ROWS);
  });
});

// ---------------------------------------------------------------------------
// The seeds this package ships
// ---------------------------------------------------------------------------

describe('loadSeedBundle — the seed files this package ships', () => {
  // The fixtures either side of this case say what the loader does
  // with a file it is handed. Only `data/` says whether the files it
  // was written for are files it still accepts, and nothing else in
  // this package asks: a seed file is read by no linter, reaches no
  // type-checker, and is opened by the naming invariant for the
  // names in it rather than for its members. A schema tightened past
  // what the worked example states makes `bun run db:seed` a command
  // nobody can run, and every fixture here stays green.
  //
  // Read through `SEED_ROSTER` rather than against five file names
  // written out again, so a concern added to the roster is one this
  // case covers rather than one it never hears about. An entry the
  // loader does not read comes back with nothing under it and is
  // reported here as a file with no rows, which is what it is.
  //
  // Rows rather than the absence of a throw, for the reason the
  // sound fixture above gives: a bundle the loader had emptied
  // satisfies a case that only asked whether it had refused.
  //
  // The count in front of that list is the whole of what makes the
  // list mean anything — an emptied roster leaves nothing to filter,
  // and an empty list equals an empty list whatever `data/` holds.
  //
  // Called with no argument, which is how the command reaches it:
  // `runSeedCli` falls through to the same default, so what this
  // case reads is what `bun run db:seed` reads. A default resolving
  // nowhere is refused as five files that could not be read rather
  // than passing quietly.
  it('loads and validates every file the roster names', () => {
    const bundle = loadSeedBundle();
    const emptyFiles = ROSTER_CONCERNS
      .filter((concern) => (bundle[concern] ?? []).length === 0)
      .map((concern) => SEED_ROSTER[concern].file);

    expect(ROSTER_CONCERNS.length).toBeGreaterThan(0);
    expect(emptyFiles).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The taxonomy this package ships, and the cap it stays under
// ---------------------------------------------------------------------------

describe('data/categories.json — a taxonomy of roots', () => {
  // Nesting is capped at one level by a trigger on `categories`, and
  // nothing between this file and that trigger holds the taxonomy
  // this package ships to it. The row schema sees one row at a time,
  // and the pass that holds rows against each other resolves a
  // `categoryKey` and leaves `parentKey` alone.
  //
  // What does look is the apply pass, which orders roots before the
  // rows naming one and refuses a parent that is no root of the same
  // bundle. It is not the cap and does not stand in for it — a
  // parent that is a root of another domain resolves there and is
  // refused by the trigger — and either way the refusal lands inside
  // a transaction, with a connection open and the rest of the bundle
  // written and about to be rolled back. Asked here, the same
  // question is a red case over a file, with nothing opened.
  //
  // Roots and nothing else is stronger than the cap requires: one
  // level of nesting is legal, and both the seed and the apply pass
  // write it. It is what the worked example ships anyway, because a
  // taxonomy in which no row names a parent leaves neither guard of
  // that trigger anything to fire on, and stays clear of the cap
  // without anyone working out which side of it a row added later
  // falls on.
  //
  // Read through `loadSeedBundle` rather than by opening the file,
  // because what it hands back is what an apply pass writes: the
  // header stripped off the object above these rows, and every
  // member of each one held to the schema that names it.
  //
  // The count in front of the list is the whole of what makes the
  // list mean anything. No file schema carries a `.min(1)`, so a
  // `categories.json` emptied to `[]` loads clean, and every
  // category in an empty list is a root. The case above asks whether
  // each file came back with rows at all, which is a different
  // question in a different case: this one is only as sound as what
  // it asserts itself.
  it('carries no category naming a parent', () => {
    const { categories } = loadSeedBundle();
    const nested = categories
      .filter((category) => category.parentKey !== null)
      .map((category) => `${category.key} names ${category.parentKey}`);

    expect(categories.length).toBeGreaterThan(0);
    expect(nested).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A key no schema names
// ---------------------------------------------------------------------------

describe('loadSeedBundle — a key no schema names', () => {
  // Equality over the whole list rather than a search within it for
  // the one failure expected, which is what holds the refusal to
  // that key: this bundle differs from the sound one in nothing
  // else, so a second failure is a row refused for a reason the case
  // is not about, and an empty list is the key going through.
  it('reports the file and the field, and nothing else', () => {
    const directory = writeFixture(FIXTURE_ROWS_WITH_UNKNOWN_KEY);

    expect(refusedFailures(directory)).toEqual([
      {
        file: UNKNOWN_KEY_FILE,
        field: UNKNOWN_KEY_FIELD,
        message: expect.stringContaining(UNKNOWN_KEY_REASON),
      },
    ]);
  });

  // The two asserted together rather than one after the other: a
  // message naming the file on one line and the field on another
  // attributes neither, and a bundle broken in two places is exactly
  // where a reader needs them paired.
  it('names the file and the field together in its message', () => {
    const directory = writeFixture(FIXTURE_ROWS_WITH_UNKNOWN_KEY);

    expect(refusedMessage(directory)).toContain(
      `${UNKNOWN_KEY_FILE} (${UNKNOWN_KEY_FIELD})`,
    );
  });
});

// ---------------------------------------------------------------------------
// A value outside a closed set
// ---------------------------------------------------------------------------

describe('loadSeedBundle — a polarity outside the tuple', () => {
  // The guard that keeps the case below about a value the tuple does
  // not carry. A member added to `TERM_POLARITIES` later makes the
  // fixture sound, which reddens that case with a diff about a list
  // of failures rather than about the fixture that stopped being
  // one. This case says which happened.
  it('plants a value the polarity tuple does not carry', () => {
    expect(TERM_POLARITIES).not.toContain(POLARITY_OUTSIDE_TUPLE);
  });

  // Equality over the whole list for the reason the unknown-key case
  // gives. Zod 4 words an enum refusal around the ALLOWED set rather
  // than the received value, so the message is pinned at the full
  // option tuple: that wording is what tells this refusal from one
  // over the same member for another reason — a polarity that is not
  // a string is refused by a type message naming no options at all.
  it('reports the file and the field, and nothing else', () => {
    const directory = writeFixture(FIXTURE_ROWS_WITH_UNKNOWN_POLARITY);

    expect(refusedFailures(directory)).toEqual([
      {
        file: SEED_ROSTER.terms.file,
        field: 'terms[0].polarity',
        message: expect.stringContaining('"positive"|"negative"|"ignore"'),
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// A reference resolving to nothing
// ---------------------------------------------------------------------------

describe('loadSeedBundle — a persona naming an absent domain', () => {
  // The rows are held against each other only once every file has
  // validated, so this bundle is sound file by file and disagrees
  // only across them. That ordering is why the case rests on the
  // ones above as much as on the sound fixture: a bundle any schema
  // refused never reaches the pass under test.
  //
  // Equality over the whole list carries a second load here. A
  // category row and a topic row name a domain slug too and both
  // still resolve, so a pass resolving against the wrong set of
  // slugs reports three failures where this one reports one.
  //
  // Two files are in play and the failure carries both. It is
  // reported against `personas.json`, which holds the row to
  // correct, while the message names `domains.json`, where the slug
  // would have to be declared for it to resolve — so the tail of the
  // message is pinned rather than the value alone. The sentence in
  // front of that tail is the loader's to word and is not held here.
  it('reports the file and the field, and nothing else', () => {
    const directory = writeFixture(FIXTURE_ROWS_WITH_ABSENT_DOMAIN_SLUG);

    expect(refusedFailures(directory)).toEqual([
      {
        file: SEED_ROSTER.personas.file,
        field: 'personas[0].domainSlug',
        message: expect.stringContaining(
          `${SEED_ROSTER.domains.file} declares: '${ABSENT_DOMAIN_SLUG}'`,
        ),
      },
    ]);
  });
});

describe('loadSeedBundle — a term naming an absent category', () => {
  // The half of that pass keyed on something other than a domain
  // slug: a term names a category by the `key` half of that table's
  // (domain, key) natural key, and the two files it puts in play are
  // `terms.json` and `categories.json`.
  //
  // Equality over the whole list, and a message pinned at its tail,
  // for the reasons the persona case gives.
  it('reports the file and the field, and nothing else', () => {
    const directory = writeFixture(FIXTURE_ROWS_WITH_ABSENT_CATEGORY_KEY);

    expect(refusedFailures(directory)).toEqual([
      {
        file: SEED_ROSTER.terms.file,
        field: 'terms[0].categoryKey',
        message: expect.stringContaining(
          `${SEED_ROSTER.categories.file} declares: '${ABSENT_CATEGORY_KEY}'`,
        ),
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// The connection a refused bundle never opens
// ---------------------------------------------------------------------------

/**
 * What the double throws when a run reaches it.
 *
 * A sentence of its own rather than a bare `Error`, so a case that
 * expected the loader's refusal and met this one instead says which
 * of the two happened rather than that something threw.
 */
const DOUBLE_REACHED = 'the seed pass reached the database double';

/** What a run asked of the double, and the opener to hand it. */
interface DatabaseDouble {
  /** Every request the run made, in the order it made them. */
  readonly calls: readonly string[];

  /** What `runSeedCli` takes in place of a pool. */
  readonly connect: () => SeedConnection;
}

/**
 * A database that refuses everything, and the log of what was asked
 * of it.
 *
 * The `db` throws on any property whatever rather than on
 * `transaction` alone. What the apply pass reaches for first is that
 * pass's business, and a double that had to know would go quiet the
 * day it changed: a method it had not thought of reads as
 * `undefined` and fails somewhere else, or nowhere.
 *
 * The log is what the cases below are about. A run that refused
 * before opening anything and a run that opened a connection and
 * died on its first write both come back as one rejected promise,
 * and nothing but the calls tells them apart.
 *
 * @returns The log and the opener, sharing one closure.
 */
function databaseDouble(): DatabaseDouble {
  const calls: string[] = [];
  const db = new Proxy(
    {},
    {
      get: (_target, property) => {
        const call = `db.${String(property)}`;

        calls.push(call);

        throw new Error(`${DOUBLE_REACHED}: ${call}`);
      },
    },
  ) as unknown as Db;

  return {
    calls,
    connect: () => {
      calls.push('connect');

      return {
        db,
        close: async () => {
          calls.push('close');
        },
      };
    },
  };
}

describe('runSeedCli — what a refusal costs the apply pass', () => {
  // The control the case below rests on, and the whole of what makes
  // an empty log mean anything. Handed a bundle nothing is wrong
  // with, the run reaches the double, and reaches it at
  // `transaction` — which is `applySeedBundle`'s first act, so what
  // the log records is the apply pass beginning rather than a
  // connection merely being opened.
  //
  // It closes on the way out too, which is the `finally` rather than
  // the happy path: a pool nobody ended keeps the process alive, and
  // a command that printed its error and then hung reads as the
  // worse failure of the two.
  it('reaches the apply pass when the bundle is sound', async () => {
    const directory = writeFixture(FIXTURE_ROWS);
    const double = databaseDouble();

    await expect(runSeedCli(double.connect, directory))
      .rejects.toThrow(DOUBLE_REACHED);
    expect(double.calls).toEqual(['connect', 'db.transaction', 'close']);
  });

  // Two assertions, because the order can break in two directions
  // and either one alone is satisfied by the other's failure. A run
  // that opened its connection first still refuses the bundle, so
  // the error on its own is met by the very order this case exists
  // to rule out; a run that skipped the loader reaches the double,
  // so the log on its own is met by an error nobody asked for.
  //
  // The bundle is the unknown-key one, so what the ordering is worth
  // here is concrete: the pass it stops is the one that would have
  // written that topic row with a member silently missing and
  // reported it created.
  it('opens nothing when the bundle is refused', async () => {
    const directory = writeFixture(FIXTURE_ROWS_WITH_UNKNOWN_KEY);
    const double = databaseDouble();

    await expect(runSeedCli(double.connect, directory))
      .rejects.toThrow(SeedValidationError);
    expect(double.calls).toEqual([]);
  });
});
