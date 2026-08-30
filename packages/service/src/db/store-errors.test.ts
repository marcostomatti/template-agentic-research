/**
 * `StoreRefusal` and `classifyPgError` — the one refusal every wave-1
 * store raises, and the reading of a driver error that produces it.
 *
 * Six claims, and every one of them is load-bearing for a route that
 * never sees a database.
 *
 * That the classifier WALKS `cause`. Drizzle does not rethrow the pg
 * error: it throws a wrapper whose own `code` and `constraint` are
 * `undefined`, with the `DatabaseError` carrying the SQLSTATE one
 * link below. A classifier reading only the value it was handed
 * answers `null` for every refusal a deployment can actually produce,
 * and each duplicate slug becomes a 500. Half this table is
 * wrapped and half is bare for that reason, and neither half is the
 * one true shape — a raw `pg` client hands the `DatabaseError` back
 * at depth 0.
 *
 * That it classifies exactly three SQLSTATEs and reads them off an
 * UNKNOWN value. The refused rows carry the three; the unclassified
 * rows carry the near neighbours that must not be mistaken for them —
 * a not-null violation, the integrity-constraint CLASS code the three
 * all belong to, a `code` that is a number rather than a string, a
 * plain `Error`, a `null`, an `undefined`, a string and a number.
 * Every one of those reaches a store's `catch` in some deployment,
 * and each must come back as `null` so the caller rethrows what it
 * caught rather than answering a 409 about nothing.
 *
 * That the walk TERMINATES. A `cause` chain may be cyclic — nothing
 * in the language forbids `err.cause === err` — and the cap is
 * bracketed with a row on each side, since a bound is pinned only by
 * a pair.
 *
 * That a mechanism naming no constraint still classifies. The
 * taxonomy depth guard is a trigger doing `RAISE ... USING ERRCODE =
 * 'check_violation'`, and a `RAISE` leaves `constraint` undefined —
 * so a refusal whose `constraint` is absent is the normal shape for
 * the rule this whole surface most needs to report, not a degenerate
 * one.
 *
 * That a `StoreRefusal` is NOT an `AppError`. A store states what was
 * refused and the rules layer decides the status; an `AppError`
 * escaping a service would answer a plausible status no rule ever
 * authorised, so the negative `instanceof` is asserted directly.
 *
 * And that NOTHING A CALLER SUBMITTED reaches a refusal. One sentinel
 * string is planted in every place the driver puts request content —
 * the `DatabaseError.detail`, its `message`, and the wrapper's
 * `Failed query: ... params:` line — and occurs zero times in
 * everything of the refusal a logger or a response could reach
 * without deliberately walking `cause`. Counted rather than searched
 * for, so a row cannot pass on a reading that found nothing because
 * it was looking at the wrong object; and each row asserts the
 * sentinel is present in its OWN fixture first, so a row whose
 * planting quietly stopped working reports that instead of a
 * containment it never tested.
 *
 * Expected values are written down rather than imported. The three
 * SQLSTATEs, the depth cap and the message wording appear here as
 * literals, so this file pins them; importing them would only assert
 * that the module agrees with itself. The one thing taken from the
 * module is the `StoreRefusalReason` TYPE, and that is what makes
 * `SQLSTATE_BY_REASON` an exhaustiveness guard: a fourth reason added
 * to the union is a red `check-types` here rather than an untested
 * member.
 *
 * Mutation grid, measured over the 45 cases in this file with
 * `--reporter=json` and a `diff` against a copy of the module as the
 * revert check. Fourteen legs, each isolating one claim.
 *
 * The walk. Replacing `link = fields.cause` with `undefined` reddens
 * 9 — every wrapped row, the cause-reachability case and both
 * containment cases of the wrapper-planted fixture — while every
 * bare-driver row stays green, which is exactly the shape that says
 * the walk is the claim rather than the classification. Dropping
 * `link === null` from the object guard reddens the null row alone,
 * where reading `.code` off `null` throws. Lowering the cap to 7 and
 * raising it to 9 redden one row each: the same bound, seen from
 * either side, and neither row alone would pin it.
 *
 * The table. Adding `23502` reddens the not-null row; deleting
 * `23505` reddens 12; matching any code in class `23` reddens 11,
 * among them both near misses the table carries for that widening —
 * the class code `23000` and the numeric `23505`. Letting `code` be
 * a non-string reddens the numeric row alone, because an index
 * lookup stringifies the key back into a match. Reading the THROWN
 * value as a code reddens the thrown string and the thrown number,
 * which is why those two rows carry `23505` rather than arbitrary
 * values.
 *
 * The refusal. Removing the `name` assignment reddens 3, dropping
 * the constraint from the message reddens 1, and letting a
 * non-string `constraint` through reddens 1.
 *
 * Containment takes TWO legs and neither reaches all three rows,
 * because each fixture plants its sentinel in a different member of
 * a different link. Copying the driver `detail` into `constraint`
 * reddens 11, two of them containment rows; appending the driver
 * message to the refusal message reddens 4, the third among them. A
 * report claiming one leg proved containment would be naming the
 * wrong row.
 *
 * Sixteen cases no leg reaches, and they divide three ways. Nine are
 * invisible by construction: six table guards that read only the
 * tables beside them, and three planted controls that drive
 * `loggableTextOf` over structural objects rather than over the
 * class, which no real refusal can be made to leak. Six more would
 * each take a leg this grid did not run — three further widenings of
 * the classifier that the plain `Error`, `undefined` and no-cause
 * rows fence, a message built without its reason, a `StoreRefusal`
 * given an `AppError` ancestor, and the bare-driver half of the
 * reachability pair, whose `cause` IS the driver error and so
 * survives the walk being removed.
 *
 * The sixteenth is the cyclic-cause row, and it is the honest
 * exception. An unbounded walk does not redden it — it HANGS, since
 * a synchronous loop is not something a test timeout can interrupt,
 * and the leg that would demonstrate it is one nobody can afford to
 * run. That row guards against a hung suite rather than a failing
 * one, and this grid says nothing about it.
 */
import type { StoreRefusalReason } from './store-errors.js';

import { describe, expect, it } from 'vitest';

import { AppError } from '../../lib/errors/index.js';

import { classifyPgError, StoreRefusal } from './store-errors.js';

/**
 * How deep the module walks a `cause` chain, written down rather than
 * imported so a change to its own constant is a red pair here.
 */
const CAUSE_DEPTH_CAP = 8;

/**
 * The string planted wherever the driver carries request content, and
 * asserted absent from every refusal. Neutral by construction: it
 * names nothing, so it can be searched for in a stack trace without
 * matching the code that produced it.
 */
const SENTINEL = 'sentinel-submitted-value';

/** The two outcomes the classification table has to carry rows for. */
const OUTCOMES = ['refused', 'unclassified'];

/**
 * The SQLSTATE each reason is read from, declared independently of
 * the module.
 *
 * Typed as an exhaustive `Record` over the reason union on purpose. A
 * fourth member added to `StoreRefusalReason` without a row here does
 * not compile, which is the one guard a test table cannot give itself
 * — every other guard below can only compare this file against
 * itself.
 */
const SQLSTATE_BY_REASON: Readonly<Record<StoreRefusalReason, string>> = {
  'check-violation': '23514',
  'foreign-key-violation': '23503',
  'unique-violation': '23505',
};

/**
 * The shape a pg `DatabaseError` presents, as far as anything here
 * reads it. Loose on purpose: these fixtures stand in for a value
 * that arrives as `unknown` and whose members are whatever the
 * driver put there.
 */
interface DriverErrorFields {
  readonly code?: unknown;
  readonly constraint?: unknown;
  readonly detail?: string;
}

/**
 * Builds a stand-in for the pg `DatabaseError` a refusal arrives as.
 *
 * `detail` is where the driver quotes the submitted value back —
 * measured against the live Postgres as `Key (slug)=(<value>) already
 * exists.` — so the containment rows plant the sentinel there and in
 * the message, which is the other half of what the server says.
 */
function driverError(fields: DriverErrorFields, message: string): unknown {
  return Object.assign(new Error(message), fields);
}

/**
 * Wraps a value the way drizzle wraps a driver error: a new error
 * whose message is the SQL and whose `cause` is what failed.
 *
 * The wrapper carries NO `code` and NO `constraint`, which is the
 * measured shape and the reason the walk exists.
 */
function drizzleWrapper(inner: unknown, sql: string): unknown {
  return new Error(`Failed query: ${sql}`, { cause: inner });
}

/**
 * Stacks `links` plain wrappers above `inner`, putting the driver
 * error at chain index `links` — reachable only while that index is
 * below the cap.
 */
function chainAbove(inner: unknown, links: number): unknown {
  let outer = inner;

  for (let n = 0; n < links; n += 1) {
    outer = new Error(`wrapper ${n}`, { cause: outer });
  }

  return outer;
}

/** A `cause` chain that points at itself. */
function cyclicError(): unknown {
  const looped: { cause?: unknown } = new Error('a wrapper wrapping itself');

  looped.cause = looped;

  return looped;
}

/** One thrown value, and what the classifier makes of it. */
type ClassifyCase =
  | {
    readonly label: string;
    readonly outcome: 'refused';
    readonly thrown: unknown;
    readonly reason: StoreRefusalReason;
    readonly constraint: string | undefined;
  }
  | {
    readonly label: string;
    readonly outcome: 'unclassified';
    readonly thrown: unknown;
  };

/**
 * Every shape a store's `catch` can be handed, and what each one is.
 *
 * The constraint names are this repository's own, spelled as
 * `drizzle/0001_lethal_paibok.sql` emits them, so a row reads as the
 * refusal it stands for rather than as a placeholder. They are
 * fixtures either way — nothing here asks a database anything — but a
 * fixture that names a real key is the one a reader can check.
 */
const CLASSIFY_CASES: readonly ClassifyCase[] = [
  {
    label: 'a bare driver unique violation',
    outcome: 'refused',
    thrown: driverError(
      { code: '23505', constraint: 'domains_slug_unique' },
      'duplicate key value violates unique constraint',
    ),
    reason: 'unique-violation',
    constraint: 'domains_slug_unique',
  },
  {
    label: 'a drizzle-wrapped unique violation',
    outcome: 'refused',
    thrown: drizzleWrapper(
      driverError(
        { code: '23505', constraint: 'terms_category_id_pattern_unique' },
        'duplicate key value violates unique constraint',
      ),
      'insert into terms ...',
    ),
    reason: 'unique-violation',
    constraint: 'terms_category_id_pattern_unique',
  },
  {
    label: 'a drizzle-wrapped foreign key violation',
    outcome: 'refused',
    thrown: drizzleWrapper(
      driverError(
        { code: '23503', constraint: 'categories_parent_id_categories_id_fk' },
        'update or delete on table violates foreign key constraint',
      ),
      'delete from categories ...',
    ),
    reason: 'foreign-key-violation',
    constraint: 'categories_parent_id_categories_id_fk',
  },
  {
    label: 'a drizzle-wrapped check violation naming its constraint',
    outcome: 'refused',
    thrown: drizzleWrapper(
      driverError(
        { code: '23514', constraint: 'operator_settings_singleton_check' },
        'new row for relation violates check constraint',
      ),
      'insert into operator_settings ...',
    ),
    reason: 'check-violation',
    constraint: 'operator_settings_singleton_check',
  },
  {
    label: 'a trigger raising a check violation and naming nothing',
    outcome: 'refused',
    thrown: drizzleWrapper(
      driverError({ code: '23514' }, 'a category may not be nested that deep'),
      'insert into categories ...',
    ),
    reason: 'check-violation',
    constraint: undefined,
  },
  {
    label: 'a driver error below an unrelated system error',
    outcome: 'refused',
    thrown: Object.assign(
      new Error('pool shutting down', {
        cause: driverError(
          { code: '23505', constraint: 'personas_domain_id_role_unique' },
          'duplicate key value violates unique constraint',
        ),
      }),
      { code: 'ECONNRESET' },
    ),
    reason: 'unique-violation',
    constraint: 'personas_domain_id_role_unique',
  },
  {
    label: 'a driver error whose constraint is not a string',
    outcome: 'refused',
    thrown: driverError(
      { code: '23503', constraint: 42 },
      'insert or update on table violates foreign key constraint',
    ),
    reason: 'foreign-key-violation',
    constraint: undefined,
  },
  {
    label: 'a driver error one link inside the cap',
    outcome: 'refused',
    thrown: chainAbove(
      driverError(
        { code: '23505', constraint: 'categories_domain_id_key_unique' },
        'duplicate key value violates unique constraint',
      ),
      CAUSE_DEPTH_CAP - 1,
    ),
    reason: 'unique-violation',
    constraint: 'categories_domain_id_key_unique',
  },
  {
    label: 'a driver error one link past the cap',
    outcome: 'unclassified',
    thrown: chainAbove(
      driverError(
        { code: '23505', constraint: 'categories_domain_id_key_unique' },
        'duplicate key value violates unique constraint',
      ),
      CAUSE_DEPTH_CAP,
    ),
  },
  {
    label: 'a plain error',
    outcome: 'unclassified',
    thrown: new Error('something in this package threw'),
  },
  { label: 'a null', outcome: 'unclassified', thrown: null },
  { label: 'an undefined', outcome: 'unclassified', thrown: undefined },
  { label: 'a thrown string', outcome: 'unclassified', thrown: '23505' },
  { label: 'a thrown number', outcome: 'unclassified', thrown: 23505 },
  {
    label: 'an object whose code is a number',
    outcome: 'unclassified',
    thrown: { code: 23505, constraint: 'domains_slug_unique' },
  },
  {
    label: 'a not-null violation',
    outcome: 'unclassified',
    thrown: driverError(
      { code: '23502' },
      'null value in column violates not-null constraint',
    ),
  },
  {
    label: 'the integrity-constraint class code the three belong to',
    outcome: 'unclassified',
    thrown: driverError({ code: '23000' }, 'integrity constraint violation'),
  },
  {
    label: 'a connection failure with no cause at all',
    outcome: 'unclassified',
    thrown: Object.assign(new Error('connect ECONNREFUSED'), {
      code: 'ECONNREFUSED',
    }),
  },
  {
    label: 'a cause chain that points at itself',
    outcome: 'unclassified',
    thrown: cyclicError(),
  },
];

/**
 * One refusal built from a driver error carrying the sentinel, and
 * where the fixture planted it.
 *
 * `plantedIn` is the row's own liveness control: it is searched
 * FIRST, and a row whose planting stopped working reports that rather
 * than reporting a containment it never tested.
 */
interface ContainmentCase {
  readonly label: string;
  readonly thrown: unknown;
  readonly plantedIn: readonly string[];
}

/**
 * The three places the driver puts a submitted value, each planted
 * with the sentinel.
 *
 * All three are measured shapes rather than invented ones. `detail`
 * is `Key (slug)=(<value>) already exists.`; the `DatabaseError`
 * message is the server's own prose, which for a check violation
 * quotes the failing row; and the wrapper's message is `Failed query:
 * <sql>` with the bound `params:` beneath it.
 */
const CONTAINMENT_CASES: readonly ContainmentCase[] = [
  {
    label: 'a submitted value quoted in the driver detail',
    thrown: driverError(
      {
        code: '23505',
        constraint: 'domains_slug_unique',
        detail: `Key (slug)=(${SENTINEL}) already exists.`,
      },
      'duplicate key value violates unique constraint',
    ),
    plantedIn: ['detail'],
  },
  {
    label: 'a failing row quoted in the driver message',
    thrown: driverError(
      { code: '23514', constraint: 'research_pool_status_check' },
      `Failing row contains (1, ${SENTINEL}).`,
    ),
    plantedIn: ['message'],
  },
  {
    label: 'bound parameters quoted in the wrapper message',
    thrown: drizzleWrapper(
      driverError(
        {
          code: '23505',
          constraint: 'personas_domain_id_role_unique',
          detail: `Key (role)=(${SENTINEL}) already exists.`,
        },
        'duplicate key value violates unique constraint',
      ),
      `insert into personas ... params: ${SENTINEL}`,
    ),
    plantedIn: ['detail', 'wrapper message'],
  },
];

/** The outcomes a table carries, deduplicated and sorted. */
function outcomesOf(rows: readonly { readonly outcome: string }[]): string[] {
  return [...new Set(rows.map((row) => row.outcome))].sort();
}

/**
 * How many times `needle` occurs in `haystack`.
 *
 * A count rather than a boolean, because the assertions here run in
 * both directions: zero over a refusal, and a stated positive over
 * the fixture that fed it. A `not.toContain` gives no reading at all
 * when the fixture has quietly stopped carrying the value.
 */
function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Everything of a refusal that a logger or a response can reach
 * without deliberately walking `cause`.
 *
 * The four reads are what actually happens to one of these objects.
 * `errorHandler` in `lib/errors/handler.ts` logs `message` on every
 * branch and `stack` on the unknown-error branch a `StoreRefusal`
 * takes; a pino-shaped logger serialising the object writes its
 * enumerable own properties, which is what `JSON.stringify` answers
 * here; and `constraint` is read directly because a service may put
 * it in a detail.
 *
 * `cause` is deliberately NOT read. It holds the driver error, it is
 * non-enumerable, and a separate case asserts it still carries what
 * this one asserts absent — the containment is a property of what
 * gets serialised, not of the fixture having lost the value.
 */
function loggableTextOf(refusal: RefusalLike): string {
  return [
    refusal.message,
    refusal.name,
    refusal.constraint ?? '',
    JSON.stringify(refusal),
    String(refusal.stack),
  ].join('\n');
}

/**
 * The reads {@link loggableTextOf} makes. Structural rather than
 * `StoreRefusal`, so the planted controls can drive the same helper
 * with a sentinel in one site at a time — which no real refusal can
 * be made to carry, that being the whole claim.
 */
interface RefusalLike {
  readonly message: string;
  readonly name: string;
  readonly constraint?: string;
  readonly stack?: string;
}

/** Every message and detail down a `cause` chain, joined. */
function causeChainTextOf(err: unknown): string {
  const parts: string[] = [];
  let link: unknown = err;

  for (let depth = 0; depth < 10 && typeof link === 'object' && link !== null;
    depth += 1) {
    const fields = link as {
      message?: unknown; detail?: unknown; cause?: unknown;
    };

    parts.push(String(fields.message), String(fields.detail));
    link = fields.cause;
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// classifyPgError
// ---------------------------------------------------------------------------

describe('classifyPgError', () => {
  it('carries rows for both outcomes', () => {
    expect(outcomesOf(CLASSIFY_CASES)).toEqual(OUTCOMES);
  });

  it('labels every row distinctly', () => {
    const labels = CLASSIFY_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('covers every reason the closed set declares', () => {
    const covered = CLASSIFY_CASES
      .filter((row) => row.outcome === 'refused')
      .map((row) => row.reason);

    expect([...new Set(covered)].sort())
      .toEqual(Object.keys(SQLSTATE_BY_REASON).sort());
  });

  it('brackets the cause-depth cap with a row on each side', () => {
    const bracketed = CLASSIFY_CASES
      .filter((row) => row.label.includes('the cap'))
      .map((row) => row.outcome)
      .sort();

    expect(bracketed).toEqual(OUTCOMES);
  });

  for (const row of CLASSIFY_CASES) {
    if (row.outcome === 'refused') {
      it(`classifies ${row.label}`, () => {
        const refusal = classifyPgError(row.thrown);

        expect(refusal).toBeInstanceOf(StoreRefusal);
        expect(refusal?.reason).toBe(row.reason);
        expect(refusal?.constraint).toBe(row.constraint);
      });

      continue;
    }

    it(`classifies ${row.label} as nothing`, () => {
      expect(classifyPgError(row.thrown)).toBeNull();
    });
  }

  it('reads every SQLSTATE the closed reason set is spelled from', () => {
    const misread = Object.entries(SQLSTATE_BY_REASON)
      .filter(([reason, code]) => classifyPgError({ code })?.reason !== reason)
      .map(([reason]) => reason);

    expect(misread).toEqual([]);
  });

  it('keeps the driver error reachable on cause', () => {
    const driver = driverError(
      { code: '23505', constraint: 'domains_slug_unique' },
      'duplicate key value violates unique constraint',
    );

    expect(classifyPgError(drizzleWrapper(driver, 'insert ...'))?.cause)
      .toBe(driver);
  });

  it('answers a distinct refusal per call rather than a shared one', () => {
    const thrown = driverError({ code: '23505' }, 'duplicate key');

    expect(classifyPgError(thrown)).not.toBe(classifyPgError(thrown));
  });
});

// ---------------------------------------------------------------------------
// StoreRefusal
// ---------------------------------------------------------------------------

describe('StoreRefusal', () => {
  it('is an Error, so an unhandled one still has a stack', () => {
    const refusal = new StoreRefusal({ reason: 'unique-violation' });

    expect(refusal).toBeInstanceOf(Error);
    expect(refusal.name).toBe('StoreRefusal');
    expect(typeof refusal.stack).toBe('string');
  });

  it('is NOT an AppError, so an unmapped refusal cannot answer 4xx', () => {
    const refusal = new StoreRefusal({ reason: 'foreign-key-violation' });

    expect(refusal).not.toBeInstanceOf(AppError);
  });

  it('names the reason and the constraint in its message', () => {
    const refusal = new StoreRefusal({
      reason: 'unique-violation',
      constraint: 'domains_slug_unique',
    });

    expect(refusal.message)
      .toBe('Store refused a write: unique-violation (domains_slug_unique)');
  });

  it('names the reason alone when the mechanism named nothing', () => {
    const refusal = new StoreRefusal({ reason: 'check-violation' });

    expect(refusal.message).toBe('Store refused a write: check-violation');
    expect(refusal.constraint).toBeUndefined();
  });

  it('gives every reason a message of its own', () => {
    function messageFor(reason: StoreRefusalReason): string {
      return new StoreRefusal({ reason }).message;
    }

    const reasons = Object.keys(SQLSTATE_BY_REASON) as StoreRefusalReason[];
    const messages = reasons.map(messageFor);

    expect(new Set(messages).size).toBe(messages.length);
  });

  it('carries the same message however the refusal was reached', () => {
    const constraint = 'terms_category_id_pattern_unique';
    const built = new StoreRefusal({ reason: 'unique-violation', constraint });
    const classified = classifyPgError(
      driverError({ code: '23505', constraint }, 'duplicate key'),
    );

    expect(classified?.message).toBe(built.message);
  });

  it('serialises to exactly the three fields a logger may write', () => {
    const refusal = new StoreRefusal({
      reason: 'unique-violation',
      constraint: 'domains_slug_unique',
      cause: driverError({ code: '23505' }, 'duplicate key'),
    });

    expect(Object.keys(refusal).sort())
      .toEqual(['constraint', 'name', 'reason']);
    expect(Object.propertyIsEnumerable.call(refusal, 'cause')).toBe(false);
  });

  it('omits an absent constraint from its serialised form', () => {
    const refusal = new StoreRefusal({ reason: 'check-violation' });

    expect(JSON.parse(JSON.stringify(refusal)))
      .toStrictEqual({ name: 'StoreRefusal', reason: 'check-violation' });
  });
});

// ---------------------------------------------------------------------------
// containment
// ---------------------------------------------------------------------------

describe('refusal containment', () => {
  it('labels every row distinctly', () => {
    const labels = CONTAINMENT_CASES.map((row) => row.label);

    expect(labels.length).toBe(new Set(labels).size);
  });

  it('names a planting site for every row', () => {
    const unplanted = CONTAINMENT_CASES
      .filter((row) => row.plantedIn.length === 0)
      .map((row) => row.label);

    expect(unplanted).toEqual([]);
  });

  for (const row of CONTAINMENT_CASES) {
    it(`keeps ${row.label} out of the refusal`, () => {
      // The fixture is searched FIRST. A row whose planting stopped
      // working would otherwise report a containment it never tested.
      expect(occurrences(causeChainTextOf(row.thrown), SENTINEL))
        .toBe(row.plantedIn.length);

      const refusal = classifyPgError(row.thrown);

      expect(refusal).toBeInstanceOf(StoreRefusal);
      expect(occurrences(loggableTextOf(refusal as StoreRefusal), SENTINEL))
        .toBe(0);
    });

    it(`leaves ${row.label} reachable through cause`, () => {
      const refusal = classifyPgError(row.thrown);

      expect(occurrences(causeChainTextOf(refusal), SENTINEL))
        .toBeGreaterThan(0);
    });
  }

  // The three controls below prove each read in `loggableTextOf` is
  // live, one site at a time. Each expects TWO occurrences and not
  // one: the planted values are plain objects, whose every field
  // `JSON.stringify` emits, so a sentinel is counted once by the read
  // that names it and once by the serialisation. A real refusal
  // cannot be planted at all — it takes no message, and `Error` holds
  // `message` and `stack` non-enumerably — which is why the controls
  // are structural rather than instances of the class under test.
  it('finds a sentinel planted in the message', () => {
    const planted: RefusalLike = {
      message: `Store refused a write: unique-violation (${SENTINEL})`,
      name: 'StoreRefusal',
      stack: 'at somewhere',
    };

    expect(occurrences(loggableTextOf(planted), SENTINEL)).toBe(2);
  });

  it('finds a sentinel planted in the constraint', () => {
    const planted: RefusalLike = {
      message: 'Store refused a write: unique-violation',
      name: 'StoreRefusal',
      constraint: SENTINEL,
      stack: 'at somewhere',
    };

    expect(occurrences(loggableTextOf(planted), SENTINEL)).toBe(2);
  });

  it('finds a sentinel planted in the stack', () => {
    const planted: RefusalLike = {
      message: 'Store refused a write: unique-violation',
      name: 'StoreRefusal',
      stack: `at ${SENTINEL}`,
    };

    expect(occurrences(loggableTextOf(planted), SENTINEL)).toBe(2);
  });
});
