/**
 * @packageDocumentation
 * The marker grammar a workflow source may carry, and the build-time
 * settings table those markers resolve against.
 *
 * Kept apart from `build-workflows.ts`, the entry point this module
 * sits beneath — the two are one delivery, split along the line
 * between what needs a real bun process and what does not. Reading
 * `workflows/src/`, transpiling a library with `Bun.Transpiler` and
 * writing `workflows/dist/` belong to the entry point. The rules
 * saying what a marker means, which forms are refused, and what a
 * setting resolves to belong here.
 *
 * That split is what makes the rules testable rather than merely
 * tidy. `Bun.Transpiler` is absent from the process the default suite
 * runs in, so a resolver reaching for one directly could be exercised
 * only by spawning a build and reading its output — a run of the
 * whole pipeline, over a directory tree, to assert one refusal.
 * Everything on the resolution path takes what it needs as an
 * argument instead: a loader returning a splice-ready library body,
 * an ordered list of the places a setting may be read from. A case
 * hands those a fake and asserts on the value that comes back, with
 * no filesystem and no transpiler anywhere in the run. Reading a
 * `.env` off disk is a step taken BEFORE resolution starts, not
 * something resolution does for itself, which is why it can be.
 *
 * The settings table sits here for a different reason, and it is a
 * boundary rather than a convenience: a build setting is not a
 * service setting. `src/config.ts` is the zod schema every value the
 * running service reads passes through, and a name resolved while
 * generating an artifact never reaches that service. Declaring one
 * there would add a schema entry per marker for a value nothing at
 * runtime consults, and would leave a developer's own environment one
 * import away from the generated output.
 */
import { readFileSync, statSync } from 'node:fs';

/**
 * What every `__ENVVAR:<NAME>__` marker resolves to when no other
 * source answers for the name.
 *
 * This table is the whole of what the default build reads. Settings
 * resolution is opt-in, so a build handed neither an environment nor
 * a `.env` path consults these values and nothing else, and every
 * setting a workflow source may name has an entry here. A name with
 * no entry resolves only while a caller supplies one, and fails the
 * build otherwise rather than baking an empty string into a node
 * parameter.
 *
 * The values are strings because an environment variable is one: a
 * marker resolves to text wherever it sits, and a parameter wanting
 * a number parses it on the far side of the build. Nothing here is
 * read by the running service, which is why none of it belongs in
 * the zod schema in `src/config.ts`.
 */
export const ENV_DEFAULTS: Readonly<Record<string, string>> = {
  /**
   * The stamp a built workflow carries on its canvas, answering
   * which checkout the artifact in front of an operator was
   * generated from.
   *
   * `dev` is the fallback rather than the usual value:
   * `scripts/build-workflows.ts` resolves the git short commit and
   * supplies it in front of this table, and this is what a build
   * with no commit to name — an unpacked tarball, an image with no
   * git binary — is stamped with instead.
   */
  AR_BUILD_TAG: 'dev',

  /**
   * How often `ar-dispatch` wakes up, as the cron expression its
   * schedule trigger carries.
   *
   * A tick rate, not a schedule. No row's timing is written here:
   * what a tick does is claim the schedulable rows whose own
   * `next_run_at` has already passed, so `interval_seconds` on the
   * row decides when it comes due and this decides how soon
   * afterwards anything notices. That makes the expression the floor
   * on how precise every schedule in the system can be — a row
   * asking for five minutes gets whatever this grants.
   *
   * Hourly rather than quarter-hourly, and the floor argument above
   * is why that needed deciding rather than defaulting. A tick is not
   * free: the dispatcher exists to invoke the downstream workflows,
   * and from phase 6 those make paid model calls, so four ticks an
   * hour is four times the spend for the same rows coming due. A
   * schedule is acquired cheaply — one expression, in one field, on
   * one trigger — and then charged once per tick for as long as
   * nobody looks at it, which is the asymmetry this default is set
   * against. Nothing a tick reaches today makes such a call; the
   * targets arrive in phases 5 and 6. Choosing the cadence before
   * the first bill rather than after it is the point.
   *
   * A rate, not a ceiling. Ticking hourly bounds how often spending
   * can start and says nothing about what one pass costs:
   * `AR_DISPATCH_BATCH_CAP` below bounds the rows a pass claims, and
   * the per-run ceilings the model-holding workflows carry from
   * phase 6 bound what each claimed row spends. An operator wanting
   * finer timing changes one value here, and takes on the bill that
   * comes with it.
   *
   * Five fields, matching the form the schedule trigger's
   * `cronExpression` field takes.
   */
  AR_DISPATCH_CRON: '0 * * * *',

  /**
   * The most schedulable rows a single `ar-dispatch` tick claims.
   *
   * A ceiling on the work one pass starts, not on the work waiting:
   * rows past the cap stay due, because claiming is what moves a
   * row's `next_run_at`, and the following tick takes them.
   *
   * The cap bounds a pass by itself, with no reference to how many
   * rows came due — worth stating because the number due is nothing
   * anyone chooses. A dispatcher left off for a day, an operator
   * enabling a batch of rows in one sitting, a seed writing
   * `next_run_at` in the past: each leaves a backlog the next tick
   * would otherwise start all of at once. Under the cap that tick
   * starts this many, and the rest drain over the ticks after it.
   *
   * Applied twice, and the two applications do not defend the same
   * thing. Each claim statement in `ar-dispatch` carries it as a SQL
   * `LIMIT`; the Code node downstream applies it again over the
   * merged claims, through `capBatch` in `src/lib/schedule.ts`.
   * The rule that second application runs has landed; the dispatcher
   * carrying both applications arrives later in this phase. The
   * duplication is there because a `LIMIT` reads as paging. Whoever
   * next tunes that query — adding a filter, changing the ordering,
   * folding in a join — sees a performance knob rather than the only
   * thing standing between one pass and the whole backlog, and it is
   * one edit from being gone.
   *
   * Only the second application survives such an edit, and it is
   * worth being exact about what that leaves. The Code node bounds
   * what is INVOKED, which is what costs money once phase 6 puts
   * model calls behind the dispatch. It cannot bound what was
   * claimed: a claim has already moved `next_run_at`, so rows a
   * vanished `LIMIT` let through would be rescheduled without ever
   * being run — skipped silently until they next come due. The
   * second copy holds the spending line; it does not make the claim
   * query safe to leave unbounded.
   */
  AR_DISPATCH_BATCH_CAP: '25',

  /**
   * The workflow `ar-dispatch` invokes for a claimed `topics` row.
   *
   * One of a pair, and what picks between them is the KIND of the
   * claimed row rather than anything written on the row itself: a
   * topic is dispatched to this workflow, an export subscription to
   * `AR_EXPORT_WORKFLOW_ID`. Neither stands in for the other. The
   * dispatcher that reads both arrives later in this phase.
   *
   * An id and not a display name. The id is what an Execute Workflow
   * node addresses, what the instance stores a workflow under, and
   * under the one-file-per-workflow rule the roster in
   * `workflows/src/README.md` states, the name of the source file as
   * well — so the value here is one string standing in three places,
   * and a rename is all three or none.
   *
   * `ar-ingest` is the id that roster reserves for the topic path:
   * pull adapters, dedupe, gate, document through to a finding. That
   * is the work a topic coming due asks for, which is why the id is
   * the default here rather than something an operator supplies.
   *
   * Neither id names a workflow that exists. The roster delivers
   * `ar-ingest` in phase 5 and `ar-digest` in phase 6, so the
   * dispatcher landing in this phase resolves a correct id, addresses
   * it, and finds nothing behind it on the instance. That is the
   * expected state for both settings rather than a misconfiguration:
   * the value is right and the target has not been built.
   *
   * A target that is not there is routed, not raised. The dispatcher
   * invokes through an Execute Workflow node, and that node carries a
   * second output for its own failures — so the claimed row takes the
   * error branch, the node behind it closes that row's run as failed
   * naming the target it could not reach, and the tick carries on.
   * Both shapes either side of that are worse. Letting the failure
   * propagate would take a whole pass down over a workflow nobody
   * expected to be there yet; continuing on the REGULAR output would
   * close the run as a success, which is how a dispatch that never
   * happened comes to read like one that did.
   *
   * So a run reading failed against an absent target is the accurate
   * record until those phases land, not noise to be suppressed. What
   * the error branch does not buy is a retry: claiming and
   * rescheduling are one statement, so the row's `next_run_at` moved
   * before the dispatch was attempted, and a row whose target is
   * missing waits its whole interval before anything tries it again.
   */
  AR_TOPIC_WORKFLOW_ID: 'ar-ingest',

  /**
   * The workflow `ar-dispatch` invokes for a claimed
   * `export_subscriptions` row.
   *
   * The other half of the pair `AR_TOPIC_WORKFLOW_ID` opens, on the
   * same terms. Two entries rather than one because the two kinds of
   * claimed row are two different workflows' work, and a single
   * target would make the dispatcher the thing that told them apart.
   *
   * `ar-digest` is the id the roster in `workflows/src/README.md`
   * reserves for the export path: digests, plus the export
   * subscriptions the dispatcher schedules. A subscription coming due
   * asks for its export to be rendered, which is that workflow's own
   * work.
   *
   * Its target arrives a phase later than the other half's —
   * `ar-ingest` in phase 5, `ar-digest` in phase 6 — so the two ids
   * stop naming absent workflows at different times. Phase 5 is the
   * window where that shows: a claimed topic reaches a workflow that
   * exists while a claimed subscription still reaches nothing, and
   * one tick records successes and failures side by side for a reason
   * that is nobody's mistake. The error branch described under
   * `AR_TOPIC_WORKFLOW_ID` is what keeps those two outcomes readable
   * apart on the `runs` rows rather than letting the second read as a
   * fault in the first.
   */
  AR_EXPORT_WORKFLOW_ID: 'ar-digest',
};

/**
 * The name shape a dotenv line must carry for `parseDotenv` to read
 * its value: the environment-variable grammar of a letter or
 * underscore followed by letters, digits and underscores.
 *
 * Anchored at both ends, so a key with a stray space, a dash or a
 * leading digit fails it whole rather than matching a prefix.
 */
const DOTENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Read one dotenv value, with quoting deciding where it ends.
 *
 * The two cases end differently, which is the whole of what quoting
 * buys an operator here. A quoted value ends at its closing quote
 * and anything after that is commentary, so a `#` INSIDE the quotes
 * survives — which is what makes a fragment, a colour or a comment
 * character writable at all. An unquoted value ends at the first
 * whitespace-preceded `#`, so `a#b` stays whole while `a # b`
 * becomes `a`.
 *
 * An opening quote with no closing one is read as unquoted rather
 * than reported, so the quote character stays in the value. That is
 * the shell's own answer to an unbalanced quote turned into
 * something a build can carry on past, and it is visible in the
 * resolved value rather than silent.
 *
 * Nothing is unescaped. A `\n` in a value is a backslash and an
 * `n`, as it is inside the shell's single quotes.
 *
 * @param raw - Everything after the first `=`, already trimmed.
 * @returns The value the line declares.
 */
function dotenvValue(raw: string): string {
  const quote = raw.startsWith('\'') || raw.startsWith('"')
    ? raw.slice(0, 1)
    : '';

  const close = quote === ''
    ? -1
    : raw.indexOf(quote, 1);

  return close > 0
    ? raw.slice(1, close)
    : raw.replace(/\s+#.*$/, '');
}

/**
 * Read dotenv-style text into the settings it declares.
 *
 * The grammar is the one a shell reading the same file with
 * `set -a; . ./.env` would accept, and matching that is the point
 * rather than a convenience: an operator's `.env` is a file they
 * also source by hand, so a build reading it differently would
 * resolve a marker to a value they cannot reproduce at a prompt.
 * One `KEY=VALUE` per line, an optional `export ` prefix, blank and
 * `#` comment lines skipped, surrounding quotes stripped, and a
 * trailing ` #` comment dropped from an unquoted value.
 *
 * A line this cannot read is skipped rather than refused, and the
 * leniency is bounded on purpose: nothing here decides whether a
 * setting resolved. `ENV_DEFAULTS` stands behind every name, and a
 * name no source answers for fails the build by itself, so a line
 * dropped here costs a default rather than a blank. Refusing the
 * file instead would let a comment form or a shell-ism this grammar
 * does not cover — an operator's `.env` is not written for this
 * parser — stop a build over a line no marker reads.
 *
 * What that skips is every line without an `=` past its first
 * character, and every key outside `DOTENV_KEY`. A key IS trimmed
 * before it is matched, so `KEY = value` is read; a key holding a
 * space is not.
 *
 * @param text - The contents of a `.env`-style file.
 * @returns Every setting the text declares, a later line for the
 *   same key overriding an earlier one.
 */
export function parseDotenv(text: string): Record<string, string> {
  const settings: Record<string, string> = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^export\s+/, '');
    const equals = line.indexOf('=');

    if (line === '' || line.startsWith('#') || equals <= 0) {
      continue;
    }

    const key = line.slice(0, equals).trim();

    if (DOTENV_KEY.test(key)) {
      settings[key] = dotenvValue(line.slice(equals + 1).trim());
    }
  }

  return settings;
}

/**
 * Read a `.env` file into the settings it declares.
 *
 * A missing file is not an error, and that is the whole reason a
 * path is read through here rather than by a `readFileSync` at the
 * call site. A `.env` is optional in the strong sense: the default
 * build names no file at all, and `ENV_DEFAULTS` stands behind
 * every `__ENVVAR:<NAME>__` a workflow source may carry, so a build
 * with nothing to read still resolves every setting and writes the
 * same artifact. An absent file costs an override that was never
 * offered, never a value.
 *
 * A path naming nothing and no path at all are the same answer for
 * the same reason, which is why both come back empty rather than
 * one of them being the caller's problem.
 *
 * Absent is the only failure answered this way. A path naming
 * something that exists and cannot be read — a directory, a file
 * the build may not open — throws, because that is an operator
 * asking for a file and not getting it. Folding that into the empty
 * object would hand back the defaults under a build that was told
 * to override them, and a build stamping placeholder settings into
 * a deploy artifact is the outcome this whole opt-in shape exists
 * to make visible.
 *
 * @param path - Path to a `.env`-style file, or `null` when the
 *   build names none.
 * @returns Every setting the file declares, empty when there is no
 *   file to read.
 */
export function readEnvFile(path: string | null): Record<string, string> {
  if (path === null) {
    return {};
  }

  if (statSync(path, { throwIfNoEntry: false }) === undefined) {
    return {};
  }

  return parseDotenv(readFileSync(path, 'utf8'));
}

/**
 * One place a setting may be read from while a marker resolves.
 *
 * Values are optional because an environment types them that way:
 * `process.env` answers for a name it does not carry with
 * `undefined` rather than leaving the key out, so a source has to
 * admit that value to be one of these at all.
 */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * The places a build reads settings from.
 *
 * Every member is optional, and each is a place the build does not
 * read unless it is given one: an omitted member contributes
 * nothing rather than being filled in from the process the build
 * happens to be running in.
 */
export interface EnvSourceOptions {
  /**
   * An environment to read, `process.env` where a caller means
   * that — handed over deliberately, never reached for here.
   */
  readonly env?: EnvSource;

  /**
   * Path to a `.env`-style file to read, or `null` for none. Read
   * through {@link readEnvFile}, so a path naming nothing costs an
   * override rather than failing the build.
   */
  readonly envFile?: string | null;

  /**
   * The table standing behind every name, {@link ENV_DEFAULTS}
   * unless a caller replaces it — which is how a case pins what it
   * resolves against instead of inheriting the shipped values.
   */
  readonly envDefaults?: Readonly<Record<string, string>>;
}

/**
 * Build the ordered chain one `__ENVVAR:<NAME>__` is resolved
 * against.
 *
 * Highest precedence first: the environment, then the `.env` file,
 * then the defaults table. Called with no arguments the chain is
 * `ENV_DEFAULTS` behind two empty objects — the default build
 * resolves against the table alone, and neither an environment nor
 * a file is read unless a caller passes one.
 *
 * Opt-in because the alternative poisons the artifact. The obvious
 * order — environment, then a `.env`, then a default, always on —
 * makes every build absorb whatever the developer running it
 * happens to have exported, and a `.env` naming a host on their own
 * network lands in `workflows/dist/` as a node parameter. That is a
 * build one machine can reproduce and no other, from sources saying
 * nothing about the difference. Reaching for `process.env` anywhere
 * on this path is the single edit that turns it back on, which is
 * why nothing in this module does.
 *
 * The usual tripwire for that is missing here, which is why the
 * opt-in carries the whole defence rather than backing one up.
 * Where generated output is committed, a poisoned artifact surfaces
 * as a rebuild-and-diff failure — loud, if confusing, since its fix
 * hint is to re-run the generator and the generator produces the
 * same wrong file again. `workflows/dist/` is gitignored, so there
 * is no diff to fail. A locally-flavoured artifact simply is the
 * build: the one the workflow invariants read, and the one every
 * later phase is judged against.
 *
 * One caller passes an environment on purpose. The `--external`
 * deploy build in `scripts/build-workflows.ts` hands `process.env`
 * and a `.env` path through these options, and writes to
 * `workflows/dist-external/` rather than to `workflows/dist/` — a
 * separate directory rather than a flag on the same one, so the
 * artifact that absorbed an environment and the artifact that could
 * not are never the same file.
 *
 * The failure this shape is set against is written up in
 * `~/.claude/skills/codegen-env-defaults-not-process-env/SKILL.md`,
 * a user-level skill rather than one vendored under `.claude/`
 * here — which is why the argument is carried above rather than
 * left to the link.
 *
 * A chain rather than one merged object, because the sources are
 * walked rather than layered. Which entries count as answers is
 * the resolver's rule, and merging here would settle that question
 * before the resolver arrives later in this stage — an empty entry
 * in an earlier source would have overwritten a real value in a
 * later one while both were still objects, leaving nothing to
 * decline.
 *
 * The `.env` file is read while the chain is built rather than on
 * demand, so a build reads it once however many markers its
 * sources carry.
 *
 * @param options - The places to read, each defaulting to nothing.
 * @returns The sources to walk, highest precedence first.
 */
export function envSources(options: EnvSourceOptions = {}): readonly EnvSource[] {
  const { env = {}, envFile = null, envDefaults = ENV_DEFAULTS } = options;

  return [env, readEnvFile(envFile), envDefaults];
}

/**
 * Thrown when a `__ENVVAR:<NAME>__` marker names a setting no
 * source in the chain answers for.
 *
 * A distinct class rather than a bare `Error`, so a case covering
 * this path can pin the refusal to this cause. The other ways
 * resolution can fail reach a caller as `Error` too — a `.env` the
 * build may not open, a source that is not the object it was taken
 * for, a call made wrongly — and an assertion accepting any of
 * them would pass for the wrong reason. `SeedValidationError` in
 * `scripts/seed.ts` is the same arrangement for the same reason.
 *
 * The name is a field as well as part of the message, so a caller
 * can say which setting is missing without parsing prose it did
 * not write.
 *
 * `ENV_DEFAULTS` standing behind every name is what makes this
 * narrow. The table is the last source in every chain
 * {@link envSources} builds, so a shipped build reaching here names
 * a setting the table has no entry for: a misspelt marker, or an
 * entry never added beside the marker that wants it. The other way
 * in is a caller supplying its own `envDefaults`, which is how a
 * case reaches this refusal without editing the shipped table.
 *
 * A name misspelt inside a well-formed marker fails here; a marker
 * malformed around a good name does not. `__ENVVAR:AR_BUILD_TG__`
 * carries the marker form, is resolved against the chain, and
 * fails with this. Something the marker form never matches is not
 * a marker to resolve at all, and survives the pass into the
 * serialized output instead — refused there rather than here, as
 * {@link SurvivingMarkerError}.
 *
 * What the message cannot name is the file the marker came out of.
 * Resolution walks strings already parsed out of their source, so
 * the setting is the whole of what it has to hand, and a `git grep`
 * for the marker form across `workflows/src/` is what turns that
 * back into a file.
 */
export class UnresolvedSettingError extends Error {
  /**
   * The setting the marker named, without the marker syntax around
   * it — `AR_BUILD_TAG` rather than `__ENVVAR:AR_BUILD_TAG__`.
   */
  readonly setting: string;

  /**
   * @param setting - The setting no source in the chain answered
   *   for.
   */
  constructor(setting: string) {
    super(
      `__ENVVAR:${setting}__ has no value: no source the build was ` +
      'given answers for the name, and ENV_DEFAULTS carries no ' +
      'entry under it. Either the marker is misspelt, or the ' +
      'setting needs an entry in ENV_DEFAULTS beside the marker ' +
      'that wants it.',
    );
    this.name = this.constructor.name;
    this.setting = setting;
  }
}

/**
 * Resolve one `__ENVVAR:<NAME>__` setting against the chain.
 *
 * The chain is walked rather than merged, and the first source
 * holding an answer for the name settles it. That is what makes
 * the precedence {@link envSources} builds mean anything: where
 * an environment answers, neither the `.env` file nor the
 * defaults table behind it is consulted for that name at all.
 *
 * An empty string is not an answer. A source carrying the name
 * with nothing under it is walked past exactly as a source not
 * carrying the name is, so a `.env` line reading
 * `AR_DISPATCH_CRON=` resolves to the entry in `ENV_DEFAULTS`
 * rather than to a blank.
 *
 * That rule is about what an emptied value MEANS in a file an
 * operator edits by hand. A key left with its value deleted reads
 * as a setting being taken back OUT of the file, not as one being
 * set to the empty string, and nothing downstream of the parse can
 * tell those apart. Taking it at face value bakes a blank into a
 * node parameter — a schedule trigger with no cron expression, an
 * Execute Workflow node with no target id — which is a build that
 * succeeds and an artifact that fails on an instance later, in a
 * workflow nobody is watching. Falling through costs an override
 * the operator was removing anyway.
 *
 * The cost of the rule, stated rather than hidden: a setting whose
 * intended value IS the empty string cannot be expressed through
 * this chain. Nothing in `ENV_DEFAULTS` wants one, and a marker
 * stands where a value is required, so the case is priced out
 * instead of served. A setting that later wants an empty value
 * needs a sentinel with a name, not a blank.
 *
 * Nothing here judges the text. A cron expression missing a
 * field, a workflow id naming nothing on any instance, a URL with
 * a typo in the host: every one of them resolves. What a setting
 * is FOR lives in the node the marker sits in, and a build cannot
 * ask an instance whether what it just wrote is usable — so the
 * only failure this reports is a name it has no text for at all.
 *
 * @param name - The setting the marker named, without the marker
 *   syntax around it.
 * @param sources - The chain to walk, highest precedence first.
 *   Defaults to `envSources()`, which is `ENV_DEFAULTS` behind two
 *   empty objects — the default build's chain, and the safe one to
 *   inherit.
 * @returns The first non-empty value a source in the chain holds
 *   for the name.
 * @throws UnresolvedSettingError When no source in the chain
 *   answers for the name.
 */
export function resolveEnvVar(
  name: string,
  sources: readonly EnvSource[] = envSources(),
): string {
  for (const source of sources) {
    const value = source[name];

    if (typeof value === 'string' && value !== '') {
      return value;
    }
  }

  throw new UnresolvedSettingError(name);
}

/**
 * Thrown when a library named by an `__INLINE:<path>__` marker
 * cannot stand alone in a Code node.
 *
 * A spliced library is pasted into a node body, and a node body is
 * not a module: nothing there resolves a specifier, and nothing
 * consumes an export. What survives that is a declaration wearing
 * a leading `export ` keyword, because the keyword can be removed
 * and the declaration left running exactly as written. Every other
 * form is refused here, naming the file and the form, rather than
 * being written into a node that throws on its first execution.
 *
 * The refusal is the dual-context rule made mechanical. A library
 * under `src/lib/` is imported by the test suite AND spliced into
 * a workflow, and only the first of those two readers forgives an
 * import or a trailing export list. A build that let one through
 * would produce an artifact that passes every check this package
 * runs and fails on an instance, in a node nobody is watching.
 *
 * A distinct class rather than a bare `Error`, so a case covering
 * this rule can pin the refusal to it. The other ways an inline
 * fails arrive as `Error` too — a marker path naming no file, a
 * library the build may not read, a source the transpiler itself
 * rejects — and an assertion accepting any of them would pass
 * while the splice rule was missing entirely.
 *
 * Both values are fields as well as parts of the message, so a
 * case asserts on which form was named rather than parsing prose
 * it did not write. That matters because one source can break two
 * rules at once: `export * from './x.js'` is a re-export and a
 * dependency both, and a sample paired to the form it stands for
 * is only covered if the refusal named that form. The field says
 * what the refusal reported, never everything wrong with the file.
 *
 * What the message cannot name is the workflow source whose marker
 * pulled the library in. A library is loaded by path and the
 * marker site is gone by then, so a `git grep` for the marker form
 * across `workflows/src/` is what turns the path back into a
 * caller.
 */
export class SpliceableLibError extends Error {
  /**
   * The library the marker named, as the marker wrote it —
   * relative to the library directory, not an absolute path.
   */
  readonly libPath: string;

  /**
   * The form the refusal named: `export {`, `export default`,
   * `export *`, or `import` for a dependency that survived the
   * transpile.
   */
  readonly form: string;

  /**
   * @param libPath - The library the marker named.
   * @param form - The form it is refused for.
   */
  constructor(libPath: string, form: string) {
    super(
      `${libPath} cannot be spliced into a Code node: it carries ` +
      `"${form}". A spliced library is pasted into a node body, ` +
      'which is not a module, so the only form that survives is a ' +
      'declaration under a leading export keyword — export ' +
      'function, const, class, let or var. Either rewrite it as ' +
      'one of those and drop any value import, or leave the ' +
      'library out of the splice and let the node carry the logic ' +
      'itself.',
    );
    this.name = this.constructor.name;
    this.libPath = libPath;
    this.form = form;
  }
}

/**
 * One dependency a transpiler scan reports.
 */
export interface LibScanImport {
  /**
   * The form the dependency is written in, `import-statement` for a
   * static import.
   */
  readonly kind: string;

  /** The specifier, exactly as the source wrote it. */
  readonly path: string;
}

/**
 * What a transpiler scan answers about one library source.
 *
 * The shape `Bun.Transpiler.scan` returns, declared structurally
 * rather than taken from bun's own types — so nothing on the
 * resolution path depends on which bun types are installed, and a
 * case hands over a recorded answer instead of building a
 * transpiler it cannot reach from a vitest worker.
 *
 * Only `imports` is read here. `exports` is carried because a scan
 * returns it and a caller passing one along should not have to take
 * it apart first; what a library DECLARES is decided by
 * {@link stripDeclarationExports}, over the transpiled text.
 */
export interface LibScan {
  /** Every name the source exports, `default` included as a name. */
  readonly exports: readonly string[];

  /**
   * Every dependency left once type-only imports have erased. A
   * re-export counts as one: `export * from './x.js'` scans as an
   * import statement, being a dependency wearing an export keyword.
   */
  readonly imports: readonly LibScanImport[];
}

/** A transpiled library, with what the scan said about it. */
interface TranspiledLib {
  /** The library with its types erased and its exports kept. */
  readonly transpiled: string;

  /** What the transpiler's scan reported for it. */
  readonly scan: LibScan;
}

/** One form a library is refused for. */
interface SpliceRefusal {
  /**
   * The form the refusal names, carried onto
   * {@link SpliceableLibError.form} so a case asserts on which rule
   * caught the library rather than only that something did.
   */
  readonly form: string;

  /** Whether a library in this state carries the form. */
  readonly refuses: (lib: TranspiledLib) => boolean;
}

/**
 * The forms a library is refused for, in the order they are tried.
 *
 * A roster rather than a run of conditions because the order is a
 * decision rather than an accident: the first entry that matches
 * settles what the refusal NAMES, and one library can carry two
 * forms at once. The star form is what fixes the order. A source
 * reading `export * from './x.js'` scans as a dependency AND
 * carries a re-export in its text, so the dependency entry sits
 * last: ahead of the others it would refuse that library under the
 * name `import`, leaving the star rule present, working, and never
 * once the reason anything failed.
 *
 * The three re-export entries read the transpiled text rather than
 * the scan, and they have to. A transpiler reports a re-export as
 * an import and says nothing about the export keyword worn over
 * it, so a scan can tell that something is wrong but never which
 * form it is — and the form is the half a reader acts on.
 *
 * Each is anchored to the start of a line and to column one,
 * because `export` is an ordinary word. A library quoting the
 * splice rule in a string, or showing a declaration inside a
 * template literal, carries the text without carrying the form: a
 * statement begins a line, so a mid-line match is inside a literal
 * and an indented one is inside something. The limit that leaves
 * is real and goes undetected — an unindented `export const` on
 * its own line inside a template literal reads exactly like a
 * declaration, to this roster and to the strip alike. No library
 * writes one today, and nothing here would notice if one did.
 *
 * A dependency is the last entry. A Code node is not a module: it
 * resolves no specifier, so an import that survived the transpile
 * fails on the node's first execution rather than at build time,
 * which is what this refusal moves. The scan is the authority for
 * it rather than the text, because a type-only import erases before
 * the scan sees it — so a library depending on nothing but types is
 * spliceable and reads, in its source, exactly like one that is
 * not.
 */
const SPLICE_REFUSALS: readonly SpliceRefusal[] = [
  {
    form: 'export {',
    refuses: ({ transpiled }) => /^export[ \t]*\{/mu.test(transpiled),
  },
  {
    form: 'export default',
    refuses: ({ transpiled }) => /^export[ \t]+default\b/mu.test(transpiled),
  },
  {
    form: 'export *',
    refuses: ({ transpiled }) => /^export[ \t]*\*/mu.test(transpiled),
  },
  {
    form: 'import',
    refuses: ({ scan }) => scan.imports.length > 0,
  },
];

/**
 * Refuse a library that cannot stand alone in a Code node.
 *
 * Returns nothing when the library is spliceable, which is every
 * case the build carries on from. The refusal is the whole output:
 * a library reaching this point has already been read and
 * transpiled, and what remains is whether pasting it into a node
 * body would produce something that runs.
 *
 * The refusal lands at build time on purpose. A Code node is not
 * a module, so a library that cannot stand alone does not fail
 * where it was written — it fails on the node's first execution,
 * inside a run the dispatcher opened, at whatever hour the
 * schedule fired, with the executor attributing it to the
 * workflow rather than to the library spliced into it. Refusing
 * here means the artifact is never written, so there is nothing
 * to deploy and nothing on a canvas to read the failure off. And
 * nothing downstream repeats the check: `workflows/dist/` is
 * gitignored, so no committed artifact's diff would show a
 * surviving import, and the invariants suite reads a built tree
 * that exists only because this function let it be written.
 *
 * Which dependencies count is settled by the scan rather than by
 * the source, because a type-only import erases before the scan
 * sees it. Measured on the transpiler the build uses:
 * `import type { Bounds } from './bounds.js'` leaves an empty
 * import list and no trace in the transpiled text, while
 * `import { readFileSync } from 'node:fs'` survives in both. The
 * two differ by one keyword and land on opposite sides of this
 * function — a library may depend on as many types as it likes
 * and still splice, and may not depend on one value. That is the
 * lighter of the two fixes the message offers: where the
 * dependency was only ever a type, adding the keyword is the
 * whole change and the library keeps its shape.
 *
 * The limit is what a scan cannot see. Two of the three rules a
 * spliceable library obeys leave evidence and are refused here,
 * a dependency and a re-export; the third, reliance on module
 * scope, leaves none. Measured the same way, `require(p)`, a
 * dynamic `import(p)` and `import.meta.url` all scan with an
 * empty import list and survive into the transpiled text
 * unchanged, so a library reaching for one passes here and fails
 * on the node exactly the way a surviving import would. One
 * library is spliced today, `src/lib/schedule.ts`, and only in
 * the tree `tests/build/schedule-splice.test.ts` builds: no
 * workflow source names a library until `ar-dispatch`'s Code
 * node lands. It satisfies that third rule by hand, and the
 * nearest thing to a check on it is downstream rather than here:
 * that same file runs the spliced body under `new Function`,
 * which supplies no `require` and no `module` and refuses an
 * `import.meta` at construction. Reliance on module STATE gets
 * past even that, so no complete check exists and this is still
 * not where one would go.
 *
 * @param transpiled - The library with its types erased, as
 *   `transformSync` returned it.
 * @param scan - What the transpiler's scan reported for the same
 *   source.
 * @param libPath - The library as the `__INLINE:<path>__` marker
 *   named it, so the refusal points at a file rather than at a
 *   fragment of text.
 * @throws SpliceableLibError When the library carries a form a Code
 *   node cannot run — a re-export no strip can repair, or a
 *   dependency that survived the transpile.
 */
export function assertSpliceable(
  transpiled: string,
  scan: LibScan,
  libPath: string,
): void {
  for (const refusal of SPLICE_REFUSALS) {
    if (refusal.refuses({ transpiled, scan })) {
      throw new SpliceableLibError(libPath, refusal.form);
    }
  }
}

/**
 * A leading `export ` on one of the five spliceable declaration
 * forms, anchored to the start of a line and to column one.
 *
 * Only the keyword is matched — the form behind it is a lookahead —
 * so the declaration is never part of what gets replaced and cannot
 * be reshaped by a replacement. What comes back differs from what
 * went in by the keyword and the space after it, and by nothing
 * else.
 *
 * Global, because a library declares as many names as it likes and
 * every one of them carries its own keyword. Multiline and anchored
 * for the reason the refusal roster is: `export` is an ordinary
 * word, and a statement begins a line.
 */
const DECLARATION_EXPORT = /^export[ \t]+(?=(?:function|const|class|let|var)\b)/gmu;

/**
 * Strip the export keyword off every declaration a library exports,
 * leaving the declaration itself untouched.
 *
 * The last thing done to a library body before it is pasted into a
 * Code node, and the reason a build has a step here at all. A Code
 * node is not a module, so `export` is a syntax error inside one —
 * and the transpile does not remove it. Measured on the transpiler
 * the build uses: `export function f(a: number) {}` comes back as
 * `export function f(a) {}`, the types gone and the keyword intact.
 * Transpiling makes a library runnable; this makes it pasteable.
 *
 * Runs after {@link assertSpliceable} and relies on it having run.
 * The three re-export forms are statements in their own right, so
 * no strip repairs them — this function leaves `export default`,
 * `export {` and `export *` exactly as it found them, which in a
 * build is a state no library reaches because the refusal is ahead
 * of it. Called without that refusal in front, it hands back a body
 * still carrying the form.
 *
 * Column one is what separates a declaration from a mention of one.
 * The control the build keeps for that is a library holding a
 * snippet inside a template literal: the snippet's own
 * `export const` is indented, so it is left alone and the literal
 * comes back holding what it was written to hold. The limit is the
 * one the refusal roster carries too, and it is the caller's to
 * avoid — an unindented `export const` on its own line inside a
 * template literal reads as a declaration here, and the strip
 * rewrites the text that literal was carrying without anything
 * noticing.
 *
 * The five forms are the whole of what is spliceable, and a sixth
 * is the standing gap. `export async function` declares a name the
 * way the others do, but the word after `export ` is not one of the
 * five: it is neither refused above nor stripped here, and it
 * survives into a node body to fail on first execution. No library
 * writes one today. What catches it is the built-output case in
 * `tests/build/schedule-splice.test.ts`, which asserts the one
 * spliced library carries no export keyword — for that library,
 * and for no other.
 *
 * @param transpiled - A library with its types erased, already
 *   accepted by {@link assertSpliceable}.
 * @returns The same source with each declaration's leading export
 *   keyword removed.
 */
export function stripDeclarationExports(transpiled: string): string {
  return transpiled.replace(DECLARATION_EXPORT, '');
}

/**
 * The library-inlining marker, as regex source rather than a
 * compiled `RegExp`.
 *
 * `__INLINE:<path>__`, in any string of a workflow source, names a
 * library under the build's lib directory and is replaced by that
 * library's splice-ready body. The one capture is the path, which
 * is what the loader is handed.
 *
 * Source rather than an instance for the reason
 * `tests/invariants/naming-patterns.ts` keeps its needles that way:
 * replacement is global, a global `RegExp` carries `lastIndex` from
 * one call into the next, and a single shared instance therefore
 * resolves the markers in one string and skips them in the next.
 * Each caller compiles its own, and today {@link inlineLibString}
 * is the only one.
 *
 * The survival check over a built artifact is not a second caller,
 * which is worth saying because its subject invites the
 * assumption. It walks {@link SURVIVING_MARKER_FORMS} — the bare
 * `__INLINE:` prefix — rather than this grammar, because a marker
 * that reached an artifact is ordinarily one this pattern did not
 * match. A check compiled over it would be blind to exactly the
 * input it exists for.
 *
 * The character class is written out the way `DOTENV_KEY` above
 * writes its own, rather than as a shorthand escape, so the source
 * carries no backslash at all: what is written here is what
 * compiles, with no doubling to get wrong in between.
 *
 * The forward slash in that class is deliberate and is not used
 * yet. Every library sits directly under the lib directory today,
 * but phase 4 lands a wave of them under `src/lib/sources/`, and a
 * class without the separator would simply not match that marker.
 * Nothing would replace it, and it would fail the build as a marker
 * that survived the pass — naming neither the file it wanted nor
 * the directory it was looked for in. The dot is in the class for a
 * plainer reason: a library is named with its extension.
 *
 * What the class admits is not what the build accepts. A slash and
 * a dot also spell an absolute path and a `..` segment, so this
 * matches `__INLINE:/etc/x.ts__` and hands the path on;
 * {@link assertMarkerPath} is what names it. The split
 * is the point rather than an oversight. A marker the grammar
 * misses is reported as a malformed marker, while one the grammar
 * takes and the path rule refuses is reported as a path pointing
 * outside the lib directory, and only the second says which edit
 * fixes it.
 *
 * The retired forms are not hits for this pattern: `__INLINE_JSON`
 * and `__INLINE_YAML` carry an underscore where this wants its
 * colon. Refusing those is a rule of its own, reported as
 * {@link RetiredMarkerError}, rather than a case this one falls
 * through to.
 */
export const LIB_MARKER = '__INLINE:([A-Za-z0-9_./-]+)__';

/**
 * The build-setting marker, as regex source rather than a compiled
 * `RegExp`.
 *
 * `__ENVVAR:<NAME>__`, in any string of a workflow source, names a
 * build setting and is replaced by whatever the settings chain
 * resolves it to — {@link ENV_DEFAULTS} alone in the default build.
 * The one capture is the bare name, which is the form
 * {@link resolveEnvVar} takes.
 *
 * Source rather than an instance for the reasons
 * {@link LIB_MARKER} carries.
 *
 * The name grammar is the environment-variable one `DOTENV_KEY`
 * spells anchored: a letter or underscore, then letters, digits and
 * underscores. The two are written out separately rather than one
 * derived from the other by stripping the anchors off a shared
 * source, because that derivation would be the load-bearing part
 * and nothing would fail if it stopped being right. Written twice,
 * a name a `.env` can hold but a marker cannot is a difference a
 * case can pin.
 *
 * Holding the grammar here, rather than capturing anything up to
 * the closing underscores, is what turns a mistyped name into a
 * refusal that names it. `__ENVVAR:AR-BUILD-TAG__` is not a hit, so
 * nothing replaces it and it reaches the serialized output intact,
 * where the survival check over the built artifact refuses it,
 * naming the `__ENVVAR:` form.
 * A class wide enough to capture it would instead send a name no
 * source can hold into settings resolution, which reports an
 * unresolved setting: true, and about the wrong thing.
 */
export const ENV_MARKER = '__ENVVAR:([A-Za-z_][A-Za-z0-9_]*)__';

/**
 * Thrown when an `__INLINE:<path>__` marker names a file outside
 * the library directory the build inlines from.
 *
 * A marker names a library under that directory, and the directory
 * is the whole of what may be inlined. A path escaping it is
 * refused here rather than read: an absolute path names a file
 * chosen without reference to the tree the build was pointed at,
 * and a `..` segment walks out of that tree. Either one would put
 * the contents of an arbitrary file into a node body, and the
 * artifact would carry them onto every instance it is deployed to.
 *
 * A distinct class rather than a bare `Error`, so a case covering
 * the path rule can pin the refusal to it. The other ways an
 * inline fails arrive as something else: a path naming no file
 * comes back as whatever `readFileSync` throws, a source the
 * transpiler rejects as whatever it raises, and a library that
 * cannot stand alone in a node as {@link SpliceableLibError}. An
 * assertion accepting any `Error` would pass for all of those, and
 * would pass with this rule missing entirely.
 *
 * Both values are fields as well as parts of the message, so a case
 * asserts on which rule caught the path rather than parsing prose
 * it did not write. One path can break both rules at once —
 * `/etc/../x.ts` is absolute AND carries a segment — and a sample
 * paired to the form it stands for is only covered if the refusal
 * named that form.
 *
 * What the message cannot name is the workflow source whose marker
 * wrote the path. Resolution walks strings already parsed out of
 * their source, so the path is the whole of what it has to hand,
 * and a `git grep` for the marker form across `workflows/src/` is
 * what turns it back into a caller.
 */
export class MarkerPathError extends Error {
  /**
   * The path the marker named, exactly as the marker wrote it —
   * unresolved, and never joined to the library directory.
   */
  readonly libPath: string;

  /**
   * The rule that caught it: `an absolute path` or `a .. segment`.
   * Worded as the object of the message rather than as a label, so
   * the refusal reads as one sentence.
   */
  readonly form: string;

  /**
   * @param libPath - The path the marker named.
   * @param form - The rule it is refused under.
   */
  constructor(libPath: string, form: string) {
    super(
      `__INLINE:${libPath}__ names ${form}, which points outside ` +
      'the library directory the build inlines from. A marker ' +
      'names a file inside that directory, written relative to ' +
      'it. Either rewrite the path relative to the library ' +
      'directory, or move the library into it — a file outside it ' +
      'is not inlined under any spelling.',
    );
    this.name = this.constructor.name;
    this.libPath = libPath;
    this.form = form;
  }
}

/**
 * Refuse a marker path that points outside the library directory.
 *
 * Returns nothing when the path stays inside, which is every case
 * the build carries on from. The check runs before the file is
 * opened, so a refused path is never read and never transpiled.
 *
 * The rule is syntactic on purpose, and the function is handed the
 * path alone rather than the directory it would be resolved
 * against. It judges what the marker NAMES rather than where the
 * name would land, so `a/../b.ts` resolves back inside the
 * directory and is refused anyway. That is the stricter reading
 * and the deliberate one: a path walking out of the tree and back
 * in is not one anybody meant to write, and a rule that resolved
 * first would need the directory handed to it for a question that
 * does not depend on which directory it is.
 *
 * A forward slash is the only separator tested, which is complete
 * for what {@link LIB_MARKER} admits. Its path class carries no
 * backslash and no colon, so no marker can spell a Windows-style
 * traversal or a drive letter, and the only absolute form the
 * grammar can produce is a leading slash.
 *
 * The `..` test is over segments rather than over the text, so a
 * file named `bounds..ts` is left alone. A substring test would
 * refuse it, and the refusal would name a traversal in a path that
 * has none.
 *
 * The order the two rules are tried in is a decision rather than
 * an accident. A path can carry both — `/etc/../x.ts` is absolute
 * and has a segment — and absolute is tried first, so such a path
 * is reported as an absolute path. That is the half a reader acts
 * on: dropping the segment leaves the marker pointing at the same
 * file, while dropping the leading slash is the edit that moves it
 * back under the directory.
 *
 * Why this rule owns the rejection rather than the grammar, from
 * the vantage of somebody writing a marker: a path the grammar
 * missed would simply not be replaced, and the survived-the-pass
 * check downstream would report a marker it could not read —
 * naming neither the file wanted nor the directory looked in, and
 * reading as a typo. Refused here, the message says which edit
 * moves the path back inside.
 *
 * The limit is everything below the text. Nothing here touches the
 * filesystem, so a path that stays inside the directory by every
 * spelling and resolves through a symlink to somewhere else passes
 * this check and is read. No library is symlinked today, and this
 * is not where that would be caught.
 *
 * @param libPath - The path an `__INLINE:<path>__` marker named,
 *   as its capture gave it.
 * @throws MarkerPathError When the path is absolute or carries a
 *   `..` segment.
 */
export function assertMarkerPath(libPath: string): void {
  if (libPath.startsWith('/')) {
    throw new MarkerPathError(libPath, 'an absolute path');
  }

  if (libPath.split('/').includes('..')) {
    throw new MarkerPathError(libPath, 'a .. segment');
  }
}

/**
 * Thrown when a workflow source carries a marker form the build no
 * longer resolves: `__INLINE_JSON:<file>__` or
 * `__INLINE_YAML:<file>__`.
 *
 * Both once named a file in the build's own tree and inlined it
 * into a node body as a JSON literal. Neither is resolved here and
 * neither is passed through: a source carrying one is refused by
 * name, and the message says where the value it wanted is read
 * from now.
 *
 * Both retired because the configuration they carried moved into
 * the database, not because inlining a file was a mistake. The
 * JSON form baked in curated repo content, on the reasoning that
 * repo content is not runtime state and that reading it from a
 * node costs a round trip on a hot path. The YAML form converted
 * an operator-editable file at build time precisely so that no
 * committed JSON twin could drift from the hand-edited original.
 * Both arguments still hold for what they were about, and neither
 * form was config-in-code by accident.
 *
 * What ended them is that a value inlined at build time is one
 * value for every domain the artifact reaches, and this pipeline
 * runs the same workflows for as many domains as there are rows.
 * The destination is `domains.settings`, the jsonb payload on the
 * domains row: every member optional, `{}` a complete value, an
 * absent member meaning the pipeline's own default applies, read
 * per-domain at run time. Changing a value there is a row edit
 * rather than a rebuild and a redeploy of every workflow that
 * happened to inline it, and that is the whole of the argument
 * for the move. It is a change of where the configuration lives
 * rather than the removal of something that was wrong.
 *
 * Refusing by name is what keeps the marker's own text out of a
 * node body. A retired form is not a marker to a build that does
 * not know it: it matches no grammar, so nothing replaces it and
 * nothing reports it, and it is written into the artifact as the
 * literal characters somebody typed. The node then reads
 * `__INLINE_JSON:<file>__` where the value belonged, on an
 * instance, while the build that produced it reported success.
 * That silent pass-through is what this refusal is set against —
 * not the survival check over the built artifact, which reads the
 * same text from the other end of the same build.
 *
 * A distinct class rather than a bare `Error`, so a case covering
 * the retirement can pin the refusal to it. Every other way the
 * marker pass fails arrives as something else — a path escaping
 * the library directory as {@link MarkerPathError}, a library that
 * cannot stand alone in a node as {@link SpliceableLibError}, a
 * name no source resolves as {@link UnresolvedSettingError} — and
 * an assertion accepting any `Error` would pass for all of them.
 *
 * It would also pass with this rule missing entirely, which is the
 * reading that matters here and the one a `toThrow` cannot make.
 * An unresolved marker reaches the serialized artifact intact, and
 * the survival check over that artifact refuses it there — so a
 * build carrying a retired marker fails either way, and only the
 * class and the form say which rule caught it. Refusing at
 * resolution is what turns that into a message about the marker
 * rather than about the output it survived into.
 *
 * The form is a field as well as part of the message, so a case
 * asserts on which of the two was found rather than parsing prose
 * it did not write. They retired together and one rule refuses
 * both, but they are separate forms, and a sample paired to one is
 * only covered if the refusal named that one.
 *
 * What the message cannot name is the workflow source the marker
 * was written in. Resolution walks strings already parsed out of
 * their source, so the form is the whole of what it has to hand,
 * and a `git grep` for it across `workflows/src/` is what turns it
 * back into a caller.
 */
export class RetiredMarkerError extends Error {
  /**
   * The retired form the source carried: `__INLINE_JSON` or
   * `__INLINE_YAML`, without the file name or the closing
   * underscores.
   */
  readonly form: string;

  /**
   * @param form - The retired marker form the source carried.
   */
  constructor(form: string) {
    super(
      `${form} is a retired marker form. Configuration the ` +
      'pipeline reads lives in the database, on the ' +
      'domains.settings payload of the domain a run is for, ' +
      'rather than in a file baked into a node body at build ' +
      'time. Either drop the marker and have the node read the ' +
      'value from that payload, or — when the value is the same ' +
      'for every domain — express it as __ENVVAR:<NAME>__ and ' +
      'declare that name in the build defaults table.',
    );
    this.name = this.constructor.name;
    this.form = form;
  }
}

/**
 * Apply a function to every string a parsed JSON value holds.
 *
 * The walk the marker rules are carried by. Each of those rules is
 * about ONE string — a library marker replaced by a library body in
 * {@link inlineLibString}, a setting marker replaced by its value in
 * {@link resolveEnvString} — and this is what reaches every string a
 * workflow source buries one in. That split is the point rather than
 * tidiness: a case over either rule hands it a string and reads a
 * string back, with no tree to build and no depth to get right, and
 * the depths are proven once here instead of once per rule.
 *
 * What counts as a marker is not decided here. `fn` is handed every
 * string, the great majority of which carry nothing to replace, and
 * returns whatever should stand in that string's place. A rule with
 * no work to do returns what it was given.
 *
 * The tree is rebuilt rather than edited. Every object and every
 * array comes back new and the value handed in is left as it was,
 * so a caller holding a parsed source can still say what it started
 * with after resolution has run over it.
 *
 * Object VALUES only. A key is a string too, and one carrying a
 * marker is not reached: replacing a key is a change to the shape
 * rather than to the content, and it can land on a key already
 * there, which is a collision a walk has no way to report. Such a
 * marker is not silently kept either — it reaches the serialized
 * output intact, and the survival check over the built artifact
 * refuses it there, naming the form.
 *
 * The order the branches are tried in is the substance of this
 * function rather than a formatting choice, because each way of
 * getting it wrong leaves every marker correctly resolved and shows
 * up nowhere in a case asserting the markers resolved. `typeof
 * null` reports `object`, so a null reaching the object branch is
 * walked as one and comes back `{}`. `typeof []` reports `object`
 * as well, so an array rebuilt from its entries comes back an
 * object keyed `"0"` and `"1"`. A number or a boolean handed to a
 * string function comes back as text. What those cost is a workflow
 * whose markers are all resolved and whose `active` flag is now the
 * string `"false"`.
 *
 * Member order survives the rebuild. `Object.entries` visits an
 * object's own keys in the order `JSON.stringify` will serialize
 * them, and rebuilding from that order preserves it. The build's
 * output is compared byte for byte between runs, so a walk that
 * reordered members would read as a build that is not deterministic
 * rather than as a walk that is not stable.
 *
 * `unknown` in and `unknown` out rather than a generic handing the
 * caller its own type back. The shape genuinely is preserved — a
 * string for a string, an array of the same length, an object with
 * the same keys — but nothing in the body proves it, and a
 * `<T>(value: T) => T` signature buys that claim with a cast that
 * would hold for whatever the body became. Both callers are on the
 * resolution path and want a JSON value rather than a named shape.
 *
 * The limit is the input contract, and it is not checked. A finite
 * tree is assumed: `JSON.parse` cannot produce a cycle, and every
 * caller here hands over what it parsed. A hand-built object
 * referring to itself recurses until the stack ends.
 *
 * @param value - A parsed JSON value, of any of the shapes
 *   `JSON.parse` produces.
 * @param fn - Applied to every string in that value, returning what
 *   stands in its place.
 * @returns A new value of the same shape, with every string
 *   replaced by what `fn` returned for it.
 */
export function mapStrings(
  value: unknown,
  fn: (text: string) => string,
): unknown {
  if (typeof value === 'string') {
    return fn(value);
  }

  if (Array.isArray(value)) {
    const elements: readonly unknown[] = value;

    return elements.map((element) => mapStrings(element, fn));
  }

  if (typeof value === 'object' && value !== null) {
    const members = Object.entries(value as Record<string, unknown>);

    return Object.fromEntries(members.map(
      ([key, member]) => [key, mapStrings(member, fn)],
    ));
  }

  return value;
}

/**
 * What {@link inlineLibString} hands a library path to, and takes a
 * splice-ready body back from.
 *
 * Everything done to a library before it can stand in a Code node
 * happens behind this: reading the file, erasing its types,
 * refusing a form a node cannot run, and taking the export keyword
 * off what is left. What comes back is the body as it will appear
 * in the artifact.
 *
 * A function rather than the directory to read from, because that
 * work needs `Bun.Transpiler` and the default suite's process has
 * none. Behind a parameter, the transpiler is the caller's problem
 * and the marker rule is exercised with a lookup.
 *
 * @param libPath - The path a marker named, relative to the
 *   library directory and already accepted by
 *   {@link assertMarkerPath}.
 * @returns The library's body, ready to be spliced as it stands.
 */
export type LibLoader = (libPath: string) => string;

/**
 * Replace every `__INLINE:<path>__` in one string with the library
 * body the loader returns for it.
 *
 * One string rather than a tree. {@link mapStrings} is what reaches
 * the strings a workflow source buries markers in, and this is what
 * one of those strings has done to it — so a case hands this a
 * string and a lookup and reads a string back, with no filesystem
 * and no transpiler anywhere in the run.
 *
 * Every marker in the string, not the first. A node body inlining
 * two libraries writes two markers, and a replacement stopping at
 * one would leave the second to the survival check, reported as a
 * marker nothing could read rather than as a library nothing
 * inlined. The pattern is compiled here rather than shared, for
 * the reason {@link LIB_MARKER} is a source string: a global
 * instance carries `lastIndex` out of one call and into the next,
 * so the call that skips a marker is the one after the call that
 * resolved one.
 *
 * What bounds that claim is {@link LIB_MARKER}'s path class, and it
 * was measured rather than assumed. The class admits `_` and the
 * quantifier is greedy, so two markers with nothing but path
 * characters between them are read as one: `__INLINE:a.ts__` run
 * straight into `__INLINE:b.ts__` captures the path `a.ts__` and
 * leaves the rest of the text standing. Every separator a node body
 * actually puts between two inlines ends the class — a newline, a
 * space, a semicolon, a quote — and a mis-read fails loudly, since
 * the loader is handed a path no library sits at. It is named here
 * because the survival check is not what would catch it: the text
 * left behind has had its opening underscores eaten, so it is no
 * longer a marker.
 *
 * The path is judged before the loader sees it.
 * {@link assertMarkerPath} runs first, so a path pointing outside
 * the library directory is never opened, never transpiled and
 * never spliced. That ordering is the rule rather than a
 * precaution: the refusal is about what a marker NAMES, and
 * reading the file to find out would be the thing it exists to
 * prevent.
 *
 * The replacement is a function, and that is load-bearing rather
 * than a style. A string replacement gives `$` a meaning — `$&`
 * stands for the match, `$1` for a capture, `$'` for everything
 * after the match — and a library body is full of `$`. `$('Tick')`,
 * the ordinary way one Code node reads another's output, is a `$`
 * against a quote, exactly the third of those, so a string
 * replacement would splice the rest of the node parameter into the
 * library in its place. A function's return value is inserted as it
 * stands, whatever it carries.
 *
 * A marker in what the loader returned is not resolved. Replacement
 * reads the string it was given, and text standing in for a match
 * is not scanned again, so a library carrying an `__INLINE:` marker
 * of its own reaches the serialized output intact and is refused
 * there as a marker that survived the pass. Nesting is not
 * supported and nothing pretends otherwise. A SETTING marker inside
 * a library body is the opposite case and does resolve: settings
 * resolution runs afterwards, over the string this returned, so a
 * `__ENVVAR:` marker written inside a library resolves as if the
 * workflow source had written it. That is the whole reason inlining
 * goes first.
 *
 * Nothing here judges what came back. A loader returning an empty
 * string, or text still wearing an export keyword, is spliced
 * exactly as handed over. Every rule about what a library may be
 * lives behind {@link LibLoader}, and this side of the parameter
 * cannot tell a body that will run from one that will not.
 *
 * Whatever the loader throws comes through untouched — a path
 * naming no file as whatever `readFileSync` raises, a library that
 * cannot stand alone as {@link SpliceableLibError}. Nothing is
 * wrapped: a wrapper would add a class saying only `while inlining`
 * to a message that already names the file.
 *
 * @param value - One string out of a workflow source, carrying a
 *   marker or not.
 * @param loadLib - Handed each marker's path, returning the
 *   library's splice-ready body.
 * @returns The string with every marker replaced, and the string
 *   itself when it carries none.
 * @throws MarkerPathError When a marker names a path outside the
 *   library directory.
 */
export function inlineLibString(
  value: string,
  loadLib: LibLoader,
): string {
  const marker = new RegExp(LIB_MARKER, 'gu');

  return value.replace(marker, (_match: string, libPath: string) => {
    assertMarkerPath(libPath);

    return loadLib(libPath);
  });
}

/**
 * Replace every `__ENVVAR:<NAME>__` in one string with what the
 * settings chain resolves that name to.
 *
 * The sibling of {@link inlineLibString}, and one string rather than
 * a tree for the same reason: {@link mapStrings} is what reaches the
 * strings a workflow source buries markers in, and this is what one
 * of those strings has done to it. A case hands this a string and a
 * chain and reads a string back, with no filesystem and no
 * transpiler anywhere in the run.
 *
 * Every marker in the string, not the first. A node parameter
 * reading two settings writes two markers, and a sticky note naming
 * the build stamp twice is the ordinary case rather than a contrived
 * one. The pattern is compiled here rather than shared, for the
 * reason {@link ENV_MARKER} is a source string: a global instance
 * carries `lastIndex` out of one call and into the next, so the call
 * that skips a marker is the one after the call that resolved one.
 *
 * What bounds that claim is {@link ENV_MARKER}'s name class, and it
 * is the bound {@link inlineLibString} carries for its path class.
 * The class admits `_` and the quantifier is greedy, so two markers
 * with nothing between them are read as one: measured,
 * `__ENVVAR:A____ENVVAR:B__` captures the name `A__` and leaves
 * `ENVVAR:B__` standing. Every separator a node parameter actually
 * puts between two settings ends the class — a space, a quote, a
 * comma, a newline — and a mis-read fails loudly, because the name
 * captured wears the trailing underscores of the first marker and no
 * source is written to answer for one. It is named here because the
 * survival check is not what would catch it: the text left behind
 * has had its opening underscores eaten, so it is no longer a
 * marker.
 *
 * The chain is handed down rather than defaulted twice.
 * {@link resolveEnvVar} carries a default of its own and it is never
 * reached from here — whatever this was given goes to every marker
 * in the string, so one string resolves against one chain instead of
 * against a chain built per marker.
 *
 * The replacement is a function, and that is load-bearing rather
 * than a style, for the reason {@link inlineLibString} states: a
 * string replacement gives `$` a meaning, so `$&`, `$1` and `$'`
 * would be read out of the value standing in for the marker rather
 * than left in it. A library body is full of `$` and a setting value
 * usually is not, which makes the exposure here smaller rather than
 * absent — the deploy build resolves settings out of an operator's
 * environment, and nothing on this path judges what those hold.
 *
 * A marker in what a setting resolved to is not resolved.
 * Replacement reads the string it was given and text standing in for
 * a match is not scanned again, so a value that is itself a marker
 * reaches the serialized output intact and is refused there as a
 * marker that survived the pass. What DOES resolve is a marker
 * written inside a library body, and not because anything is
 * re-scanned: inlining runs first, and this pass walks the string
 * inlining returned.
 *
 * The refusal comes through untouched. A name no source answers for
 * arrives as {@link UnresolvedSettingError} naming the setting, and
 * nothing is wrapped — a wrapper would add a class saying only
 * `while resolving` to a message that already names the setting and
 * the two edits that fix it. A marker MALFORMED around a good name
 * is not this rule's to report: `__ENVVAR:AR-BUILD-TAG__` is not a
 * hit for the grammar, nothing replaces it, and the survival check
 * refuses it over the serialized output instead.
 *
 * @param value - One string out of a workflow source, carrying a
 *   marker or not.
 * @param sources - The chain to walk, highest precedence first.
 *   Defaults to `envSources()` — `ENV_DEFAULTS` behind two empty
 *   objects, which is the default build's chain and the safe one to
 *   inherit.
 * @returns The string with every marker replaced, and the string
 *   itself when it carries none.
 * @throws UnresolvedSettingError When a marker names a setting no
 *   source in the chain answers for.
 */
export function resolveEnvString(
  value: string,
  sources: readonly EnvSource[] = envSources(),
): string {
  const marker = new RegExp(ENV_MARKER, 'gu');

  return value.replace(
    marker,
    (_match: string, name: string) => resolveEnvVar(name, sources),
  );
}

/**
 * The marker forms a source may no longer carry, in the order
 * they are tried.
 *
 * The form alone rather than the whole marker shape. A retired
 * marker is not a marker to the live grammar — {@link LIB_MARKER}
 * wants a colon straight after `INLINE`, so `__INLINE_JSON:` is
 * not a hit for it — and there is no capture to read a file name
 * out of. Nothing here needs one: what the refusal names is the
 * form, and {@link RetiredMarkerError} carries only that. Matching
 * the prefix also reaches a form written wrongly around a good
 * file name, which a shape-matching rule would leave to the
 * survival check to report as text nothing could read.
 *
 * The order settles what a string carrying both is refused under.
 * One rule refuses both forms and the first found is the one
 * named, so a case pairing a sample to a form plants that form on
 * its own.
 */
const RETIRED_MARKER_FORMS: readonly string[] = [
  '__INLINE_JSON',
  '__INLINE_YAML',
];

/**
 * Refuse a string carrying either retired marker form.
 *
 * Read over the string as the source wrote it, before anything is
 * inlined or resolved, so a source carrying one is refused without
 * a library ever being opened.
 *
 * @param value - One string out of a workflow source.
 * @throws RetiredMarkerError When the string carries a retired
 *   form, naming the first of them in roster order.
 */
function assertNoRetiredMarker(value: string): void {
  for (const form of RETIRED_MARKER_FORMS) {
    if (value.includes(form)) {
      throw new RetiredMarkerError(form);
    }
  }
}

/** What {@link resolveMarkers} resolves a source against. */
export interface ResolveMarkersOptions {
  /**
   * Handed every library marker's path, returning that library's
   * splice-ready body. Required, because a loader cannot be
   * defaulted: reading and transpiling a library needs a real bun
   * process, and this module deliberately has none.
   */
  readonly loadLib: LibLoader;

  /**
   * The settings chain to walk, highest precedence first.
   * Defaults to `envSources()` — {@link ENV_DEFAULTS} behind two
   * empty objects, which is the default build's chain and the one
   * a caller inherits by saying nothing.
   */
  readonly sources?: readonly EnvSource[];
}

/**
 * Resolve every marker a parsed workflow source carries.
 *
 * The whole marker pass in one call, and what a build hands a
 * parsed source to: every library inlined, every setting
 * resolved, every retired form refused. The rules underneath are
 * each about one string — {@link inlineLibString},
 * {@link resolveEnvString} — and {@link mapStrings} is what
 * reaches the strings a source buries them in.
 *
 * One walk, three steps per string, rather than a walk per rule.
 * The order those steps run in is the substance of this function,
 * and each of the two orderings is load-bearing.
 *
 * The retired refusal runs first, over the string as the source
 * wrote it. A source carrying `__INLINE_JSON` or `__INLINE_YAML`
 * is refused before a library is opened or a setting is read,
 * which is {@link assertMarkerPath}'s ordering one level up: the
 * refusal is about what a source WROTE, and doing the work first
 * would change only how much had happened before it failed.
 *
 * Inlining runs before settings resolution, and that ordering is
 * the reason the two are separate passes at all. A library may
 * carry a setting marker of its own — a build stamp written into
 * a constant is the ordinary case — and replacement does not
 * re-scan what it inserted. What resolves such a marker is not
 * nesting but sequence: settings resolution walks the string
 * inlining returned, so a marker inside a library body resolves
 * exactly as if the workflow source had written it there. Run the
 * two the other way round and that marker reaches the artifact
 * intact.
 *
 * The reverse does not resolve, and is not meant to. A library
 * marker inside a library body, or inside a value a setting
 * resolved to, is text this pass has already gone past: it
 * survives into the serialized output, and the survival check
 * refuses it there. Nesting is one level deep, in one direction.
 *
 * Reading the source's own string leaves the retired refusal a
 * limit worth stating: a retired form written inside a LIBRARY
 * body is not reached here. It is spliced in as it stands and
 * survives into the serialized output, where the survival check
 * names it — a message about an artifact rather than about the
 * library that wrote it.
 *
 * One chain for the whole value. `sources` is resolved once,
 * before the walk starts, and the same array reaches every
 * string. A chain built per string would read the `.env` off disk
 * once per string carrying a marker, and could answer two of them
 * from different contents of one file.
 *
 * The value handed in is left as it was. {@link mapStrings}
 * rebuilds every object and array it walks, so a caller holding a
 * parsed source can still say what it started with after this has
 * run over it.
 *
 * Nothing here says resolution finished. A marker that matched no
 * grammar is still in the value this returns: a name misspelt
 * inside a well-formed marker fails loudly, but a marker
 * malformed around a good name matches nothing, and neither does
 * one written as an object key. Those reach the serialized output
 * and are refused there. This resolves what it recognizes; what
 * it did not recognize is the survival check's to name, as
 * {@link SurvivingMarkerError}, from the other end of the same
 * build.
 *
 * Whatever the loader throws comes through untouched — a path
 * naming no file, a library that cannot stand alone in a Code
 * node. Nothing on this path wraps it.
 *
 * @param value - A parsed workflow source, or any value
 *   `JSON.parse` produces.
 * @param options - The loader every library marker is resolved
 *   through, and the chain every setting marker is resolved
 *   against.
 * @returns A new value of the same shape, with every marker this
 *   pass recognizes replaced.
 * @throws RetiredMarkerError When a string carries a retired
 *   marker form.
 * @throws MarkerPathError When a library marker names a path
 *   outside the library directory.
 * @throws UnresolvedSettingError When a setting marker names a
 *   setting no source in the chain answers for.
 */
export function resolveMarkers(
  value: unknown,
  options: ResolveMarkersOptions,
): unknown {
  const { loadLib, sources = envSources() } = options;

  return mapStrings(value, (text) => {
    assertNoRetiredMarker(text);

    return resolveEnvString(inlineLibString(text, loadLib), sources);
  });
}

/**
 * Every marker form a built artifact is refused for carrying.
 *
 * The roster the survival check walks, and the whole of what
 * {@link SurvivingMarkerError} can name. Four entries: the two
 * live forms this module's grammars are built on, and the two
 * retired ones no source may write at all.
 *
 * Forms rather than grammars, which is the substance of the
 * roster rather than a shortcut. A marker that reaches an
 * artifact is by definition one the pass did not resolve, and the
 * commonest reason is that no grammar matched it —
 * `__ENVVAR:AR-BUILD-TAG__` is not a hit for {@link ENV_MARKER},
 * which is exactly why nothing replaced it. A check compiled over
 * those same grammars would miss the input it exists for, and
 * report a clean artifact carrying the marker text somebody
 * typed. {@link RETIRED_MARKER_FORMS} is matched by prefix for
 * the same reason, one step earlier in the build.
 *
 * The two live forms are written out here rather than derived
 * from {@link LIB_MARKER} and {@link ENV_MARKER} by stripping the
 * capture off their sources, for the reason {@link ENV_MARKER}
 * gives for writing its own name grammar out a second time: the
 * derivation would become the load-bearing part, and nothing
 * would fail if it stopped being right. Written out, a form that
 * has drifted from the grammar it mirrors is a difference a case
 * can pin.
 *
 * The order settles what an artifact carrying several is refused
 * under, since the first found is the one named. The retired
 * forms lead because they name a different edit — the value they
 * once inlined belongs in `domains.settings` now, which is a
 * change to where config lives — where the two live forms name a
 * character to fix in the marker itself.
 */
export const SURVIVING_MARKER_FORMS: readonly string[] = [
  ...RETIRED_MARKER_FORMS,
  '__INLINE:',
  '__ENVVAR:',
];

/**
 * Thrown when a built artifact still carries marker text:
 * `__INLINE:`, `__ENVVAR:`, or one of the retired inline forms.
 *
 * The last thing a build does with an artifact, and the only one
 * of its refusals read over the serialized TEXT rather than over
 * a value. {@link resolveMarkers} replaces every marker it
 * recognizes and says nothing about the rest; this reads the
 * output back and refuses an artifact that would put marker
 * characters on an instance where a value belonged.
 *
 * Three ways a marker gets that far, and this is the only thing
 * that catches any of them — the roster is what the check is for
 * rather than a second opinion on work already done. A retired
 * form written inside a LIBRARY body is spliced in as it stands,
 * because replacement never re-scans what it inserted. A marker
 * written as an object KEY is not reached at all, because
 * {@link mapStrings} walks values. A marker malformed around a
 * good name is a hit for no grammar, so nothing replaced it and
 * nothing refused it. Each reaches serialization intact, and each
 * reads as an ordinary string until this looks at it.
 *
 * What it does not reach belongs beside that roster, because the
 * name invites the wider claim. Two markers written with nothing
 * between them are read as one, and the text left standing has
 * had its opening underscores eaten: `INLINE:b.ts__` carries no
 * form to match, so this is silent about it. What refuses that is
 * the loader, handed a path no library sits at.
 *
 * A distinct class rather than a bare `Error`, so a case covering
 * the check can pin the refusal to it. The other ways writing an
 * artifact fails arrive as something else — a source that is not
 * JSON as whatever `JSON.parse` raises, an output directory that
 * cannot be written as whatever `writeFileSync` throws — and an
 * assertion accepting any `Error` would pass for either of them.
 *
 * Nothing stands behind this one, which is what separates it from
 * every refusal ahead of it. {@link RetiredMarkerError} and
 * {@link MarkerPathError} each have this check underneath them:
 * delete either rule and the build still fails, further along and
 * with a message about an artifact rather than about the marker.
 * Delete this one and the build reports success, writes the file,
 * and the marker text reaches an instance. So a case here is not
 * asserting which of two rules caught something — it is the whole
 * of what says a built artifact is resolved.
 *
 * The form is a field as well as part of the message, so a case
 * asserts on which form survived rather than parsing prose it did
 * not write. The three ways one survives are different mistakes
 * with different edits behind them, and a sample planted for one
 * is only covered if the refusal named that form.
 *
 * What the form cannot say is WHERE in the artifact it survived.
 * A key, a library body and a misspelt name all report the same
 * text, and a `grep` for the form over the artifact is what turns
 * it back into a site.
 *
 * For an `__ENVVAR:` form the reading to rule out first is the
 * tempting one: it is never a setting left unresolved. A
 * well-formed marker whose name no source in the chain answers
 * for is refused back at resolution, by
 * {@link UnresolvedSettingError}, which names the setting and
 * never lets an artifact be written at all. So neither
 * `ENV_DEFAULTS` nor a `.env` is the edit behind a refusal here.
 * What is left is a name the marker grammar does not admit — a
 * hyphen, a dot, a leading digit — or a well-formed marker
 * sitting in a key, per the roster above. Both are edits to the
 * characters a workflow source wrote.
 *
 * Which is what refusing the artifact buys, because how loudly
 * the literal text would have failed depends entirely on the
 * parameter it landed in, and this check cannot see that. A cron
 * field takes five fields and refuses a string that is not them.
 * A workflow id names no workflow, which the dispatcher arriving
 * later in this phase routes to an error branch. A URL takes
 * `__ENVVAR:AR-BUILD-TAG__` for one more path segment, reads on
 * a canvas as a URL with an odd tail, and says nothing until a
 * request is finally made — on an instance, a deploy away from
 * the checkout holding the source and the one wrong character.
 * No setting in {@link ENV_DEFAULTS} supplies a URL today, which
 * is the reason this is written over the form alone rather than
 * keyed to a site: the table is not closed, and the quiet site is
 * the one it has to cover.
 */
export class SurvivingMarkerError extends Error {
  /**
   * The marker form found in the serialized output: `__INLINE:`,
   * `__ENVVAR:`, or a retired `__INLINE_JSON` / `__INLINE_YAML`.
   *
   * The form alone. The check reads text with no marker parse
   * behind it, so there is no captured name or path to carry
   * beside it — a form that survived is by definition one nothing
   * managed to read.
   */
  readonly form: string;

  /**
   * @param form - The marker form found in the serialized output.
   */
  constructor(form: string) {
    super(
      `${form} survived into the built artifact, so a node would ` +
      'read the marker text where its value belonged. Resolution ' +
      'replaces only what it recognizes: a marker written as an ' +
      'object key is not reached by a walk over values, a retired ' +
      'form inside a library body is spliced in as it stands, and ' +
      'a marker malformed around its name is a hit for no ' +
      'grammar. Fix the marker where the workflow source or the ' +
      'library wrote it — nothing after this point resolves it.',
    );
    this.name = this.constructor.name;
    this.form = form;
  }
}
