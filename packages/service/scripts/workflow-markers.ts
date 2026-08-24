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
   * `dev` is the fallback rather than the usual value: the entry
   * point arriving with this module resolves the git short commit
   * and supplies it, and this is what a build with no commit to
   * name — an unpacked tarball, an image with no git binary — is
   * stamped with instead.
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
   * merged claims, through `capBatch` in `src/lib/schedule.ts` —
   * all three arriving later in this phase. The duplication is
   * there because a `LIMIT` reads as paging. Whoever next tunes
   * that query — adding a filter, changing the ordering, folding
   * in a join — sees a performance knob rather than the only thing
   * standing between one pass and the whole backlog, and it is one
   * edit from being gone.
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
