import type { RafaRun, RafaRunResult } from './call';
import type { DevToolsIncoming } from '../http';

import { describe, expect, it } from 'vitest';

import { DEVTOOLS_COMMENT_PATH, DEVTOOLS_REPORT_PATH } from '../endpoint';
import {
  LOOPBACK_ADDRESS,
  ROUND,
  SAME_ORIGIN_HEADERS,
  SERVER_PORT,
  assemble,
  createResponse,
  fakeRequest,
  runMiddleware,
} from '../harness';

import { rafaGateway } from './rafa';

/**
 * ## What this file drives, and how it differs from its two neighbours
 *
 * `./rafa.test.ts` drives {@link rafaGateway} directly, over no
 * middleware at all. `../endpoint.integration.test.ts` drives the
 * assembled middleware over a hand-written fake tracker that is not
 * {@link rafaGateway}. Neither proves that the two actually wire
 * together — that `../plugin.ts`'s `assembleDevTools`, handed a REAL
 * `rafaGateway({run})` the way `packages/web/vite.config.ts` does,
 * reaches it with the argv `./rafa.ts` says it builds. This file is
 * that missing case: one `../harness.ts` `assemble()` call per case,
 * `gateway` set to `rafaGateway({run})` over a recording runner that
 * answers scripted NDJSON, and every assertion reading the CALLS the
 * runner recorded rather than a call the gateway's own unit suite
 * already pins.
 *
 * ## The order
 *
 * The missing-binary case runs first: it is the one refusal among the
 * four, in the sense every other file in this package orders its
 * cases — the tracker never answers, and the endpoint's own belt
 * (`../endpoint.ts`'s `withoutThrowing`) is not even needed, because
 * `./rafa.ts` never throws. Then the duplicate, which is the other
 * shape where no `create` argv exists to assert on. Then the report
 * that files, which is the one case naming BOTH argvs and the order
 * between them. Then the "also affected" comment, on its own gateway
 * and its own assembly, needing neither of the report cases before it:
 * `../endpoint.ts`'s comment route reads the issue id off the request
 * body alone.
 */

/** A process that exited zero and printed `stdout`. */
function printed(stdout: string): RafaRunResult {
  return { code: 0, stdout, stderr: '', errno: null };
}

/** What `rafa issue list` answers when it found no matching issue. */
function noMatches(): RafaRunResult {
  const event = JSON.stringify({
    type: 'result',
    ok: true,
    data: { tracker: { kind: 'github' }, query: {}, issues: [] },
  });

  return printed(`${event}\n`);
}

/**
 * What `rafa issue list` answers when it found one matching issue.
 *
 * @param id - The tracker's own identifier for the hit.
 * @param title - The hit's title, read back verbatim.
 * @param url - Where the hit can be viewed.
 * @returns The runner answer.
 */
function oneMatch(id: string, title: string, url: string): RafaRunResult {
  const event = JSON.stringify({
    type: 'result',
    ok: true,
    data: {
      tracker: { kind: 'github' },
      query: {},
      issues: [{ title, ref: { kind: 'github', externalId: id, url } }],
    },
  });

  return printed(`${event}\n`);
}

/**
 * What `rafa issue create` or `rafa issue comment` answers once it
 * landed on the tracker.
 *
 * @param id - The identifier the tracker assigned or already held.
 * @param url - Where the issue can be viewed.
 * @returns The runner answer.
 */
function filed(id: string, url: string): RafaRunResult {
  const event = JSON.stringify({
    type: 'result',
    ok: true,
    data: { tracker: { kind: 'github' }, ref: { kind: 'github', externalId: id, url } },
  });

  return printed(`${event}\n`);
}

/**
 * A runner answering the given results in order, recording every argv
 * it was handed.
 *
 * A call past the last scripted result throws rather than silently
 * repeating the last one, so a gateway that ran one call too many reds
 * the case that arranged for exactly the calls it expects.
 *
 * @param results - One per expected call, in order.
 * @returns The runner and the argv list it fills.
 */
function runner(...results: readonly RafaRunResult[]): {
  readonly run: RafaRun;
  readonly calls: string[][];
} {
  const calls: string[][] = [];

  return {
    calls,
    run: (argv) => {
      calls.push([...argv]);
      const next = results[calls.length - 1];

      if (next === undefined) {
        const nth = String(calls.length);

        throw new Error(`no result arranged for call ${nth}`);
      }

      return Promise.resolve(next);
    },
  };
}

/**
 * Build a request for `POST /__devtools/report`, same-origin, over
 * loopback.
 *
 * @param body - The raw request body.
 * @returns The request.
 */
function reportRequest(body: string): DevToolsIncoming {
  return fakeRequest({
    method: 'POST',
    url: DEVTOOLS_REPORT_PATH,
    headers: SAME_ORIGIN_HEADERS,
    remoteAddress: LOOPBACK_ADDRESS,
    localPort: SERVER_PORT,
    body,
  });
}

/**
 * Build a request for `POST /__devtools/comment` — the "also affected"
 * route — same-origin, over loopback.
 *
 * @param body - The raw request body.
 * @returns The request.
 */
function commentRequest(body: string): DevToolsIncoming {
  return fakeRequest({
    method: 'POST',
    url: DEVTOOLS_COMMENT_PATH,
    headers: SAME_ORIGIN_HEADERS,
    remoteAddress: LOOPBACK_ADDRESS,
    localPort: SERVER_PORT,
    body,
  });
}

/** The title every report case in this file posts. */
const REPORT_TITLE = 'The lexicon editor loses focus on save';

/** The report body, spelled once. */
const REPORT_BODY = JSON.stringify({
  feature: 'feedback',
  title: REPORT_TITLE,
  body: 'Steps: open the lexicon editor, edit a term, press save.',
  context: {},
});

/** The list argv every report case's search runs, for {@link REPORT_TITLE}. */
const LIST_ARGV = Object.freeze([
  'rafa',
  'issue',
  'list',
  '--type=bug',
  `--search=${REPORT_TITLE}`,
  '--output=json',
]);

describe('a posted report when the rafa binary is missing', () => {
  it('leaves the response at stored, with the report still written to disk', async () => {
    // Arrange: an ENOENT off the very first call — the search — which
    // is the shape a machine with no `rafa` on its `PATH` produces.
    const { calls, run } = runner({
      code: null,
      stdout: '',
      stderr: '',
      errno: 'ENOENT',
    });
    const gateway = rafaGateway({ run });
    const { assembly, fs } = assemble({ gateway });
    const { res, read } = createResponse();

    // Act
    await runMiddleware(assembly.handler, reportRequest(REPORT_BODY), res);

    // Assert: the endpoint still answers `stored` — the local write
    // already succeeded before the gateway ran — carrying the
    // gateway's own refusal beside it, and the create argv never ran.
    expect(read().statusCode).toBe(200);
    expect(read().body).toMatchObject({
      status: 'stored',
      gateway: {
        status: 'refused',
        reason: 'rafa issue list could not be started (ENOENT).',
      },
    });
    expect(calls).toStrictEqual([[...LIST_ARGV]]);

    // The report itself: one write, for the JSON naming it, and no
    // attachment in this body to write a second one for.
    expect(fs.writes).toHaveLength(1);

    const stored = read().body as { readonly path: string };

    expect(fs.writes[0]?.path).toBe(stored.path);
  });
});

describe('a posted report whose search matched an existing issue', () => {
  it('answers duplicate and never runs a create', async () => {
    // Arrange: the tracker already knows this title.
    const matchUrl = 'https://github.com/acme/widgets/issues/103';
    const { calls, run } = runner(oneMatch('103', REPORT_TITLE, matchUrl));
    const gateway = rafaGateway({ run });
    const { assembly } = assemble({ gateway });
    const { res, read } = createResponse();

    // Act
    await runMiddleware(assembly.handler, reportRequest(REPORT_BODY), res);

    // Assert: the duplicate is reported, and the list argv is the ONLY
    // call the runner ever saw — no create argv exists to assert on.
    expect(read().statusCode).toBe(200);
    expect(read().body).toMatchObject({
      status: 'stored',
      gateway: {
        status: 'duplicate',
        match: { id: '103', title: REPORT_TITLE, url: matchUrl },
      },
    });
    expect(calls).toStrictEqual([[...LIST_ARGV]]);
  });
});

describe('a posted report the tracker has not seen before', () => {
  it('runs the list argv then the create argv, in that order, with the round-prefixed title', async () => {
    // Arrange: no match, so a create follows.
    const createUrl = 'https://github.com/acme/widgets/issues/104';
    const { calls, run } = runner(noMatches(), filed('104', createUrl));
    const gateway = rafaGateway({ run });
    const { assembly } = assemble({ gateway });
    const { res, read } = createResponse();

    // Act
    await runMiddleware(assembly.handler, reportRequest(REPORT_BODY), res);

    // Assert: both argv, whole and in the order they ran — the list
    // first, then the create carrying the `[fb/<round>]` prefix
    // `../endpoint.ts` hands `./rafa.ts` no authority to skip.
    expect(read().statusCode).toBe(200);
    expect(calls).toStrictEqual([
      [...LIST_ARGV],
      [
        'rafa',
        'issue',
        'create',
        `--title=[fb/${ROUND}] ${REPORT_TITLE}`,
        '--body=Steps: open the lexicon editor, edit a term, press save.',
        '--type=bug',
        '--module=web',
        '--output=json',
      ],
    ]);
    expect(read().body).toMatchObject({
      status: 'stored',
      gateway: {
        status: 'filed',
        tracker: 'github',
        id: '104',
        url: createUrl,
      },
    });
  });
});

describe('an also affected comment', () => {
  it('runs the comment argv', async () => {
    // Arrange: no report needs to precede this — `../endpoint.ts`'s
    // comment route reads the issue id off the request body alone.
    const commentUrl = 'https://github.com/acme/widgets/issues/104';
    const { calls, run } = runner(filed('104', commentUrl));
    const gateway = rafaGateway({ run });
    const { assembly } = assemble({ gateway });
    const { res, read } = createResponse();
    const commentText = 'Also affected: the same modal traps focus on Firefox 148.';
    const body = JSON.stringify({ issueId: '104', body: commentText });

    // Act
    await runMiddleware(assembly.handler, commentRequest(body), res);

    // Assert
    expect(read().statusCode).toBe(200);
    expect(calls).toStrictEqual([[
      'rafa',
      'issue',
      'comment',
      '104',
      `--body=${commentText}`,
      '--output=json',
    ]]);
    expect(read().body).toEqual({
      status: 'commented',
      gateway: {
        status: 'filed',
        tracker: 'github',
        id: '104',
        url: commentUrl,
      },
    });
  });
});
