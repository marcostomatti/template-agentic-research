import type {
  DevToolsClock,
  DevToolsStoreFs,
  DevToolsStoreRequest,
} from './store';
import type * as nodeFs from 'node:fs/promises';

import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import { DEVTOOLS_DEFAULT_OUT_DIR, storeReport } from './store';

/**
 * ## Nothing here touches a real filesystem or a real clock
 *
 * `store.ts` takes both as arguments, so every case below hands it a
 * Map-free recorder and a clock stuck at one instant. No temp
 * directory is created, nothing is cleaned up afterwards, no case
 * depends on the order the others ran in, and a case can assert an
 * EXACT path rather than a pattern — which is the point of the
 * injection, not a side benefit of it.
 *
 * The recorder is the one mutable thing in this file. A spy has to
 * accumulate, and a fresh one is built per case, so the mutation is
 * local to the case that reads it.
 *
 * ## Why so many refusals carry a positive control
 *
 * Every refusal here is `storeReport` answering `ok: false`, and a
 * function hard-wired to refuse would pass all of them. So each pairs
 * the refusal with the ONE edit that should have made it write — a
 * title with a letter in it, a round that survives sanitisation, a
 * filesystem that does not throw — and asserts that the same call then
 * writes.
 *
 * ## Why the paths are spelled as literals
 *
 * `.rafa/feedback/round-3/20260918-123456-789-menu-drifts-off-screen
 * .json` is written out rather than rebuilt with `join` and the same
 * helpers `store.ts` uses, which would make these cases restate
 * whatever the module currently believes. The separator is POSIX
 * because that is what the two platforms this suite runs on use.
 *
 * Refusals run before the write cases, and the write cases before the
 * attachment case, which is this plan's order for this file.
 */

/** One call the recorder saw. */
interface RecordedWrite {
  /** Where it was written. */
  readonly path: string;

  /** What was written there. */
  readonly data: string | Uint8Array;
}

/** A filesystem that records instead of writing. */
interface RecordingFs extends DevToolsStoreFs {
  /** Every directory `mkdir` was asked for, in order. */
  readonly directories: readonly string[];

  /** Every file `writeFile` was asked for, in order. */
  readonly writes: readonly RecordedWrite[];
}

/**
 * Build a recording filesystem.
 *
 * @param fail - Consulted before each call; anything it answers other
 * than `undefined` is thrown instead of the call succeeding. Absent
 * means every call succeeds.
 * @returns The recorder.
 */
function createFs(
  fail?: (operation: 'mkdir' | 'writeFile', path: string) => unknown,
): RecordingFs {
  const directories: string[] = [];
  const writes: RecordedWrite[] = [];

  return {
    directories,
    writes,
    async mkdir(path: string) {
      const failure = fail?.('mkdir', path);

      if (failure !== undefined) {
        throw failure;
      }

      directories.push(path);

      return undefined;
    },
    async writeFile(path: string, data: string | Uint8Array) {
      const failure = fail?.('writeFile', path);

      if (failure !== undefined) {
        throw failure;
      }

      writes.push({ path, data });
    },
  };
}

/** The instant every case is stamped with: 2026-09-18T12:34:56.789Z. */
const CLOCK: DevToolsClock = () => new Date(
  Date.UTC(2026, 8, 18, 12, 34, 56, 789),
);

/** What {@link CLOCK} spells as. */
const STAMP = '20260918-123456-789';

/** A request that writes cleanly; each case varies one thing. */
const REQUEST: DevToolsStoreRequest = Object.freeze({
  outDir: DEVTOOLS_DEFAULT_OUT_DIR,
  round: 'round-3',
  report: Object.freeze({
    feature: 'feedback',
    title: 'Menu drifts off-screen',
    body: 'At 320px the popover lands past the right edge.',
    context: Object.freeze({ route: '/lexicon', width: 320 }),
  }),
});

/** Where {@link REQUEST} lands. */
const REQUEST_PATH
  = `.rafa/feedback/round-3/${STAMP}-menu-drifts-off-screen.json`;

/**
 * Build a request whose report differs from {@link REQUEST}'s.
 *
 * @param report - The fields to override.
 * @returns A fresh request.
 */
function withReport(
  report: Partial<DevToolsStoreRequest['report']>,
): DevToolsStoreRequest {
  return { ...REQUEST, report: { ...REQUEST.report, ...report } };
}

/**
 * Build an attachment carrying the given text as its bytes.
 *
 * @param name - The name the sender gave it.
 * @param text - What it decodes to.
 * @returns The attachment.
 */
function attachment(name: string, text: string) {
  return {
    name,
    mime: 'image/png',
    base64: Buffer.from(text, 'utf8').toString('base64'),
  };
}

describe('what storeReport refuses', () => {
  it('refuses a slug that would escape the directory', async () => {
    // Arrange: a title that is nothing but a traversal, so sanitising
    // it to [a-z0-9-] leaves no characters at all.
    const fs = createFs();

    // Act
    const result = await storeReport(withReport({ title: '../..' }), {
      fs,
      now: CLOCK,
    });

    // Assert
    expect(result).toEqual({
      ok: false,
      rule: 'slug-unusable',
      reason: expect.any(String),
    });
    expect(fs.directories).toEqual([]);
    expect(fs.writes).toEqual([]);

    // The control, and the escape reading in one: a traversal with a
    // name on the end of it DOES write, and what it writes is inside
    // the round directory under a separator-free name.
    const escaped = await storeReport(
      withReport({ title: '../../etc/passwd' }),
      { fs: createFs(), now: CLOCK },
    );

    expect(escaped).toMatchObject({
      ok: true,
      stored: { path: `.rafa/feedback/round-3/${STAMP}-etc-passwd.json` },
    });
  });

  it('refuses a round left empty by sanitisation', async () => {
    // Arrange
    const fs = createFs();

    // Act
    const result = await storeReport(
      { ...REQUEST, round: '../..' },
      { fs, now: CLOCK },
    );

    // Assert
    expect(result).toMatchObject({ ok: false, rule: 'round-unusable' });
    expect(fs.directories).toEqual([]);
    expect(fs.writes).toEqual([]);

    // The control: the same call with a round that survives writes.
    expect(await storeReport(REQUEST, { fs: createFs(), now: CLOCK }))
      .toMatchObject({ ok: true });
  });

  it('refuses an unusable attachment name before any write', async () => {
    // Arrange: '..' has no stem once the extension is split off, so
    // nothing usable survives it.
    const fs = createFs();
    const request = withReport({
      attachments: [attachment('..', 'bytes')],
    });

    // Act
    const result = await storeReport(request, { fs, now: CLOCK });

    // Assert: the refusal, and that name resolution ran BEFORE the
    // mkdir rather than after it.
    expect(result).toMatchObject({
      ok: false,
      rule: 'attachment-name-unusable',
    });
    expect(fs.directories).toEqual([]);
    expect(fs.writes).toEqual([]);

    // The control: the same report with a usable name writes both
    // files.
    const usable = createFs();
    const written = await storeReport(
      withReport({ attachments: [attachment('shot.png', 'bytes')] }),
      { fs: usable, now: CLOCK },
    );

    expect(written).toMatchObject({ ok: true });
    expect(usable.writes).toHaveLength(2);
  });

  it('refuses a clock that answers no usable time', async () => {
    // Arrange: an injected clock is a boundary like any other.
    const fs = createFs();

    // Act
    const result = await storeReport(REQUEST, {
      fs,
      now: () => new Date(Number.NaN),
    });

    // Assert
    expect(result).toMatchObject({ ok: false, rule: 'clock-unusable' });
    expect(fs.writes).toEqual([]);

    // The control: the same request under a clock that answers.
    expect(await storeReport(REQUEST, { fs: createFs(), now: CLOCK }))
      .toMatchObject({ ok: true });
  });

  it('refuses an unwritable directory and writes nothing', async () => {
    // Arrange: what a read-only checkout answers.
    const denied = Object.assign(new Error('permission denied'), {
      code: 'EACCES',
    });
    const fs = createFs((operation) => (
      operation === 'mkdir'
        ? denied
        : undefined
    ));

    // Act
    const result = await storeReport(REQUEST, { fs, now: CLOCK });

    // Assert: the rule, and the errno in the reason so an operator
    // learns which failure it was.
    expect(result).toMatchObject({ ok: false, rule: 'write-failed' });
    expect(result).toHaveProperty(
      'reason',
      expect.stringContaining('(EACCES)'),
    );
    expect(fs.writes).toEqual([]);

    // The control: the same request through a filesystem that does not
    // throw writes.
    expect(await storeReport(REQUEST, { fs: createFs(), now: CLOCK }))
      .toMatchObject({ ok: true });
  });

  it('refuses a failed attachment write, JSON unwritten', async () => {
    // Arrange: the disk fills up on the attachment.
    const full = Object.assign(new Error('no space left'), {
      code: 'ENOSPC',
    });
    const fs = createFs((operation, path) => (
      path.endsWith('.png')
        ? full
        : undefined
    ));

    // Act
    const result = await storeReport(
      withReport({ attachments: [attachment('shot.png', 'bytes')] }),
      { fs, now: CLOCK },
    );

    // Assert: the module's ordering claim — a JSON on disk always has
    // its attachments beside it, so a failed attachment means no JSON.
    expect(result).toMatchObject({ ok: false, rule: 'write-failed' });
    expect(fs.writes).toEqual([]);
  });

  it('appends an errno to a write refusal and nothing else', async () => {
    // Arrange: an injected filesystem may reject with anything, and a
    // refusal reason reaches a browser.
    const shouty = { code: 'not an errno <script>alert(1)</script>' };

    // Act
    const result = await storeReport(REQUEST, {
      fs: createFs(() => shouty),
      now: CLOCK,
    });

    // Assert: no parenthesised detail at all when the code is not one.
    expect(result).toMatchObject({ ok: false, rule: 'write-failed' });
    expect(result).toHaveProperty('reason', expect.not.stringContaining('('));

    // The control: a real errno IS appended, so the assertion above
    // reads as "this one was filtered" rather than "nothing is ever
    // appended".
    const real = await storeReport(REQUEST, {
      fs: createFs(() => ({ code: 'EROFS' })),
      now: CLOCK,
    });

    expect(real).toHaveProperty('reason', expect.stringContaining('(EROFS)'));
  });
});

describe('what storeReport writes', () => {
  it('writes under the round directory and answers the path', async () => {
    // Arrange
    const fs = createFs();

    // Act
    const result = await storeReport(REQUEST, { fs, now: CLOCK });

    // Assert
    expect(result).toMatchObject({
      ok: true,
      stored: {
        round: 'round-3',
        storedAt: '2026-09-18T12:34:56.789Z',
        path: REQUEST_PATH,
        attachmentPaths: [],
      },
    });
    expect(fs.directories).toEqual(['.rafa/feedback/round-3']);
    expect(fs.writes.map((write) => write.path)).toEqual([REQUEST_PATH]);
  });

  it('sanitises the round and the slug to [a-z0-9-]', async () => {
    // Arrange: a branch name with a separator in it, and a title with
    // capitals, punctuation, a double space and two non-ASCII letters.
    const fs = createFs();
    const request = {
      ...withReport({ title: 'Ünïcode  Title — Draft' }),
      round: 'Feature/Round 3!!',
    };

    // Act
    const result = await storeReport(request, { fs, now: CLOCK });

    // Assert: the exact path, so a sanitiser that merely stripped the
    // separators would read differently from one that maps runs to a
    // single dash and trims the edges.
    expect(result).toMatchObject({
      ok: true,
      stored: {
        round: 'feature-round-3',
        path:
          `.rafa/feedback/feature-round-3/${STAMP}-n-code-title-draft.json`,
      },
    });

    // ...and the charset claim itself, read off the two segments the
    // report body and the branch name reached.
    expect('feature-round-3').toMatch(/^[a-z0-9-]+$/);
    expect(`${STAMP}-n-code-title-draft`).toMatch(/^[a-z0-9-]+$/);
  });

  it('truncates a long title to at most 60 characters of slug', async () => {
    // Arrange: `report.ts` accepts a title of 120 characters, which
    // would otherwise be 120 characters of filename.
    const fs = createFs();

    // Act: a title whose 60th character falls mid-word.
    const result = await storeReport(
      withReport({ title: `${'long title '.repeat(11)}end` }),
      { fs, now: CLOCK },
    );

    // Assert: 59, not 60 — the cut landed on the dash that stood for
    // the 11th space, and a truncation never leaves a dash exposed at
    // the end. Measured; the first spelling of this case asserted 60
    // and read `expected ... to have a length of 60 but got 59`.
    const cut = `${'long-title-'.repeat(5)}long`;

    expect(cut).toHaveLength(59);
    expect(result).toMatchObject({
      ok: true,
      stored: { path: `.rafa/feedback/round-3/${STAMP}-${cut}.json` },
    });

    // The cap itself, read where nothing is trimmed off it: 70 letters
    // of title become exactly 60 of slug, so the limit is at 60 rather
    // than merely somewhere below it.
    const flat = await storeReport(
      withReport({ title: 'a'.repeat(70) }),
      { fs: createFs(), now: CLOCK },
    );

    expect(flat).toMatchObject({
      ok: true,
      stored: {
        path: `.rafa/feedback/round-3/${STAMP}-${'a'.repeat(60)}.json`,
      },
    });
  });

  it('writes JSON carrying the round, the time and the fields', async () => {
    // Arrange
    const fs = createFs();

    // Act
    await storeReport(REQUEST, { fs, now: CLOCK });

    // Assert
    const [write] = fs.writes;

    expect(typeof write?.data).toBe('string');
    expect(JSON.parse(String(write?.data))).toEqual({
      round: 'round-3',
      storedAt: '2026-09-18T12:34:56.789Z',
      feature: 'feedback',
      title: 'Menu drifts off-screen',
      body: 'At 320px the popover lands past the right edge.',
      context: { route: '/lexicon', width: 320 },
      attachments: [],
    });
  });

  it('defaults reports into a directory the repo already ignores', () => {
    // Arrange + Act + Assert: the constant `plugin.ts` uses when no
    // outDir option is given. `.rafa/` is gitignored at the repo root,
    // so a stored report is never staged by the loop's `git add -A`.
    expect(DEVTOOLS_DEFAULT_OUT_DIR).toBe('.rafa/feedback');
  });
});

describe('where attachments land', () => {
  it('writes one file per attachment beside the report', async () => {
    // Arrange: two attachments whose names sanitise to the same stem,
    // so the ordinal is what keeps them apart.
    const fs = createFs();
    const request = withReport({
      attachments: [
        attachment('Screen Shot.PNG', 'first'),
        attachment('screen-shot.png', 'second'),
      ],
    });

    // Act
    const result = await storeReport(request, { fs, now: CLOCK });

    // Assert: both files are in the report's own directory, and the
    // answer names them in the order the report listed them.
    const directory = '.rafa/feedback/round-3';
    const stem = `${STAMP}-menu-drifts-off-screen`;
    const first = `${directory}/${stem}-1-screen-shot.png`;
    const second = `${directory}/${stem}-2-screen-shot.png`;

    expect(result).toMatchObject({
      ok: true,
      stored: { path: REQUEST_PATH, attachmentPaths: [first, second] },
    });

    // Beside, read as a claim about the directory rather than about
    // the spelling: every written path shares the report's directory.
    expect(fs.writes.map((write) => write.path)).toEqual([
      first,
      second,
      REQUEST_PATH,
    ]);

    // ...and the bytes are the decoded attachment, not its base64.
    expect(Buffer.from(fs.writes[0]?.data ?? '').toString('utf8'))
      .toBe('first');
    expect(Buffer.from(fs.writes[1]?.data ?? '').toString('utf8'))
      .toBe('second');
  });

  it('records each attachment in the JSON without its base64', async () => {
    // Arrange
    const fs = createFs();

    // Act
    await storeReport(
      withReport({ attachments: [attachment('shot.png', 'twelve bytes')] }),
      { fs, now: CLOCK },
    );

    // Assert: the JSON is the last write, and it names the file rather
    // than carrying it a second time.
    const json = JSON.parse(String(fs.writes[1]?.data)) as {
      attachments: readonly Record<string, unknown>[];
    };

    expect(json.attachments).toEqual([
      {
        name: 'shot.png',
        mime: 'image/png',
        bytes: 12,
        file: `${STAMP}-menu-drifts-off-screen-1-shot.png`,
      },
    ]);
  });

  it('is satisfied by the real node:fs/promises', () => {
    // Arrange: a type-level reading, because the seam exists so that
    // `plugin.ts` can pass the real module. `tsc` refuses the
    // assignment below when the interface drifts away from node's own
    // signatures, so this reds in check-types rather than at
    // dev-server start.
    type NodeFsSatisfiesStoreFs =
      Pick<typeof nodeFs, 'mkdir' | 'writeFile'> extends DevToolsStoreFs
        ? true
        : false;

    // Act
    const satisfied: NodeFsSatisfiesStoreFs = true;

    // Assert
    expect(satisfied).toBe(true);
  });
});
