import type { FeedbackReport } from './submit';
import type { DevToolsFetch } from '../../core/host';

import { describe, expect, it } from 'vitest';

import { buildDevToolsHost } from '../../core/host';

import {
  FEEDBACK_REASON_LIMIT,
  submitAlsoAffected,
  submitFeedbackReport,
} from './submit';

/**
 * ## The host is real and the `fetch` under it is the only stub
 *
 * Every case below builds a host with `buildDevToolsHost` and injects
 * a `fetchImpl`, rather than hand-writing an object shaped like a
 * `DevToolsHost`. Two things follow, and both are readings this file
 * would otherwise not have:
 *
 * - The url each case records is the JOINED one. `./submit.ts` asks
 *   for `/report`, `src/core/host.ts` joins it onto the normalised
 *   endpoint, and what the stub sees is `/__devtools/report`. A hand
 *   built host would have pinned the argument the module passed and
 *   said nothing about where it lands.
 * - The `init` each case records is the one `./submit.ts` built,
 *   because the join passes `init` through untouched.
 *
 * `fetchImpl` is the seam `src/core/host.ts` declares for exactly
 * this; nothing here touches the platform `fetch`, and no case needs
 * a server.
 *
 * ## `toStrictEqual`, deliberately, wherever a url is absent
 *
 * `toEqual` treats a missing key and a key holding `undefined` as the
 * same thing, and `./submit.ts` promises the first: a `filed` with no
 * url has no `url` member at all. Every mapping case therefore reads
 * the whole result with `toStrictEqual`, which is what makes the
 * omission a pinned behaviour rather than an accident of how the
 * object was built.
 *
 * ## The control character is built from its code, never written
 *
 * {@link BELL} is `String.fromCharCode(7)`. This repository's
 * control-byte law is about what reaches a FILE, and a six-character
 * escape written into a tool call has been seen to arrive on disk as
 * the byte it names -- so the one case that needs a control character
 * in a reason builds it at runtime and the source stays printable.
 *
 * ## Refusals first, and the accepting cases are their control
 *
 * The file opens with the three the task names -- a refusal body, an
 * answer that is not JSON, a `fetch` that throws -- then the readings
 * that refuse a shape, then the four mappings and the also-affected
 * path. A refusal read alone is weak evidence: a module that refused
 * everything would pass all of them. The mappings at the bottom reach
 * `filed`, `duplicate` and `stored` through the same function, so a
 * blanket refusal reds there.
 */

/** What a case records about one call the module made. */
interface FeedbackCall {
  /** The joined url, endpoint prefix and all. */
  readonly url: string;

  /** Exactly the `init` the module built. */
  readonly init: RequestInit | undefined;
}

/** A host whose `fetch` is stubbed, plus what that stub was asked. */
interface FeedbackStub {
  /** The host to hand a call under test. */
  readonly host: ReturnType<typeof buildDevToolsHost>;

  /** Every call made through it, in order. */
  readonly calls: FeedbackCall[];
}

/** One control character, built rather than written. */
const BELL = String.fromCharCode(7);

/** What a dev server that did not answer at all is reported as. */
const UNREACHABLE = 'The dev server did not answer. Is it still running?';

/** What an answer this module cannot read is reported as. */
const UNREADABLE
  = 'The dev server answered something this widget could not read.';

/** What a refusal with nothing to say is reported as. */
const UNSAID = 'The dev server refused it and gave no reason.';

/**
 * A host over a stubbed `fetch`.
 *
 * @param reply - What the stub answers; it may also throw.
 * @returns The host and the recording list.
 */
function stubbed(reply: DevToolsFetch): FeedbackStub {
  const calls: FeedbackCall[] = [];
  const host = buildDevToolsHost({
    config: { features: [] },
    status: null,
    fetchImpl: (url, init) => {
      calls.push({ url, init });

      return reply(url, init);
    },
  });

  return { host, calls };
}

/**
 * A host answering one JSON body with a 200.
 *
 * @param body - Whatever the dev server is pretending to say.
 * @returns The stub.
 */
function answering(body: unknown): FeedbackStub {
  return stubbed(() => Promise.resolve(
    new Response(JSON.stringify(body), { status: 200 }),
  ));
}

/** A report every accepting case sends, unchanged. */
function report(): FeedbackReport {
  return {
    feature: 'feedback',
    title: 'The drawer forgets the selector',
    body: '## Context\n\nIt does.\n',
    context: { url: 'http://localhost:5173/agents', viewport: '1440x900' },
  };
}

describe('submitFeedbackReport refusals', () => {
  it('answers the reason when the dev server refuses the body', async () => {
    const { host } = answering({
      status: 'refused',
      rule: 'body.title',
      reason: 'A title is at most 120 characters.',
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'refused',
      reason: 'A title is at most 120 characters.',
    });
  });

  it('answers a refusal when the answer is not JSON', async () => {
    const { host } = stubbed(() => Promise.resolve(
      new Response('<!doctype html><title>404</title>', { status: 404 }),
    ));

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'refused', reason: UNREADABLE });
  });

  it('answers a refusal when the dev server cannot be reached', async () => {
    const { host } = stubbed(() => Promise.reject(new TypeError(
      'Failed to fetch',
    )));

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'refused', reason: UNREACHABLE });
  });

  it('answers a refusal when the answer is a JSON array', async () => {
    const { host } = answering([{ status: 'stored', path: 'a/b.json' }]);

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'refused', reason: UNREADABLE });
  });

  it('answers a refusal when the answer is a bare null', async () => {
    const { host } = answering(null);

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'refused', reason: UNREADABLE });
  });

  it('answers a refusal for a status it has never heard of', async () => {
    const { host } = answering({ status: 'queued', path: 'a/b.json' });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'refused', reason: UNREADABLE });
  });

  it('answers a refusal when a stored answer carries no path', async () => {
    const { host } = answering({ status: 'stored' });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'refused', reason: UNREADABLE });
  });

  it('answers a refusal when a stored path is nothing but space', async () => {
    const { host } = answering({ status: 'stored', path: '   ' });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'refused', reason: UNREADABLE });
  });

  it('answers a fixed sentence when a refusal says nothing', async () => {
    const { host } = answering({ status: 'refused', rule: 'body' });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'refused', reason: UNSAID });
  });

  it('reduces a refusal reason to one safe line', async () => {
    const { host } = answering({
      status: 'refused',
      rule: 'gateway',
      reason: `\n${BELL}rafa:   could not\treach   the tracker\nstack frame`,
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'refused',
      reason: 'rafa: could not reach the tracker',
    });
  });

  it('caps a refusal reason at the limit and marks the cut', async () => {
    const { host } = answering({
      status: 'refused',
      rule: 'gateway',
      reason: 'x'.repeat(FEEDBACK_REASON_LIMIT + 1),
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'refused',
      reason: `${'x'.repeat(FEEDBACK_REASON_LIMIT)}...`,
    });
  });

  it('rejects rather than misreporting a payload it cannot send', async () => {
    const { host, calls } = answering({ status: 'stored', path: 'a/b.json' });
    const unserialisable: FeedbackReport = {
      ...report(),
      context: { size: 1n } as unknown as FeedbackReport['context'],
    };

    await expect(submitFeedbackReport(host, unserialisable)).rejects.toThrow(
      TypeError,
    );
    expect(calls).toHaveLength(0);
  });
});

describe('submitFeedbackReport mappings', () => {
  it('answers stored when no gateway ran', async () => {
    const { host } = answering({
      status: 'stored',
      path: '.rafa/feedback/q20b/2026-09-20-report.json',
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'stored',
      path: '.rafa/feedback/q20b/2026-09-20-report.json',
    });
  });

  it('answers stored when the tracker refused', async () => {
    const { host } = answering({
      status: 'stored',
      path: '.rafa/feedback/q20b/2026-09-20-report.json',
      gateway: { status: 'refused', reason: 'rafa exited 1: no auth token' },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'stored',
      path: '.rafa/feedback/q20b/2026-09-20-report.json',
    });
  });

  it('answers filed with the tracker, the id and the url', async () => {
    const { host } = answering({
      status: 'stored',
      path: '.rafa/feedback/q20b/2026-09-20-report.json',
      gateway: {
        status: 'filed',
        tracker: 'github',
        id: '103',
        url: 'https://github.com/owner/name/issues/103',
      },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'filed',
      tracker: 'github',
      id: '103',
      url: 'https://github.com/owner/name/issues/103',
    });
  });

  it('omits url entirely when the local tracker has none', async () => {
    const { host } = answering({
      status: 'stored',
      path: '.rafa/feedback/q20b/2026-09-20-report.json',
      gateway: { status: 'filed', tracker: 'local', id: 'local-7' },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'filed',
      tracker: 'local',
      id: 'local-7',
    });
  });

  it('drops a filed url that is not http or https', async () => {
    const { host } = answering({
      status: 'stored',
      path: 'a/b.json',
      gateway: {
        status: 'filed',
        tracker: 'github',
        id: '103',
        url: 'javascript:alert(1)',
      },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'filed',
      tracker: 'github',
      id: '103',
    });
  });

  it('drops a filed url that is relative', async () => {
    const { host } = answering({
      status: 'stored',
      path: 'a/b.json',
      gateway: {
        status: 'filed',
        tracker: 'github',
        id: '103',
        url: '/issues/103',
      },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'filed',
      tracker: 'github',
      id: '103',
    });
  });

  it('answers duplicate with the matched id, title and url', async () => {
    const { host } = answering({
      status: 'stored',
      path: 'a/b.json',
      gateway: {
        status: 'duplicate',
        match: {
          id: '91',
          title: '[fb/q20b] The drawer forgets the selector',
          url: 'https://github.com/owner/name/issues/91',
        },
      },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'duplicate',
      id: '91',
      title: '[fb/q20b] The drawer forgets the selector',
      url: 'https://github.com/owner/name/issues/91',
    });
  });

  it('omits a duplicate url the tracker could not give', async () => {
    const { host } = answering({
      status: 'stored',
      path: 'a/b.json',
      gateway: {
        status: 'duplicate',
        match: { id: 'local-3', title: 'Already reported' },
      },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'duplicate',
      id: 'local-3',
      title: 'Already reported',
    });
  });

  it('drops a duplicate url that is not http or https', async () => {
    const { host } = answering({
      status: 'stored',
      path: 'a/b.json',
      gateway: {
        status: 'duplicate',
        match: {
          id: '91',
          title: 'Already reported',
          url: 'javascript:alert(1)',
        },
      },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({
      status: 'duplicate',
      id: '91',
      title: 'Already reported',
    });
  });

  it('falls back to stored when a duplicate carries no match', async () => {
    const { host } = answering({
      status: 'stored',
      path: 'a/b.json',
      gateway: { status: 'duplicate' },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'stored', path: 'a/b.json' });
  });

  it('falls back to stored when a filed outcome names no tracker', async () => {
    const { host } = answering({
      status: 'stored',
      path: 'a/b.json',
      gateway: { status: 'filed', id: '103' },
    });

    const result = await submitFeedbackReport(host, report());

    expect(result).toStrictEqual({ status: 'stored', path: 'a/b.json' });
  });
});

describe('submitFeedbackReport request', () => {
  it('posts the report as JSON to the report route', async () => {
    const { host, calls } = answering({ status: 'stored', path: 'a/b.json' });
    const sent = report();

    await submitFeedbackReport(host, sent);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('/__devtools/report');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.headers).toStrictEqual({
      'content-type': 'application/json',
    });
    expect(JSON.parse(String(calls[0]?.init?.body))).toStrictEqual(sent);
  });

  it('sends the attachments the drawer captured', async () => {
    const { host, calls } = answering({ status: 'stored', path: 'a/b.json' });
    const withPng: FeedbackReport = {
      ...report(),
      attachments: [
        { name: 'screenshot.png', mime: 'image/png', base64: 'iVBORw0=' },
      ],
    };

    await submitFeedbackReport(host, withPng);

    expect(JSON.parse(String(calls[0]?.init?.body))).toStrictEqual(withPng);
  });
});

describe('submitAlsoAffected', () => {
  it('answers a refusal when the dev server has no gateway', async () => {
    const { host } = answering({
      status: 'refused',
      rule: 'gateway-absent',
      reason: 'This dev server has no report gateway configured.',
    });

    const result = await submitAlsoAffected(host, '91', 'Also affected.');

    expect(result).toStrictEqual({
      status: 'refused',
      reason: 'This dev server has no report gateway configured.',
    });
  });

  it('answers a refusal when the answer is not JSON', async () => {
    const { host } = stubbed(() => Promise.resolve(
      new Response('nope', { status: 500 }),
    ));

    const result = await submitAlsoAffected(host, '91', 'Also affected.');

    expect(result).toStrictEqual({ status: 'refused', reason: UNREADABLE });
  });

  it('answers a refusal when the dev server cannot be reached', async () => {
    const { host } = stubbed(() => Promise.reject(new TypeError(
      'Failed to fetch',
    )));

    const result = await submitAlsoAffected(host, '91', 'Also affected.');

    expect(result).toStrictEqual({ status: 'refused', reason: UNREACHABLE });
  });

  it('answers a refusal for an answer that did not comment', async () => {
    const { host } = answering({ status: 'stored', path: 'a/b.json' });

    const result = await submitAlsoAffected(host, '91', 'Also affected.');

    expect(result).toStrictEqual({ status: 'refused', reason: UNREADABLE });
  });

  it('answers a refusal for a filed gateway under the wrong status', async () => {
    const { host } = answering({
      status: 'stored',
      path: 'a/b.json',
      gateway: { status: 'filed', tracker: 'github', id: '91' },
    });

    const result = await submitAlsoAffected(host, '91', 'Also affected.');

    expect(result).toStrictEqual({ status: 'refused', reason: UNREADABLE });
  });

  it('answers the tracker line when the gateway refused', async () => {
    const { host } = answering({
      status: 'commented',
      gateway: { status: 'refused', reason: 'rafa exited 1: no auth token' },
    });

    const result = await submitAlsoAffected(host, '91', 'Also affected.');

    expect(result).toStrictEqual({
      status: 'refused',
      reason: 'rafa exited 1: no auth token',
    });
  });

  it('answers filed for the issue that was commented on', async () => {
    const { host } = answering({
      status: 'commented',
      gateway: {
        status: 'filed',
        tracker: 'github',
        id: '91',
        url: 'https://github.com/owner/name/issues/91',
      },
    });

    const result = await submitAlsoAffected(host, '91', 'Also affected.');

    expect(result).toStrictEqual({
      status: 'filed',
      tracker: 'github',
      id: '91',
      url: 'https://github.com/owner/name/issues/91',
    });
  });

  it('omits url entirely when the local tracker has none', async () => {
    const { host } = answering({
      status: 'commented',
      gateway: { status: 'filed', tracker: 'local', id: 'local-3' },
    });

    const result = await submitAlsoAffected(host, 'local-3', 'Also affected.');

    expect(result).toStrictEqual({
      status: 'filed',
      tracker: 'local',
      id: 'local-3',
    });
  });

  it('posts the issue id and the comment to the comment route', async () => {
    const { host, calls } = answering({
      status: 'commented',
      gateway: { status: 'filed', tracker: 'local', id: '91' },
    });

    await submitAlsoAffected(host, '91', 'Also affected: same selector.');

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('/__devtools/comment');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.headers).toStrictEqual({
      'content-type': 'application/json',
    });
    expect(JSON.parse(String(calls[0]?.init?.body))).toStrictEqual({
      issueId: '91',
      body: 'Also affected: same selector.',
    });
  });
});
