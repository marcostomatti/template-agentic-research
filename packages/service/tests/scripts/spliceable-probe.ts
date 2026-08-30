/**
 * @packageDocumentation
 * What `assertSpliceable` makes of files on disk, asked from a
 * process that can build a transpiler.
 *
 * A command rather than a module, and the LAUNCHER decides that
 * rather than a preference between two shapes. The refusal judges a
 * transpiled library beside the scan its transpiler reported, and
 * `Bun.Transpiler` is what produces both: measured in this
 * package's own workers, `Bun` is an object carrying `serve` and
 * nothing else, `Bun.Transpiler` is `undefined`, and
 * `bunTranspiler()` refuses there by name. A case already inside a
 * worker cannot relaunch itself, so a subprocess is the only shape
 * left to it — the same reason `tests/build/schedule-splice.test.ts`
 * spawns a build rather than calling one.
 *
 * Every path named on the command line is answered, in the order it
 * was given, and the answers leave as one JSON array. So a caller
 * asks about a subject and its control in ONE run, which is what
 * makes an acceptance worth anything: `assertSpliceable` returns
 * nothing when it accepts, so a probe that never reached it — a
 * transpiler it could not build, an import resolving somewhere else
 * — reports exactly the silence a spliceable library does. A run
 * whose control came back refused is a run where the acceptance
 * beside it was decided by the rule.
 *
 * Nothing here judges anything else. A path naming no file, or a
 * source the transpiler itself cannot read, leaves this process
 * through its own failure, so a caller reads a non-zero exit and
 * whatever was said on the way out rather than a verdict that
 * swallowed it.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { bunTranspiler } from '../../scripts/build-workflows.js';
import {
  assertSpliceable,
  SpliceableLibError,
} from '../../scripts/workflow-markers.js';

/**
 * One transpiler for every path this run was given.
 *
 * Built once, as a build builds one per run rather than one per
 * library. It is also the first thing that can fail here, and
 * failing at module scope is what makes an unusable process a
 * non-zero exit rather than a run answering every path the same
 * way.
 */
const TRANSPILER = bunTranspiler();

/**
 * What this reports for a file a Code node could run.
 *
 * The word is written out here and again on the caller's side
 * rather than exported, which is the arrangement
 * `tests/scripts/approve-args.test.ts` gives its reason for: a
 * caller comparing this constant against itself would agree with
 * any spelling the two drifted into.
 */
const SPLICEABLE = 'spliceable';

/**
 * What `assertSpliceable` says about one file.
 *
 * The form is carried through rather than the message, because one
 * source can break two rules at once and only the form says which
 * one the refusal named. Anything that is not a splice refusal is
 * rethrown: a file that cannot be read and a source that cannot be
 * transpiled are both failures of this probe rather than answers
 * about a library, and a verdict absorbing either would report a
 * broken run as a judged one.
 *
 * @param path - The file to read and judge.
 * @returns {@link SPLICEABLE}, or the refusal and the form it named.
 * @throws Error Whatever reading or transpiling the file raised.
 */
function verdictFor(path: string): string {
  const source = readFileSync(path, 'utf8');

  try {
    assertSpliceable(
      TRANSPILER.transformSync(source),
      TRANSPILER.scan(source),
      path,
    );
  } catch (cause) {
    if (cause instanceof SpliceableLibError) {
      return `refused ${cause.form}`;
    }

    throw cause;
  }

  return SPLICEABLE;
}

console.log(JSON.stringify(process.argv.slice(2).map(verdictFor)));
