import type { RafaRun, RafaRunResult } from './call';
import type { DevToolsStoredReport } from '../store';

import { describe, expect, it } from 'vitest';

import { rafaGateway } from './rafa';

/**
 * ## What this file drives
 *
 * `./rafa.ts`: what goes into an argv, and what an answer means.
 * Running a command and reading NDJSON back is `./call.test.ts`'s
 * subject, and the four process-level refusals it pins in detail are
 * pinned once more HERE, through the gateway, because the plan's task
 * names them as this gateway's cases and because a refusal that never
 * reached `search`, `file` or `comment` would prove nothing.
 *
 * ## Nothing here runs `rafa`
 *
 * Every case injects a `run` that records the argv it was handed and
 * answers a fixed {@link RafaRunResult}. The real binary is never
 * spawned, nothing is filed and nothing is commented on — which is
 * also why the create and comment envelopes below are the plan's
 * reading of rafa's output rather than a live capture.
 *
 * ## What "the exact argv of every call" means here
 *
 * Every case asserts `calls` WHOLE, with `toStrictEqual` over an
 * array of arrays. So a flag added, dropped, reordered, split into
 * two elements or spelled `--flag value` reds a case, and so does a
 * second call nobody asked for. Spec decision 6 is the reason: an
 * argv array is the thing under test, not a command line.
 *
 * The refusals run first, then the duplicate, then the two filed
 * outcomes, which is this plan's order for every test file in the
 * package.
 */

/** The argv a search runs, for the report title every case uses. */
const LIST_ARGV = Object.freeze([
  'rafa',
  'issue',
  'list',
  '--type=bug',
  '--search=Modal traps focus on Firefox',
  '--output=json',
]);

/** The start event rafa prints before every result event. */
const START = JSON.stringify({
  type: 'start',
  command: 'issue list',
  ts: '2026-09-19T21:47:53.941Z',
});

/** A stored report every case files, or varies away from. */
const STORED: DevToolsStoredReport = Object.freeze({
  report: Object.freeze({
    feature: 'feedback',
    title: 'Modal traps focus on Firefox',
    body: 'Tab cycles inside the dialog and never reaches the close.',
    context: Object.freeze({ route: '/agents' }),
  }),
  round: 'round-1',
  storedAt: '2026-09-18T12:34:56.789Z',
  path: '.rafa/feedback/round-1/20260918-123456-789-feedback.json',
  attachmentPaths: Object.freeze([]),
});

/**
 * A process that exited zero and printed `stdout`.
 *
 * @param stdout - What it printed.
 * @returns The runner answer.
 */
function printed(stdout: string): RafaRunResult {
  return { code: 0, stdout, stderr: '', errno: null };
}

/**
 * The NDJSON an `issue list` call answers.
 *
 * @param issues - What `data.issues` holds.
 * @param kind - What `data.tracker.kind` holds.
 * @returns The two events, newline separated.
 */
function listed(issues: readonly unknown[], kind = 'github'): RafaRunResult {
  const event = JSON.stringify({
    type: 'result',
    ok: true,
    data: { tracker: { kind }, query: {}, issues },
  });

  return printed(`${START}\n${event}\n`);
}

/**
 * The NDJSON an `issue create` call answers.
 *
 * The plan's Description read literally: a result event whose data
 * holds the tracker and the ref.
 *
 * @param data - What `data` holds.
 * @returns The two events, newline separated.
 */
function created(data: unknown): RafaRunResult {
  const event = JSON.stringify({ type: 'result', ok: true, data });

  return printed(`${START}\n${event}\n`);
}

/**
 * A runner answering the given results in order, recording each argv.
 *
 * A call past the last result is a thrown error rather than a
 * silently repeated answer, so a gateway that ran one command too
 * many reds the case that arranged for one.
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

describe('the refusals of the rafa gateway', () => {
  it('refuses a blank search rather than matching everything', async () => {
    // Arrange: an empty `--search=` would list every open bug and
    // make the first of them a duplicate of this report.
    const { calls, run } = runner();
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.search('   ');

    // Assert: refused, and nothing was run at all.
    expect(answered.status).toBe('refused');
    expect(calls).toStrictEqual([]);
  });

  it('refuses a blank issue id rather than running one', async () => {
    // Arrange
    const { calls, run } = runner();
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.comment('  ', 'Also affected.');

    // Assert
    expect(answered.status).toBe('refused');
    expect(calls).toStrictEqual([]);
  });

  it('refuses an issue id beginning with a dash', async () => {
    // Arrange: the id is the ONE positional argv element this module
    // builds, and a leading dash is a flag to every CLI.
    const { calls, run } = runner();
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.comment('--help', 'Also affected.');

    // Assert
    expect(answered.status).toBe('refused');
    expect(calls).toStrictEqual([]);
  });

  it('refuses when the binary is missing, after one call', async () => {
    // Arrange: the ENOENT case — no rafa on this machine.
    const { calls, run } = runner({
      code: null,
      stdout: '',
      stderr: '',
      errno: 'ENOENT',
    });
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert: the search argv ran, the create did not, and the report
    // is left on disk for the endpoint to answer `stored` with.
    expect(answered).toStrictEqual({
      status: 'refused',
      reason: 'rafa issue list could not be started (ENOENT).',
    });
    expect(calls).toStrictEqual([[...LIST_ARGV]]);
  });

  it('refuses a non-zero exit, carrying its stderr line', async () => {
    // Arrange
    const { calls, run } = runner({
      code: 1,
      stdout: '',
      stderr: 'error: no tracker is configured\n',
      errno: null,
    });
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert
    expect(answered).toStrictEqual({
      status: 'refused',
      reason: 'rafa issue list exited 1: error: no tracker is configured',
    });
    expect(calls).toStrictEqual([[...LIST_ARGV]]);
  });

  it('refuses output that is not NDJSON', async () => {
    // Arrange
    const { calls, run } = runner(printed('<html>login</html>'));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert
    expect(answered).toStrictEqual({
      status: 'refused',
      reason: 'rafa issue list answered output that is not NDJSON.',
    });
    expect(calls).toStrictEqual([[...LIST_ARGV]]);
  });

  it('refuses a result event whose ok is false', async () => {
    // Arrange
    const event = JSON.stringify({
      type: 'result',
      ok: false,
      error: 'gh auth login is required',
    });
    const { calls, run } = runner(printed(`${START}\n${event}`));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert
    expect(answered).toStrictEqual({
      status: 'refused',
      reason: 'rafa issue list refused this call: gh auth login is required',
    });
    expect(calls).toStrictEqual([[...LIST_ARGV]]);
  });

  it('refuses a list whose issues carry no identifier', async () => {
    // Arrange: the failure the plan warns about — a parser reading
    // `id` off an issue finds nothing. Answering no matches would
    // make dedupe silently stop working.
    const { run } = runner(listed([{ id: 7, title: 'Modal traps focus' }]));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.search('Modal traps focus');

    // Assert
    const reason = answered.status === 'refused'
      ? answered.reason
      : '';

    expect(answered.status).toBe('refused');
    expect(reason).toContain('none of them carries an identifier');
  });

  it('refuses a list answer that is not the expected shape', async () => {
    // Arrange + Act
    const { run } = runner(created({ issues: 'all of them' }));
    const gateway = rafaGateway({ run });
    const answered = await gateway.search('Modal traps focus');

    // Assert
    expect(answered).toStrictEqual({
      status: 'refused',
      reason: 'rafa issue list answered a result this gateway cannot read.',
    });
  });

  it('refuses a create that answered no issue identifier', async () => {
    // Arrange: the one create answer with no fallback — without an
    // id the report may or may not have been filed, and saying so is
    // the only honest outcome.
    const { calls, run } = runner(
      listed([]),
      created({ tracker: { kind: 'github' } }),
    );
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert
    const reason = answered.status === 'refused'
      ? answered.reason
      : '';

    expect(answered.status).toBe('refused');
    expect(reason).toContain('may or may not have been filed');
    expect(calls).toHaveLength(2);
  });

  it('refuses every call when no runner is configured', async () => {
    // Arrange: the state this stage ships in, `./run.ts` being the
    // next task. A gateway with no runner files nothing and says so.
    const gateway = rafaGateway();

    // Act
    const searched = await gateway.search('Modal traps focus');
    const filed = await gateway.file(STORED);
    const commented = await gateway.comment('103', 'Also affected.');

    // Assert
    expect(searched.status).toBe('refused');
    expect(filed.status).toBe('refused');
    expect(commented.status).toBe('refused');
  });
});

describe('a report the tracker already knows', () => {
  it('answers the duplicate and never runs a create', async () => {
    // Arrange: one hit, in the shape measured at plan time.
    const { calls, run } = runner(listed([
      {
        title: 'Modal traps focus on Firefox',
        ref: {
          opt: 0,
          kind: 'github',
          externalId: '103',
          url: 'https://github.com/owner/name/issues/103',
          module: 'web',
        },
      },
    ]));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert: the duplicate, and exactly one call — the list.
    expect(answered).toStrictEqual({
      status: 'duplicate',
      match: {
        id: '103',
        title: 'Modal traps focus on Firefox',
        url: 'https://github.com/owner/name/issues/103',
      },
    });
    expect(calls).toStrictEqual([[...LIST_ARGV]]);
  });

  it('searches on the raw title, never on the prefixed one', async () => {
    // Arrange: searching for `[fb/round-1] ...` could never match an
    // issue filed in an earlier round, which would defeat dedupe.
    const { calls, run } = runner(listed([]), created({
      tracker: { kind: 'github' },
      ref: { kind: 'github', externalId: '104' },
    }));
    const gateway = rafaGateway({ run });

    // Act
    await gateway.file(STORED);

    // Assert
    expect(calls[0]).toStrictEqual([...LIST_ARGV]);
    expect(calls[0]?.join(' ')).not.toContain('[fb/');
  });

  it('answers matches of id, title and url from a search', async () => {
    // Arrange: two hits, the second on a tracker with no web address.
    const { calls, run } = runner(listed([
      {
        title: 'One',
        ref: { externalId: '103', url: 'https://example.test/103' },
      },
      { title: 'Two', ref: { externalId: 4, url: null } },
    ], 'local'));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.search('Modal traps focus on Firefox');

    // Assert: a numeric id reads as a string, and a null url is
    // absent rather than null.
    expect(answered).toStrictEqual({
      status: 'matches',
      matches: [
        { id: '103', title: 'One', url: 'https://example.test/103' },
        { id: '4', title: 'Two' },
      ],
    });
    expect(calls).toStrictEqual([[...LIST_ARGV]]);
  });

  it('answers no matches when the tracker knew nothing', async () => {
    // Arrange + Act: the control over the refusal above — an EMPTY
    // issue list is an answer, not a failure.
    const { run } = runner(listed([]));
    const gateway = rafaGateway({ run });
    const answered = await gateway.search('Modal traps focus on Firefox');

    // Assert
    expect(answered).toStrictEqual({ status: 'matches', matches: [] });
  });
});

describe('a report the tracker files', () => {
  it('prefixes the title with the round and files on github', async () => {
    // Arrange
    const { calls, run } = runner(listed([]), created({
      tracker: { kind: 'github' },
      ref: {
        kind: 'github',
        externalId: '104',
        url: 'https://github.com/owner/name/issues/104',
      },
    }));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert: both argv, whole and in order.
    expect(calls).toStrictEqual([
      [...LIST_ARGV],
      [
        'rafa',
        'issue',
        'create',
        '--title=[fb/round-1] Modal traps focus on Firefox',
        '--body=Tab cycles inside the dialog and never reaches the close.',
        '--type=bug',
        '--module=web',
        '--output=json',
      ],
    ]);
    expect(answered).toStrictEqual({
      status: 'filed',
      tracker: 'github',
      id: '104',
      url: 'https://github.com/owner/name/issues/104',
    });
  });

  it('files on local and answers no url when there is none', async () => {
    // Arrange: rafa's chain falling back, which is what gives a
    // machine with no GitHub login a path at all.
    const { run } = runner(listed([], 'local'), created({
      tracker: { kind: 'local' },
      ref: { kind: 'local', externalId: '7', url: null },
    }));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert
    expect(answered).toStrictEqual({
      status: 'filed',
      tracker: 'local',
      id: '7',
    });
  });

  it('carries the stored attachment paths in the body', async () => {
    // Arrange: the browser has not seen these paths, so they are
    // appended here. The bytes stay on the machine.
    const withFiles: DevToolsStoredReport = {
      ...STORED,
      attachmentPaths: Object.freeze([
        '.rafa/feedback/round-1/20260918-123456-789-feedback-screenshot.png',
      ]),
    };
    const { calls, run } = runner(listed([]), created({
      tracker: { kind: 'github' },
      ref: { externalId: '105' },
    }));
    const gateway = rafaGateway({ run });

    // Act
    await gateway.file(withFiles);

    // Assert
    const body = calls[1]?.[4] ?? '';

    expect(body).toContain('## Attachments');
    expect(body).toContain(
      '- `.rafa/feedback/round-1/'
      + '20260918-123456-789-feedback-screenshot.png`',
    );
    expect(body.startsWith(`--body=${STORED.report.body}`)).toBe(true);
  });

  it('leaves a body without attachments untouched', async () => {
    // Arrange + Act: the control over the case above — no attachment
    // means no section, not an empty one.
    const { calls, run } = runner(listed([]), created({
      tracker: { kind: 'github' },
      ref: { externalId: '106' },
    }));
    const gateway = rafaGateway({ run });

    await gateway.file(STORED);

    // Assert
    expect(calls[1]?.[4]).toBe(`--body=${STORED.report.body}`);
  });

  it('files with the configured module and priority', async () => {
    // Arrange
    const { calls, run } = runner(listed([]), created({
      tracker: { kind: 'github' },
      ref: { externalId: '107' },
    }));
    const gateway = rafaGateway({ run, module: 'service', priority: 'high' });

    // Act
    await gateway.file(STORED);

    // Assert
    expect(calls[1]).toStrictEqual([
      'rafa',
      'issue',
      'create',
      '--title=[fb/round-1] Modal traps focus on Firefox',
      '--body=Tab cycles inside the dialog and never reaches the close.',
      '--type=bug',
      '--module=service',
      '--priority=high',
      '--output=json',
    ]);
  });

  it('runs the configured binary as the first argv element', async () => {
    // Arrange + Act
    const { calls, run } = runner(listed([]));
    const gateway = rafaGateway({ run, bin: '/opt/rafa/bin/rafa' });

    await gateway.search('Modal traps focus on Firefox');

    // Assert
    expect(calls[0]?.[0]).toBe('/opt/rafa/bin/rafa');
  });

  it('keeps a title holding spaces as ONE argv element', async () => {
    // Arrange: the whole point of the `--flag=value` form. A shell
    // string would have split this into five arguments.
    const spaced: DevToolsStoredReport = {
      ...STORED,
      report: { ...STORED.report, title: 'a b "c" d e' },
    };
    const { calls, run } = runner(listed([]), created({
      tracker: { kind: 'github' },
      ref: { externalId: '108' },
    }));
    const gateway = rafaGateway({ run });

    // Act
    await gateway.file(spaced);

    // Assert
    expect(calls[0]?.[4]).toBe('--search=a b "c" d e');
    expect(calls[1]?.[3]).toBe('--title=[fb/round-1] a b "c" d e');
  });

  it('reads a create ref nested under issue as well', async () => {
    // Arrange: the create envelope was never read live, so the
    // measured LIST nesting is accepted beside the plan's `data.ref`.
    const { run } = runner(listed([]), created({
      tracker: { kind: 'github' },
      issue: { ref: { externalId: '109', url: 'https://e.test/109' } },
    }));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert
    expect(answered).toStrictEqual({
      status: 'filed',
      tracker: 'github',
      id: '109',
      url: 'https://e.test/109',
    });
  });

  it('names the tracker off the ref when data named none', async () => {
    // Arrange: `ref.kind` is measured on every listed ref, so it is
    // the fallback rather than a guess.
    const { run } = runner(listed([]), created({
      ref: { kind: 'local', externalId: '110' },
    }));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.file(STORED);

    // Assert
    expect(answered).toStrictEqual({
      status: 'filed',
      tracker: 'local',
      id: '110',
    });
  });
});

describe('the also affected comment', () => {
  it('runs the id as a positional and the body as one flag', async () => {
    // Arrange
    const { calls, run } = runner(created({
      tracker: { kind: 'github' },
      ref: { externalId: '103', url: 'https://e.test/103' },
    }));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.comment(
      '103',
      'Also affected: same modal, Firefox 148.',
    );

    // Assert
    expect(calls).toStrictEqual([[
      'rafa',
      'issue',
      'comment',
      '103',
      '--body=Also affected: same modal, Firefox 148.',
      '--output=json',
    ]]);
    expect(answered).toStrictEqual({
      status: 'filed',
      tracker: 'github',
      id: '103',
      url: 'https://e.test/103',
    });
  });

  it('answers the id it was given, whatever the envelope', async () => {
    // Arrange: the comment envelope was never read live, so a shape
    // this gateway cannot read must not turn a comment that landed
    // into a refusal.
    const { run } = runner(created({ commented: true }));
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.comment('AR-123', 'Also affected.');

    // Assert
    expect(answered).toStrictEqual({
      status: 'filed',
      tracker: 'unknown',
      id: 'AR-123',
    });
  });

  it('refuses when the comment call itself refused', async () => {
    // Arrange: the control over the case above — a tracker that said
    // no is still a refusal, not a filed comment.
    const { run } = runner({
      code: 1,
      stdout: '',
      stderr: 'error: issue 103 not found',
      errno: null,
    });
    const gateway = rafaGateway({ run });

    // Act
    const answered = await gateway.comment('103', 'Also affected.');

    // Assert
    expect(answered).toStrictEqual({
      status: 'refused',
      reason: 'rafa issue comment exited 1: error: issue 103 not found',
    });
  });
});

describe('the gateway itself', () => {
  it('answers to a name that is not the absent one', async () => {
    // Arrange + Act: `GET /__devtools/status` spells "no gateway" as
    // `none`, so a gateway may not answer to it.
    const gateway = rafaGateway();

    // Assert
    expect(gateway.name).toBe('rafa');
    expect(gateway.name).not.toBe('none');
    await expect(gateway.search('x')).resolves.toMatchObject({
      status: 'refused',
    });
  });

  it('is frozen, so a caller cannot swap a method out', async () => {
    // Arrange + Act
    const { run } = runner(listed([]));
    const gateway = rafaGateway({ run });

    // Assert
    expect(Object.isFrozen(gateway)).toBe(true);
    await expect(gateway.search('Modal traps focus on Firefox'))
      .resolves.toMatchObject({ status: 'matches' });
  });
});
