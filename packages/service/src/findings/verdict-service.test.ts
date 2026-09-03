/**
 * `src/findings/verdict-service.ts` — what the one write on the
 * findings surface refuses, and what each refusal is careful not to
 * say. Driven over `tests/helpers/memory-research-store.ts`, so
 * every claim here is answered with no database anywhere.
 *
 * SIX SECTIONS AND FIFTEEN CASES, ALL OF THEM ABOUT A REFUSAL.
 * What a ruling ANSWERS — the appended row, the second ruling that
 * does not replace the first, the note and its absence — is the
 * next task's, and this file deliberately reads none of it: every
 * positive call below is a CONTROL inside a refusal case rather
 * than a case of its own.
 *
 * EVERY REFUSAL CASE CARRIES ITS OWN CONTROL, VARIED ALONG THAT
 * ROW'S OWN AXIS. A function refusing every ruling passes each
 * refusal case written on its own, so the control has to sit in the
 * same case and has to differ from the refused call in exactly the
 * thing under test: the same body under a verdict the ladder names,
 * the same body under an id that resolves, the same verdict under a
 * domain that accepts it.
 *
 * AND THE SENTINEL ALONE WOULD NOT BE ENOUGH, which is the sharpest
 * thing the fixture buys. {@link MISSING_VERDICT} is outside every
 * ladder in this file, so a service that ignored the domain
 * entirely and always judged against
 * `DEFAULT_VERDICT_VOCABULARY` would refuse it in every section and
 * pass. So each of the two vocabulary sections also submits a
 * verdict the OTHER ladder names and asserts it refused: a default
 * member under the declared ladder, and a declared member under the
 * fallback. Those two cases are what say the ladder is read PER
 * CALL off the OWNING domain rather than picked once.
 *
 * THE THREE DOMAINS DIFFER ONLY IN THEIR LADDER. One declares
 * {@link DECLARED_LADDER}, one declares nothing at all, and one
 * declares the EMPTY list. The third is what separates a DECLARED
 * empty ladder from an ABSENT one, and nothing else here can make
 * that reading: a service testing the member for EMPTINESS rather
 * than for absence accepts every verdict the default names on a
 * domain that has closed judging, and every other case in this
 * file stays green.
 *
 * THE EMPTY LADDER IS READ AS REFUSING EVERYTHING RATHER THAN AS
 * REFUSING THE SENTINEL. That case submits every member of both
 * other ladders in turn, and its control accepts each of those same
 * verdicts somewhere else in the same case — so a store or a
 * service refusing everything everywhere fails the control while
 * the closed domain's own zeros stay green.
 *
 * NO REFUSAL MAY HAVE WRITTEN. Each section reads a call tally off
 * a counting port rather than asserting the status alone, because a
 * ruling that was appended and THEN refused is the one outcome a
 * status cannot report. The control is the same tally over the
 * accepted call in the same case, so a wrapper that had stopped
 * counting reports zero for both.
 *
 * WHAT A REFUSAL NAMES IS ASSERTED IN THE POSITIVE, AND IT IS THE
 * ACCEPTED SET. Each vocabulary refusal names {@link VERDICT_FIELD}
 * and carries every member of the ladder that was read — derived
 * from the fixture's own list rather than written out again — so a
 * refusal that had stopped composing the ladder in, or that
 * composed the WRONG domain's, fails here. The empty ladder is the
 * one that renders as `[]`, which is the same reading with nothing
 * to list.
 *
 * THE 404 NAMES NEITHER, AND THAT IS DELIBERATE. There is no field
 * to name for an address that resolved to nothing and no ladder was
 * ever read, so that section asserts `details` ABSENT rather than
 * reaching for a field path this surface does not build. The
 * containment rule below still binds it.
 *
 * THAT NO REFUSAL QUOTES THE SUBMITTED VERDICT, IN ANY OF THE THREE
 * CHANNELS IT COULD. {@link channelsOf} renders the message, the
 * details and the CAUSE separately, and the containment case counts
 * the sentinel in each. Counted rather than asserted absent, with
 * the same three counts taken over a planted refusal that leaks
 * through all three — a renderer that answered the empty string, or
 * one that never looked at `cause`, would otherwise report a clean
 * refusal and a leaking one alike.
 *
 * {@link MISSING_VERDICT} IS NOT A SUBSTRING OF ANY LADDER MEMBER
 * HERE, and that is a property of the fixture rather than of the
 * service. A refusal names the accepted set, so a caller submitting
 * a PREFIX of a declared verdict reads its own text back inside
 * that member — nothing copied it, but a count cannot tell the
 * difference. The sentinel is shaped so the zeros above are a
 * reading of the refusal.
 *
 * Mutation grid, run whole over this file with `--reporter=json`
 * and read as the failed case SET rather than as a count. FOURTEEN
 * legs, every one of them mutating `./verdict-service.ts`: each
 * rule this file is about belongs to the service, and the store
 * behind it stores whatever verdict it is handed.
 *
 * Judging against `DEFAULT_VERDICT_VOCABULARY` whatever the domain
 * declares reddens 11 of 15, the widest leg here, and its size is
 * the CONTROLS rather than the subjects: seven cases store
 * {@link DECLARED_MEMBER}, which the default does not name, so the
 * accepted half of a case about something else reds with it.
 * Dropping the ladder check reddens 10 and refusing every verdict
 * reddens 10, and the two sets differ on exactly the cases each is
 * about — the first loses every refusal and takes the containment
 * case with it, the second loses every control.
 *
 * Appending the ruling and THEN refusing it reddens exactly 1, the
 * write tally, with every status assertion in the file green
 * through it. That is the whole reason that case counts calls
 * rather than reading a refusal.
 *
 * Comparing the finding lookup against `undefined` so its branch
 * never fires reddens 3: the two id cases, and the containment
 * case that submits a missing id. Comparing the DOMAIN lookup the
 * same way reddens exactly 1, the orphan case — and that leg read
 * ZERO before that case existed, no ordinary sequence of calls
 * being able to produce a finding whose domain is not there.
 *
 * Parsing the body BELOW the finding lookup reddens 1, the
 * unrecognized-key case, whose tally is the only reading of that
 * ordering anywhere. Dropping `.strict()` reddens the same 1.
 * Making `verdict` optional reddens 1, the missing-verdict case.
 *
 * Omitting the ladder from the message reddens 3, the three cases
 * that read what a refusal NAMES, and composing the SUBMITTED
 * verdict into that message reddens 1, the containment case. The
 * two sets are disjoint, which is what keeps naming the accepted
 * set and quoting the submitted one separate claims rather than
 * one claim asserted twice.
 *
 * Testing the stored member for EMPTINESS rather than for absence
 * reddens 2, both of the empty-ladder cases and nothing else.
 *
 * AND ONE LEG READS ZERO, RECORDED RATHER THAN DROPPED. Swapping
 * `??` for `||` in the fallback reddens NOTHING, because an empty
 * array is TRUTHY and the two spellings fall through the same one
 * state. It is in the grid because it is the reflex a reader
 * reaches for on being told an empty ladder must not fall through,
 * and the zero is the answer: the mistake that IS reachable is the
 * emptiness test above, not the operator.
 */
import type { VerdictServiceStore } from './verdict-service.js';
import type { FieldError } from '../../lib/errors/index.js';
import type {
  MemoryDomainFinding,
  MemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';

import { describe, expect, it } from 'vitest';

import {
  AppError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors/index.js';
import {
  createMemoryResearchStore,
} from '../../tests/helpers/memory-research-store.js';
import { DEFAULT_VERDICT_VOCABULARY } from '../db/schema/values.js';

import { recordVerdict } from './verdict-service.js';

/** The domain that names its own ladder. */
const DECLARED = 'example-declared';

/** The domain that names none, and is judged by the default. */
const FALLBACK = 'example-fallback';

/** The domain that names the EMPTY ladder, and accepts nothing. */
const CLOSED = 'example-closed';

/**
 * The ladder {@link DECLARED} declares.
 *
 * SHARES NO MEMBER WITH `DEFAULT_VERDICT_VOCABULARY`, which is what
 * makes the cross-ladder cases readable: a default member submitted
 * here has to be refused, and a member of this list submitted under
 * the fallback has to be refused too. Two lists that overlapped
 * would leave a service reading the wrong domain's ladder green on
 * whichever member they shared.
 */
const DECLARED_LADDER: readonly string[] = ['adopt', 'hold'];

/** One member of it, for the controls that have to be accepted. */
const DECLARED_MEMBER = 'adopt';

/** One member of the default ladder, on the same terms. */
const FALLBACK_MEMBER = 'neutral';

/**
 * A verdict shaped like one and outside every ladder in this file.
 *
 * SENTINEL-SHAPED ON PURPOSE, so the containment block's count of
 * it in a refusal is a reading of the refusal rather than a
 * coincidence of wording. It is also a substring of no ladder
 * member here, which is the other half of that reading: a refusal
 * names the accepted set, so a submitted string that sat inside a
 * declared verdict would come back without anything having copied
 * it.
 */
const MISSING_VERDICT = 'zzsentinelverdictzz';

/** The `field` every vocabulary refusal here has to name. */
const VERDICT_FIELD = 'verdict';

/** The code it has to carry, which no schema could have raised. */
const OUTSIDE_VOCABULARY_CODE = 'verdict_outside_vocabulary';

/** An id shaped like one and carried by no finding in any case. */
const MISSING_ID = 9999;

/** {@link DECLARED}'s one finding. */
const DECLARED_FINDING_ID = 11;

/** {@link FALLBACK}'s one finding. */
const FALLBACK_FINDING_ID = 12;

/** {@link CLOSED}'s one finding. */
const CLOSED_FINDING_ID = 13;

/**
 * A domain id no `domains` row carries, for the orphan plant.
 *
 * The planting seam takes whatever id it is given, which is what
 * makes the RACE `findDomainById` answers null for reachable at
 * all: no ordinary sequence of calls can produce a finding whose
 * domain is not there.
 */
const MISSING_DOMAIN_ID = 8888;

/** The finding planted under it, and read by one case. */
const ORPHANED_FINDING_ID = 14;

/** A key `verdictBodySchema` does not declare. */
const UNDECLARED_KEY = 'zzsentinelkeyzz';

/** What an operator wrote beside a ruling, where a case sends one. */
const NOTE = 'read again';

/** Where the store's clock starts. */
const CLOCK_START = '2026-03-10T00:00:00.000Z';

/** How far it moves on every reading, in milliseconds. */
const CLOCK_STEP_MS = 60000;

/**
 * One finding, in the shape the planting seam takes.
 *
 * PLANTED RATHER THAN WRITTEN, because `FindingStore` declares no
 * insert at all: `src/findings/store.ts` states that the absence IS
 * the read-first rule, so `MemoryResearchStore.setDomainFindings`
 * is the only way this table gets rows.
 *
 * @param id - The finding's id.
 * @returns The row. Nothing below reads its score, its stamp or its
 *   payload — a ruling is judged against the DOMAIN — so the three
 *   are the same on every finding here and no case can come to rest
 *   on one of them.
 */
function findingRow(id: number): MemoryDomainFinding {
  return {
    id,
    documentId: id,
    entityId: null,
    fields: {},
    score: 0.5,
    scoreVersion: 1,
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
  };
}

/**
 * A clock that moves one step on every reading.
 *
 * FIXED AND ADVANCING RATHER THAN THE WALL CLOCK, on the terms
 * `./service.test.ts` states: two appends inside one millisecond of
 * wall time tie on `labelled_at`, and nothing here should rest on
 * the `id` tiebreak beneath it without saying so.
 *
 * @returns A clock of its own, so two stores never share a count.
 */
function advancingClock(): () => Date {
  let readings = 0;

  return () => {
    const at = new Date(Date.parse(CLOCK_START) + readings * CLOCK_STEP_MS);

    readings += 1;

    return at;
  };
}

/** Three domains, each with one finding and its own ladder. */
interface PlantedLadders {
  /** The store, holding all three domains and their findings. */
  readonly store: MemoryResearchStore;
}

/**
 * Plants that shape.
 *
 * @returns The store. The three finding ids are constants rather
 *   than members here: nothing allocates them, the planting seam
 *   takes the id it is given, and a case naming one reads better
 *   than a case reaching into a returned record.
 *
 * @remarks
 * ALL THREE DOMAINS ARE PLANTED FOR EVERY CASE, which is what lets
 * a cross-ladder case submit one domain's verdict against another's
 * finding in the same store. Each domain holds exactly one finding,
 * so nothing here can be a paging or an ordering reading by
 * accident.
 */
async function plantLadders(): Promise<PlantedLadders> {
  const store = createMemoryResearchStore({ now: advancingClock() });
  const declared = await store.insertDomain({
    slug: DECLARED,
    name: 'Declared',
    settings: { verdictVocabulary: DECLARED_LADDER },
  });
  const fallback = await store.insertDomain({
    slug: FALLBACK,
    name: 'Fallback',
    settings: {},
  });
  const closed = await store.insertDomain({
    slug: CLOSED,
    name: 'Closed',
    settings: { verdictVocabulary: [] },
  });

  store.setDomainFindings(declared.id, [findingRow(DECLARED_FINDING_ID)]);
  store.setDomainFindings(fallback.id, [findingRow(FALLBACK_FINDING_ID)]);
  store.setDomainFindings(closed.id, [findingRow(CLOSED_FINDING_ID)]);

  return { store };
}

/** How many times each of the three port methods was called. */
interface CallCounts {
  /** Lookups of the finding the path named. */
  findFindingById: number;

  /** Lookups of the domain that finding belongs to. */
  findDomainById: number;

  /** Appends of a ruling. The one write. */
  insertFindingLabel: number;
}

/** A tally with every member at zero. */
const NO_CALLS: CallCounts = {
  findFindingById: 0,
  findDomainById: 0,
  insertFindingLabel: 0,
};

/**
 * The three-method port with a tally beside it.
 *
 * A COUNTING WRAPPER RATHER THAN A STUB: every call is forwarded to
 * the planted store, so a case reading the tally is reading a call
 * that really happened and really answered. A stub would pin the
 * ordering and lose every other claim in the same case.
 *
 * @param store - Where the calls go.
 * @returns The port to hand {@link recordVerdict}, and the tally it
 *   fills.
 */
function countingStore(store: MemoryResearchStore): {
  counted: VerdictServiceStore;
  calls: CallCounts;
} {
  const calls: CallCounts = { ...NO_CALLS };
  const counted: VerdictServiceStore = {
    findFindingById(id) {
      calls.findFindingById += 1;

      return store.findFindingById(id);
    },
    findDomainById(id) {
      calls.findDomainById += 1;

      return store.findDomainById(id);
    },
    insertFindingLabel(input) {
      calls.insertFindingLabel += 1;

      return store.insertFindingLabel(input);
    },
  };

  return { counted, calls };
}

/**
 * Runs a call that has to be refused, and hands the refusal back.
 *
 * @param run - The call.
 * @returns The `AppError` it raised.
 * @throws When the call ANSWERED, so a refusal that quietly stopped
 *   happening fails here — naming the refusal it wanted — rather
 *   than asserting over an error nobody built. Anything that is not
 *   an `AppError` is rethrown unchanged.
 */
async function refusalFrom(run: () => Promise<unknown>): Promise<AppError> {
  try {
    await run();
  } catch (err) {
    if (err instanceof AppError) {
      return err;
    }

    throw err;
  }

  throw new Error('expected a refusal, and the call answered');
}

/**
 * Rules on {@link DECLARED_FINDING_ID}'s domain and hands the
 * refusal back.
 *
 * @param store - Where the finding, its domain and the ruling go.
 * @param id - The finding to rule on.
 * @param verdict - What to submit.
 * @returns The `AppError` the ruling raised.
 */
async function refusedVerdict(
  store: VerdictServiceStore,
  id: number,
  verdict: string,
): Promise<AppError> {
  return await refusalFrom(() => recordVerdict(store, id, { verdict }));
}

/**
 * The two facts a caller reads off each detail of a 422.
 *
 * @param err - The refusal.
 * @returns One `{ field, code }` per detail, in the order raised.
 */
function detailsOf(err: AppError): { field: string; code: string }[] {
  const details = err.details as readonly FieldError[] | undefined;

  return [...details ?? []].map((detail) => ({
    field: detail.field,
    code: detail.code ?? '',
  }));
}

/**
 * What each detail SAYS, which is where the accepted set is.
 *
 * @param err - The refusal.
 * @returns The messages, joined, so a case can ask whether every
 *   member of a ladder was named without caring which detail named
 *   it. There is only ever one detail on the refusals here, and a
 *   join says so without asserting it twice.
 */
function messageOf(err: AppError): string {
  const details = err.details as readonly FieldError[] | undefined;

  return [...details ?? []].map((detail) => detail.message).join(' ');
}

/**
 * Renders an error's `cause` into text a search can read.
 *
 * @param cause - `err.cause`, which is `unknown` by declaration.
 * @returns The name, the message and the stack for an `Error`; the
 *   serialised value otherwise; and the empty string when there is
 *   no cause. The STACK is in it deliberately: a driver error's own
 *   message is repeated there, so a channel that read only
 *   `cause.message` would miss the copy underneath it.
 */
function renderCause(cause: unknown): string {
  if (cause === undefined) {
    return '';
  }

  if (cause instanceof Error) {
    return [cause.name, cause.message, cause.stack ?? ''].join(' ');
  }

  return JSON.stringify(cause) ?? String(cause);
}

/**
 * The three channels a refusal could carry a submitted value out
 * through, rendered separately.
 *
 * SEPARATELY RATHER THAN JOINED, so a count of zero in each is
 * three readings and a leak names the channel it came through. The
 * order is fixed: the message, the details, the cause.
 *
 * @param err - The refusal.
 * @returns The three renderings.
 */
function channelsOf(err: AppError): string[] {
  return [
    err.message,
    JSON.stringify(err.details ?? null),
    renderCause(err.cause),
  ];
}

/**
 * @param haystack - The text to search.
 * @param needle - The string to count.
 * @returns How many times the needle occurs. A count rather than a
 *   boolean, so a zero can be read against a known positive taken
 *   by this same function in the same case.
 */
function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * @param err - The refusal.
 * @param needle - The string that must not be in it.
 * @returns One count per channel, in {@link channelsOf}'s order.
 */
function leaksIn(err: AppError, needle: string): number[] {
  return channelsOf(err).map((text) => countOccurrences(text, needle));
}

/**
 * @param ladder - The accepted set a refusal had to name.
 * @param err - The refusal.
 * @returns One boolean per member, true when the message named it.
 *   Derived from the ladder rather than written out again, so a
 *   member added to a fixture joins this reading with nothing
 *   edited.
 */
function namesEachOf(ladder: readonly string[], err: AppError): boolean[] {
  const message = messageOf(err);

  return ladder.map((member) => message.includes(member));
}

/** @returns `ladder.map(() => true)`, for the assertion above. */
function allNamed(ladder: readonly string[]): boolean[] {
  return ladder.map(() => true);
}

// -------------------------------------------------------------------------
// A verdict outside a domain-declared ladder
// -------------------------------------------------------------------------

describe('a verdict outside a domain-declared ladder', () => {
  it('refuses a verdict the domain does not declare', async () => {
    const { store } = await plantLadders();
    const refusal = await refusedVerdict(
      store,
      DECLARED_FINDING_ID,
      MISSING_VERDICT,
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.code).toBe('VALIDATION_ERROR');
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal)).toEqual([
      { field: VERDICT_FIELD, code: OUTSIDE_VOCABULARY_CODE },
    ]);

    // The positive control, varied along the one axis under test:
    // the same finding, the same body shape, a verdict the ladder
    // names. A service refusing every ruling passes the refusal
    // above and fails this.
    const stored = await recordVerdict(store, DECLARED_FINDING_ID, {
      verdict: DECLARED_MEMBER,
    });

    expect(stored.verdict).toBe(DECLARED_MEMBER);
    expect(stored.findingId).toBe(DECLARED_FINDING_ID);
  });

  it('refuses a default verdict under that ladder', async () => {
    // The reading the sentinel alone cannot make. A service that
    // ignored the domain and always judged against the default
    // would refuse the sentinel everywhere and pass every other
    // case in this file; it accepts THIS verdict, which the
    // declaring domain never named.
    const { store } = await plantLadders();
    const refusal = await refusedVerdict(
      store,
      DECLARED_FINDING_ID,
      FALLBACK_MEMBER,
    );

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal)).toEqual([
      { field: VERDICT_FIELD, code: OUTSIDE_VOCABULARY_CODE },
    ]);

    // The control is the same verdict against a finding whose
    // domain declares nothing, in the same case: the value is
    // acceptable, and only the ladder it was judged against refused
    // it.
    const stored = await recordVerdict(store, FALLBACK_FINDING_ID, {
      verdict: FALLBACK_MEMBER,
    });

    expect(stored.verdict).toBe(FALLBACK_MEMBER);
  });

  it('names the field and every declared verdict', async () => {
    const { store } = await plantLadders();
    const refusal = await refusedVerdict(
      store,
      DECLARED_FINDING_ID,
      MISSING_VERDICT,
    );

    expect(detailsOf(refusal)).toEqual([
      { field: VERDICT_FIELD, code: OUTSIDE_VOCABULARY_CODE },
    ]);
    expect(namesEachOf(DECLARED_LADDER, refusal))
      .toEqual(allNamed(DECLARED_LADDER));

    // And names NO member of the default ladder, which is what says
    // the set composed in is the one that was read rather than the
    // constant a fallback would have reached for. The two lists
    // share no member, so this reading is available at all.
    expect(namesEachOf(DEFAULT_VERDICT_VOCABULARY, refusal))
      .toEqual(DEFAULT_VERDICT_VOCABULARY.map(() => false));
  });

  it('writes nothing when it refuses', async () => {
    // The outcome no status can report: a ruling appended and THEN
    // refused. The control is the same tally over the accepted call
    // in the same case, so a wrapper that had stopped counting
    // reports zero for both.
    const { store } = await plantLadders();
    const refused = countingStore(store);

    await refusedVerdict(
      refused.counted,
      DECLARED_FINDING_ID,
      MISSING_VERDICT,
    );

    expect(refused.calls).toEqual({
      ...NO_CALLS,
      findFindingById: 1,
      findDomainById: 1,
    });

    const answered = countingStore(store);

    await recordVerdict(answered.counted, DECLARED_FINDING_ID, {
      verdict: DECLARED_MEMBER,
    });

    expect(answered.calls).toEqual({
      findFindingById: 1,
      findDomainById: 1,
      insertFindingLabel: 1,
    });
  });
});

// -------------------------------------------------------------------------
// A verdict outside the fallback ladder
// -------------------------------------------------------------------------

describe('a verdict outside the fallback ladder', () => {
  it('refuses a verdict the default does not name', async () => {
    const { store } = await plantLadders();
    const refusal = await refusedVerdict(
      store,
      FALLBACK_FINDING_ID,
      MISSING_VERDICT,
    );

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal)).toEqual([
      { field: VERDICT_FIELD, code: OUTSIDE_VOCABULARY_CODE },
    ]);

    // The control, varied along the one axis under test: the same
    // finding, a verdict the DEFAULT names. A domain declaring
    // nothing is judged against that ladder rather than against
    // none, which is the whole difference between a fallback and a
    // closed domain.
    const stored = await recordVerdict(store, FALLBACK_FINDING_ID, {
      verdict: FALLBACK_MEMBER,
    });

    expect(stored.verdict).toBe(FALLBACK_MEMBER);
    expect(DEFAULT_VERDICT_VOCABULARY).toContain(FALLBACK_MEMBER);
  });

  it('refuses a declared verdict under the fallback', async () => {
    // The mirror of the cross-ladder case one section up, and the
    // reading that says the ladder is read PER CALL off the OWNING
    // domain rather than picked once: this verdict is accepted on
    // the finding whose domain declares it, in the same case.
    const { store } = await plantLadders();
    const refusal = await refusedVerdict(
      store,
      FALLBACK_FINDING_ID,
      DECLARED_MEMBER,
    );

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal)).toEqual([
      { field: VERDICT_FIELD, code: OUTSIDE_VOCABULARY_CODE },
    ]);

    const stored = await recordVerdict(store, DECLARED_FINDING_ID, {
      verdict: DECLARED_MEMBER,
    });

    expect(stored.verdict).toBe(DECLARED_MEMBER);
  });

  it('names the field and every default verdict', async () => {
    const { store } = await plantLadders();
    const refusal = await refusedVerdict(
      store,
      FALLBACK_FINDING_ID,
      MISSING_VERDICT,
    );

    expect(detailsOf(refusal)).toEqual([
      { field: VERDICT_FIELD, code: OUTSIDE_VOCABULARY_CODE },
    ]);
    expect(namesEachOf(DEFAULT_VERDICT_VOCABULARY, refusal))
      .toEqual(allNamed(DEFAULT_VERDICT_VOCABULARY));

    // And names no member of the other domain's ladder, on the
    // terms the declared section states.
    expect(namesEachOf(DECLARED_LADDER, refusal))
      .toEqual(DECLARED_LADDER.map(() => false));
  });
});

// -------------------------------------------------------------------------
// An id that names no finding
// -------------------------------------------------------------------------

describe('an id that names no finding', () => {
  it('answers 404 and builds no detail', async () => {
    const { store } = await plantLadders();
    const refusal = await refusalFrom(() => recordVerdict(store, MISSING_ID, {
      verdict: DECLARED_MEMBER,
    }));

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.code).toBe('NOT_FOUND');
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();

    // The control, varied along the one axis under test: the same
    // body, an id that resolves. There is no field path to assert
    // here and no ladder was ever read, which is why this section
    // asserts the detail ABSENT rather than reaching for one.
    const stored = await recordVerdict(store, DECLARED_FINDING_ID, {
      verdict: DECLARED_MEMBER,
    });

    expect(stored.findingId).toBe(DECLARED_FINDING_ID);
  });

  it('refuses a finding whose domain is gone', async () => {
    // The race the domain lookup answers null for, made reachable.
    // `findings.domain_id` is NOT NULL and cascades, so a null
    // there means the domain went between the two reads — which
    // took this finding with it, and by the time a caller reads
    // the answer no finding carries the id either. Without this
    // case that branch is unreachable from any fixture here and
    // the grid records a zero for it.
    const { store } = await plantLadders();

    store.setDomainFindings(MISSING_DOMAIN_ID, [
      findingRow(ORPHANED_FINDING_ID),
    ]);

    const orphan = await store.findFindingById(ORPHANED_FINDING_ID);

    expect(orphan?.domainId).toBe(MISSING_DOMAIN_ID);
    await expect(
      store.findDomainById(MISSING_DOMAIN_ID),
    ).resolves.toBeNull();

    const refusal = await refusedVerdict(
      store,
      ORPHANED_FINDING_ID,
      DECLARED_MEMBER,
    );

    expect(refusal).toBeInstanceOf(NotFoundError);
    expect(refusal.statusCode).toBe(404);
    expect(refusal.details).toBeUndefined();
  });

  it('reads no domain and writes nothing', async () => {
    // The ordering claim, which no assertion on the status can
    // make: a lookup moved below the domain read answers the same
    // 404 having already asked about a domain nothing named.
    const { store } = await plantLadders();
    const refused = countingStore(store);

    await refusalFrom(() => recordVerdict(refused.counted, MISSING_ID, {
      verdict: DECLARED_MEMBER,
    }));

    expect(refused.calls).toEqual({ ...NO_CALLS, findFindingById: 1 });

    const answered = countingStore(store);

    await recordVerdict(answered.counted, DECLARED_FINDING_ID, {
      verdict: DECLARED_MEMBER,
    });

    expect(answered.calls).toEqual({
      findFindingById: 1,
      findDomainById: 1,
      insertFindingLabel: 1,
    });
  });
});

// -------------------------------------------------------------------------
// A ladder declared empty
// -------------------------------------------------------------------------

describe('a ladder declared empty', () => {
  it('refuses every verdict either ladder names', async () => {
    // The declared-empty-versus-absent reading, and nothing else
    // in this file can make it. A service testing the stored
    // member for EMPTINESS rather than for absence accepts the
    // four default verdicts below on a domain that has closed
    // judging, and every other case here stays green.
    const { store } = await plantLadders();
    const every = [...DEFAULT_VERDICT_VOCABULARY, ...DECLARED_LADDER];
    const codes: string[] = [];

    for (const verdict of every) {
      const refusal = await refusedVerdict(
        store,
        CLOSED_FINDING_ID,
        verdict,
      );

      codes.push(...detailsOf(refusal).map((detail) => detail.code));
    }

    expect(codes).toEqual(every.map(() => OUTSIDE_VOCABULARY_CODE));

    // The control, and it is per verdict rather than one accepted
    // call: each of those same strings is stored somewhere in this
    // same store, so a service or a store refusing everything
    // everywhere fails here while the zeros above stay green.
    const stored: string[] = [];

    for (const verdict of DEFAULT_VERDICT_VOCABULARY) {
      const row = await recordVerdict(store, FALLBACK_FINDING_ID, {
        verdict,
      });

      stored.push(row.verdict);
    }

    for (const verdict of DECLARED_LADDER) {
      const row = await recordVerdict(store, DECLARED_FINDING_ID, {
        verdict,
      });

      stored.push(row.verdict);
    }

    expect(stored).toEqual(every);
  });

  it('names the field and an empty ladder', async () => {
    const { store } = await plantLadders();
    const refusal = await refusedVerdict(
      store,
      CLOSED_FINDING_ID,
      MISSING_VERDICT,
    );

    expect(detailsOf(refusal)).toEqual([
      { field: VERDICT_FIELD, code: OUTSIDE_VOCABULARY_CODE },
    ]);
    expect(messageOf(refusal)).toContain('[]');

    // And names no member of either other ladder, which is the same
    // reading the two sections above take: a refusal that had
    // fallen through to the default would list its four members
    // here.
    const others = [...DEFAULT_VERDICT_VOCABULARY, ...DECLARED_LADDER];

    expect(namesEachOf(others, refusal))
      .toEqual(others.map(() => false));
  });
});

// -------------------------------------------------------------------------
// A body outside the declared shape
// -------------------------------------------------------------------------

describe('a body outside the declared shape', () => {
  it('refuses an unrecognized key before any read', async () => {
    const { store } = await plantLadders();
    const refused = countingStore(store);
    const refusal = await refusalFrom(() => recordVerdict(
      refused.counted,
      DECLARED_FINDING_ID,
      { verdict: DECLARED_MEMBER, [UNDECLARED_KEY]: 'anything' },
    ));

    expect(refusal).toBeInstanceOf(ValidationError);
    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal)).toEqual([
      { field: 'body', code: 'unrecognized_keys' },
    ]);

    // The parse precedes every read, so the refusal costs the
    // database nothing at all. The control is the same body without
    // the key, counted the same way in the same case.
    expect(refused.calls).toEqual(NO_CALLS);

    const answered = countingStore(store);

    await recordVerdict(answered.counted, DECLARED_FINDING_ID, {
      verdict: DECLARED_MEMBER,
    });

    expect(answered.calls).toEqual({
      findFindingById: 1,
      findDomainById: 1,
      insertFindingLabel: 1,
    });
  });

  it('refuses a body carrying no verdict', async () => {
    const { store } = await plantLadders();
    const refusal = await refusalFrom(() => recordVerdict(
      store,
      DECLARED_FINDING_ID,
      { note: NOTE },
    ));

    expect(refusal.statusCode).toBe(422);
    expect(detailsOf(refusal)).toEqual([
      { field: VERDICT_FIELD, code: 'invalid_type' },
    ]);

    // The control, varied along the one axis under test: the same
    // note beside a verdict. The note is optional and the verdict
    // is not, which is the whole difference between the two bodies.
    const stored = await recordVerdict(store, DECLARED_FINDING_ID, {
      note: NOTE,
      verdict: DECLARED_MEMBER,
    });

    expect(stored.note).toBe(NOTE);
    expect(stored.verdict).toBe(DECLARED_MEMBER);
  });
});

// -------------------------------------------------------------------------
// What a refusal carries
// -------------------------------------------------------------------------

describe('what a refusal carries', () => {
  it('quotes the submitted verdict in no channel', async () => {
    // The one route on this surface whose subject is a string a
    // caller chose, so all four refusals it can raise are read here
    // rather than one standing for the rest. Counted per CHANNEL
    // rather than over a joined blob, so a leak names the channel
    // it came through.
    const { store } = await plantLadders();
    const refusals = [
      await refusedVerdict(store, DECLARED_FINDING_ID, MISSING_VERDICT),
      await refusedVerdict(store, FALLBACK_FINDING_ID, MISSING_VERDICT),
      await refusedVerdict(store, CLOSED_FINDING_ID, MISSING_VERDICT),
      await refusalFrom(() => recordVerdict(store, MISSING_ID, {
        verdict: MISSING_VERDICT,
      })),
    ];

    expect(refusals.map((refusal) => leaksIn(refusal, MISSING_VERDICT)))
      .toEqual(refusals.map(() => [0, 0, 0]));

    // The search would find it: a planted refusal leaking through
    // all three channels is counted by the same helper in the same
    // case, so the zeros above are a reading rather than a search
    // that could only ever answer nothing. A renderer that ignored
    // `cause` fails on the third member alone.
    const planted = new ValidationError(
      `refused ${MISSING_VERDICT}`,
      [{
        field: VERDICT_FIELD,
        message: `not ${MISSING_VERDICT}`,
        code: OUTSIDE_VOCABULARY_CODE,
      }],
      { cause: new Error(`the store saw ${MISSING_VERDICT}`) },
    );

    expect(leaksIn(planted, MISSING_VERDICT).map((count) => count > 0))
      .toEqual([true, true, true]);

    // And the four envelopes were built at all: a helper answering
    // the empty string would satisfy every count above. Three carry
    // one detail and the 404 carries none, which is that section's
    // claim read again from here.
    expect(refusals.map((refusal) => refusal.message.length > 0))
      .toEqual(refusals.map(() => true));
    expect(refusals.map((refusal) => detailsOf(refusal).length))
      .toEqual([1, 1, 1, 0]);
  });
});
