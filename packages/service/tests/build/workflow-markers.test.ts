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
 * The subjects after them are not settings rules at all, and sit
 * here because they belong to the same module. Two of them are
 * about a library: which ones the build will paste into a Code
 * node, and what it takes off one before pasting it. Both judge a
 * library a transpiler has already been over, so their cases hand
 * over a recorded transpile out of `marker-fixtures.ts` — the same
 * reason the settings cases run on arguments, a vitest worker
 * having no `Bun.Transpiler` to produce a fresh one with.
 *
 * The refusals `assertSpliceable` makes need a guard the settings
 * ones do not. The whole output of that function is a throw, so
 * every refusal case ever written for it is satisfied by a version
 * refusing whatever it is handed, and a section of nothing but
 * refusals reads green under one. Each refused sample is asked
 * beside the nearest library that must be ACCEPTED, and the two
 * differ by the thing the rule is about.
 *
 * The forms refused for how a library DECLARES its names need one
 * thing the dependency form does not: the refusal has to say WHICH
 * of them caught the library. One source can break two rules at
 * once — a star re-export is a dependency wearing an export
 * keyword, and is measured to be both — so a case reading only that
 * something was thrown is covered by whichever rule reached it
 * first, and would stay green with the star rule deleted outright.
 *
 * The strip is the other half of that pair, and its cases read the
 * way the refusals cannot: it returns a value, so each compares a
 * whole body against a recorded `stripped` and reddens for a strip
 * taking too little as readily as for one taking too much. What
 * the recording cannot supply is a reason to believe there was
 * anything to take — a sample still carrying its keyword after the
 * strip was recorded would be satisfied by a function handing its
 * argument straight back — so a guard reads that off the fixtures
 * before any of the five forms is asked.
 *
 * Its control is the mirror of the string-literal one above and
 * catches the opposite mistake. A library declaring a template
 * literal that itself shows an indented `export const` carries two
 * of them, and only the one at column one is a declaration: a
 * replacement matching the phrase anywhere takes both, and hands
 * back a literal holding a snippet nobody wrote. That library
 * still transpiles and still splices, so the build has no second
 * chance to notice.
 *
 * The last two subjects are the whole marker pass rather than one
 * rule inside it. `resolveMarkers` is what a build hands a parsed
 * source to, so both hand over a template — a source-shaped object
 * with the marker buried where a node buries a body — and one
 * builder makes every one of them, so a refused template and the
 * resolved one it stands beside differ by the marker alone.
 *
 * The first is the two marker forms the build no longer resolves,
 * one form to a template. One rule refuses both and names the first
 * it finds, so a template carrying both would be refused under one
 * of them while saying nothing about the other.
 *
 * Neither of those cases may read the throw. A retired form left
 * standing reaches the serialized artifact and the survival check
 * refuses it there, so a build carrying one fails either way, and
 * only the class and the form say which rule caught it. Their
 * guard is the live inline form the two are near misses of:
 * `__INLINE:` and `__INLINE_JSON:` part company only in the
 * characters between `INLINE` and the colon, so a refusal keyed on
 * the shared prefix takes the one marker the build exists to
 * resolve. Reading that library's body back is the single case
 * there that reddens for a pass refusing whatever it is handed.
 *
 * The last is a library marker naming a path outside the directory
 * the build inlines from: one absolute, one walking out with a `..`
 * segment. Both are that same live marker with an escape written in
 * front of the path, so the prefix is the whole of what parts a
 * refused marker from a resolved one — and resolving the path with
 * nothing in front of it is what says the section is not simply
 * refusing whatever it is handed.
 *
 * Those refusals are read as the class and its two fields, and not
 * for the reason the retired ones are. Nothing further on re-checks
 * a path: one the rule let through is replaced by whatever the
 * loader returned, leaving no marker for the survival check to
 * find. What such a path meets next is the loader, and the fixture
 * one here answers for a single library and refuses every other
 * path — so a rule gone missing reddens those cases with a bare
 * `Error` rather than passing them, and the class is what tells the
 * two apart.
 *
 * What no refusal there can say is that a path pointed OUTSIDE
 * anything. The rule reports the form it matched, which is text, so
 * the guard reading that property resolves each path from a
 * directory and asks whether it stayed underneath — beside the
 * accepted path, which does.
 */
import type { LibSample } from './marker-fixtures.js';
import type { EnvSource, LibLoader } from '../../scripts/workflow-markers.js';

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  ENV_DEFAULTS,
  MarkerPathError,
  RetiredMarkerError,
  SpliceableLibError,
  UnresolvedSettingError,
  assertSpliceable,
  envSources,
  parseDotenv,
  readEnvFile,
  resolveEnvVar,
  resolveMarkers,
  stripDeclarationExports,
} from '../../scripts/workflow-markers.js';

import {
  LIB_CONTROL_SAMPLES,
  REFUSED_LIB_SAMPLES,
  SPLICEABLE_LIB_SAMPLES,
  valueAtPath,
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
 * The default sample, read out here for the control below rather
 * than for a claim of its own.
 *
 * What the control needs from it is the phrase: the two libraries
 * carry the same text and are judged differently, so the form this
 * sample is refused under is where that text is spelled. Written
 * again beside the control it would be a second spelling, and a
 * control carrying a phrase the rule no longer fires on is accepted
 * by a rule that had stopped firing on anything.
 */
const DEFAULT_SAMPLE = sampleById(REFUSED_LIB_SAMPLES, 'refused-default');

/**
 * The library ACCEPTED here: one whose body carries the phrase
 * {@link DEFAULT_SAMPLE} is refused for, inside a string literal.
 *
 * The near miss the default rule is likeliest to be written wrongly
 * for. `export` is an ordinary word, and a library quoting the
 * splice rule — in a message, a comment, a snippet it hands to a
 * reader — carries the text without carrying the form. A rule
 * matching the phrase anywhere in the transpiled text refuses this
 * source at build time, under a form the file never used, for a
 * library that declares one function and nothing else.
 *
 * A control rather than a claim about the strip: nothing is removed
 * from this library, and what it says is where the rule above may
 * NOT fire.
 */
const STRING_LITERAL_SAMPLE = sampleById(
  LIB_CONTROL_SAMPLES,
  'control-export-text-in-string',
);

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

  // The guard the control rests on, and the one thing about that
  // sample a case cannot read off the function. Accepting a library
  // is what this function does for almost everything handed to it,
  // so the case below says something only while this source really
  // carries the phrase the default rule fires on — and carries it
  // nowhere a statement can begin.
  //
  // Read by blanking the quoted literals rather than by anchoring a
  // regex to the start of a line. The rule's own test is the anchor,
  // and a guard written that way would be the rule restated: it
  // would move with the rule, and would agree with a rule that had
  // moved wrongly.
  it('is asked about a library quoting the phrase in a literal', () => {
    const outsideLiterals = STRING_LITERAL_SAMPLE.transpiled
      .replace(/"[^"]*"/gu, '""');

    expect(STRING_LITERAL_SAMPLE.transpiled)
      .toContain(DEFAULT_SAMPLE.refusedForm);
    expect(outsideLiterals).not.toContain(DEFAULT_SAMPLE.refusedForm);
  });

  // The control itself, and the near miss that gives the claim above
  // it its edge: this source and `refused-default` carry the same
  // phrase, and are told apart by where it sits. A rule refusing on
  // the text alone passes every case in this section and fails here
  // — which is the whole of what a false-positive control is for,
  // since a roster of refusals can only ever say that something is
  // refused.
  //
  // The form is read back rather than the throw, so a failure names
  // the rule that fired wrongly instead of reporting that one did.
  it('accepts a library carrying the phrase inside a string', () => {
    expect(refusedFormOf(STRING_LITERAL_SAMPLE)).toBeNull();
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

// ---------------------------------------------------------------------------
// Taking the keyword off a declaration the build accepted
// ---------------------------------------------------------------------------

/** One spliceable declaration form, paired to its planted sample. */
interface DeclarationCase {
  /** The form whose leading keyword has to come off. */
  readonly form: string;

  /** The sample in `SPLICEABLE_LIB_SAMPLES` standing for it. */
  readonly id: string;
}

/**
 * The five forms a leading `export ` is taken off, each paired to
 * the library planted for it.
 *
 * Written out here rather than read off the samples, for the reason
 * the refused forms are, and a guard below asserts the two agree: a
 * fixture re-labelled to match whatever the build had started doing
 * would carry this table along with it, leaving five cases passing
 * about a rule nobody chose.
 */
const DECLARATION_CASES: readonly DeclarationCase[] = [
  { form: 'export function', id: 'spliceable-function' },
  { form: 'export const', id: 'spliceable-const' },
  { form: 'export class', id: 'spliceable-class' },
  { form: 'export let', id: 'spliceable-let' },
  { form: 'export var', id: 'spliceable-var' },
];

/**
 * The library kept for the other half of the rule: one declaring a
 * template literal that itself holds an indented `export const`.
 *
 * The near miss the strip is likeliest to be written wrongly for.
 * `export` is an ordinary word, and a library showing a snippet to
 * whoever reads it carries the phrase without carrying the form. A
 * replacement matching that phrase anywhere takes the snippet's
 * keyword too, and the literal comes back holding something it was
 * never written to hold — for a library that still transpiles,
 * still splices, and reads wrongly only to whoever the snippet was
 * for.
 *
 * Its `stripped` field pins both halves in one comparison: the
 * declaration's own keyword gone, the literal's left where it was.
 */
const TEMPLATE_LITERAL_SAMPLE = sampleById(
  LIB_CONTROL_SAMPLES,
  'control-export-in-template-literal',
);

/**
 * How many times a phrase occurs in a text.
 *
 * Counting rather than matching, because the guard reading it is
 * about there being TWO of something and one of them moving.
 * `toContain` cannot tell one occurrence from two, and a
 * line-anchored regex would be the rule under test restated — it
 * would move with the rule, and would agree with one that had moved
 * wrongly.
 *
 * @param text - The text to count in.
 * @param phrase - The phrase to count, matched literally.
 * @returns How many times it occurs.
 */
function occurrencesIn(text: string, phrase: string): number {
  return text.split(phrase).length - 1;
}

describe('stripDeclarationExports — the keyword on a declaration', () => {
  // The coverage guard. These five are every sample the spliceable
  // roster carries, so a sixth planted there with no case beside it
  // fails rather than going untested — which is how a form added to
  // the build's own regex arrives.
  it('reaches every spliceable sample the fixture roster carries', () => {
    const reached = DECLARATION_CASES.map((entry) => entry.id).sort();
    const planted = SPLICEABLE_LIB_SAMPLES.map((sample) => sample.id).sort();

    expect(reached).toEqual(planted);
  });

  // The pairing, asserted rather than assumed. Each claim below
  // names a form in its own title and takes the sample from this
  // table, so a sample re-labelled to stand for a different form
  // would leave a case passing under a name that had stopped
  // describing it.
  it('pairs each sample to the form the fixture says it stands for', () => {
    const planted = DECLARATION_CASES.map(
      (entry) => sampleById(SPLICEABLE_LIB_SAMPLES, entry.id).standsFor,
    );

    expect(planted).toEqual(DECLARATION_CASES.map((entry) => entry.form));
  });

  // The guard the five claims rest on. Each compares against a
  // recorded `stripped`, and a sample whose recording still carried
  // the keyword would be satisfied by a function handing its
  // argument straight back. Read with `startsWith` rather than the
  // anchored regex the rule uses, so it says the fixture has a
  // keyword to lose rather than restating how the rule finds one.
  it('is asked about samples that carry a keyword to lose', () => {
    const planted = SPLICEABLE_LIB_SAMPLES.map((sample) => sample.id);
    const carrying = SPLICEABLE_LIB_SAMPLES
      .filter((sample) => sample.transpiled.startsWith('export '))
      .map((sample) => sample.id);
    const losing = SPLICEABLE_LIB_SAMPLES
      .filter((sample) => !sample.stripped.startsWith('export '))
      .map((sample) => sample.id);

    expect(carrying).toEqual(planted);
    expect(losing).toEqual(planted);
  });

  for (const entry of DECLARATION_CASES) {
    // The whole body compared, not the first line: the keyword and
    // the space after it are the only difference the strip is
    // allowed to make, so a replacement reshaping the declaration
    // behind it fails here as readily as one that removed nothing.
    it(`strips the keyword off ${entry.form}`, () => {
      const sample = sampleById(SPLICEABLE_LIB_SAMPLES, entry.id);

      expect(stripDeclarationExports(sample.transpiled)).toBe(sample.stripped);
    });
  }

  // The guard the control rests on, and the one thing about that
  // sample no case can read off the function: leaving a body alone
  // is most of what the strip does, so the case below says something
  // only while this library really carries a second `export const`,
  // inside its literal, indented.
  //
  // Read by blanking the literal and counting, rather than by
  // anchoring a regex to the start of a line. The rule's own test is
  // the anchor, and a guard written that way would be the rule
  // restated. Two occurrences whole and one with the literal blanked
  // puts the second inside it; the space in front of one puts it off
  // column one, which is what saves it.
  it('is asked about a literal holding an indented export of its own', () => {
    const blanked = TEMPLATE_LITERAL_SAMPLE.transpiled
      .replace(/`[^`]*`/gu, '``');

    expect(occurrencesIn(TEMPLATE_LITERAL_SAMPLE.transpiled, 'export const'))
      .toBe(2);
    expect(occurrencesIn(blanked, 'export const')).toBe(1);
    expect(TEMPLATE_LITERAL_SAMPLE.transpiled).toContain(' export const');
  });

  // The control itself, and the near miss that gives the five claims
  // above their edge: this library carries the same phrase twice and
  // the two are told apart by where they sit. An unanchored strip
  // passes every case above and fails here, which is the whole of
  // what a false-positive control is for — a roster of strips can
  // only ever say that something was removed.
  it('leaves an indented export inside a template literal intact', () => {
    expect(stripDeclarationExports(TEMPLATE_LITERAL_SAMPLE.transpiled))
      .toBe(TEMPLATE_LITERAL_SAMPLE.stripped);
  });
});

// ---------------------------------------------------------------------------
// A source carrying a marker form the build no longer resolves
// ---------------------------------------------------------------------------

/** One retired marker form, paired to a marker written in it. */
interface RetiredCase {
  /** The form the refusal has to name. */
  readonly form: string;

  /** A whole marker in that form, as a source would write one. */
  readonly marker: string;
}

/**
 * The two forms the build refuses rather than resolves, each with a
 * marker written in it and in neither of the others.
 *
 * One rule refuses both and names the first form it finds, so a
 * template carrying both would be refused under one of them and say
 * nothing about the other. Each marker is kept to one form for that
 * reason, and the guard below asserts it rather than leaving it to
 * the eye.
 *
 * The file names are invented and nothing reads them. A retired form
 * is refused on the form alone — there is no capture to take a name
 * out of, and no file is opened — so what they are for is to make
 * each of these a whole marker rather than a bare prefix, which is
 * how a workflow source would have carried one.
 */
const RETIRED_CASES: readonly RetiredCase[] = [
  { form: '__INLINE_JSON', marker: '__INLINE_JSON:taxonomy.json__' },
  { form: '__INLINE_YAML', marker: '__INLINE_YAML:digest-rules.yaml__' },
];

/**
 * The library the accepting templates inline, and the body the
 * loader below hands back for it.
 *
 * Its own dependency is a type and erases before the transpile, so
 * the recorded body is a plain function carrying no marker of any
 * kind. Nothing read back out of it can be mistaken for a marker the
 * pass left standing.
 */
const LIVE_LIB_SAMPLE = sampleById(
  LIB_CONTROL_SAMPLES,
  'control-type-only-import',
);

/**
 * The marker the accepting template carries: the live inline form,
 * which is what both retired forms are near misses of.
 *
 * `__INLINE:` and `__INLINE_JSON:` part company only in the
 * characters between `INLINE` and the colon, so a refusal keyed on
 * the shared prefix takes this one too — and this is the marker the
 * build exists to resolve.
 *
 * The section after those is a near miss of a different kind: both
 * of its refused markers are this one with an escape written in
 * front of the path, so the prefix is the whole of what parts them
 * from it.
 */
const LIVE_MARKER = `__INLINE:${LIVE_LIB_SAMPLE.path}__`;

/**
 * Where every template below buries its marker.
 *
 * A node parameter rather than a top-level value, so the walk has to
 * descend to reach it. Depth is its own subject and no case here
 * claims anything about it, but a refusal read off a string the walk
 * never reached would be no refusal at all.
 */
const MARKER_SITE: readonly (string | number)[] = [
  'nodes',
  0,
  'parameters',
  'jsCode',
];

/**
 * A source-shaped template carrying one marker and nothing else.
 *
 * One builder for every input below, so an accepting template and a
 * refused one differ by the marker and by nothing else. Written out
 * one per case they could drift into differing somewhere the rule
 * is not about, and a control would stop being a near miss of the
 * things it stands beside.
 *
 * A function rather than a constant, for the reason the template in
 * `marker-fixtures.ts` is one: a case resolving in place would hand
 * the next one a template with nothing left to find, and that case
 * would pass by finding nothing.
 *
 * @param marker - The marker to bury at {@link MARKER_SITE}.
 * @returns A fresh template carrying it there.
 */
function templateCarrying(marker: string): Record<string, unknown> {
  return {
    name: 'AR Marker Pass Fixture',
    nodes: [
      {
        name: 'Read settings',
        parameters: { jsCode: `// build\n${marker}\n` },
      },
    ],
  };
}

/**
 * The loader every call below is made with.
 *
 * It answers for one library and refuses anything else rather than
 * handing back a body for it. A loader answering whatever it was
 * asked would turn a marker resolved against the wrong path into a
 * pass — and these refusals are about markers no loader should be
 * asked about at all, so a call reaching it is a failure that has to
 * say so.
 *
 * @param libPath - The path a library marker named.
 * @returns The recorded body of the one library it answers for.
 */
const FIXTURE_LOADER: LibLoader = (libPath) => {
  if (libPath !== LIVE_LIB_SAMPLE.path) {
    throw new Error(
      `The fixture loader was asked for ${JSON.stringify(libPath)}, and `
      + `answers only for ${JSON.stringify(LIVE_LIB_SAMPLE.path)}.`,
    );
  }

  return LIVE_LIB_SAMPLE.stripped;
};

/**
 * Run the whole marker pass over a template carrying one marker.
 *
 * No settings chain is handed over, so the pass falls back to the
 * one a default build resolves against. Nothing here carries a
 * setting marker for it to answer: the library inlined declares a
 * plain function, and the surrounding template is prose.
 *
 * @param marker - The marker to bury in the template.
 * @returns Whatever the pass returned for it.
 */
function resolveTemplateCarrying(marker: string): unknown {
  return resolveMarkers(templateCarrying(marker), { loadLib: FIXTURE_LOADER });
}

/**
 * The {@link RetiredMarkerError} a call refused with.
 *
 * A third helper beside {@link refusalOf} and
 * {@link spliceRefusalOf}, rather than one taking a class, for the
 * reason the second was written: pinning a named class is the point
 * of all three, and a helper handed the class to expect would let a
 * case pin whatever it happened to pass. Anything else thrown is
 * rethrown, so a pass failing some other way — a path escaping the
 * library directory, a setting no source answers for — fails the
 * cases below with that error rather than passing them.
 *
 * A call that RETURNED is its own failure and says so with what it
 * returned. Reading a field off a refusal that never happened would
 * otherwise fail on a property of `undefined`, naming neither what
 * was expected nor what occurred.
 *
 * @param resolve - The call under test, passed unmade so what it
 *   throws lands here.
 * @returns The refusal it threw.
 */
function retiredRefusalOf(resolve: () => unknown): RetiredMarkerError {
  let resolved: unknown;

  try {
    resolved = resolve();
  } catch (thrown) {
    if (thrown instanceof RetiredMarkerError) {
      return thrown;
    }

    throw thrown;
  }

  throw new Error(
    `resolveMarkers resolved to ${JSON.stringify(resolved)} where a `
    + 'refusal was expected.',
  );
}

describe('resolveMarkers — a marker form the build no longer resolves', () => {
  // The fixture guard, and the two things about these templates no
  // case can read off the pass. Each is refused under the first form
  // its string carries, so a marker carrying both would prove
  // nothing about the second, and a marker carrying neither would
  // leave every case below about whatever the pass does with
  // ordinary text. The second expectation is the other half: a
  // template that buried nothing at the site is refused by no rule
  // at all.
  it('is asked about templates burying one retired form apiece', () => {
    const carried = RETIRED_CASES.map((entry) => RETIRED_CASES
      .filter((other) => entry.marker.includes(other.form))
      .map((other) => other.form));
    const buried = RETIRED_CASES.filter((entry) => String(
      valueAtPath(templateCarrying(entry.marker), MARKER_SITE),
    ).includes(entry.marker));

    expect(carried).toEqual(RETIRED_CASES.map((entry) => [entry.form]));
    expect(buried).toEqual(RETIRED_CASES);
  });

  // The guard the refusals rest on, and the only case here that
  // moves when the pass refuses whatever it is handed. Every claim
  // below reads a refusal, and a section of nothing but refusals is
  // green under such a version.
  //
  // The near miss is the live inline form: it differs from both
  // retired ones only in the characters between `INLINE` and the
  // colon, so a rule keyed on the shared prefix refuses the one
  // marker the build exists to resolve, and fails here and nowhere
  // else. The library body is read back rather than the return, so a
  // pass quietly resolving the marker to nothing fails here too —
  // and the expected value is the same template built around the
  // body, which keeps the comparison from spelling a second copy of
  // either.
  it('resolves the live inline form the retired ones sit beside', () => {
    const resolved = resolveTemplateCarrying(LIVE_MARKER);
    const spliced = templateCarrying(LIVE_LIB_SAMPLE.stripped);

    expect(valueAtPath(resolved, MARKER_SITE))
      .toBe(valueAtPath(spliced, MARKER_SITE));
  });

  for (const entry of RETIRED_CASES) {
    // The class rather than the throw, and here that is the whole of
    // what a case can say by refusing. A retired marker left
    // standing reaches the serialized artifact and the survival
    // check refuses it there, so a build carrying one fails either
    // way: what this rule adds is a message about the marker rather
    // than about the output it survived into, and the class is what
    // says which of the two caught it.
    it(`throws RetiredMarkerError for a template carrying ${entry.form}`, () => {
      expect(() => resolveTemplateCarrying(entry.marker))
        .toThrow(RetiredMarkerError);
    });

    // Which form was found, carried as a field so a case says which
    // of the two it was about without parsing a sentence it did not
    // write. One rule refuses both and names the first it reaches,
    // so a case reading only the throw is covered by whichever form
    // the roster happens to try first — and would stay green with
    // the other dropped from that roster outright.
    it(`names ${entry.form} as the form it refused for`, () => {
      const refusal = retiredRefusalOf(
        () => resolveTemplateCarrying(entry.marker),
      );

      expect(refusal.form).toBe(entry.form);
    });

    // The same form in the sentence an operator actually reads,
    // since a build refusing on a terminal prints the message and
    // none of the fields.
    it(`names ${entry.form} in the message`, () => {
      const refusal = retiredRefusalOf(
        () => resolveTemplateCarrying(entry.marker),
      );

      expect(refusal.message).toContain(entry.form);
    });
  }
});

// ---------------------------------------------------------------------------
// A library marker naming a path outside the directory it inlines from
// ---------------------------------------------------------------------------

/** One way out of the library directory, paired to a path taking it. */
interface MarkerPathCase {
  /** The form the refusal has to name. */
  readonly form: string;

  /** A path leaving that way, as a marker would write one. */
  readonly libPath: string;
}

/**
 * The two ways out of the library directory the rule tells apart,
 * each written as the accepted library's own path with one escape in
 * front of it.
 *
 * Built off that path rather than spelled beside it, so a refused
 * marker and the resolved one it stands next to differ by the prefix
 * and by nothing else. Written out, the two could drift into
 * differing somewhere the rule is not about, and a case would be
 * covered by a path refused for some other reason entirely.
 *
 * Each path takes exactly one way out, and that is structural rather
 * than asserted: it is the accepted path with a single prefix in
 * front, so the one carrying `../` has no leading slash and the one
 * carrying `/` has no segment. It matters because one rule catches
 * both and tries absolute first — `/lib/../x.ts` breaks both and is
 * reported as absolute — so a path breaking both would say nothing
 * about the segment while a case claimed it had.
 */
const MARKER_PATH_CASES: readonly MarkerPathCase[] = [
  { form: 'an absolute path', libPath: `/${LIVE_LIB_SAMPLE.path}` },
  { form: 'a .. segment', libPath: `../${LIVE_LIB_SAMPLE.path}` },
];

/**
 * A directory to judge those paths against, and one no build reads.
 *
 * The rule under test is handed no directory at all: it judges what
 * a marker NAMES rather than where the name would land, so none of
 * these paths is ever joined to anything. The guard below needs one
 * anyway, because what it reads is whether a path resolved from a
 * directory stays underneath it — a mechanism the rule does not use,
 * which is the point of it. The value is arbitrary.
 */
const NOTIONAL_LIB_DIR = '/build/lib';

/**
 * The whole marker one of these paths is written inside.
 *
 * Built from the path rather than carried beside it on the roster,
 * so the path a case reads off a refusal and the path the marker
 * wrote are provably one string. Spelled twice, a marker could name
 * one path while the entry expected another, and the field claim
 * would be about a path nothing had asked for.
 *
 * @param libPath - The path the marker names.
 * @returns The marker, as a workflow source would write it.
 */
function libMarkerNaming(libPath: string): string {
  return `__INLINE:${libPath}__`;
}

/**
 * The {@link MarkerPathError} a call refused with.
 *
 * A fourth helper beside {@link refusalOf}, {@link spliceRefusalOf}
 * and {@link retiredRefusalOf} rather than one taking a class, for
 * the reason the later two were written: pinning a named class is
 * the point of all of them, and a helper handed the class to expect
 * would let a case pin whatever it happened to pass.
 *
 * What it rethrows is what makes this section redden for a rule that
 * had gone missing rather than pass. A path the rule let through is
 * handed straight on to the loader, and {@link FIXTURE_LOADER}
 * answers for one library and refuses every other path — a refusal
 * that is not this class, so it arrives here and goes back out.
 *
 * A call that RETURNED is its own failure and says so with what it
 * returned, for the reason {@link retiredRefusalOf} gives.
 *
 * @param resolve - The call under test, passed unmade so what it
 *   throws lands here.
 * @returns The refusal it threw.
 */
function markerPathRefusalOf(resolve: () => unknown): MarkerPathError {
  let resolved: unknown;

  try {
    resolved = resolve();
  } catch (thrown) {
    if (thrown instanceof MarkerPathError) {
      return thrown;
    }

    throw thrown;
  }

  throw new Error(
    `resolveMarkers resolved to ${JSON.stringify(resolved)} where a `
    + 'refusal was expected.',
  );
}

describe('resolveMarkers — a library marker leaving the directory', () => {
  // The fixture guard, and the half of these paths no case can read
  // off the pass. Every claim below is about a path that points
  // outside the library directory, and nothing in a refusal says it
  // does — the rule reports the form it matched, which a path
  // pointing nowhere in particular would match just as well.
  //
  // So the property is read here instead, by resolving each path
  // from a directory and asking whether it stayed underneath. That
  // is not how the rule judges them, which is what keeps the guard
  // from moving with a rule that moved wrongly. The accepted path is
  // resolved beside them for the same reason a control exists at
  // all: with nothing landing inside, landing outside says nothing.
  it('is asked about paths that resolve outside a directory', () => {
    const escaping = MARKER_PATH_CASES.filter((entry) => !resolve(
      NOTIONAL_LIB_DIR,
      entry.libPath,
    ).startsWith(`${NOTIONAL_LIB_DIR}/`));
    const inside = resolve(NOTIONAL_LIB_DIR, LIVE_LIB_SAMPLE.path);
    const forms = new Set(MARKER_PATH_CASES.map((entry) => entry.form));

    expect(escaping).toEqual(MARKER_PATH_CASES);
    expect(inside.startsWith(`${NOTIONAL_LIB_DIR}/`)).toBe(true);
    expect(forms.size).toBe(MARKER_PATH_CASES.length);
  });

  // The guard the refusals rest on, and the only case here that
  // moves when the pass refuses whatever it is handed. Every claim
  // below reads a refusal, and a section of nothing but refusals is
  // green under such a version.
  //
  // The near miss is the same library path with nothing in front of
  // it: both refused markers are this one plus a prefix, so a rule
  // reaching for the separator rather than for where it sits refuses
  // the marker the build exists to resolve, and fails here and
  // nowhere else. The library body is read back rather than the
  // return, so a pass quietly resolving the marker to nothing fails
  // here too.
  it('resolves that same path with no escape in front of it', () => {
    const resolved = resolveTemplateCarrying(LIVE_MARKER);
    const spliced = templateCarrying(LIVE_LIB_SAMPLE.stripped);

    expect(valueAtPath(resolved, MARKER_SITE))
      .toBe(valueAtPath(spliced, MARKER_SITE));
  });

  for (const entry of MARKER_PATH_CASES) {
    // The class rather than the throw. A path refused here is never
    // opened, so what a case would otherwise be reading is the
    // loader's own refusal at being asked for a library it does not
    // answer for — a different rule, one line further on, arriving
    // as a bare `Error`.
    it(`throws MarkerPathError for a marker naming ${entry.form}`, () => {
      expect(() => resolveTemplateCarrying(libMarkerNaming(entry.libPath)))
        .toThrow(MarkerPathError);
    });

    // Which of the two rules caught the path, carried as a field so
    // a case says what it was about without parsing a sentence it
    // did not write. One rule catches both and names the first it
    // reaches, so a case reading only the throw is covered by
    // whichever way out is tried first — and would stay green with
    // the other rule dropped outright.
    it(`names ${entry.form} as the form it refused for`, () => {
      const refusal = markerPathRefusalOf(
        () => resolveTemplateCarrying(libMarkerNaming(entry.libPath)),
      );

      expect(refusal.form).toBe(entry.form);
    });

    // The path as the marker wrote it, unresolved and never joined
    // to the library directory. It is the field a reader turns back
    // into the source that wrote it, and the one thing here a build
    // would have needed a directory to produce — a refusal naming a
    // path resolved against one would be about a file rather than
    // about the characters a marker carried.
    it(`carries ${entry.libPath} as a field on the refusal`, () => {
      const refusal = markerPathRefusalOf(
        () => resolveTemplateCarrying(libMarkerNaming(entry.libPath)),
      );

      expect(refusal.libPath).toBe(entry.libPath);
    });

    // The same path in the sentence an operator actually reads,
    // since a build refusing on a terminal prints the message and
    // none of the fields. In the marker form rather than bare,
    // which is what turns the refusal into a `git grep` over
    // `workflows/src/` for the source the marker was written in.
    it(`names ${entry.libPath} in the message, as a marker`, () => {
      const refusal = markerPathRefusalOf(
        () => resolveTemplateCarrying(libMarkerNaming(entry.libPath)),
      );

      expect(refusal.message).toContain(libMarkerNaming(entry.libPath));
    });
  }
});
