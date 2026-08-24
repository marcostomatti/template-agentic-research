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
