/**
 * What the build's settings rules answer with: the setting no
 * source in the chain answers for, the source carrying a name with
 * nothing under it, the `.env` line forms that fill a source in the
 * first place, and the order the sources are asked in.
 *
 * Almost every case here runs against values handed in as
 * arguments: a chain of sources and the name to look up in it, or
 * the text a `.env` would hold. That is the payoff of keeping the
 * rules in `scripts/workflow-markers.ts` apart from the entry point
 * above them — a refusal is asserted by calling one function, with
 * no source tree to build over and no `Bun.Transpiler` anywhere in
 * the run, which is the one thing a vitest worker cannot supply.
 *
 * The exception is the precedence claim at the foot of the file,
 * and it is one respect rather than a different approach: the
 * middle source of a chain is filled by reading a path and by
 * nothing else, so those cases write a `.env` into a temporary
 * directory and hand the path over. Still one function called,
 * still no tree to build.
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
 * The third claim sits underneath both of those: what one line of
 * a `.env` parses to, before any chain has been built out of it.
 * Its two halves pull opposite ways — four line forms that must be
 * READ, two that must be SKIPPED — so they share one fixture text
 * rather than getting one each. A skipped line can only be shown
 * declined against a key set the readable lines populated; on its
 * own, "nothing came out of the comment" is what a parser reading
 * nothing at all reports too.
 *
 * The fourth claim is the order those sources are handed over in:
 * an environment ahead of the `.env` file, the file ahead of
 * `ENV_DEFAULTS`. It belongs to `envSources` rather than to the
 * resolver, and the cases read it back through one — each
 * contested name is answered by exactly one tier, so the value
 * that comes back says which source was reached without any case
 * inspecting the array it walked. Their guards are built to stay
 * green when that order changes: a fixture guard moving with the
 * order would be restating the claim rather than standing behind
 * it.
 *
 * The last subject is not a settings rule at all, and sits here
 * because it belongs to the same module: which libraries the build
 * will paste into a Code node. `assertSpliceable` judges a library
 * a transpiler has already been over, so its cases hand it a
 * recorded transpile-and-scan pair out of `marker-fixtures.ts` —
 * the same reason the settings cases run on arguments, a vitest
 * worker having no `Bun.Transpiler` to produce a fresh one with.
 *
 * Its refusals need a guard the settings ones do not. The whole
 * output of that function is a throw, so every refusal case ever
 * written for it is satisfied by a version refusing whatever it is
 * handed, and a section of nothing but refusals reads green under
 * one. Each refused sample is asked beside the nearest library
 * that must be ACCEPTED, and the two differ by the thing the rule
 * is about.
 *
 * The forms refused for how a library DECLARES its names need one
 * thing the dependency form does not: the refusal has to say WHICH
 * of them caught the library. One source can break two rules at
 * once — a star re-export is a dependency wearing an export
 * keyword, and is measured to be both — so a case reading only that
 * something was thrown is covered by whichever rule reached it
 * first, and would stay green with the star rule deleted outright.
 */
import type { LibSample } from './marker-fixtures.js';
import type { EnvSource } from '../../scripts/workflow-markers.js';

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  ENV_DEFAULTS,
  SpliceableLibError,
  UnresolvedSettingError,
  assertSpliceable,
  envSources,
  parseDotenv,
  readEnvFile,
  resolveEnvVar,
} from '../../scripts/workflow-markers.js';

import {
  LIB_CONTROL_SAMPLES,
  REFUSED_LIB_SAMPLES,
  SPLICEABLE_LIB_SAMPLES,
} from './marker-fixtures.js';

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

// ---------------------------------------------------------------------------
// The line forms a `.env` is written in
// ---------------------------------------------------------------------------

/**
 * A `.env` carrying every line form `parseDotenv` reads, and both
 * of the forms it skips.
 *
 * One text rather than one per form, because the skipped forms
 * cannot be shown declined against anything smaller. "No key came
 * out of the comment line" holds for a parser that read nothing at
 * all, so what carries that claim is the key set of THIS text: the
 * readable lines have to arrive for the skipped ones to be absent
 * on purpose rather than absent along with everything else.
 *
 * The names are ordinary rather than the `AR_` ones a real file
 * carries, because parsing a file and deciding what a setting
 * resolves to are separate steps. Nothing here judges a name
 * against `ENV_DEFAULTS` — the parse reads whatever the operator
 * wrote, and the chain built out of it decides afterwards whether
 * any marker wanted the name.
 *
 * The commented-out line repeats a key the file already declares,
 * which is the shape an operator leaves behind when they take a
 * setting back out by hand. Both halves of that matter: the live
 * line above it has to survive, and the `#` line has to contribute
 * no key of its own.
 */
const DOTENV_LINES: readonly string[] = [
  '# What the file is for, written where no value can be read out.',
  '',
  'PLAIN=unquoted-value',
  'SINGLE=\'single quoted\'',
  'DOUBLE="double quoted"',
  'export EXPORTED=exported-value',
  'TRAILING=trailing-value # what the setting above is for',
  'QUOTED_HASH="a # the quotes around it keep"',
  'UNSPACED_HASH=a#b',
  '#PLAIN=the value an operator took back out',
  '',
];

/** The text {@link DOTENV_LINES} spells, as a file holds it. */
const DOTENV_TEXT = DOTENV_LINES.join('\n');

/**
 * Every key the text above declares, in sorted order.
 *
 * The skipped forms are asserted as this set rather than as
 * absences named one at a time, and the two are not the same
 * strength. A case listing the keys it expects NOT to see has to
 * think of them first, and a comment line's leaked key is exactly
 * the one nobody writes down — `#PLAIN` is not a name anyone means
 * to look for. Asking what the parser produced puts the burden the
 * other way round.
 */
const DOTENV_KEYS: readonly string[] = [
  'DOUBLE',
  'EXPORTED',
  'PLAIN',
  'QUOTED_HASH',
  'SINGLE',
  'TRAILING',
  'UNSPACED_HASH',
];

describe('parseDotenv — the line forms an operator writes', () => {
  // The guard the skip claim rests on, and the one thing about this
  // fixture that cannot be read off the parser's own output. A text
  // carrying neither a comment nor a blank line satisfies "nothing
  // came out of one" without the parser having declined anything,
  // and reads identically in a green run.
  it('is asked against a text carrying both skipped forms', () => {
    const comments = DOTENV_LINES.filter(
      (line) => line.startsWith('#'),
    );
    const blanks = DOTENV_LINES.filter((line) => line === '');

    expect(comments).not.toHaveLength(0);
    expect(blanks).not.toHaveLength(0);
  });

  it('reads an unquoted value whole', () => {
    expect(parseDotenv(DOTENV_TEXT).PLAIN).toBe('unquoted-value');
  });

  // Either quote character, and neither survives into the value.
  // What comes back is what the shell would have exported, so a
  // marker resolving to it carries no quoting for a node parameter
  // to strip on the far side of the build.
  it('strips the quotes around a quoted value', () => {
    const settings = parseDotenv(DOTENV_TEXT);

    expect(settings.SINGLE).toBe('single quoted');
    expect(settings.DOUBLE).toBe('double quoted');
  });

  // The prefix is what lets the same file be sourced as a shell
  // script, so it is the operator's file that puts it there rather
  // than this build wanting it. Read past rather than refused, and
  // never taken for part of the name.
  it('reads a line carrying an export prefix', () => {
    expect(parseDotenv(DOTENV_TEXT).EXPORTED).toBe('exported-value');
  });

  it('drops a comment trailing an unquoted value', () => {
    expect(parseDotenv(DOTENV_TEXT).TRAILING).toBe('trailing-value');
  });

  // The two controls on the rule above, both of them values a
  // parser cutting at every `#` truncates without saying so.
  // Quoting is the whole of what buys an operator a `#` in a value;
  // the unspaced one is the near neighbour, since `a#b` is a single
  // token to a shell and is how a fragment or a colour gets
  // written.
  it('keeps a # the comment rule does not reach', () => {
    const settings = parseDotenv(DOTENV_TEXT);

    expect(settings.QUOTED_HASH).toBe('a # the quotes around it keep');
    expect(settings.UNSPACED_HASH).toBe('a#b');
  });

  // The claim about the two skipped forms, and the reason every
  // case above reads the same text. The keys that arrived are the
  // evidence the parser ran at all; the keys that did not are then
  // evidence it declined the comment and the blank rather than
  // never having reached them.
  //
  // What this does not prove is which rule did the declining. The
  // key grammar behind them refuses `#PLAIN` on its own, so a
  // parser that had lost its comment branch still fails to produce
  // that key — the two stand behind each other, and this case goes
  // red only when both are gone. The claim is the behaviour an
  // operator relies on, not the branch that supplies it.
  it('declares the keys its readable lines carry, and no others', () => {
    expect(Object.keys(parseDotenv(DOTENV_TEXT)).sort())
      .toEqual(DOTENV_KEYS);
  });
});

// ---------------------------------------------------------------------------
// Which source in the chain answers a name first
// ---------------------------------------------------------------------------

/**
 * The setting every tier carries, and the one the environment is
 * asserted to win.
 *
 * Contested by all three on purpose. A name only two of them hold
 * would leave the third's place in the chain unpinned, and where
 * each source sits is the whole of what these cases are about.
 */
const ENV_WINNING_SETTING = 'AR_BUILD_TAG';

/**
 * The setting the `.env` file and the table carry and the
 * environment does not — the one the file is asserted to win.
 *
 * The environment staying silent for this name is what makes the
 * value that comes back attributable to the file rather than to
 * whatever sits above it.
 */
const FILE_WINNING_SETTING = 'AR_DISPATCH_CRON';

/**
 * The setting neither the environment nor the file carries, left to
 * the table at the back of the chain.
 *
 * The tail rather than a further precedence rule, and worth asking
 * for anyway: it is the case a chain that had dropped its defaults
 * table fails, and it is how a shipped build resolves nearly every
 * marker it meets.
 */
const DEFAULTS_WINNING_SETTING = 'AR_DISPATCH_BATCH_CAP';

/**
 * What the fixture environment holds for
 * {@link ENV_WINNING_SETTING}.
 *
 * Neither what `ENV_DEFAULTS` ships nor what the fixture file
 * holds, so reading it back names the environment and nothing else.
 */
const ENVIRONMENT_BUILD_TAG = 'tag-from-the-environment';

/**
 * What the fixture `.env` holds for {@link ENV_WINNING_SETTING},
 * and the value the environment in front of it has to beat.
 */
const FILE_BUILD_TAG = 'tag-from-the-env-file';

/**
 * What the fixture `.env` holds for {@link FILE_WINNING_SETTING}.
 *
 * A cron expression the table does not ship, so the value coming
 * back says the file was reached rather than only that something
 * of the right shape was.
 */
const FILE_CRON = '*/3 * * * *';

/**
 * The environment handed to `envSources`, carrying exactly one of
 * the three contested names.
 *
 * A plain object rather than `process.env`. The build reads the
 * environment a caller passes and never reaches for an ambient
 * one, so there is nothing here for a developer's own exports to
 * arrive through — which is the property that keeps a build
 * reproducible, and is asserted elsewhere rather than here.
 */
const FIXTURE_ENVIRONMENT: EnvSource = {
  [ENV_WINNING_SETTING]: ENVIRONMENT_BUILD_TAG,
};

/**
 * The fixture `.env`: the name the environment contests, and the
 * name only the table stands behind it on.
 */
const FIXTURE_DOTENV_TEXT = [
  `${ENV_WINNING_SETTING}=${FILE_BUILD_TAG}`,
  `${FILE_WINNING_SETTING}=${FILE_CRON}`,
  '',
].join('\n');

/**
 * A directory holding that file, removed once this file finishes.
 *
 * The one place these cases touch a disk, and not avoidable:
 * `envSources` fills its middle source by reading a path, so a
 * chain whose file tier holds anything at all is a chain built over
 * a real file. There is no seam to hand parsed text through, and
 * adding one would leave the read itself — the step that turns a
 * path into that tier — outside every case in this file.
 */
const FIXTURE_DIR = mkdtempSync(join(tmpdir(), 'ar-workflow-markers-'));

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

/** The path the chains below are built over. */
const FIXTURE_ENV_FILE = join(FIXTURE_DIR, '.env');

writeFileSync(FIXTURE_ENV_FILE, FIXTURE_DOTENV_TEXT);

/**
 * The chain a deploy build resolves against: an environment, a
 * `.env` path, and the table behind them both.
 *
 * `envDefaults` is left out rather than replaced, so the tier at
 * the back is the table the build itself ships. That costs these
 * cases their choice of what it answers with, which is why the
 * values read off `ENV_DEFAULTS` below are read rather than
 * spelled again.
 */
const FULL_CHAIN = envSources({
  env: FIXTURE_ENVIRONMENT,
  envFile: FIXTURE_ENV_FILE,
});

describe('envSources — which source answers a name first', () => {
  // The guard the two lower claims rest on. Each of them reads a
  // value back and says which tier it came from, and that reading
  // holds only while the tiers in front stay silent for the name —
  // an environment that had grown an `AR_DISPATCH_CRON` entry would
  // answer the file's claim itself, and would look right doing it.
  it('is asked with an environment carrying one contested name', () => {
    expect(Object.keys(FIXTURE_ENVIRONMENT)).toEqual([ENV_WINNING_SETTING]);
  });

  // The guard the first claim rests on, and the one thing here that
  // cannot be read off a fixture constant. A `.env` the build never
  // found, or found and could not parse, contributes an empty
  // source — and "the environment won" holds over one of those
  // exactly as it holds over a file that lost. Read through
  // `readEnvFile` rather than through a chain, so the guard says
  // what the file carries whatever order the sources end up in.
  //
  // It is half of what the first claim needs, and the case below
  // resolving the file's own name is the other half: this one says
  // the file carries the contested name, that one says the chain
  // reaches the file at all. Neither is the first claim, and the
  // first claim passes green without either — a `.env` that was
  // never written leaves the environment winning against nothing.
  //
  // Whole rather than key by key: the third claim needs this file
  // NOT to carry the name it leaves to the table, and an absence
  // nobody writes down is the one that leaks.
  it('is asked against a `.env` the build reads as written', () => {
    expect(readEnvFile(FIXTURE_ENV_FILE)).toEqual({
      [ENV_WINNING_SETTING]: FILE_BUILD_TAG,
      [FILE_WINNING_SETTING]: FILE_CRON,
    });
  });

  // The same for the tier at the back. A table with no entry under
  // one of these names would leave the claim below it passing for a
  // chain that had dropped the table altogether.
  it('is asked against a table carrying all three names', () => {
    const declared = Object.keys(ENV_DEFAULTS);

    expect(declared).toContain(ENV_WINNING_SETTING);
    expect(declared).toContain(FILE_WINNING_SETTING);
    expect(declared).toContain(DEFAULTS_WINNING_SETTING);
  });

  // The last guard, and what makes a returned value name a tier at
  // all. Two tiers answering a contested name with the same string
  // would leave the case reading it back green whichever of them
  // was reached.
  it('is asked with a different value in every tier', () => {
    const tags = new Set([
      ENVIRONMENT_BUILD_TAG,
      FILE_BUILD_TAG,
      ENV_DEFAULTS[ENV_WINNING_SETTING],
    ]);

    expect(tags.size).toBe(3);
    expect(FILE_CRON).not.toBe(ENV_DEFAULTS[FILE_WINNING_SETTING]);
  });

  // The first claim. Both sources carry the name, and the value
  // that comes back is the environment's — so the file behind it
  // was never consulted for it, which is what an operator exporting
  // a setting over their own `.env` is relying on.
  it('resolves the environment ahead of the `.env` file', () => {
    expect(resolveEnvVar(ENV_WINNING_SETTING, FULL_CHAIN))
      .toBe(ENVIRONMENT_BUILD_TAG);
  });

  // The second, one tier down: the environment is silent for this
  // name, and the value is the file's rather than the table's. A
  // chain ordering the table in front of the file passes the case
  // above and fails this one, which is why the two claims are made
  // over different names.
  it('resolves the `.env` file ahead of ENV_DEFAULTS', () => {
    expect(resolveEnvVar(FILE_WINNING_SETTING, FULL_CHAIN)).toBe(FILE_CRON);
  });

  // The end of the chain. Neither tier in front answers, and the
  // table does — which is every marker a default build resolves,
  // reached here through a chain that had somewhere else to look.
  it('resolves from ENV_DEFAULTS where neither source answers', () => {
    expect(resolveEnvVar(DEFAULTS_WINNING_SETTING, FULL_CHAIN))
      .toBe(ENV_DEFAULTS[DEFAULTS_WINNING_SETTING]);
  });
});

// ---------------------------------------------------------------------------
// A library carrying a dependency the transpile left behind
// ---------------------------------------------------------------------------

/**
 * The sample a roster carries under one id.
 *
 * A lookup rather than a literal, so what a case asserts on is the
 * source measured against a real transpiler with its output
 * recorded beside it. A copy written out here would go on passing
 * after that recording had been re-measured, describing a
 * transpile no build produces.
 *
 * Refusing an id nothing carries is the whole reason it throws.
 * `find` answers `undefined`, and a case handed one fails several
 * lines later on a property of `undefined`, naming neither the
 * roster nor the id it was looking for — which is exactly how a
 * renamed fixture entry arrives.
 *
 * @param samples - The roster to look in.
 * @param id - The sample wanted out of it.
 * @returns The sample carrying that id.
 */
function sampleById<Sample extends LibSample>(
  samples: readonly Sample[],
  id: string,
): Sample {
  const sample = samples.find((candidate) => candidate.id === id);

  if (sample === undefined) {
    throw new Error(
      `No sample in marker-fixtures.ts carries the id ${JSON.stringify(id)}. `
      + `The roster asked holds: ${samples.map((entry) => entry.id).join(', ')}.`,
    );
  }

  return sample;
}

/**
 * The library refused here: one importing a value out of `node:fs`,
 * which the transpile leaves standing in the text and the scan
 * reports as a dependency.
 *
 * A dependency is the form with no lighter fix. The three re-export
 * forms are a library declaring its names the wrong way and are
 * rewritten where they are written; an import is a library needing
 * something a Code node has no way to fetch, so what it asks for
 * has to be given up or carried in beside it.
 */
const VALUE_IMPORT_SAMPLE = sampleById(
  REFUSED_LIB_SAMPLES,
  'refused-value-import',
);

/**
 * The nearest library that must be ACCEPTED: an import statement
 * over a dependency that is nothing but a type.
 *
 * It carries two loads. The first is vacuity — `assertSpliceable`
 * returns nothing, so a version refusing whatever it is handed
 * passes every refusal case below it, and this is the one case
 * that reddens there. The second is what the rule is about: this
 * source opens with an import statement exactly as the refused one
 * does, and the two part company only because `import type` erases
 * before either the transpiled text or the scan sees it. Refusing
 * on the word rather than on the dependency would fail here and
 * nowhere else.
 */
const TYPE_ONLY_SAMPLE = sampleById(
  LIB_CONTROL_SAMPLES,
  'control-type-only-import',
);

/**
 * The {@link SpliceableLibError} a call refused with.
 *
 * A second helper beside {@link refusalOf} rather than one taking a
 * class, because pinning a named class is the point of both and a
 * helper handed the class to expect would let a case pin whatever
 * it happened to pass. Anything else thrown is rethrown, so a rule
 * that had started failing some other way fails the cases below
 * with that error instead of passing them.
 *
 * A call that RETURNED is its own failure and says so. Reading a
 * field off a refusal that never happened would otherwise fail on a
 * property of `undefined`, naming neither what was expected nor
 * what occurred.
 *
 * @param assertLib - The call under test, passed unmade so what it
 *   throws lands here.
 * @returns The refusal it threw.
 */
function spliceRefusalOf(assertLib: () => void): SpliceableLibError {
  try {
    assertLib();
  } catch (thrown) {
    if (thrown instanceof SpliceableLibError) {
      return thrown;
    }

    throw thrown;
  }

  throw new Error(
    'assertSpliceable returned where a refusal was expected.',
  );
}

describe('assertSpliceable — a library depending on a value', () => {
  // The fixture guard, and the one thing here that cannot be read
  // off the function's own behaviour. The claim is about a scan
  // REPORTING a dependency, so a sample whose scan reported none
  // would leave every case below about some other rule entirely —
  // and the control is only a control while its own scan is empty
  // despite its source opening with an import statement.
  it('is asked about a scan reporting a dependency, and one not', () => {
    expect(VALUE_IMPORT_SAMPLE.scan.imports.map((entry) => entry.path))
      .toEqual(['node:fs']);
    expect(TYPE_ONLY_SAMPLE.source).toMatch(/^import[ \t]/mu);
    expect(TYPE_ONLY_SAMPLE.scan.imports).toEqual([]);
  });

  // The accept path, and what stops the refusals below passing for
  // a rule that refuses everything it is handed. The value is only
  // that it returned: there is nothing else to read back, which is
  // why this case has to exist rather than being implied by one of
  // them.
  it('accepts the library whose dependency erased before the scan', () => {
    expect(() => assertSpliceable(
      TYPE_ONLY_SAMPLE.transpiled,
      TYPE_ONLY_SAMPLE.scan,
      TYPE_ONLY_SAMPLE.path,
    )).not.toThrow();
  });

  // The class rather than the throw. Every case under this one
  // reads a field off the refusal and would take any object
  // carrying one, so this is what says which error a build catching
  // narrowly will see — and the other ways an inline fails reach a
  // caller as a bare `Error`.
  it('throws SpliceableLibError rather than a bare Error', () => {
    expect(() => assertSpliceable(
      VALUE_IMPORT_SAMPLE.transpiled,
      VALUE_IMPORT_SAMPLE.scan,
      VALUE_IMPORT_SAMPLE.path,
    )).toThrow(SpliceableLibError);
  });

  // The path the marker named, carried as a field so a caller can
  // say which file to open without parsing a sentence it did not
  // write. Nothing else in the refusal locates the library: the
  // text handed over is a transpiled body, and by then the workflow
  // source whose marker pulled it in is gone.
  it('carries the library path as a field on the refusal', () => {
    const refusal = spliceRefusalOf(() => assertSpliceable(
      VALUE_IMPORT_SAMPLE.transpiled,
      VALUE_IMPORT_SAMPLE.scan,
      VALUE_IMPORT_SAMPLE.path,
    ));

    expect(refusal.libPath).toBe(VALUE_IMPORT_SAMPLE.path);
  });

  // The same name in the sentence an operator actually reads, since
  // a build refusing on a terminal prints the message and none of
  // the fields.
  it('names the library path in the message', () => {
    const refusal = spliceRefusalOf(() => assertSpliceable(
      VALUE_IMPORT_SAMPLE.transpiled,
      VALUE_IMPORT_SAMPLE.scan,
      VALUE_IMPORT_SAMPLE.path,
    ));

    expect(refusal.message).toContain(VALUE_IMPORT_SAMPLE.path);
  });

  // Which rule caught it, read off the fixture rather than spelled
  // again. One library can carry two refused forms at once, so a
  // case reading only that something threw is covered by whichever
  // rule happened to reach it first — and this sample is refused by
  // the dependency rule or by nothing.
  it('names the dependency as the form it refused for', () => {
    const refusal = spliceRefusalOf(() => assertSpliceable(
      VALUE_IMPORT_SAMPLE.transpiled,
      VALUE_IMPORT_SAMPLE.scan,
      VALUE_IMPORT_SAMPLE.path,
    ));

    expect(refusal.form).toBe(VALUE_IMPORT_SAMPLE.refusedForm);
  });
});

// ---------------------------------------------------------------------------
// A library exporting its names in a form no strip repairs
// ---------------------------------------------------------------------------

/** One refused export form, paired to the sample planted for it. */
interface ReexportCase {
  /** The form the refusal has to name. */
  readonly form: string;

  /** The sample in `REFUSED_LIB_SAMPLES` standing for that form. */
  readonly id: string;
}

/**
 * The three forms refused for how a library DECLARES its names,
 * rather than for what it depends on.
 *
 * Each is a statement in its own right — a trailing list, a default,
 * a star — so there is no keyword at the head of a declaration to
 * take off, and no version of `stripDeclarationExports` repairs one.
 * That is what separates them from the dependency form above, which
 * is refused for naming a file a Code node has no way to fetch.
 *
 * The form is written out here rather than read off the sample, and
 * a guard below asserts the two agree. Reading it off would make the
 * pairing true however either side moved: a fixture re-measured and
 * re-labelled to match whatever the build had started reporting
 * would carry this section along with it, leaving three cases
 * passing about a rule nobody chose.
 */
const REEXPORT_CASES: readonly ReexportCase[] = [
  { form: 'export {', id: 'refused-named-list' },
  { form: 'export default', id: 'refused-default' },
  { form: 'export *', id: 'refused-star' },
];

/**
 * The star sample, read out here for the guard that keeps its claim
 * about the ORDER the forms are tried in rather than about the
 * throw.
 */
const STAR_SAMPLE = sampleById(REFUSED_LIB_SAMPLES, 'refused-star');

/**
 * The form `assertSpliceable` refused a sample under, or `null`
 * where it accepted one.
 *
 * A returned value rather than a thrown refusal, so a guard can name
 * every sample it was wrong about instead of stopping at the first —
 * a helper that throws cannot be called from inside a filter.
 * Anything that is not a {@link SpliceableLibError} is rethrown,
 * which is where the class gets pinned for the claims below: a rule
 * that had started failing some other way fails them with that error
 * rather than passing them.
 *
 * @param sample - The library to judge, with the transpile and the
 *   scan measured beside it.
 * @returns The form the refusal named, or `null` where the library
 *   was accepted.
 */
function refusedFormOf(sample: LibSample): string | null {
  try {
    assertSpliceable(sample.transpiled, sample.scan, sample.path);
  } catch (thrown) {
    if (thrown instanceof SpliceableLibError) {
      return thrown.form;
    }

    throw thrown;
  }

  return null;
}

describe('assertSpliceable — a library exporting in a refused form', () => {
  // The coverage guard, and it reaches past this section on purpose:
  // the three forms here plus the dependency form above are every
  // entry the fixture roster carries. A fifth form planted there
  // with no case beside it is a rule nothing proves still fires, and
  // the suite would stay green while the coverage shrank.
  it('reaches every refused sample the fixture roster carries', () => {
    const reached = [
      ...REEXPORT_CASES.map((entry) => entry.id),
      VALUE_IMPORT_SAMPLE.id,
    ].sort();
    const planted = REFUSED_LIB_SAMPLES.map((sample) => sample.id).sort();

    expect(reached).toEqual(planted);
  });

  // The pairing itself, asserted rather than assumed. Each claim
  // below reads its form out of the table above, so a fixture whose
  // `refusedForm` had been edited to something else would leave one
  // sample standing for two different forms — and the claim would go
  // on passing under whichever label the fixture had acquired.
  it('pairs each sample to the form the fixture says it stands for', () => {
    const planted = REEXPORT_CASES.map(
      (entry) => sampleById(REFUSED_LIB_SAMPLES, entry.id).refusedForm,
    );

    expect(planted).toEqual(REEXPORT_CASES.map((entry) => entry.form));
  });

  // What makes the star claim a claim about ORDER. That sample is
  // measured to break two rules at once: its text carries
  // `export *`, and its scan reports the file it re-exports as a
  // dependency. Only while both hold does a refusal naming the star
  // form say the star rule was reached FIRST — with the scan empty,
  // the dependency rule could never have caught it and the order
  // would go untested. Read off the fixture rather than through the
  // function, so it says the same thing whatever order the rules are
  // tried in.
  it('is asked about a star sample its own scan calls a dependency', () => {
    expect(STAR_SAMPLE.transpiled).toContain('export *');
    expect(STAR_SAMPLE.scan.imports).not.toHaveLength(0);
  });

  // The guard the three claims rest on, and the only case here that
  // moves when the rule starts refusing whatever it is handed.
  // `assertSpliceable` returns nothing, so a refusal case has no
  // value to read back and a section of nothing but refusals reads
  // green under such a version. The declaration forms are the near
  // misses that matter: every rule here fires on an `export` at the
  // start of a line, and these five are exactly that and must be
  // spliced.
  it('accepts every declaration form the build splices', () => {
    const refused = SPLICEABLE_LIB_SAMPLES
      .filter((sample) => refusedFormOf(sample) !== null)
      .map((sample) => sample.id);

    expect(refused).toEqual([]);
  });

  for (const entry of REEXPORT_CASES) {
    // Which rule caught the library, not merely that something did.
    // One source can carry two refused forms at once, so a case
    // reading only the throw is covered by whichever rule reached it
    // first: delete the star rule and its sample is still refused,
    // under the dependency form, with a `toThrow` assertion none the
    // wiser.
    it(`refuses ${entry.id} under the form ${entry.form}`, () => {
      const sample = sampleById(REFUSED_LIB_SAMPLES, entry.id);

      expect(refusedFormOf(sample)).toBe(entry.form);
    });
  }
});
