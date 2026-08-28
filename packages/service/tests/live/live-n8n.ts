/**
 * @packageDocumentation
 * Live-n8n gate — the opt-in seam for cases that need a running n8n
 * instance, beside the `live-postgres.ts` gate that keys this same
 * directory's Postgres cases to a running server.
 *
 * `describeLiveN8n` is `describe` when `AR_N8N_URL` is set and
 * `describe.skip` when it is not. A file written under it therefore
 * reports its cases as skipped on a run that was pointed at no
 * instance — a count in the summary rather than a failure — and runs
 * them on one that was.
 *
 * The setting is read off `process.env` rather than through the zod
 * schema in `src/config.ts`, which is where the operator commands
 * reach that same name. `live-postgres.ts` reads its own the same
 * way, and the reason holds for both: a gate is asked at module load
 * and answers with one value, so it takes the shortest route to that
 * value and pulls nothing else in behind it.
 *
 * The explicit type annotation is carried over deliberately rather
 * than for symmetry. Inferred, the union of `describe` and
 * `describe.skip` is built out of vitest-internal types —
 * `SuiteCollectorCallable` and its siblings, declared inside
 * `@vitest/runner` — that cannot be named from here, so the export
 * would have no type a reader of this file could resolve.
 * `live-postgres.ts` records the same annotation as load-bearing and
 * prices it as a `tsc --noEmit` failure, which is not what this
 * package's configuration does today: measured on both gates with the
 * annotation stripped, `bun run check-types` stays green because
 * `declaration` is false in `tsconfig.json`, and
 * `tsc --noEmit --declaration` is what raises TS4023. So no gate here
 * reddens for a missing annotation, and the name is worth writing
 * anyway.
 *
 * Nothing else is exported, which is a divergence from that sibling
 * worth naming rather than leaving to be read as an oversight.
 * `live-postgres.ts` exports the URL it gated on because its own
 * helpers open a pool with it; nothing here opens anything. A case
 * that has to reach an instance wants a base URL and a key together,
 * and `requireInstance` in `scripts/deploy-external.ts` already
 * answers with both or refuses naming whichever of the two is
 * missing, which is a better shape than the bare `string | undefined`
 * this module could hand over and leaves a case one place to ask
 * rather than two.
 *
 * No file drives this gate yet. `tests/live/n8n-deploy.live.test.ts`
 * is the first, and it arrives next in this stage.
 */
import { describe } from 'vitest';

/**
 * Whatever `AR_N8N_URL` was set to, if anything.
 *
 * Module-private: it is the value the gate is derived from and not
 * one a case is meant to build a request out of.
 */
const N8N_URL = process.env['AR_N8N_URL'];

/**
 * The gate every n8n live file hangs its cases off.
 *
 * `describe` where `AR_N8N_URL` answered and `describe.skip` where it
 * did not, so a file under it is written the same way in both cases
 * and the run it is collected into decides which of the two it got.
 */
export const describeLiveN8n: (name: string, fn: () => void) => void = N8N_URL
  ? describe
  : describe.skip;
