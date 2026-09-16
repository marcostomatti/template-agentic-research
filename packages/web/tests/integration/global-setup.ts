/**
 * @packageDocumentation
 * The integration suite's precondition check: one refusal, before the
 * first browser starts, when the backend this suite needs is not there.
 *
 * `playwright.integration.config.ts` names this module as its
 * `globalSetup`. It is the only module in either Playwright tree that is
 * not a spec, and it earns that by answering a failure mode no spec can
 * report legibly. The other two configs drive a fixture-backed app, so
 * their only precondition is a free port; this one serves the app with
 * `VITE_AR_API_URL` set and every read crosses a socket to
 * `@ar/service` over a seeded Postgres. Start it without the service,
 * without the seed or without the credential pair and the suite does not
 * fail — it HANGS, then reports a wall of timed-out assertions against
 * an app whose every read rejected, which reads exactly like the app
 * being broken. Refusing up front turns that into one sentence naming
 * the step that was skipped.
 *
 * Both readings are taken, and both are reported together rather than
 * one at a time: a run missing the service AND the credentials should
 * cost one refusal rather than two rounds of fixing.
 *
 * This module deliberately does NOT import the config it belongs to,
 * even though the two share the `AR_API_PORT` default. Playwright loads
 * that config in order to find this file, so importing it back is a
 * cycle; the duplicated default is the cheaper of the two problems, and
 * the config's own comment names this file as the other half of it.
 */

/** Where the operator steps this module checks for are written down. */
const RUN_BOOK = 'packages/web/tests/README.md';

/**
 * The service's host and port.
 *
 * 127.0.0.1 rather than `localhost` for the reason all three configs
 * give: a host resolving the name to ::1 first would probe a different
 * socket than the service bound. 3100 rather than the service's own
 * default 3000 so a run cannot land on a locally running dev service and
 * report against a database nobody seeded.
 */
const HOST = '127.0.0.1';
const API_PORT = process.env['AR_API_PORT'] ?? '3100';
const HEALTH_URL = `http://${HOST}:${API_PORT}/health`;

/**
 * How long the probe waits before calling the service absent.
 *
 * Bounded on purpose. A refused connection answers immediately, but a
 * port held open by something that never replies — a half-started
 * container, a service stuck on its own database handshake — would
 * otherwise hang the setup for Playwright's whole global timeout and
 * produce no message at all. Five seconds is far above a loopback
 * round-trip and far below the point where a reader assumes the suite
 * is running.
 */
const HEALTH_TIMEOUT_MS = 5_000;

/** The two variables a spec reads its credential from. */
const CREDENTIAL_VARS = ['AR_INTEGRATION_USER', 'AR_INTEGRATION_PASSWORD'];

/**
 * The refusal reason for each credential variable that carries nothing.
 *
 * Blank counts as unset, and that is the interesting half: `export
 * AR_INTEGRATION_PASSWORD=` leaves the variable PRESENT and empty, which
 * a `=== undefined` test accepts and every login spec then fails on with
 * the service's own refusal sentence — a real credential being wrong and
 * a credential never having been exported look identical from inside a
 * spec. Neither value is ever read into a message here; the whole point
 * of the pair is that no spec and no capture spells one.
 */
function missingCredentials(env: Record<string, string | undefined>): string[] {
  return CREDENTIAL_VARS
    .filter(name => (env[name] ?? '').trim() === '')
    .map(name => `${name} is unset or empty.`);
}

/**
 * The refusal reason when `GET /health` does not answer `ok`, or
 * `undefined` when it does.
 *
 * Three distinct failures collapse into this one reading, and the
 * message says which was seen. A rejected fetch is the service not
 * listening at all. A non-2xx is the service answering: the built-in
 * route replies `503` with `{ status: 'error' }` when any declared
 * dependency is in error, which is what an unmigrated or unreachable
 * database looks like from outside. And a 2xx whose body is not
 * `{ status: 'ok' }` is something else entirely on the port — a dev
 * server, a proxy, another project's service — which is the case a
 * status-only check would wave through.
 */
async function probeHealth(): Promise<string | undefined> {
  const response = await fetch(HEALTH_URL, {
    signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
  }).catch((cause: unknown) => cause instanceof Error
    ? cause
    : new Error(String(cause)));

  if (response instanceof Error) {
    return `GET ${HEALTH_URL} did not answer (${response.message}).`;
  }

  if (!response.ok) {
    return `GET ${HEALTH_URL} answered ${String(response.status)}, not 200.`;
  }

  const body: unknown = await response.json().catch(() => undefined);
  const status = typeof body === 'object' && body !== null && 'status' in body
    ? body.status
    : undefined;

  if (status !== 'ok') {
    return `GET ${HEALTH_URL} answered 200 but not { status: 'ok' } — `
      + 'something other than @ar/service is on that port.';
  }

  return undefined;
}

/**
 * Refuses the run when the service or the credential pair is missing.
 *
 * @throws When `GET /health` fails or either credential variable carries
 *   nothing. The message lists every reason found and points at the
 *   run-book rather than restating its steps, so the two cannot drift.
 */
export default async function globalSetup(): Promise<void> {
  const reasons = [...missingCredentials(process.env)];
  const health = await probeHealth();
  const all = health === undefined
    ? reasons
    : [...reasons, health];

  if (all.length === 0) {
    return;
  }

  throw new Error(
    [
      'The integration suite needs a seeded @ar/service and a credential '
        + 'pair, and one or both are absent:',
      ...all.map(reason => `  - ${reason}`),
      `Follow the integration run-book in ${RUN_BOOK} — it is the ordered `
        + 'list of steps, and no task or script performs them for you.',
    ].join('\n'),
  );
}
