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
   */
  AR_DISPATCH_BATCH_CAP: '25',
};
