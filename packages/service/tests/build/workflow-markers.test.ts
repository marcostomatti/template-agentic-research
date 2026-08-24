/**
 * What `resolveEnvVar` reads out of a chain of sources: the setting
 * no source answers for, and the source carrying a name with
 * nothing under it.
 *
 * Every case here runs against values handed in as arguments: a
 * chain of sources, and the name to look up in it. That is the
 * payoff of keeping the rules in `scripts/workflow-markers.ts`
 * apart from the entry point above them — a refusal is asserted by
 * calling one function, with no source tree to build over, no
 * `.env` on disk, and no `Bun.Transpiler` anywhere in the run,
 * which is the one thing a vitest worker cannot supply.
 *
 * The claim has two halves, and a case reading only that something
 * was thrown proves neither. Resolution can fail other ways that
 * reach a caller as an `Error` — a `.env` the build may not open,
 * a source that is not the object it was taken for — so the class
 * is pinned rather than the throw, and the setting is read off the
 * refusal rather than left to prose. The field carries the bare
 * name; the message carries it inside the marker form, which is
 * what turns a refusal back into a `git grep` over
 * `workflows/src/` for the file the marker was written in.
 *
 * Three chains are asked, one per way a name can go unanswered: a
 * chain whose sources answer for other names, a chain with no
 * sources in it at all, and the default chain `resolveEnvVar`
 * falls back to when a caller names none — `ENV_DEFAULTS` behind
 * two empty objects, which is what every default build resolves
 * against and the only one of the three a shipped build reaches.
 *
 * Two guards stand in front of them, because a refusal case passes
 * for a resolver that refuses everything, and for a fixture that
 * was never about anything. The first pins the name as a
 * misspelling of an entry the table really carries; the second
 * asks the same chains for a name they do hold and reads the value
 * back.
 *
 * The second claim is the rule deciding which entries in a chain
 * count as answers at all: a source carrying the name with an
 * empty string is walked past exactly as one not carrying it is.
 * Read on its own that is indistinguishable from a resolver never
 * reaching the source — both leave the value behind it standing —
 * so the emptied entry and a real one sit in the SAME fixture
 * source, and a guard asks that source for the real one. Only once
 * the head of the chain is known to be consulted does the later
 * value mean the empty entry was declined rather than unseen.
 *
 * The rest of the marker rules — what a `.env` line parses to, and
 * the precedence between the sources — arrive as further cases in
 * this file later in this stage.
 */
import type { EnvSource } from '../../scripts/workflow-markers.js';

import { describe, expect, it } from 'vitest';

import {
  ENV_DEFAULTS,
  UnresolvedSettingError,
  resolveEnvVar,
} from '../../scripts/workflow-markers.js';

// ---------------------------------------------------------------------------
// The settings these cases ask for
// ---------------------------------------------------------------------------

/**
 * The name nothing answers for: `AR_BUILD_TAG` with a letter gone.
 *
 * A misspelling rather than an invented name, because that is how a
 * shipped build reaches this refusal at all. `ENV_DEFAULTS` stands
 * behind every name a workflow source may carry, so the chain runs
 * out only where a marker names something the table has no entry
 * for — a typo inside a well-formed marker, or an entry never added
 * beside the marker that wants it.
 */
const UNANSWERED_SETTING = 'AR_BUILD_TG';

/**
 * The entry {@link UNANSWERED_SETTING} is a misspelling of.
 *
 * Carried as its own constant so the guard below can assert the
 * pair. Asserting the misspelling absent on its own is satisfied by
 * any string nobody ever declared, which is a fixture the refusal
 * is not about.
 */
const ANSWERED_SETTING = 'AR_BUILD_TAG';

/**
 * What {@link ANSWERED_SETTING} resolves to through the chain built
 * below, chosen to be nothing `ENV_DEFAULTS` carries.
 *
 * The read-back guard would hold for a resolver ignoring its chain
 * and answering from the table if this were the shipped default, so
 * the value has to be one only the fixture supplies.
 */
const FIXTURE_BUILD_TAG = 'fixture-tag';

// ---------------------------------------------------------------------------
// The chains they are asked against
// ---------------------------------------------------------------------------

/**
 * Sources carrying real settings, and not the one asked for.
 *
 * Two of them rather than one, so the walk has somewhere to go
 * after the first declines: a resolver reading only the head of the
 * chain refuses this name too, and would look right doing it.
 *
 * The name is written as a computed key rather than spelled again,
 * so the source and the guard reading it back cannot drift into
 * being about different settings.
 */
const CHAIN_WITHOUT_IT: readonly EnvSource[] = [
  { AR_DISPATCH_CRON: '*/5 * * * *' },
  { [ANSWERED_SETTING]: FIXTURE_BUILD_TAG },
];

/**
 * A chain with no sources in it at all.
 *
 * The one input where the refusal cannot be the sources declining,
 * since there are none to decline: the walk ends without its body
 * having run. `envSources` never builds one — it always returns
 * three entries — so this arrives only from a caller assembling a
 * chain itself, and it has to refuse rather than fall off the end.
 */
const NO_SOURCES: readonly EnvSource[] = [];

// ---------------------------------------------------------------------------
// Reading a refusal
// ---------------------------------------------------------------------------

/**
 * The {@link UnresolvedSettingError} a call refused with.
 *
 * Anything else thrown is rethrown rather than handed back as this
 * refusal, which is where the class gets pinned for every case
 * reading a field below: a resolver that had started throwing a
 * `TypeError` over these inputs fails them with that error instead
 * of passing them.
 *
 * A call that RETURNED is a failure of its own and says so with the
 * value it returned. Reading a field off a refusal that never
 * happened would otherwise fail on a property of `undefined`, which
 * names neither what was expected nor what occurred.
 *
 * @param resolve - The call under test, passed unmade so what it
 *   throws lands here.
 * @returns The refusal it threw.
 */
function refusalOf(resolve: () => string): UnresolvedSettingError {
  let resolved: string;

  try {
    resolved = resolve();
  } catch (thrown) {
    if (thrown instanceof UnresolvedSettingError) {
      return thrown;
    }

    throw thrown;
  }

  throw new Error(
    `resolveEnvVar resolved to ${JSON.stringify(resolved)} where a `
    + 'refusal was expected.',
  );
}

// ---------------------------------------------------------------------------
// A setting no source in the chain answers for
// ---------------------------------------------------------------------------

describe('resolveEnvVar — a setting no source answers for', () => {
  // The guard that keeps the refusals about the hazard they were
  // written for. A name the table never carried is refused by any
  // resolver, including one that stopped consulting `ENV_DEFAULTS`
  // altogether; a misspelling of an entry the table does carry is
  // refused only by one still reading it.
  it('is asked for a misspelling of an entry the table carries', () => {
    const declared = Object.keys(ENV_DEFAULTS);

    expect(declared).toContain(ANSWERED_SETTING);
    expect(declared).not.toContain(UNANSWERED_SETTING);
  });

  // The other guard, and the one that stops every case below passing
  // for a resolver that refuses whatever it is handed. Both chains
  // the refusals use are asked for a name they hold, and the value
  // read back says which source answered: the fixture tag can only
  // have come from the chain, and the default chain answers from the
  // table rather than from anything ambient.
  it('is asked against chains that answer for a name they hold', () => {
    expect(resolveEnvVar(ANSWERED_SETTING, CHAIN_WITHOUT_IT))
      .toBe(FIXTURE_BUILD_TAG);
    expect(resolveEnvVar(ANSWERED_SETTING))
      .toBe(ENV_DEFAULTS[ANSWERED_SETTING]);
  });

  // The class rather than the throw. Everything below reads a field
  // off the refusal and would be satisfied by any object carrying
  // one, so this is the case that says which error a caller catching
  // narrowly will actually see.
  it('throws UnresolvedSettingError rather than a bare Error', () => {
    expect(() => resolveEnvVar(UNANSWERED_SETTING, CHAIN_WITHOUT_IT))
      .toThrow(UnresolvedSettingError);
  });

  // Bare, so a caller can say which setting is missing without
  // parsing a sentence it did not write. The marker syntax belongs
  // to the message and not to this field, and a refusal carrying
  // `__ENVVAR:AR_BUILD_TG__` here would read the same in a test
  // report while being useless to anything switching on it.
  it('carries the setting as a field, with no marker around it', () => {
    const refusal = refusalOf(
      () => resolveEnvVar(UNANSWERED_SETTING, CHAIN_WITHOUT_IT),
    );

    expect(refusal.setting).toBe(UNANSWERED_SETTING);
  });

  // The message names it the other way round, and that is what makes
  // the refusal actionable: resolution walks strings already parsed
  // out of their sources, so the file the marker came from is not
  // something it can name. The marker form is what a reader greps
  // `workflows/src/` for to find it.
  it('names the setting in the message, in the marker form', () => {
    const refusal = refusalOf(
      () => resolveEnvVar(UNANSWERED_SETTING, CHAIN_WITHOUT_IT),
    );

    expect(refusal.message).toContain(`__ENVVAR:${UNANSWERED_SETTING}__`);
  });

  it('refuses over a chain holding no sources at all', () => {
    const refusal = refusalOf(
      () => resolveEnvVar(UNANSWERED_SETTING, NO_SOURCES),
    );

    expect(refusal.setting).toBe(UNANSWERED_SETTING);
  });

  // The chain a build gets by naming none, and the only one of the
  // three a shipped build reaches. Called with one argument on
  // purpose: passing `envSources()` here would assert against a
  // chain this case built, leaving the default parameter — the thing
  // every caller inside the build relies on — untested.
  it('refuses over the default chain, which names no sources', () => {
    const refusal = refusalOf(() => resolveEnvVar(UNANSWERED_SETTING));

    expect(refusal.setting).toBe(UNANSWERED_SETTING);
  });
});

// ---------------------------------------------------------------------------
// A setting an earlier source carries with nothing under it
// ---------------------------------------------------------------------------

/**
 * The setting the fixtures below empty, and one `ENV_DEFAULTS`
 * really carries an entry for.
 *
 * A declared entry rather than an invented name, because the shape
 * this rule exists for is an operator deleting a value out of a
 * `.env` they also source by hand: the line stays, the value goes,
 * and what should stand behind it is the table's own entry. A name
 * the table never carried would fall through to a refusal whether
 * the empty entry was declined or taken at face value, which is a
 * fixture the rule is not about.
 */
const EMPTIED_SETTING = 'AR_DISPATCH_CRON';

/**
 * What {@link EMPTIED_SETTING} resolves to from the source sitting
 * behind the emptied one, chosen to be nothing `ENV_DEFAULTS`
 * carries.
 *
 * A cron expression the table does not ship, so a resolver that had
 * stopped walking the chain and answered from the table alone fails
 * the case rather than passing it with the right-looking kind of
 * value.
 */
const FIXTURE_CRON = '*/7 * * * *';

/**
 * A chain whose head carries {@link EMPTIED_SETTING} with nothing
 * under it, and {@link ANSWERED_SETTING} with a real value.
 *
 * Both entries sit in the SAME object on purpose. The claim is that
 * the empty one is declined, and a head holding only the empty
 * entry could not tell that apart from a head never read: either
 * way the value behind it stands. Pairing them leaves the guard
 * below asking this exact source for a name it does answer for.
 */
const CHAIN_WITH_IT_EMPTIED: readonly EnvSource[] = [
  { [ANSWERED_SETTING]: FIXTURE_BUILD_TAG, [EMPTIED_SETTING]: '' },
  { [EMPTIED_SETTING]: FIXTURE_CRON },
];

/**
 * The shape a shipped build meets the rule in: the setting emptied
 * in front, nothing between, and the defaults table at the back.
 *
 * Three sources because that is what `envSources` builds, written
 * out by hand rather than through it — the precedence that call
 * arranges is a claim of its own, and asserting it here would leave
 * this case failing for a reason it is not about.
 */
const CHAIN_EMPTIED_OVER_DEFAULTS: readonly EnvSource[] = [
  { [EMPTIED_SETTING]: '' },
  {},
  ENV_DEFAULTS,
];

/**
 * A chain in which every source carries the name and empties it.
 *
 * Where the rule runs out: nothing is left to fall through to, so
 * the walk ends the way it does for a name no source mentions.
 */
const CHAIN_EMPTIED_THROUGHOUT: readonly EnvSource[] = [
  { [EMPTIED_SETTING]: '' },
  { [EMPTIED_SETTING]: '' },
];

describe('resolveEnvVar — an earlier source holding an empty value', () => {
  // The guard everything below rests on. An entry declined and a
  // source never reached leave the same value standing, so this asks
  // the head of the chain for the name it does answer for: the
  // fixture tag can only have come from that object, which is what
  // makes the head demonstrably consulted rather than assumed to be.
  it('is asked against a chain whose head source is consulted', () => {
    expect(resolveEnvVar(ANSWERED_SETTING, CHAIN_WITH_IT_EMPTIED))
      .toBe(FIXTURE_BUILD_TAG);
  });

  // The other half of that guard, and what keeps the fall-through
  // case about an operator emptying a line rather than about a name
  // nothing ever declared.
  it('empties a setting ENV_DEFAULTS carries an entry for', () => {
    expect(Object.keys(ENV_DEFAULTS)).toContain(EMPTIED_SETTING);
  });

  // The claim. A resolver taking the empty string for an answer
  // returns it and fails here; one walking past it reaches the
  // source behind, whose value is nothing the shipped table holds.
  it('walks past the empty entry to the source behind it', () => {
    expect(resolveEnvVar(EMPTIED_SETTING, CHAIN_WITH_IT_EMPTIED))
      .toBe(FIXTURE_CRON);
  });

  // The same rule where a build actually meets it: a `.env` line
  // reading `AR_DISPATCH_CRON=` with nothing exported over it
  // resolves to the table's entry, which is the value the operator
  // was putting back by deleting theirs.
  it('falls through an emptied entry to the defaults table', () => {
    expect(resolveEnvVar(EMPTIED_SETTING, CHAIN_EMPTIED_OVER_DEFAULTS))
      .toBe(ENV_DEFAULTS[EMPTIED_SETTING]);
  });

  // The end of the rule, and the case a resolver taking `''` for an
  // answer fails loudest: it returns the empty string where nothing
  // in the chain set one. A refusal here is the same refusal a name
  // no source mentions gets, which is the point — an emptied entry
  // is not a quieter kind of value.
  it('refuses when every source in the chain empties it', () => {
    const refusal = refusalOf(
      () => resolveEnvVar(EMPTIED_SETTING, CHAIN_EMPTIED_THROUGHOUT),
    );

    expect(refusal.setting).toBe(EMPTIED_SETTING);
  });
});
