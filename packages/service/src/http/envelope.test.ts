/**
 * `ok`, `okPage` and `buildPaginationMeta` — the three functions that
 * build every success body this service writes.
 *
 * Four claims, and each one is a promise made to a client that has
 * only the body. That a success body is always the same object with
 * the same members, so a consumer can key on `success` without
 * knowing which route answered. That `data` reaches
 * `JSON.stringify` exactly as the route handed it over, since nothing
 * here copies or reshapes it and a store projecting a column it
 * should not have is therefore visible rather than hidden. That
 * `meta` is derived from the window and the count and cannot
 * disagree with them. And that `page` is echoed rather than clamped,
 * so a caller that overshot can see that it did.
 *
 * The arithmetic cases are a table, and two guards keep it from going
 * quietly vacuous. `META_SHAPES` is asserted set-equal to the shapes
 * the table actually carries, so a shape dropped from the table is a
 * failure and not a silent gap. And every row's expected page count
 * is re-derived from the OTHER direction — the smallest `n` with
 * `n * perPage >= total`, computed without `Math.ceil` — so a
 * hand-written expectation that merely agrees with the module cannot
 * pass unnoticed.
 *
 * Mutation grid, measured over the 15 cases in this file. Turning
 * `Math.ceil` into `Math.floor` reddens 3: both partial-page rows and
 * the `okPage` case built on a partial window. The empty collection
 * and the two exact-multiple rows compute the same count under either
 * operation and stay green — which is why a table made only of
 * exact multiples would prove nothing about the division at all.
 * Dropping `meta` from `okPage` reddens 4, all of them in this file's
 * third describe. Writing `success: false` reddens 5: every case that
 * asserts a whole body, plus the one that reads the discriminator
 * directly. The single `okPage` case it leaves green reads `data` and
 * `meta` by identity and never looks at `success`, which is why the
 * others assert the whole object rather than the members they are
 * about. Returning a shallow COPY of `data` from `ok` reddens exactly
 * 2 — the two identity cases, and nothing else notices, which is
 * why they are written as `toBe` rather than as another
 * `toStrictEqual`.
 */
import { describe, expect, it } from 'vitest';

import { buildPaginationMeta, ok, okPage } from './envelope.js';

/**
 * The page shapes the arithmetic table has to cover. Held set-equal to
 * the table below, so an added shape with no row, or a row deleted out
 * from under a shape, is a red case rather than a quiet gap.
 */
const META_SHAPES = [
  'empty',
  'partial-last-page',
  'exact-multiple',
  'single-partial-page',
  'page-past-the-end',
];

/**
 * One window per shape, with the page count written down rather than
 * computed, so this file pins the arithmetic instead of agreeing with
 * whatever the module does.
 */
const META_CASES = [
  { shape: 'empty', page: 1, perPage: 50, total: 0, totalPages: 0 },
  { shape: 'partial-last-page', page: 3, perPage: 50, total: 101, totalPages: 3 },
  { shape: 'exact-multiple', page: 2, perPage: 50, total: 100, totalPages: 2 },
  { shape: 'single-partial-page', page: 1, perPage: 20, total: 7, totalPages: 1 },
  { shape: 'page-past-the-end', page: 99, perPage: 50, total: 100, totalPages: 2 },
];

/**
 * Whether `pages` is the smallest window count that covers `total`
 * rows, derived by multiplication rather than by division so it shares
 * no operation with the module under test. An empty collection spans
 * no pages at all.
 */
function isSmallestCoveringCount(
  pages: number,
  perPage: number,
  total: number,
): boolean {
  if (total === 0) {
    return pages === 0;
  }

  return pages * perPage >= total && (pages - 1) * perPage < total;
}

// ---------------------------------------------------------------------------
// buildPaginationMeta
// ---------------------------------------------------------------------------

describe('buildPaginationMeta', () => {
  it('carries one row per declared page shape', () => {
    const shapes = META_CASES.map((row) => row.shape);

    expect(shapes.sort()).toEqual([...META_SHAPES].sort());
  });

  it('expects the smallest covering page count in every row', () => {
    const wrong = META_CASES.filter(
      (row) => !isSmallestCoveringCount(row.totalPages, row.perPage, row.total),
    );

    expect(wrong.map((row) => row.shape)).toEqual([]);
  });

  for (const { shape, page, perPage, total, totalPages } of META_CASES) {
    it(`derives the meta of a ${shape} window`, () => {
      expect(buildPaginationMeta({ page, perPage, total })).toStrictEqual({
        page,
        perPage,
        total,
        totalPages,
      });
    });
  }

  it('leaves the input it was given untouched', () => {
    const input = { page: 3, perPage: 50, total: 101 };

    buildPaginationMeta(input);

    expect(input).toStrictEqual({ page: 3, perPage: 50, total: 101 });
  });
});

// ---------------------------------------------------------------------------
// ok
// ---------------------------------------------------------------------------

describe('ok', () => {
  it('wraps a resource in the success envelope and nothing else', () => {
    const domain = { id: 1, slug: 'example-tech-radar' };

    expect(ok(domain)).toStrictEqual({ success: true, data: domain });
  });

  it('carries the resource by reference rather than copying it', () => {
    const domain = { id: 1, slug: 'example-tech-radar' };

    expect(ok(domain).data).toBe(domain);
  });

  it('wraps a null resource without collapsing the envelope', () => {
    const envelope = ok(null);

    expect(Object.keys(envelope).sort()).toEqual(['data', 'success']);
    expect(envelope.data).toBeNull();
    expect(envelope.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// okPage
// ---------------------------------------------------------------------------

describe('okPage', () => {
  it('wraps a page beside the window it was read through', () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const meta = buildPaginationMeta({ page: 3, perPage: 50, total: 101 });

    expect(okPage(rows, meta)).toStrictEqual({
      success: true,
      data: rows,
      meta: { page: 3, perPage: 50, total: 101, totalPages: 3 },
    });
  });

  it('answers an empty list for a zero-row page', () => {
    const meta = buildPaginationMeta({ page: 1, perPage: 50, total: 0 });

    expect(okPage([], meta)).toStrictEqual({
      success: true,
      data: [],
      meta: { page: 1, perPage: 50, total: 0, totalPages: 0 },
    });
  });

  it('answers an empty list for a page past the end of the collection', () => {
    const meta = buildPaginationMeta({ page: 99, perPage: 50, total: 100 });

    expect(okPage([], meta)).toStrictEqual({
      success: true,
      data: [],
      meta: { page: 99, perPage: 50, total: 100, totalPages: 2 },
    });
  });

  it('carries the rows and the meta by reference and mutates neither', () => {
    const rows = [{ id: 1 }];
    const meta = buildPaginationMeta({ page: 1, perPage: 50, total: 1 });
    const envelope = okPage(rows, meta);

    expect(envelope.data).toBe(rows);
    expect(envelope.meta).toBe(meta);
    expect(rows).toStrictEqual([{ id: 1 }]);
  });
});
