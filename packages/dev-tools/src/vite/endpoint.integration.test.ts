import type { ReportGateway, ReportGatewayFileOutcome } from './gateway';
import type { DevToolsIncoming } from './http';

import { describe, expect, it } from 'vitest';

import {
  DEVTOOLS_COMMENT_PATH,
  DEVTOOLS_REPORT_PATH,
  DEVTOOLS_STATUS_PATH,
  DEVTOOLS_TEMPLATES_PATH,
} from './endpoint';
import {
  LOOPBACK_ADDRESS,
  SAME_ORIGIN_HEADERS,
  SERVER_PORT,
  assemble,
  createResponse,
  fakeRequest,
  runMiddleware,
} from './harness';

/**
 * Integration cases over one assembled middleware, driven through more
 * than one of its routes in a row.
 *
 * `./plugin.test.ts` and `./endpoint.test.ts` each pin ONE route at a
 * time — the shape spec item 8's per-route tasks were written against —
 * and neither ever asks whether an id the report route answers is the
 * SAME id the "also affected" route can act on afterward, because
 * neither drives both routes against the same gateway in the same case.
 * This file is that missing case: one `./harness.ts` `assemble()` call,
 * one fake tracker, three requests in the order spec item 7's drawer
 * sends them — a templates read, a report post, then an "also affected"
 * comment — and one case reading the status payload's `repo`, `round`
 * and `gateway` together, off that same one assembly, rather than one
 * field at a time the way `./plugin.test.ts`'s two status cases each do.
 *
 * ## The fake tracker
 *
 * {@link createFakeTracker} is not a fake for the SEARCH half of
 * `./gateway.ts`'s interface — nothing here calls it, and it rejects if
 * something did — it is a fake for the two halves the "also affected"
 * path actually chains: `file` assigns an issue an id and remembers it,
 * and `comment` looks that id up and refuses the ones it never filed.
 * That refusal is this file's control: a tracker that accepted every id
 * handed to it would let the flow case below pass for the wrong
 * reason — it would prove only that a body reached SOME method, not
 * that the id the report route answered is what reached the comment
 * route.
 *
 * ## The order
 *
 * The refusal — commenting on an id the fake tracker never filed —
 * runs first. Then the flow: templates, report, comment. Then the
 * status payload, which needs no filed report and could as easily have
 * run first; it runs last because the flow case is this file's reason
 * to exist and the law is that a refusal precedes an ACCEPTING case, not
 * that every accepting case is interchangeable with another.
 */

/** What every case in this file names the fake tracker. */
const FAKE_TRACKER_NAME = 'fake-tracker';

/** One issue on {@link createFakeTracker}'s in-memory tracker. */
interface FakeTrackerIssue {
  /** The id {@link createFakeTracker}'s `file` assigned it. */
  readonly id: string;

  /** The report title `file` was handed. */
  readonly title: string;

  /** Every "also affected" comment `comment` recorded against it. */
  readonly comments: string[];
}

/** A gateway backed by one in-memory tracker. */
interface FakeTrackerGateway extends ReportGateway {
  /** Every issue `file` has created, in the order it created them. */
  readonly issues: readonly FakeTrackerIssue[];
}

/**
 * Build a gateway backed by one in-memory tracker, so a report `file`d
 * through it and an "also affected" `comment`ed through it afterward can
 * be proven to have landed on the SAME issue.
 *
 * @returns The gateway, and the issues it has filed so far.
 */
function createFakeTracker(): FakeTrackerGateway {
  const issues: FakeTrackerIssue[] = [];
  let nextId = 1;

  return {
    issues,
    name: FAKE_TRACKER_NAME,
    file: (report) => {
      const id = String(nextId);

      nextId += 1;
      issues.push({ id, title: report.report.title, comments: [] });

      return Promise.resolve(Object.freeze({
        status: 'filed' as const,
        tracker: FAKE_TRACKER_NAME,
        id,
        url: `https://tracker.test/issues/${id}`,
      }));
    },
    search: () => Promise.reject(
      new Error('no case in this file searches the fake tracker'),
    ),
    comment: (issueId, body) => {
      const issue = issues.find((candidate) => candidate.id === issueId);

      if (issue === undefined) {
        return Promise.resolve(Object.freeze({
          status: 'refused' as const,
          reason: `The fake tracker has no issue ${issueId}.`,
        }));
      }

      issue.comments.push(body);

      return Promise.resolve(Object.freeze({
        status: 'filed' as const,
        tracker: FAKE_TRACKER_NAME,
        id: issue.id,
        url: `https://tracker.test/issues/${issue.id}`,
      }));
    },
  };
}

/** An issue form the templates step reads off the injected disk. */
const BUG_FORM = `name: Bug report
description: Something in the app behaves wrong.
body:
  - type: input
    id: what-happened
    attributes:
      label: What happened
    validations:
      required: true
`;

/** The report the report step posts. */
const REPORT_TITLE = 'The lexicon editor loses focus on save';

/** The report body, spelled once. */
const REPORT_BODY = JSON.stringify({
  feature: 'feedback',
  title: REPORT_TITLE,
  body: 'Steps: open the lexicon editor, edit a term, press save.',
  context: { route: '/lexicon' },
});

/** What the "also affected" step posts, once an issue id is known. */
const ALSO_AFFECTED_TEXT
  = 'Also affected: the same modal traps focus on Firefox 148.';

/**
 * Build a request for `GET /__devtools/templates`, over loopback.
 *
 * @returns The request.
 */
function templatesRequest(): DevToolsIncoming {
  return fakeRequest({
    method: 'GET',
    url: DEVTOOLS_TEMPLATES_PATH,
    remoteAddress: LOOPBACK_ADDRESS,
    localPort: SERVER_PORT,
  });
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

describe('the refusal the flow case below needs as its control', () => {
  it('refuses an also affected comment naming an issue the fake tracker never filed', async () => {
    // Arrange: a fresh assembly over a fresh fake tracker — nothing has
    // been filed on it yet, so every issue id is unknown to it.
    const tracker = createFakeTracker();
    const { assembly } = assemble({ gateway: tracker });
    const { res, read } = createResponse();
    const body = JSON.stringify({
      issueId: 'never-filed',
      body: ALSO_AFFECTED_TEXT,
    });

    // Act
    await runMiddleware(assembly.handler, commentRequest(body), res);

    // Assert: the REQUEST was not refused — the body passed the schema
    // and a gateway was configured — the TRACKER refused, because the
    // id names no issue it ever filed.
    expect(read().statusCode).toBe(200);
    expect(read().body).toMatchObject({
      status: 'commented',
      gateway: {
        status: 'refused',
        reason: 'The fake tracker has no issue never-filed.',
      },
    });
    expect(tracker.issues).toEqual([]);
  });
});

describe('a templates read, a report post and an also affected comment on the same fake tracker', () => {
  it('comments on the very issue the report step filed', async () => {
    // Arrange: one assembly, one fake tracker, one in-memory issue-form
    // directory — every request below is driven through the SAME
    // middleware this one `assemble()` call built.
    const tracker = createFakeTracker();
    const { assembly } = assemble(
      { gateway: tracker },
      { 'bug-report.yml': BUG_FORM },
    );

    // Act 1: the templates read.
    const templates = createResponse();

    await runMiddleware(assembly.handler, templatesRequest(), templates.res);

    // Act 2: the report post, on the same middleware.
    const reported = createResponse();

    await runMiddleware(
      assembly.handler,
      reportRequest(REPORT_BODY),
      reported.res,
    );

    // Assert 1: the form the templates step read is the one this file
    // arranged, proving the templates read and the report post that
    // follows share the one injected filesystem.
    const templateList
      = templates.read().body as readonly { readonly id: string }[];

    expect(templates.read().statusCode).toBe(200);
    expect(templateList.map((template) => template.id)).toEqual([
      'bug-report',
    ]);

    // Assert 2: the report was stored and filed, and the fake tracker
    // now holds exactly the one issue `file` created for it.
    const stored = reported.read().body as {
      readonly status: 'stored';
      readonly gateway: ReportGatewayFileOutcome;
    };

    expect(reported.read().statusCode).toBe(200);

    if (stored.gateway.status !== 'filed') {
      throw new Error(
        `expected the fake tracker to file the report, got ${stored.gateway.status}`,
      );
    }

    const { id: issueId } = stored.gateway;

    expect(tracker.issues).toEqual([{
      id: issueId,
      title: REPORT_TITLE,
      comments: [],
    }]);

    // Act 3: the also affected comment, naming the id the report step
    // just answered — never a value this file hardcodes.
    const commented = createResponse();
    const commentBody = JSON.stringify({
      issueId,
      body: ALSO_AFFECTED_TEXT,
    });

    await runMiddleware(
      assembly.handler,
      commentRequest(commentBody),
      commented.res,
    );

    // Assert 3: the SAME fake tracker recorded the comment against the
    // SAME issue the report step filed — the reading no per-route case
    // in `./plugin.test.ts` or `./endpoint.test.ts` can take, since
    // neither drives both routes against one gateway in one case.
    expect(commented.read().statusCode).toBe(200);
    expect(commented.read().body).toEqual({
      status: 'commented',
      gateway: {
        status: 'filed',
        tracker: FAKE_TRACKER_NAME,
        id: issueId,
        url: `https://tracker.test/issues/${issueId}`,
      },
    });
    expect(tracker.issues).toEqual([{
      id: issueId,
      title: REPORT_TITLE,
      comments: [ALSO_AFFECTED_TEXT],
    }]);
  });
});

describe('the status payload', () => {
  it('answers repo, round and gateway all read from the one assembly', async () => {
    // Arrange: a single `assemble()` call carrying a round, a gateway
    // and a scripted `origin` remote all at once, so a payload that
    // hard-wired any one of the three, or read it from somewhere other
    // than THIS assembly, would fail this case.
    const tracker = createFakeTracker();
    const round = 'integration-round';
    const { assembly } = assemble(
      { round, gateway: tracker },
      null,
      'git@github.com:acme/widgets.git',
    );
    const { res, read } = createResponse();

    // Act
    await runMiddleware(
      assembly.handler,
      fakeRequest({
        method: 'GET',
        url: DEVTOOLS_STATUS_PATH,
        remoteAddress: LOOPBACK_ADDRESS,
      }),
      res,
    );

    // Assert: the three read together, off the one assembly above.
    expect(read().statusCode).toBe(200);
    expect(read().body).toMatchObject({
      repo: 'acme/widgets',
      round,
      gateway: FAKE_TRACKER_NAME,
    });
  });
});
