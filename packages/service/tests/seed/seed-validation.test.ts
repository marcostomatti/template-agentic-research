/**
 * What `loadSeedBundle` does with a seed file carrying a key no
 * schema names.
 *
 * The schemas under `scripts/seed-schemas.ts` are strict at every
 * level, and that is a decision about silence rather than about
 * correctness. Zod's default is to drop a key it does not recognize
 * and report nothing, so a member spelled wrong reaches the apply
 * pass as a member that was never written — the row lands, missing
 * whatever the key was carrying, and the pass reports it created.
 * What the refusal in its place has to say is which file and which
 * member, because that is the whole of what a reader needs to find
 * it.
 *
 * The bundles below are written to disk rather than handed to a
 * schema directly. What `loadSeedBundle` has to get right is the
 * roster it opens, the stripping that runs before validation, and
 * which file a failure is attributed to — none of which a call into
 * one schema ever reaches. The fixtures are written through
 * `SEED_ROSTER` itself, so their files are the files the loader
 * opens rather than five names typed out twice.
 *
 * The refusal rests on the control in front of it. A loader that
 * refused whatever it was handed would satisfy every assertion here,
 * so the sound fixture is read first: what these cases establish,
 * they establish about a loader that returns rows when the rows are
 * sound.
 */
import type { SeedFailure } from '../../scripts/seed.js';

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  SEED_ROSTER,
  SeedValidationError,
  loadSeedBundle,
} from '../../scripts/seed.js';

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
 * One list of rows per roster concern, as a fixture states them.
 *
 * Typed loosely on purpose: a fixture has to be able to state a row
 * the schemas refuse, which is what the mutated bundle below does.
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
  personas: [
    {
      domainSlug: FIXTURE_DOMAIN_SLUG,
      role: 'researcher',
      systemText: 'Placeholder.',
    },
  ],
  categories: [
    {
      domainSlug: FIXTURE_DOMAIN_SLUG,
      key: FIXTURE_CATEGORY_KEY,
      name: 'Fixture category',
      parentKey: null,
    },
  ],
  terms: [
    {
      categoryKey: FIXTURE_CATEGORY_KEY,
      pattern: 'alpha',
      weight: 1,
      polarity: 'positive',
      notes: null,
    },
  ],
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
