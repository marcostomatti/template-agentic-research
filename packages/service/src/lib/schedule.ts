/**
 * @packageDocumentation
 * Scheduling arithmetic — the rules `ar-dispatch` applies to a row it has
 * claimed, expressed as TypeScript.
 *
 * The dispatcher arrives later in this phase and holds the only schedule
 * trigger in the system: it wakes on its own cron, claims the rows that
 * are enabled and whose `next_run_at` has passed, moves each one forward,
 * and bounds how many it carries through a single pass. The arithmetic
 * behind those last two decisions lives here and nothing around it. The
 * columns it reads are the schedulable set declared in
 * `src/db/schema/scheduling.ts`, and it reads them as values handed in —
 * no I/O, no clock, no database handle. A rule reaching for one of those
 * could neither be spliced into a node nor be tested without the thing it
 * reached for.
 *
 * Dual-context is what shapes the file. A workflow source writing
 * `__INLINE:schedule.ts__` has this module transpiled and spliced into its
 * Code node body by `scripts/build-workflows.ts`, so a node runs the same
 * function the default suite imports rather than a second copy of it
 * written in JavaScript for the canvas. That is the whole of what the
 * marker buys: two copies of one rule agree until the day they do not, and
 * the day they stop agreeing is a schedule that behaves one way in a test
 * and another way on an instance. A Code node is not a module — nothing
 * resolves a specifier for it — so the build refuses a library carrying a
 * form a Code node cannot run rather than writing an artifact that fails
 * when the node is next reached.
 *
 * `src/lib/` is this package's pipeline half; the framework `lib/` at the
 * package root is the fork-style copy of the service template and stays
 * reserved for it. The two are never merged, and
 * `docs/architecture/00-overview.md` carries that argument in full. The
 * half of it that bites a reader of this file is the import specifier: a
 * `../../lib/…` written here reaches the framework, exactly as it does
 * from `src/redis/`, while the same text written one directory deeper —
 * where phase 4 puts the ported parsing libs — names a sibling pipeline
 * lib instead.
 */
