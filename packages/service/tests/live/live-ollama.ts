/**
 * @packageDocumentation
 * Live-ollama gate — the opt-in seam for the one case here that
 * asks a local model server for something, beside the
 * `live-postgres.ts` and `live-n8n.ts` gates that key this same
 * directory's other live cases to the services they need.
 *
 * `describeLiveOllama` is `describe` when `AR_OLLAMA_URL` is set and
 * `describe.skip` when it is not, which is `describeLiveN8n`'s
 * arrangement against `AR_N8N_URL` written a second time. A file
 * under it reports its cases as skipped on a run that was pointed at
 * no server — a count in the summary rather than a failure —
 * and runs them on one that was.
 *
 * ## This setting is not how the pipeline finds a model
 *
 * Worth saying first, because the name reads like configuration and
 * is not. A run that wants a proposal resolves the endpoint it is
 * entitled to call from the `connectors` row naming it, which is
 * where this design puts every endpoint that is not boot-critical:
 * `src/config.ts` declares no member for a model server,
 * `.env.example` offers none, and `src/sources/config-proposer.ts`
 * constructs no client at all. `AR_OLLAMA_URL` exists to point ONE
 * live case at an operator's own server, and is read nowhere else in
 * this repository.
 *
 * It is read off `process.env` rather than through the zod schema in
 * `src/config.ts` for the reason both sibling gates record: a gate is
 * asked at module load and answers with one value, so it takes the
 * shortest route to that value and pulls nothing else in behind it.
 *
 * ## What this module hands over, and why it is more than the sibling
 *
 * `live-n8n.ts` exports its gate and nothing else, because a case
 * that has to reach an instance wants a base URL and a key together
 * and `requireInstance` in `scripts/deploy-external.ts` already
 * answers with both or refuses naming whichever of the two is
 * missing. Nothing here has such a helper to defer to, and nothing on
 * the shipped path ever will: `ConfigProposer` is declared in
 * `src/sources/config-proposer.ts` and implemented nowhere, on
 * purpose, so whatever wants a proposal builds its own client and
 * hands it in. A live case is that whatever, and it needs the
 * settings a client is built out of.
 *
 * So {@link requireLiveOllama} is the sibling's SHAPE rather than its
 * absence: one call, answering both settings or refusing by name. The
 * model is a second setting rather than a default because a default
 * would be this file guessing which model an operator has pulled, and
 * a request naming one that is not there comes back refused from
 * inside the server, with a message about a model rather than about a
 * setting nobody set.
 *
 * The gate keys on the URL alone, so a run that set it and no model
 * OPENS and then fails in {@link requireLiveOllama} rather than
 * skipping. That is the arrangement rather than a hole in it: a
 * half-configured run has already said it wants this case, and
 * turning it back into a skip would report a case as run.
 *
 * ## The gate is the law, and what it does not reach
 *
 * `vitest run` sets no `include`, so every `*.live.test.ts` in this
 * directory is collected by the default `bun run test` and loaded
 * with it. The gate binds a `describe` and nothing above one —
 * measured on `describeLiveN8n`, and true of this one for the same
 * reason — so module scope in a file under it runs whatever the
 * setting answered, on every `bun run test`. Module scope there holds
 * constants and pure functions, and every request lives inside a
 * case. {@link requireLiveOllama} throwing rather than answering a
 * `string | undefined` is part of the same arrangement: it is safe to
 * call only where the gate has already opened, and a call above one
 * fails loudly instead of handing over an empty base URL for a
 * request to be built out of.
 *
 * ## Nothing here stands a server up
 *
 * `docker-compose.yml` declares postgres, redis and postgres-live and
 * no model server, no script in `scripts/` starts one, and no command
 * this package ships sets `AR_OLLAMA_URL` — `test:live` sets
 * `AR_LIVE_DATABASE_URL` in its own script definition and sets
 * nothing else. So the steady state of a file under this gate is
 * skipped on every command here: `bun run test`, the `test:all`
 * fan-out that reaches it, and `bun run test:live` alike. What is
 * written under it is debt this phase records rather than behaviour a
 * green verification order proved, and the design says as much about
 * the subject itself — a local model is invoked on demand only,
 * with nothing kept mounted.
 *
 * What a run does still report is narrower and worth keeping: a
 * skipped case is a COLLECTED one, so the count in the summary says
 * the file was found and its gate resolved, which is the one thing a
 * file quietly renamed out of the glob stops saying. It is no
 * evidence about a server, and it moves with every case added here,
 * so it is not a number to hold against one quoted elsewhere.
 *
 * `tests/live/config-proposer.live.test.ts` is the first file to
 * drive this gate, and the only one this phase adds.
 */
import { describe } from 'vitest';

/**
 * The setting the gate keys on: the base URL of a local model server.
 *
 * Named once and read through, so the refusal in
 * {@link requireLiveOllama} cannot come to name something other than
 * what was actually read.
 */
const URL_SETTING = 'AR_OLLAMA_URL';

/**
 * The setting naming which model to ask for.
 *
 * Not part of the gate, and read only once the gate has opened.
 */
const MODEL_SETTING = 'AR_OLLAMA_MODEL';

/**
 * Whatever {@link URL_SETTING} was set to, if anything.
 *
 * Module-private: it is the value the gate is derived from, and not
 * one a case is meant to build a request out of — a case asks
 * {@link requireLiveOllama}, which answers both settings or neither.
 */
const OLLAMA_URL = process.env[URL_SETTING];

/** Whatever {@link MODEL_SETTING} was set to, if anything. */
const OLLAMA_MODEL = process.env[MODEL_SETTING];

/**
 * The two settings a client for a local model server is built out of.
 *
 * Both required and both non-empty, which is what
 * {@link requireLiveOllama} is for: a case holding this value has no
 * branch left to write about a setting that was missing.
 */
export interface LiveOllamaSettings {
  /** Where the server is, as {@link URL_SETTING} named it. */
  readonly baseUrl: string;
  /** Which model to ask, as {@link MODEL_SETTING} named it. */
  readonly model: string;
}

/**
 * The gate every live-ollama file hangs its cases off.
 *
 * `describe` where {@link URL_SETTING} answered and `describe.skip`
 * where it did not, so a file under it is written the same way in
 * both cases and the run it is collected into decides which of the
 * two it got.
 *
 * The explicit type annotation is carried for the reason
 * `live-n8n.ts` measures and records at length: inferred, the union
 * of `describe` and `describe.skip` is built out of vitest-internal
 * types that cannot be named from here, so the export would have no
 * type a reader of this file could resolve. No gate in this package
 * reddens for its absence, and the name is worth writing anyway.
 */
export const describeLiveOllama: (name: string, fn: () => void) => void = OLLAMA_URL
  ? describe
  : describe.skip;

/**
 * The settings a request is built out of, or a refusal naming what is
 * missing.
 *
 * Safe to call only from inside {@link describeLiveOllama}, which is
 * the whole reason it throws: called above one it would run on every
 * `bun run test`, and answering a `string | undefined` there would
 * hand a case an empty base URL to point a request at rather than a
 * failure to read.
 *
 * An empty string is treated as unset for both. A setting exported
 * with no value is somebody who meant to configure this and did not,
 * and a base URL of `''` resolves to whatever the process happens to
 * be able to reach.
 *
 * @returns Both settings, each non-empty.
 * @throws {Error} When either setting answered nothing.
 */
export function requireLiveOllama(): LiveOllamaSettings {
  const baseUrl = OLLAMA_URL ?? '';
  const model = OLLAMA_MODEL ?? '';
  const missing: string[] = [];

  if (baseUrl === '') {
    missing.push(URL_SETTING);
  }

  if (model === '') {
    missing.push(MODEL_SETTING);
  }

  if (missing.length > 0) {
    throw new Error(
      `[live-ollama] ${missing.join(' and ')} answered nothing. This `
      + 'case needs a local model server and the name of a model to '
      + `ask it for, and the gate opens on ${URL_SETTING} alone, so a `
      + 'run that set that one and not the other arrives here rather '
      + 'than skipping. Nothing in this repository starts such a '
      + 'server: point both settings at one of your own.',
    );
  }

  return { baseUrl, model };
}
