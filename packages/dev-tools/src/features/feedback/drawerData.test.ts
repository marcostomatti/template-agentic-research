import type { DevToolsFetch } from '../../core/host';

import { describe, expect, it } from 'vitest';

import { buildDevToolsHost } from '../../core/host';

import {
  FEEDBACK_STATUS_PATH,
  FEEDBACK_TEMPLATES_PATH,
  encodeFeedbackAttachment,
  loadFeedbackRepo,
  loadFeedbackTemplates,
} from './drawerData';

/**
 * ## What is stubbed, and what is not
 *
 * The two reads go through `DevToolsHost.fetch`, so every case builds
 * a real host with `fetchImpl` replaced — the same seam
 * `./submit.test.ts` uses, and for the same reason: the join from a
 * path to `/__devtools/templates` is the host's, and a case that
 * stubbed the host itself would stop reading it.
 *
 * The encoding is stubbed by nothing at all. `Blob`, `File`,
 * `arrayBuffer` and `btoa` are jsdom's own, so a case builds bytes and
 * reads the base64 back with `atob`, which is an independent decoder
 * rather than a second copy of the encoder.
 *
 * ## Refusals first
 *
 * Both reads open on what they cannot read: a dev server that did not
 * answer, one that answered text, one that answered an object where a
 * list belongs, and one whose list holds a template the shared schema
 * refuses. The encoding opens on the names it has to invent, because
 * `src/vite/report.ts` refuses a name outside its charset and a
 * capture has no name at all.
 *
 * ## The reasons are pinned as text
 *
 * `./drawerData.ts` interpolates nothing into either sentence, so a
 * case holds the whole thing. Both are read once against the
 * unreachable server and once against the unreadable answer, which is
 * what keeps the two apart: a module answering one sentence for both
 * would still pass a case that only asked for a non-null reason.
 */

/** What a dev server that did not answer at all is reported as. */
const UNREACHABLE
  = 'The dev server did not answer, so there are no report forms to '
  + 'fill in. Is it still running?';

/** What an answer that is not a template list is reported as. */
const UNREADABLE
  = 'The dev server answered something this widget could not read as '
  + 'a list of report forms.';

/** One template, spelled as the endpoint serves it. */
const SERVED = {
  id: 'bug-report',
  name: 'Bug report',
  description: 'Something in the app behaves wrong.',
  module: 'web',
  fields: [
    { id: 'what-happened', kind: 'textarea', label: 'What happened' },
  ],
};

/** A host over a stubbed `fetch`, and the urls it was asked for. */
interface DataStub {
  /** The host to hand a call under test. */
  readonly host: ReturnType<typeof buildDevToolsHost>;

  /** Every url the stub was asked for, in order. */
  readonly urls: string[];
}

/**
 * A host whose `fetch` answers whatever a case wants.
 *
 * @param reply - What the stub answers; it may also throw.
 * @returns The host and the recording list.
 */
function stubbed(reply: DevToolsFetch): DataStub {
  const urls: string[] = [];
  const host = buildDevToolsHost({
    config: { features: [] },
    status: null,
    fetchImpl: (url, init) => {
      urls.push(url);

      return reply(url, init);
    },
  });

  return { host, urls };
}

/**
 * A host answering one JSON body with a 200.
 *
 * @param body - Whatever the dev server is pretending to say.
 * @returns The stub.
 */
function answering(body: unknown): DataStub {
  return stubbed(() => Promise.resolve(
    new Response(JSON.stringify(body), { status: 200 }),
  ));
}

/**
 * A host that answers something which is not JSON at all.
 *
 * @returns The stub.
 */
function answeringText(): DataStub {
  return stubbed(() => Promise.resolve(
    new Response('<!doctype html>', { status: 200 }),
  ));
}

/**
 * A host whose `fetch` rejects.
 *
 * @returns The stub.
 */
function offline(): DataStub {
  return stubbed(() => Promise.reject(new Error('offline')));
}

/**
 * The bytes a base64 string decodes to.
 *
 * @param base64 - What the encoder answered.
 * @returns One byte per character of the decoded text.
 */
function decode(base64: string): readonly number[] {
  return [...atob(base64)].map((character) => character.charCodeAt(0));
}

describe('reading the report forms', () => {
  it('answers the unreachable reason when the fetch throws', async () => {
    const { host } = offline();

    await expect(loadFeedbackTemplates(host)).resolves.toStrictEqual({
      ok: false,
      reason: UNREACHABLE,
    });
  });

  it('answers the unreachable reason for an answer that is not JSON', async () => {
    const { host } = answeringText();

    await expect(loadFeedbackTemplates(host)).resolves.toStrictEqual({
      ok: false,
      reason: UNREACHABLE,
    });
  });

  it('answers the unreadable reason for an object where a list goes', async () => {
    const { host } = answering({ templates: [] });

    await expect(loadFeedbackTemplates(host)).resolves.toStrictEqual({
      ok: false,
      reason: UNREADABLE,
    });
  });

  it('answers the unreadable reason for a form the schema refuses', async () => {
    const { host } = answering([{ id: 'bug-report' }]);

    await expect(loadFeedbackTemplates(host)).resolves.toStrictEqual({
      ok: false,
      reason: UNREADABLE,
    });
  });

  it('asks the templates route under the endpoint', async () => {
    const { host, urls } = answering([]);

    await loadFeedbackTemplates(host);

    expect(urls).toStrictEqual(['/__devtools/templates']);
    expect(FEEDBACK_TEMPLATES_PATH).toBe('/templates');
  });

  it('answers an empty list as a successful read', async () => {
    const { host } = answering([]);

    await expect(loadFeedbackTemplates(host)).resolves.toStrictEqual({
      ok: true,
      templates: [],
    });
  });

  it('answers the served forms with the schema defaults filled in', async () => {
    const { host } = answering([SERVED]);
    const answer = await loadFeedbackTemplates(host);

    expect(answer.ok).toBe(true);
    expect(answer.ok && answer.templates[0]?.devtools).toStrictEqual({
      screenshot: true,
      selector: true,
      context: true,
    });
    expect(answer.ok && answer.templates[0]?.fields[0]).toStrictEqual({
      id: 'what-happened',
      kind: 'textarea',
      label: 'What happened',
      required: false,
    });
  });
});

describe('reading the repository slug', () => {
  it('answers null when the fetch throws', async () => {
    const { host } = offline();

    await expect(loadFeedbackRepo(host)).resolves.toBeNull();
  });

  it('answers null when the body is not JSON', async () => {
    const { host } = answeringText();

    await expect(loadFeedbackRepo(host)).resolves.toBeNull();
  });

  it('answers null for a JSON array', async () => {
    const { host } = answering([]);

    await expect(loadFeedbackRepo(host)).resolves.toBeNull();
  });

  it('answers null for a payload carrying no repo', async () => {
    const { host } = answering({ commit: 'abc1234' });

    await expect(loadFeedbackRepo(host)).resolves.toBeNull();
  });

  it('answers null for a repo that is not a string', async () => {
    const { host } = answering({ repo: 42 });

    await expect(loadFeedbackRepo(host)).resolves.toBeNull();
  });

  it('answers null for a blank repo', async () => {
    const { host } = answering({ repo: '   ' });

    await expect(loadFeedbackRepo(host)).resolves.toBeNull();
  });

  it('asks the status route under the endpoint', async () => {
    const { host, urls } = answering({ repo: 'owner/name' });

    await loadFeedbackRepo(host);

    expect(urls).toStrictEqual(['/__devtools/status']);
    expect(FEEDBACK_STATUS_PATH).toBe('/status');
  });

  it('answers the slug trimmed', async () => {
    const { host } = answering({ repo: ' owner/name ' });

    await expect(loadFeedbackRepo(host)).resolves.toBe('owner/name');
  });

  it('answers the unknown slug, which the link refuses later', async () => {
    const { host } = answering({ repo: 'unknown' });

    await expect(loadFeedbackRepo(host)).resolves.toBe('unknown');
  });
});

describe('encoding an attachment', () => {
  it('names a capture, which is a Blob and has none', async () => {
    const encoded = await encodeFeedbackAttachment(
      new Blob(['hi'], { type: 'image/png' }),
    );

    expect(encoded.name).toBe('screenshot.png');
  });

  it('names a JPEG capture with the JPEG extension', async () => {
    const encoded = await encodeFeedbackAttachment(
      new Blob(['hi'], { type: 'image/jpeg' }),
    );

    expect(encoded.name).toBe('screenshot.jpg');
  });

  it('falls back where a filename sanitises down to nothing', async () => {
    const encoded = await encodeFeedbackAttachment(
      new File(['hi'], '///', { type: 'image/png' }),
    );

    expect(encoded.name).toBe('screenshot.png');
  });

  it('replaces what the endpoint charset will not take', async () => {
    const encoded = await encodeFeedbackAttachment(
      new File(['hi'], 'shot(1)/two.png', { type: 'image/png' }),
    );

    expect(encoded.name).toBe('shot-1--two.png');
    expect(encoded.name).toMatch(/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/);
  });

  it('drops what a name may not begin with', async () => {
    const encoded = await encodeFeedbackAttachment(
      new File(['hi'], '..hidden.png', { type: 'image/png' }),
    );

    expect(encoded.name).toBe('hidden.png');
  });

  it('caps a name at the length the endpoint accepts', async () => {
    const encoded = await encodeFeedbackAttachment(
      new File(['hi'], `${'n'.repeat(200)}.png`, { type: 'image/png' }),
    );

    expect(encoded.name).toBe('n'.repeat(128));
  });

  it('lower-cases a mime reported in upper case', async () => {
    // Not a `File`: the platform's own constructor lower-cases `type`
    // for both `Blob` and `File` (measured — `new File([], 'x', {type:
    // 'IMAGE/PNG'}).type` is `image/png`), so a real one cannot carry
    // an upper-case mime this far and no case built from one could
    // red. The structural stand-in is what makes the module's own
    // lower-casing readable at all.
    const shouting = {
      type: 'IMAGE/PNG',
      arrayBuffer: () => Promise.resolve(new Uint8Array([104, 105]).buffer),
    } as unknown as Blob;
    const encoded = await encodeFeedbackAttachment(shouting);

    expect(new File(['hi'], 'x.png', { type: 'IMAGE/PNG' }).type)
      .toBe('image/png');
    expect(encoded.mime).toBe('image/png');
  });

  it('reads a blob with no type as the PNG a capture answers', async () => {
    const encoded = await encodeFeedbackAttachment(new Blob(['hi']));

    expect(encoded.mime).toBe('image/png');
    expect(encoded.name).toBe('screenshot.png');
  });

  it('encodes the bytes as standard padded base64', async () => {
    const encoded = await encodeFeedbackAttachment(
      new File(['hi'], 'shot.png', { type: 'image/png' }),
    );

    expect(encoded).toStrictEqual({
      name: 'shot.png',
      mime: 'image/png',
      base64: 'aGk=',
    });
  });

  it('encodes a blob far larger than one chunk', async () => {
    // One mebibyte, which is 128 chunks and is chosen to be past the
    // point where `String.fromCharCode(...bytes)` stops working:
    // measured, the spread throws `RangeError: Maximum call stack size
    // exceeded` from 1,000,000 arguments under bun and from 200,000
    // under node. A smaller blob passes with the chunking removed, so
    // this size is what makes the loop readable rather than decorative.
    //
    // The fill is 200 because a byte above 127 is what an encoder
    // writing UTF-8 instead of raw bytes gets wrong.
    const size = 1_048_576;
    const bytes = new Uint8Array(size).fill(200);
    const encoded = await encodeFeedbackAttachment(
      new Blob([bytes], { type: 'image/png' }),
    );
    const decoded = decode(encoded.base64);

    expect(decoded).toHaveLength(size);
    expect(decoded[0]).toBe(200);
    expect(decoded[size - 1]).toBe(200);
  });

  it('freezes what it answers', async () => {
    const encoded = await encodeFeedbackAttachment(new Blob(['hi']));

    expect(Object.isFrozen(encoded)).toBe(true);
  });
});
