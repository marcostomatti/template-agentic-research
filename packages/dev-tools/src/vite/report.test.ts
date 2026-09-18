import type { DevToolsReport } from './report';

import { describe, expect, it } from 'vitest';

import { parseReport } from './report';

/**
 * ## Why there is no server, no socket and no fixture here
 *
 * `report.ts` reads its one argument and nothing else, so a case is an
 * object literal and an assertion. Nothing is listened on, nothing is
 * written, and no case depends on the order the others ran in.
 *
 * ## Why so many cases carry a positive control
 *
 * Every refusal here is a parse answering `ok: false`, and a schema
 * hard-wired to refuse would pass all of them. So the cases that could
 * read as a false negative pair the refusal with the ONE edit that
 * should have made it pass — a present `feature`, one character fewer,
 * a third attachment instead of a fourth — and assert that the same
 * call then parses.
 *
 * ## Why the limits are spelled as literals
 *
 * 120, 5,000, 3 and `5 * 1024 * 1024` are written out here rather than
 * imported from `report.ts`, which keeps them private. Importing them
 * would make these cases restate whatever the module currently
 * believes; the literals are spec item 8.3's numbers, so a limit
 * edited in the module reds here instead of moving in step.
 *
 * Refusals run before accepting cases, which is this plan's order for
 * every test file.
 */

/** A report that passes every rule; each case varies one thing. */
const VALID: DevToolsReport = Object.freeze({
  feature: 'feedback',
  title: 'Menu drifts off-screen on a narrow viewport',
  body: 'At 320px the popover lands past the right edge.',
  context: Object.freeze({
    route: '/lexicon',
    width: 320,
    reducedMotion: false,
  }),
});

/** Spec item 8.3's "≤ 5 MB each", read as mebibytes. */
const ATTACHMENT_LIMIT_BYTES = 5 * 1024 * 1024;

/**
 * Standard padded base64 that decodes to exactly `bytes` bytes.
 *
 * Built by arithmetic rather than by encoding a buffer, so the
 * boundary pair below is exact and a 5 MB case costs one `repeat`
 * rather than an allocation and an encode. The pair itself is this
 * helper's control: if the arithmetic were off by a group, the
 * at-the-limit case and the one-byte-over case could not both hold.
 *
 * @param bytes - The decoded size wanted.
 * @returns A base64 string of that decoded size.
 */
function base64OfBytes(bytes: number): string {
  const padding = (3 - (bytes % 3)) % 3;
  const groups = (bytes + padding) / 3;

  return 'A'.repeat(groups * 4 - padding) + '='.repeat(padding);
}

/** A small, well-formed attachment. */
const ATTACHMENT = Object.freeze({
  name: 'screenshot.png',
  mime: 'image/png',
  base64: base64OfBytes(3),
});

describe('what parseReport refuses', () => {
  it('refuses a body with no feature at all', () => {
    // Arrange: the key is ABSENT, not set to undefined — what a sender
    // that forgot the field actually posts.
    const input = {
      title: VALID.title,
      body: VALID.body,
      context: { ...VALID.context },
    };

    // Act
    const parse = parseReport(input);

    // Assert
    expect(parse).toEqual({
      ok: false,
      path: 'feature',
      reason: expect.any(String),
    });

    // The positive control: the same body with the one missing field
    // present parses, so a schema that refused everything would fail
    // here rather than pass the assertion above.
    expect(parseReport({ ...input, feature: 'feedback' })).toMatchObject({
      ok: true,
    });
  });

  it('refuses a title of 121 characters and accepts one of 120', () => {
    // Arrange
    const overLength = { ...VALID, title: 'a'.repeat(121) };

    // Act + Assert
    expect(parseReport(overLength)).toMatchObject({
      ok: false,
      path: 'title',
    });

    // The control is one character, which is the whole claim: the
    // limit is at 120 and not merely somewhere below 121.
    expect(parseReport({ ...VALID, title: 'a'.repeat(120) })).toMatchObject({
      ok: true,
    });
  });

  it('counts a title in code points, not in UTF-16 units', () => {
    // Arrange: 121 astral characters is 121 code points and 242
    // `.length` units; 61 of them is 61 code points and 122 units —
    // over the limit if `.length` were the measure, under it if code
    // points are.
    //
    // Measured against zod 4.5.1, and pinned because it is the
    // opposite of zod 3's behaviour: a version bump that restored
    // `.length` counting reds this case rather than quietly halving
    // what an emoji-bearing title may hold.
    const tooMany = { ...VALID, title: '\u{1F600}'.repeat(121) };
    const wideButShort = { ...VALID, title: '\u{1F600}'.repeat(61) };

    // Act + Assert
    expect(parseReport(tooMany)).toMatchObject({ ok: false, path: 'title' });
    expect(parseReport(wideButShort)).toMatchObject({ ok: true });
  });

  it('refuses a body of 5,001 characters and accepts one of 5,000', () => {
    // Arrange
    const overLength = { ...VALID, body: 'b'.repeat(5001) };

    // Act + Assert
    expect(parseReport(overLength)).toMatchObject({
      ok: false,
      path: 'body',
    });
    expect(parseReport({ ...VALID, body: 'b'.repeat(5000) })).toMatchObject({
      ok: true,
    });
  });

  it('refuses a nested context value and names the key that nested', () => {
    // Arrange: the context is a flat table or it is not a context.
    const nested = {
      ...VALID,
      context: { route: '/lexicon', viewport: { width: 320, height: 640 } },
    };

    // Act
    const parse = parseReport(nested);

    // Assert: the path carries the offending key, which is what makes
    // the refusal actionable in a form with one field per key.
    expect(parse).toMatchObject({
      ok: false,
      path: 'context.viewport',
    });

    // The control: the same key holding a primitive parses.
    expect(parseReport({
      ...VALID,
      context: { route: '/lexicon', viewport: '320x640' },
    })).toMatchObject({ ok: true });
  });

  it('refuses an array and a null in the context as well', () => {
    // Arrange: the two shapes that are neither a primitive nor an
    // obvious object, pinned so `typeof value === 'object'` reasoning
    // cannot pass for the union.
    const withArray = { ...VALID, context: { tags: ['a', 'b'] } };
    const withNull = { ...VALID, context: { route: null } };

    // Act + Assert
    expect(parseReport(withArray)).toMatchObject({
      ok: false,
      path: 'context.tags',
    });
    expect(parseReport(withNull)).toMatchObject({
      ok: false,
      path: 'context.route',
    });
  });

  it('refuses a context key naming a prototype member', () => {
    // Arrange: own properties after JSON.parse, so they arrive as
    // ordinary data rather than as something inherited.
    const withConstructor = JSON.parse(
      '{"feature":"f","title":"t","body":"b","context":{"constructor":"x"}}',
    ) as unknown;
    const withPrototype = JSON.parse(
      '{"feature":"f","title":"t","body":"b","context":{"prototype":"x"}}',
    ) as unknown;

    // Act + Assert: the path is the bare `context` and NOT
    // `context.constructor`, because the refusal is about the record
    // rather than about one entry. Asserted exactly so a refusal that
    // started echoing the offending key back would red here.
    expect(parseReport(withConstructor)).toEqual({
      ok: false,
      path: 'context',
      reason: expect.any(String),
    });
    expect(parseReport(withPrototype)).toMatchObject({
      ok: false,
      path: 'context',
    });

    // The control: an ordinary key in the same position parses.
    expect(parseReport({ ...VALID, context: { plain: 'x' } })).toMatchObject({
      ok: true,
    });
  });

  it('refuses a fourth attachment and accepts three', () => {
    // Arrange
    const four = {
      ...VALID,
      attachments: [ATTACHMENT, ATTACHMENT, ATTACHMENT, ATTACHMENT],
    };

    // Act + Assert
    expect(parseReport(four)).toMatchObject({
      ok: false,
      path: 'attachments',
    });

    // The control is the fourth attachment alone.
    expect(parseReport({
      ...VALID,
      attachments: [ATTACHMENT, ATTACHMENT, ATTACHMENT],
    })).toMatchObject({ ok: true });
  });

  it('refuses an attachment one byte over 5 MB and accepts one at it', () => {
    // Arrange: the exact boundary, so "5 MB" is pinned as 5 mebibytes
    // and not as 5,000,000 bytes — the two differ by about 5%, and a
    // module that read the limit the other way would accept the first
    // of these.
    const oversize = {
      ...VALID,
      attachments: [{
        ...ATTACHMENT,
        base64: base64OfBytes(ATTACHMENT_LIMIT_BYTES + 1),
      }],
    };

    // Act
    const parse = parseReport(oversize);

    // Assert: the path reaches into the array, which is what lets a
    // sender say WHICH file was too large.
    expect(parse).toMatchObject({
      ok: false,
      path: 'attachments.0.base64',
    });

    // The control is one byte.
    expect(parseReport({
      ...VALID,
      attachments: [{
        ...ATTACHMENT,
        base64: base64OfBytes(ATTACHMENT_LIMIT_BYTES),
      }],
    })).toMatchObject({ ok: true });
  });

  it('refuses an attachment name containing a path separator', () => {
    // Arrange: the traversal attempt, in both platforms' spellings.
    // `./store.ts` sanitises what it writes too; this is the earlier
    // guard, and it refuses rather than rewrites.
    const posix = {
      ...VALID,
      attachments: [{ ...ATTACHMENT, name: '../../etc/passwd' }],
    };
    const windows = {
      ...VALID,
      attachments: [{ ...ATTACHMENT, name: '..\\..\\hosts' }],
    };

    // Act + Assert
    expect(parseReport(posix)).toMatchObject({
      ok: false,
      path: 'attachments.0.name',
    });
    expect(parseReport(windows)).toMatchObject({
      ok: false,
      path: 'attachments.0.name',
    });

    // A separator anywhere at all, not merely at the front — a name
    // that looks ordinary until it is joined to a directory.
    expect(parseReport({
      ...VALID,
      attachments: [{ ...ATTACHMENT, name: 'shots/today.png' }],
    })).toMatchObject({ ok: false, path: 'attachments.0.name' });

    // The control: the same name with the directory taken off parses,
    // so the refusal is about the separator and not about the word.
    expect(parseReport({
      ...VALID,
      attachments: [{ ...ATTACHMENT, name: 'today.png' }],
    })).toMatchObject({ ok: true });
  });

  it('refuses a dotfile name and the two directory names', () => {
    // Arrange + Act + Assert: no separator in any of them, so these
    // are a reading of the pattern rather than of a `.includes('/')`.
    for (const name of ['.hidden', '.', '..']) {
      expect(parseReport({
        ...VALID,
        attachments: [{ ...ATTACHMENT, name }],
      })).toMatchObject({ ok: false, path: 'attachments.0.name' });
    }
  });

  it('refuses an attachment body that is not standard base64', () => {
    // Arrange: a stray character, a URL-safe alphabet, and a length
    // that is not a multiple of four. All three reach the SAME
    // refusal, before any size is computed from them.
    const spellings = ['A!AA', 'AA-_', 'AAA'];

    // Act + Assert
    for (const base64 of spellings) {
      expect(parseReport({
        ...VALID,
        attachments: [{ ...ATTACHMENT, base64 }],
      })).toMatchObject({ ok: false, path: 'attachments.0.base64' });
    }

    // The control: four characters of the standard alphabet parse.
    expect(parseReport({
      ...VALID,
      attachments: [{ ...ATTACHMENT, base64: 'AAAA' }],
    })).toMatchObject({ ok: true });
  });

  it('refuses an attachment missing a field, and a bad mime', () => {
    // Arrange
    const noMime = {
      ...VALID,
      attachments: [{ name: ATTACHMENT.name, base64: ATTACHMENT.base64 }],
    };
    const paramMime = {
      ...VALID,
      attachments: [{ ...ATTACHMENT, mime: 'text/plain; charset=utf-8' }],
    };

    // Act + Assert
    expect(parseReport(noMime)).toMatchObject({
      ok: false,
      path: 'attachments.0.mime',
    });
    expect(parseReport(paramMime)).toMatchObject({
      ok: false,
      path: 'attachments.0.mime',
    });
  });

  it('refuses an empty feature, title and body', () => {
    // Arrange + Act + Assert: a present-but-empty field is a sender
    // that sent nothing, and each is named by its own path.
    expect(parseReport({ ...VALID, feature: '' })).toMatchObject({
      ok: false,
      path: 'feature',
    });
    expect(parseReport({ ...VALID, title: '' })).toMatchObject({
      ok: false,
      path: 'title',
    });
    expect(parseReport({ ...VALID, body: '' })).toMatchObject({
      ok: false,
      path: 'body',
    });
  });

  it('refuses a feature id that is prose rather than an identifier', () => {
    // Arrange + Act + Assert
    expect(parseReport({ ...VALID, feature: 'report a bug' })).toMatchObject({
      ok: false,
      path: 'feature',
    });
    expect(parseReport({ ...VALID, feature: '../escape' })).toMatchObject({
      ok: false,
      path: 'feature',
    });

    // The control: dots, dashes and underscores inside an id are fine.
    expect(parseReport({ ...VALID, feature: 'ar.feedback_v2-1' }))
      .toMatchObject({ ok: true });
  });

  it('refuses a body that is not an object, with an empty path', () => {
    // Arrange + Act + Assert: what a caller sends when the request
    // carried a JSON string, a number or nothing at all. The path is
    // '' because the failure is the root itself.
    for (const input of ['hello', 7, null, [VALID]]) {
      expect(parseReport(input)).toMatchObject({ ok: false, path: '' });
    }
  });
});

describe('what parseReport accepts', () => {
  it('parses a report with no attachments', () => {
    // Act
    const parse = parseReport({ ...VALID, context: { ...VALID.context } });

    // Assert: the whole value, so a schema that silently dropped a
    // field would red here rather than pass an `ok: true` check.
    expect(parse).toEqual({
      ok: true,
      report: {
        feature: 'feedback',
        title: VALID.title,
        body: VALID.body,
        context: { route: '/lexicon', width: 320, reducedMotion: false },
      },
    });
  });

  it('parses a report carrying three attachments', () => {
    // Arrange
    const input = {
      ...VALID,
      attachments: [
        { name: 'one.png', mime: 'image/png', base64: base64OfBytes(3) },
        { name: 'two.txt', mime: 'text/plain', base64: base64OfBytes(4) },
        { name: 'three.bin', mime: 'application/octet-stream', base64: 'AAAA' },
      ],
    };

    // Act
    const parse = parseReport(input);

    // Assert
    expect(parse).toMatchObject({ ok: true });
    expect(parse.ok && parse.report.attachments).toHaveLength(3);
    expect(parse.ok && parse.report.attachments?.[1]).toEqual({
      name: 'two.txt',
      mime: 'text/plain',
      base64: base64OfBytes(4),
    });
  });

  it('strips an unknown top-level key rather than refusing it', () => {
    // Arrange: a sender one version ahead of this plugin. Documented
    // behaviour, not an accident — `context` is where app-supplied
    // data belongs, so an unknown sibling is dropped and never
    // reaches the store.
    const input = { ...VALID, severity: 'high', nested: { a: 1 } };

    // Act
    const parse = parseReport(input);

    // Assert
    expect(parse).toMatchObject({ ok: true });
    expect(parse.ok && Object.keys(parse.report).sort()).toEqual([
      'body',
      'context',
      'feature',
      'title',
    ]);
  });

  it('drops an own __proto__ context key without polluting anything', () => {
    // Arrange: the one prototype key the module's own refusal never
    // sees. zod 4.5.1's record parse removes it from its output before
    // any refinement runs, so this parses as a SUCCESS whose context
    // simply lacks the key.
    //
    // Asserted rather than assumed, and asserted on the OUTCOME: the
    // key is gone, the prototype is untouched, and a fresh object has
    // not gained a property. A zod that stopped dropping it would red
    // here — the key would survive into the context — which is what
    // keeps this from being a silent pass.
    const input = JSON.parse(
      '{"feature":"f","title":"t","body":"b",'
      + '"context":{"__proto__":{"polluted":"yes"},"keep":"v"}}',
    ) as unknown;

    // Act
    const parse = parseReport(input);

    // Assert
    expect(parse).toMatchObject({ ok: true });
    expect(parse.ok && parse.report.context).toEqual({ keep: 'v' });
    expect(parse.ok
      && Object.getPrototypeOf(parse.report.context) === Object.prototype)
      .toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('accepts an empty context', () => {
    // Arrange + Act + Assert: an app that supplies no extra keys is
    // not an error, and the field stays required so the shape a store
    // writes is the same either way.
    expect(parseReport({ ...VALID, context: {} })).toMatchObject({
      ok: true,
      report: { context: {} },
    });
  });

  it('answers a frozen result, so a caller cannot rewrite the verdict', () => {
    // Act
    const accepted = parseReport({ ...VALID, context: {} });
    const refused = parseReport({ ...VALID, title: '' });

    // Assert
    expect(Object.isFrozen(accepted)).toBe(true);
    expect(Object.isFrozen(refused)).toBe(true);
  });
});
