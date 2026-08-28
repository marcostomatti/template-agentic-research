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
 * The gate is the law here rather than a convenience. `vitest run`
 * sets no `include`, so every `*.live.test.ts` in this directory is
 * collected by the default `bun run test` and loaded with it —
 * measured, a file written under this gate has its module scope run
 * even on a pass that answered no instance. What stands between a
 * case and a real instance is this one ternary, and what it is
 * holding is the rule `AGENTS.md` states under
 * `Testing — isolated vs live`: the default suite touches no
 * database, no network and no credentials, which is incident-derived
 * rather than stylistic. A case reaching an instance outside the gate
 * has not taken a shortcut, it has put a network call inside the
 * suite CI runs on every PR. The gate opens only for a setting
 * exported into the run: measured, an `AR_N8N_URL` an operator put in
 * `.env` for the deploy commands leaves a case under it skipped, so
 * arming this seam is deliberate rather than a side effect of having
 * configured one. The limit is that same measurement read the other
 * way: the gate binds a `describe` and nothing above one, so a
 * module-scope call in a file under it runs whatever the setting
 * answered, and that is where this seam can be broken without
 * touching this file at all.
 *
 * No compose stack in this repository ships an instance to point it
 * at. `docker-compose.yml` here declares postgres, redis and
 * postgres-live and no n8n service, and the script that stands one
 * up, `bootstrap.sh`, is phase 7 in the roster in
 * `scripts/README.md`. So the sibling's arrangement has no
 * counterpart here: `bun run stress:start` brings up the
 * `postgres-live` service that `bun run test:live` then points
 * `AR_LIVE_DATABASE_URL` at, that command sets no other setting, and
 * `.env.example` carries `AR_N8N_URL` commented and without a value.
 * Rule 3 under `Testing — isolated vs live`, that live tests run only
 * against the `--profile stress` services, is one an n8n case cannot
 * satisfy for the same reason, so the instance a case here needs is
 * an operator's own, started by hand, until that phase lands.
 *
 * A run of a file under this gate is therefore not a gate for this
 * plan. Every command this package ships leaves such a case skipped —
 * `bun run test`, the `test:all` fan-out that reaches it, and
 * `bun run test:live` alike — so a green verification order is silent
 * about anything written here, and what lands under this gate is debt
 * this plan records rather than behaviour it proved. What a run does
 * say is narrower and worth keeping: a skipped case is a collected
 * one, so the count in the summary is evidence the file was found and
 * its gate resolved, which is the one thing a file quietly renamed
 * out of the glob stops reporting. It is no evidence about an
 * instance, and it moves with every case added here, so it is not a
 * number to hold against one quoted elsewhere.
 *
 * `tests/live/n8n-deploy.live.test.ts` is the first file to drive this
 * gate. It uploads the workflows this package builds to the instance
 * the setting names and reads that instance back for each of them,
 * which is the half of the deploy path a stub in the isolated suite
 * has no way to answer.
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
