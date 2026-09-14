/**
 * What `scripts/doc-references.ts` reads out of a markdown text,
 * asked over texts these cases write and never over a document this
 * repository tracks. A reader tuned against the tree it is later
 * run over would pass that tree whatever it did, so every text here
 * is built for the one rule its case is about.
 *
 * Four subjects, in the order the reader applies them. The shape
 * rule a span passes to be read. The fence blanking every later read
 * runs over. Then the two populations read out of what is left, the
 * path-shaped spans and the relative link targets. Last the marker
 * grammar, refusals first, since a refusal is the one output the
 * grammar exists to produce.
 *
 * A case asserting that something is NOT read passes for a reader
 * that reads nothing, so none stands alone. Every refusal the shape
 * rule makes is paired with a near twin it accepts, differing only
 * in the character that branch refuses; every blanked region is
 * followed by a reference outside it that is asserted read, at the
 * line it holds in the source; and every marker attempt refused is
 * paired with the same attempt carrying what it lacked.
 *
 * The span-pairing cases are the ones a plausible reader gets wrong,
 * and each text is chosen so that the plausible reader disagrees
 * with this one. A reader pairing any backtick with the next reads a
 * path out of a span a longer run was holding open; a reader working
 * line by line loses step after a span wrapped across a line break;
 * and a reader pairing across a blank line swallows the first span
 * of the next paragraph into a stray backtick.
 */
import type { DocReading } from '../../scripts/doc-references.js';

import { describe, expect, it } from 'vitest';

import {
  PATH_EXTENSIONS,
  blankFencedBlocks,
  isPathShaped,
  readDocReferences,
} from '../../scripts/doc-references.js';

/**
 * One markdown text out of its lines, so a case reads line by line
 * and a line number asserted against it can be counted off the
 * array.
 */
function doc(...lines: readonly string[]): string {
  return lines.join('\n');
}

/**
 * A reading holding nothing, spread under the one population a case
 * is about so that every other population is asserted empty too.
 */
const NOTHING: DocReading = {
  spans: [],
  links: [],
  markers: [],
  refusals: [],
};

// ---------------------------------------------------------------------------
// The shape rule
// ---------------------------------------------------------------------------

describe('isPathShaped', () => {
  it('reads the extension set the census was taken with, no wider', () => {
    const census = [
      'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'md', 'mdx', 'json', 'sql',
      'sh', 'css', 'html', 'yml', 'yaml', 'toml', 'lock', 'txt', 'env',
      'example', 'gitignore', 'gitkeep', 'png', 'svg', 'jpg', 'n8n', 'bin',
      'log',
    ];

    expect([...PATH_EXTENSIONS].sort()).toEqual([...census].sort());
  });

  /**
   * One refusal per branch of the rule, each beside the near twin the
   * rule reads, so the refusal is shown to come from that branch and
   * not from a rule refusing the whole sample.
   */
  const REFUSALS: readonly {
    readonly why: string;
    readonly refused: string;
    readonly twin: string;
  }[] = [
    { why: 'an empty span', refused: '', twin: 'a/' },
    {
      why: 'whitespace',
      refused: 'docs/a guide.md',
      twin: 'docs/a-guide.md',
    },
    {
      why: 'a URL scheme',
      refused: 'https://docs/guide.md',
      twin: 'https/docs/guide.md',
    },
    {
      why: 'a drive letter',
      refused: 'C:/docs/guide.md',
      twin: 'C/docs/guide.md',
    },
    { why: 'a glob', refused: 'src/*.ts', twin: 'src/x.ts' },
    {
      why: 'a placeholder',
      refused: 'src/<name>.ts',
      twin: 'src/name.ts',
    },
    { why: 'a leading slash', refused: '/src/app.ts', twin: 'src/app.ts' },
    {
      why: 'a home directory',
      refused: '~/notes/a.md',
      twin: 'notes/a.md',
    },
    { why: 'no slash', refused: 'README.md', twin: './README.md' },
    {
      why: 'an extension the set does not name',
      refused: 'src/app.py',
      twin: 'src/app.sh',
    },
    { why: 'no extension', refused: 'bin/run', twin: 'bin/run/' },
    {
      why: 'a line suffix',
      refused: 'docs/guide.md:107',
      twin: 'docs/guide.md',
    },
  ];

  for (const { why, refused, twin } of REFUSALS) {
    it(`refuses ${why} and reads its near twin`, () => {
      expect(isPathShaped(refused)).toBe(false);
      expect(isPathShaped(twin)).toBe(true);
    });
  }

  it('reads relative, dotted, scoped and upper-case spellings as paths', () => {
    const read = [
      './store.js',
      '../db/index.js',
      'a/.eslintrc.json',
      'packages/service/.env',
      'design/logo.PNG',
      '@scope/',
    ];

    expect(read.filter((content) => !isPathShaped(content))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Fence blanking
// ---------------------------------------------------------------------------

describe('blankFencedBlocks', () => {
  it('empties the opener, body and closer, keeping every other line', () => {
    const text = doc('before', '```ts', 'inside', '```', 'after');

    expect(blankFencedBlocks(text)).toBe(doc('before', '', '', '', 'after'));
  });

  it('closes a tilde fence on tildes only', () => {
    const text = doc('~~~', '```', 'inside', '~~~', 'after');

    expect(blankFencedBlocks(text)).toBe(doc('', '', '', '', 'after'));
  });

  it('closes on a run at least as long as the opener and no shorter', () => {
    const text = doc('````', '```', 'inside', '`````', 'after');

    expect(blankFencedBlocks(text)).toBe(doc('', '', '', '', 'after'));
  });

  it('does not close on a run with text after it', () => {
    const text = doc('```', '```ts', 'inside', '```', 'after');

    expect(blankFencedBlocks(text)).toBe(doc('', '', '', '', 'after'));
  });

  it('opens behind three spaces of indent and not behind four', () => {
    const text = doc('   ```', 'inside', '   ```', '    ```', 'after');

    expect(blankFencedBlocks(text))
      .toBe(doc('', '', '', '    ```', 'after'));
  });

  it('opens no fence where the info string carries a backtick', () => {
    const text = doc('```src/app.ts``` is inline', 'after');

    expect(blankFencedBlocks(text)).toBe(text);
  });

  it('blanks to the end of the text when nothing closes the fence', () => {
    const text = doc('before', '```', 'inside', 'still inside');

    expect(blankFencedBlocks(text)).toBe(doc('before', '', '', ''));
  });
});

// ---------------------------------------------------------------------------
// Spans
// ---------------------------------------------------------------------------

describe('readDocReferences, spans', () => {
  it('reads a path-shaped span at its line and passes over one that is not', () => {
    const text = doc('# Title', '', 'See `docs/guide.md`, run `bun run test`.');

    expect(readDocReferences(text)).toEqual({
      ...NOTHING,
      spans: [{ target: 'docs/guide.md', line: 3 }],
    });
  });

  it('reads no span inside a fence, and the next at its source line', () => {
    const text = doc(
      '```md',
      'Read `docs/inside.md`.',
      '```',
      'Read `docs/after.md`.',
    );

    expect(readDocReferences(text).spans)
      .toEqual([{ target: 'docs/after.md', line: 4 }]);
  });

  it('reads a span the fence-shaped inline line opens with', () => {
    const text = doc('```src/app.ts``` is inline', 'and `docs/guide.md`');

    expect(readDocReferences(text).spans).toEqual([
      { target: 'src/app.ts', line: 1 },
      { target: 'docs/guide.md', line: 2 },
    ]);
  });

  it('closes a span only on a run as long as the one opening it', () => {
    const matched = doc('``src/app.ts`` and `docs/guide.md`');
    const unmatched = doc('`src/app.ts`` and `docs/guide.md`');

    expect(readDocReferences(matched).spans).toEqual([
      { target: 'src/app.ts', line: 1 },
      { target: 'docs/guide.md', line: 1 },
    ]);
    expect(readDocReferences(unmatched).spans).toEqual([]);
  });

  it('pairs a span across a line break and stays in step after it', () => {
    const text = doc('The file `docs/', 'guide.md` moved; see `src/app.ts`.');

    expect(readDocReferences(text).spans)
      .toEqual([{ target: 'src/app.ts', line: 2 }]);
  });

  it('pairs no span across a blank line', () => {
    const text = doc('A stray ` backtick.', '', 'See `src/app.ts`.');

    expect(readDocReferences(text).spans)
      .toEqual([{ target: 'src/app.ts', line: 3 }]);
  });
});

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

describe('readDocReferences, links', () => {
  it('reads every relative target at its line, whatever its shape', () => {
    const text = doc('Intro', 'See [the guide](docs/guide.md) and [notes](NOTES.md).');

    expect(readDocReferences(text)).toEqual({
      ...NOTHING,
      links: [
        { target: 'docs/guide.md', line: 2 },
        { target: 'NOTES.md', line: 2 },
      ],
    });
  });

  it('gives a target the line it sits on when its text wraps', () => {
    const text = doc('See [the', 'guide](docs/guide.md).');

    expect(readDocReferences(text).links)
      .toEqual([{ target: 'docs/guide.md', line: 2 }]);
  });

  it('skips a scheme, an anchor and a leading slash, and cuts # and ?', () => {
    const text = doc(
      '[a](https://docs/a.md) [b](mailto:someone) [c](#usage)',
      '[d](/docs/a.md) [e](//docs/a.md)',
      '[f](docs/f.md#usage) [g](docs/g.md?plain=1)',
    );

    expect(readDocReferences(text).links).toEqual([
      { target: 'docs/f.md', line: 3 },
      { target: 'docs/g.md', line: 3 },
    ]);
  });

  it('reads no link inside a span or a fence, and one outside both', () => {
    const text = doc(
      'Written `[example](docs/span.md)` as an example.',
      '```md',
      '[example](docs/fence.md)',
      '```',
      '[live](docs/live.md)',
    );

    expect(readDocReferences(text).links)
      .toEqual([{ target: 'docs/live.md', line: 5 }]);
  });

  it('reads an image target and a titled target', () => {
    const text = doc('![logo](design/logo.png)', '[guide](docs/guide.md "The guide")');

    expect(readDocReferences(text).links).toEqual([
      { target: 'design/logo.png', line: 1 },
      { target: 'docs/guide.md', line: 2 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

describe('readDocReferences, markers', () => {
  /**
   * The same path under a marker missing its reason in each of the
   * ways one can be missing, beside the marker that carries one.
   */
  const REASONLESS: readonly string[] = [
    '<!-- doc-links-skip: a/b.png -- -->',
    '<!-- doc-links-skip: a/b.png --    -->',
    '<!-- doc-links-skip: a/b.png -->',
  ];

  for (const attempt of REASONLESS) {
    it(`refuses ${attempt} and skips nothing with it`, () => {
      const text = doc('Intro', '', attempt);

      expect(readDocReferences(text)).toEqual({
        ...NOTHING,
        refusals: [{ fault: 'no-reason', text: attempt, line: 3 }],
      });
    });
  }

  it('reads the reasoned twin of those attempts as a marker', () => {
    const text = doc('Intro', '', '<!-- doc-links-skip: a/b.png -- an example -->');

    expect(readDocReferences(text)).toEqual({
      ...NOTHING,
      markers: [{ path: 'a/b.png', reason: 'an example', line: 3 }],
    });
  });

  it('refuses a marker naming no path', () => {
    const reading = readDocReferences(doc(
      '<!-- doc-links-skip: -- an example -->',
      '<!-- doc-links-skip: -->',
    ));

    expect(reading.markers).toEqual([]);
    expect(reading.refusals.map(({ fault, line }) => ({ fault, line })))
      .toEqual([{ fault: 'no-path', line: 1 }, { fault: 'no-path', line: 2 }]);
  });

  it('refuses a marker with no colon or with two words for a path', () => {
    const reading = readDocReferences(doc(
      '<!-- doc-links-skip a/b.png -- an example -->',
      '<!-- doc-links-skip: a/b.png c/d.png -- an example -->',
    ));

    expect(reading.markers).toEqual([]);
    expect(reading.refusals.map(({ fault, line }) => ({ fault, line })))
      .toEqual([{ fault: 'malformed', line: 1 }, { fault: 'malformed', line: 2 }]);
  });

  it('refuses a marker wrapped across two lines', () => {
    const text = doc(
      '<!-- doc-links-skip: a/b.png -- an example that',
      'wraps onto a second line -->',
    );

    expect(readDocReferences(text)).toEqual({
      ...NOTHING,
      refusals: [{
        fault: 'unterminated',
        text: '<!-- doc-links-skip: a/b.png -- an example that',
        line: 1,
      }],
    });
  });

  it('keeps a reason whole, a -- and a quoted span included', () => {
    const text = doc('<!-- doc-links-skip: a/b.png -- the `a/b.png` sample -- kept -->');

    expect(readDocReferences(text)).toEqual({
      ...NOTHING,
      spans: [{ target: 'a/b.png', line: 1 }],
      markers: [{ path: 'a/b.png', reason: 'the `a/b.png` sample -- kept', line: 1 }],
    });
  });

  it('reads no attempt inside a span or a fence, and a live one after', () => {
    const text = doc(
      'Write `<!-- doc-links-skip: <path> -- <reason> -->` to skip one.',
      '```md',
      '<!-- doc-links-skip: a/b.png -->',
      '```',
      '<!-- doc-links-skip: c/d.png -- a live one -->',
    );

    expect(readDocReferences(text)).toEqual({
      ...NOTHING,
      markers: [{ path: 'c/d.png', reason: 'a live one', line: 5 }],
    });
  });

  it('takes a comment under another name for no attempt at all', () => {
    const text = doc(
      '<!-- ralph:plan=q16b -->',
      '<!-- doc-links-skipping: a/b.png -- an example -->',
    );

    expect(readDocReferences(text)).toEqual(NOTHING);
  });
});

// ---------------------------------------------------------------------------
// One reading
// ---------------------------------------------------------------------------

describe('readDocReferences, one text', () => {
  it('returns every population in document order at its source line', () => {
    const text = doc(
      '# Guide',
      '',
      'Start at `docs/start.md`, then [the next page](docs/next.md).',
      '',
      '```sh',
      'cat `docs/never.md` [never](docs/never.md)',
      '```',
      '',
      '<!-- doc-links-skip: docs/gone.md -- named to say it was removed -->',
      'The old `docs/gone.md` and [its link](docs/gone.md#top).',
      '<!-- doc-links-skip: docs/also.md -->',
    );

    expect(readDocReferences(text)).toEqual({
      spans: [
        { target: 'docs/start.md', line: 3 },
        { target: 'docs/gone.md', line: 10 },
      ],
      links: [
        { target: 'docs/next.md', line: 3 },
        { target: 'docs/gone.md', line: 10 },
      ],
      markers: [{
        path: 'docs/gone.md',
        reason: 'named to say it was removed',
        line: 9,
      }],
      refusals: [{
        fault: 'no-reason',
        text: '<!-- doc-links-skip: docs/also.md -->',
        line: 11,
      }],
    });
  });
});
