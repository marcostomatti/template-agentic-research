/**
 * `SECRET_CONFIG_KEYS`, `MASKED_SECRET` and the two walks over them
 * — what a connector's config answers with and what it refuses to
 * be handed back.
 *
 * Five claims. That a value under a rostered key is replaced
 * wherever it sits and whatever its type. That the match reads a
 * key's NAME rather than its exact spelling, so a case variant is
 * covered and a name nobody rostered is not. That a config carrying
 * nothing rostered comes back the same by value. That the answer is
 * a new structure either way, so the row the caller was holding is
 * untouched. And that the mask literal submitted back is reported
 * by the path it sat at, and only where it actually sits.
 *
 * THREE OF THOSE ARE SATISFIED BY A MODULE THAT DOES NOTHING, so
 * each carries its control in the same case. The unchanged-config
 * case masks a second config that DOES carry a secret and requires
 * that one to differ. The per-roster-key loop is paired with a key
 * the roster does not name, which must survive. And the empty
 * path list is paired with a config the walk has to find something
 * in.
 *
 * The case leg's control is the other direction: the cased spelling
 * it sends is asserted ABSENT from the roster, so what masked it was
 * the match and not a second row somebody added.
 *
 * TWO READERS HERE ARE WRITTEN INDEPENDENTLY OF THE MODULE rather
 * than imported from it, because a reader sharing the module's walk
 * could only ever agree with it. {@link valuesAtSecretKeys} is a
 * recursive collector that re-derives the case-insensitive match
 * from the exported roster, and it is what checks the expected
 * column of the table below rather than the module's answer.
 * {@link resolvePath} walks a dotted path by hand, which is what
 * pins the SPELLING of a reported path instead of agreeing with
 * whatever the module spelt.
 *
 * The expected values are written out rather than derived, and one
 * case writes out the mask literal itself. That case is not
 * decoration: every other expectation here reads the export, so a
 * re-spelt sentinel agrees with itself everywhere and reddens
 * nothing at all, which was measured before it was written. The text
 * is what a stored client reads back, so changing it is a change to
 * the wire rather than to a constant.
 *
 * Mutation grid, measured over the 59 cases here, each leg named by
 * the edit it makes. Matching a key exactly rather than
 * case-insensitively reddens 2 — the case row and the case case,
 * which is the whole of what the roster's own spellings leave to the
 * match. Masking no key at all reddens 32 and is the fixture
 * reporting rather than coverage. Dropping the fail-closed prefill
 * reddens exactly the key-order case; assigning instead of defining
 * exactly the one carrying a `__proto__` member. Rebuilding onto the
 * stored record reddens 4, three of them the new-object claims and
 * the fourth the round trip. Emptying every array reddens 2 and
 * re-spelling the literal reddens 1.
 *
 * The four path-walk legs land where their names say. Reporting
 * every string reddens 10 and is blunt. Matching the literal as a
 * substring reddens exactly the row whose value only contains it,
 * which is the one case that can tell those two rules apart. Joining
 * paths with a slash reddens 6, and pushing members in submitted
 * order reddens 2 — the ordering case and the two-at-once row, no
 * other row carrying two paths to put in an order.
 *
 * None of the eleven moves any of the five table guards — the two
 * shape rosters, the changed-against-unchanged splits, the expected
 * column read for a leaking secret, and the one read for a
 * resolvable path. That is what says those guards read the TABLE
 * rather than the rule, and would report a case list that had
 * quietly gone empty.
 */
import { describe, expect, it } from 'vitest';

import {
  MASKED_SECRET,
  SECRET_CONFIG_KEYS,
  findMaskedSecretPaths,
  maskConnectorConfig,
} from './secrets.js';

/**
 * The roster widened to strings.
 *
 * Every guard below asks whether some spelling is a member, and the
 * exported tuple's own type answers that at COMPILE time by
 * refusing the question — `toContain` over the literal union will
 * not take a string outside it, which is exactly the string a
 * control needs to send.
 */
const ROSTER: readonly string[] = SECRET_CONFIG_KEYS;

/** A stand-in for a stored credential, wherever one is staged. */
const STORED_SECRET = 'a-stored-credential';

/** A member name the roster does not name, and must not mask. */
const PLAIN_KEY = 'model';

/** What that member holds, in every fixture that carries it. */
const PLAIN_VALUE = 'a-model-name';

/** Whether `key` is a roster member, read case-insensitively. */
function isRostered(key: string): boolean {
  const lowered = key.toLowerCase();

  return ROSTER.some((member) => member.toLowerCase() === lowered);
}

/**
 * Every value sitting under a rostered key in `value`, at any depth.
 *
 * The table's own reader: it says what a row's expected column
 * still carries, which is a question about the FIXTURE and not
 * about the module. Recursive because a fixture's depth is a
 * handful of levels; the module itself is not, for reasons its
 * header records.
 */
function valuesAtSecretKeys(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((member: unknown) => valuesAtSecretKeys(member));
  }

  if (typeof value !== 'object' || value === null) {
    return [];
  }

  const found: unknown[] = [];

  for (const [key, member] of Object.entries(value)) {
    if (isRostered(key)) {
      found.push(member);
    } else {
      found.push(...valuesAtSecretKeys(member));
    }
  }

  return found;
}

/** What sits at `path` in `config`, or `undefined` if nothing. */
function resolvePath(config: unknown, path: string): unknown {
  let at: unknown = config;

  for (const segment of path.split('.')) {
    if (typeof at !== 'object' || at === null) {
      return undefined;
    }

    at = (at as Record<string, unknown>)[segment];
  }

  return at;
}

// ---------------------------------------------------------------------------
// The roster itself
// ---------------------------------------------------------------------------

describe('SECRET_CONFIG_KEYS', () => {
  it('names at least one key and no two that match', () => {
    const lowered = ROSTER.map((key) => key.toLowerCase());

    expect(ROSTER.length).toBeGreaterThan(0);

    // A duplicate under the match makes the roster read longer than
    // the set of keys it actually denotes.
    expect(new Set(lowered).size).toBe(ROSTER.length);
  });

  for (const key of SECRET_CONFIG_KEYS) {
    it(`masks the value under ${key}`, () => {
      expect(maskConnectorConfig({ [key]: STORED_SECRET }))
        .toStrictEqual({ [key]: MASKED_SECRET });
    });
  }

  it('leaves a member the roster does not name', () => {
    // The control for the loop above: a module masking every key
    // whatever it is called passes every one of those cases.
    expect(ROSTER).not.toContain(PLAIN_KEY);
    expect(maskConnectorConfig({ [PLAIN_KEY]: PLAIN_VALUE }))
      .toStrictEqual({ [PLAIN_KEY]: PLAIN_VALUE });
  });
});

describe('MASKED_SECRET', () => {
  it('spells the literal the way every client will read it', () => {
    // Written out because every other expectation in this file reads
    // the export and would therefore agree with any spelling. The
    // text is what a stored client sees, so changing it is a change
    // to the wire and not to a constant's name.
    expect(MASKED_SECRET).toBe('__masked_secret__');
  });
});

// ---------------------------------------------------------------------------
// maskConnectorConfig
// ---------------------------------------------------------------------------

/** The shapes the masking table has to cover. */
const MASK_SHAPES = [
  'empty-config',
  'secret-at-the-top',
  'secret-under-a-member',
  'secret-two-levels-down',
  'secret-inside-an-array',
  'secret-holding-an-object',
  'secret-holding-a-list',
  'secret-holding-a-number',
  'secret-holding-null',
  'secret-holding-a-boolean',
  'key-differing-only-in-case',
  'several-secrets-at-once',
  'nothing-rostered',
  'the-key-name-as-a-value',
];

/** The shapes the module must answer with the same value. */
const UNCHANGED_SHAPES = [
  'empty-config',
  'nothing-rostered',
  'the-key-name-as-a-value',
];

/** One config per shape with the answer written out beside it. */
const MASK_CASES = [
  { config: {}, expected: {}, shape: 'empty-config' },
  {
    config: { apiKey: STORED_SECRET, endpoint: 'https://example.test' },
    expected: { apiKey: MASKED_SECRET, endpoint: 'https://example.test' },
    shape: 'secret-at-the-top',
  },
  {
    config: { auth: { token: STORED_SECRET }, [PLAIN_KEY]: PLAIN_VALUE },
    expected: { auth: { token: MASKED_SECRET }, [PLAIN_KEY]: PLAIN_VALUE },
    shape: 'secret-under-a-member',
  },
  {
    config: {
      outer: { inner: { password: STORED_SECRET, user: 'an-account' } },
    },
    expected: {
      outer: { inner: { password: MASKED_SECRET, user: 'an-account' } },
    },
    shape: 'secret-two-levels-down',
  },
  {
    config: {
      endpoints: [{ secret: STORED_SECRET }, { [PLAIN_KEY]: PLAIN_VALUE }],
    },
    expected: {
      endpoints: [{ secret: MASKED_SECRET }, { [PLAIN_KEY]: PLAIN_VALUE }],
    },
    shape: 'secret-inside-an-array',
  },
  {
    config: { credentials: { password: 'p', user: 'u' } },
    expected: { credentials: MASKED_SECRET },
    shape: 'secret-holding-an-object',
  },
  {
    config: { token: ['first', 'second'] },
    expected: { token: MASKED_SECRET },
    shape: 'secret-holding-a-list',
  },
  {
    config: { api_key: 4172 },
    expected: { api_key: MASKED_SECRET },
    shape: 'secret-holding-a-number',
  },
  {
    config: { authorization: null },
    expected: { authorization: MASKED_SECRET },
    shape: 'secret-holding-null',
  },
  {
    config: { privateKey: false },
    expected: { privateKey: MASKED_SECRET },
    shape: 'secret-holding-a-boolean',
  },
  {
    config: { API_KEY: STORED_SECRET },
    expected: { API_KEY: MASKED_SECRET },
    shape: 'key-differing-only-in-case',
  },
  {
    config: {
      apiKey: STORED_SECRET,
      nested: { refresh_token: STORED_SECRET, region: 'a-region' },
    },
    expected: {
      apiKey: MASKED_SECRET,
      nested: { refresh_token: MASKED_SECRET, region: 'a-region' },
    },
    shape: 'several-secrets-at-once',
  },
  {
    config: { endpoint: 'https://example.test', retries: 3 },
    expected: { endpoint: 'https://example.test', retries: 3 },
    shape: 'nothing-rostered',
  },
  {
    config: { [PLAIN_KEY]: 'apiKey' },
    expected: { [PLAIN_KEY]: 'apiKey' },
    shape: 'the-key-name-as-a-value',
  },
];

describe('maskConnectorConfig', () => {
  it('carries one row per declared shape', () => {
    const shapes = MASK_CASES.map((row) => row.shape);

    expect(shapes.sort()).toEqual([...MASK_SHAPES].sort());
  });

  it('splits the table into rows that change and rows that do not', () => {
    const unchanged = MASK_CASES.filter(
      (row) => JSON.stringify(row.config) === JSON.stringify(row.expected),
    );

    expect(unchanged.map((row) => row.shape).sort())
      .toEqual([...UNCHANGED_SHAPES].sort());
  });

  it('expects no rostered key still holding its own value', () => {
    const leaking = MASK_CASES.filter(
      (row) => valuesAtSecretKeys(row.expected)
        .some((value) => value !== MASKED_SECRET),
    );

    expect(leaking.map((row) => row.shape)).toEqual([]);
  });

  it('stages a real value under a rostered key in every changed row', () => {
    // The control for the reader above: a table whose rows carried
    // nothing rostered would satisfy it without staging anything.
    const changed = MASK_CASES.filter(
      (row) => !UNCHANGED_SHAPES.includes(row.shape),
    );

    const staged = changed.filter(
      (row) => valuesAtSecretKeys(row.config).length > 0,
    );

    expect(staged).toHaveLength(changed.length);
    expect(changed.length).toBeGreaterThan(0);
  });

  for (const { config, expected, shape } of MASK_CASES) {
    it(`answers the masked form of a ${shape}`, () => {
      expect(maskConnectorConfig(config)).toStrictEqual(expected);
    });
  }
});

// ---------------------------------------------------------------------------
// The claims the table cannot make on its own
// ---------------------------------------------------------------------------

describe('maskConnectorConfig, one claim at a time', () => {
  it('masks a key differing from the roster only in case', () => {
    const config = { API_KEY: STORED_SECRET };

    expect(maskConnectorConfig(config))
      .toStrictEqual({ API_KEY: MASKED_SECRET });

    // The control: that spelling is not itself a member, so what
    // masked it was the match rather than a second row.
    expect(ROSTER).not.toContain('API_KEY');
    expect(ROSTER).toContain('api_key');
  });

  it('answers a config carrying no secret unchanged', () => {
    const config = {
      endpoint: 'https://example.test',
      headers: { accept: 'application/json' },
      retries: 3,
    };

    expect(maskConnectorConfig(config)).toStrictEqual(config);

    // The control: a module masking nothing at all answers the line
    // above correctly, so a config that DOES carry one has to move.
    const carrying = { ...config, apiKey: STORED_SECRET };

    expect(maskConnectorConfig(carrying)).not.toStrictEqual(carrying);
  });

  it('answers a new object and leaves the stored one alone', () => {
    const stored = {
      auth: { apiKey: STORED_SECRET },
      [PLAIN_KEY]: PLAIN_VALUE,
    };
    const before = JSON.stringify(stored);

    const masked = maskConnectorConfig(stored) as Record<string, unknown>;

    expect(masked).not.toBe(stored);
    expect(masked.auth).not.toBe(stored.auth);
    expect(stored.auth.apiKey).toBe(STORED_SECRET);
    expect(JSON.stringify(stored)).toBe(before);

    // The control: an answer that WAS the stored object satisfies
    // the reads above until the value is asked to have moved.
    expect(masked).not.toStrictEqual(stored);
  });

  it('answers a new object even when nothing matched', () => {
    const stored = { nested: { [PLAIN_KEY]: PLAIN_VALUE } };

    const masked = maskConnectorConfig(stored) as Record<string, unknown>;

    expect(masked).toStrictEqual(stored);
    expect(masked).not.toBe(stored);
    expect(masked.nested).not.toBe(stored.nested);
  });

  it('keeps a member the copy could have set a prototype with', () => {
    // `JSON.parse` gives `__proto__` as an own property where an
    // object literal cannot, so this is a shape a stored config can
    // genuinely be in and a plain assignment would silently drop.
    const stored: unknown = JSON.parse(
      '{"__proto__": {"apiKey": "x"}, "token": "y"}',
    );

    const masked = maskConnectorConfig(stored) as Record<string, unknown>;

    expect(Object.prototype.hasOwnProperty.call(masked, '__proto__'))
      .toBe(true);
    expect(Object.getPrototypeOf(masked)).toBe(Object.prototype);
    expect(masked.token).toBe(MASKED_SECRET);
  });

  it('answers the members in the order they were stored', () => {
    const stored = { zzz: 1, token: STORED_SECRET, [PLAIN_KEY]: PLAIN_VALUE };

    const masked = maskConnectorConfig(stored) as Record<string, unknown>;

    // Written out rather than compared against the argument's own
    // keys: an order that is neither sorted nor reversed is one only
    // a copy that kept it can answer.
    expect(Object.keys(masked)).toEqual(['zzz', 'token', PLAIN_KEY]);
  });

  it('has nothing left to do on its own answer', () => {
    const stored = { auth: { token: STORED_SECRET }, list: [{ secret: 1 }] };
    const once = maskConnectorConfig(stored);

    expect(maskConnectorConfig(once)).toStrictEqual(once);
  });

  it('answers a stored value that is not a record as itself', () => {
    // The column carries whatever jsonb holds, and nothing on it
    // constrains that to an object.
    expect(maskConnectorConfig(null)).toBeNull();
    expect(maskConnectorConfig('a-string')).toBe('a-string');
    expect(maskConnectorConfig([{ token: STORED_SECRET }]))
      .toStrictEqual([{ token: MASKED_SECRET }]);
  });
});

// ---------------------------------------------------------------------------
// findMaskedSecretPaths
// ---------------------------------------------------------------------------

/** The shapes the path table has to cover. */
const FIND_SHAPES = [
  'empty-config',
  'nothing-submitted-back',
  'at-the-top',
  'under-a-member',
  'inside-an-array',
  'under-a-key-nobody-rostered',
  'two-at-once',
  'the-literal-as-a-key',
  'a-value-that-only-contains-it',
];

/** The shapes that must answer no path at all. */
const NOTHING_FOUND_SHAPES = [
  'empty-config',
  'nothing-submitted-back',
  'the-literal-as-a-key',
  'a-value-that-only-contains-it',
];

/** One submitted config per shape, with the paths written out. */
const FIND_CASES = [
  { config: {}, expected: [], shape: 'empty-config' },
  {
    config: { apiKey: STORED_SECRET, [PLAIN_KEY]: PLAIN_VALUE },
    expected: [],
    shape: 'nothing-submitted-back',
  },
  {
    config: { apiKey: MASKED_SECRET, endpoint: 'https://example.test' },
    expected: ['apiKey'],
    shape: 'at-the-top',
  },
  {
    config: { auth: { region: 'a-region', token: MASKED_SECRET } },
    expected: ['auth.token'],
    shape: 'under-a-member',
  },
  {
    config: { tokens: ['a-first-token', MASKED_SECRET] },
    expected: ['tokens.1'],
    shape: 'inside-an-array',
  },
  {
    config: { note: MASKED_SECRET },
    expected: ['note'],
    shape: 'under-a-key-nobody-rostered',
  },
  {
    config: {
      apiKey: MASKED_SECRET,
      nested: { [PLAIN_KEY]: PLAIN_VALUE, secret: MASKED_SECRET },
    },
    expected: ['apiKey', 'nested.secret'],
    shape: 'two-at-once',
  },
  {
    config: { [MASKED_SECRET]: STORED_SECRET },
    expected: [],
    shape: 'the-literal-as-a-key',
  },
  {
    config: { apiKey: `a-prefix-${MASKED_SECRET}` },
    expected: [],
    shape: 'a-value-that-only-contains-it',
  },
];

describe('findMaskedSecretPaths', () => {
  it('carries one row per declared shape', () => {
    const shapes = FIND_CASES.map((row) => row.shape);

    expect(shapes.sort()).toEqual([...FIND_SHAPES].sort());
  });

  it('splits the table into rows that find and rows that do not', () => {
    const empty = FIND_CASES.filter((row) => row.expected.length === 0);

    expect(empty.map((row) => row.shape).sort())
      .toEqual([...NOTHING_FOUND_SHAPES].sort());
  });

  it('expects a path the literal is actually reachable at', () => {
    // Walked by hand rather than by the module, so this pins the
    // SPELLING of every expected path instead of agreeing with it.
    const wrong = FIND_CASES.flatMap(
      (row) => row.expected
        .filter((path) => resolvePath(row.config, path) !== MASKED_SECRET)
        .map((path) => `${row.shape}:${path}`),
    );

    expect(wrong).toEqual([]);
  });

  for (const { config, expected, shape } of FIND_CASES) {
    it(`names what a ${shape} submitted`, () => {
      expect(findMaskedSecretPaths(config)).toEqual(expected);
    });
  }

  it('names the paths in the order they were submitted', () => {
    const config = {
      first: MASKED_SECRET,
      middle: { deeper: [PLAIN_VALUE, MASKED_SECRET] },
      zzz: MASKED_SECRET,
    };

    expect(findMaskedSecretPaths(config))
      .toEqual(['first', 'middle.deeper.1', 'zzz']);
  });

  it('answers nothing for a config that submitted no mask', () => {
    const clean = {
      auth: { token: STORED_SECRET },
      [PLAIN_KEY]: PLAIN_VALUE,
    };

    expect(findMaskedSecretPaths(clean)).toEqual([]);

    // The control: a walk that never descends answers the line above
    // correctly, so the same shape carrying the literal has to be
    // found at the same depth.
    const submitted = { auth: { token: MASKED_SECRET } };

    expect(findMaskedSecretPaths(submitted)).toEqual(['auth.token']);
  });

  it('reads the masked config a caller would send straight back', () => {
    // The round trip the refusal exists for, end to end: what the
    // list answered is what the caller edits and returns.
    const stored = {
      auth: { apiKey: STORED_SECRET },
      [PLAIN_KEY]: PLAIN_VALUE,
    };
    const answered = maskConnectorConfig(stored) as Record<string, unknown>;

    expect(findMaskedSecretPaths(answered)).toEqual(['auth.apiKey']);
    expect(findMaskedSecretPaths(stored)).toEqual([]);
  });
});
