import type { SelectOption } from '@ar/ui';

import { describe, expect, it } from 'vitest';

import {
  parseSearchParam,
  serializeSearchParam,
} from '../routes/useSearchParamState';

import {
  ALL_FILTER_VALUE,
  type QueryField,
  filterByQuery,
  filterBySelect,
  matchesSelect,
  normalizeQuery,
  withAllOption,
} from './filters';

// The rows here are LOCAL rather than the digest fixtures on purpose:
// these functions are generic over whatever a page hands them, and
// pinning them to `data/digest.ts` would make an unrelated fixture edit
// look like a regression in the filtering. What the table does borrow
// is the SHAPE the fixture types have — a nullable column beside a
// non-nullable one — because that is the case a derivation written
// against a tidier shape gets wrong.
//
// Every case below turns on one of the near-misses the table carries,
// and `the row table` block pins them: without a null verdict, without
// a term reachable from two different columns, and without a term that
// appears only in an unsearched column, half of these tests would pass
// over data that could not tell the two behaviours apart.

interface Row {
  readonly id: number;
  readonly title: string;
  readonly source: string;
  /** Nullable, mirroring `Finding.verdict` — nobody has ruled yet. */
  readonly verdict: string | null;
}

const ROWS: readonly Row[] = [
  {
    id: 1,
    title: 'Vector search in Postgres',
    source: 'Engineering blog',
    verdict: 'adopt',
  },
  {
    id: 2,
    title: 'Rust in the kernel',
    source: 'Mailing list',
    verdict: 'trial',
  },
  {
    id: 3,
    title: 'WebAssembly components',
    source: 'Standards tracker',
    verdict: 'adopt',
  },
  {
    id: 4,
    title: 'Postgres partitioning',
    source: 'Conference talk',
    verdict: null,
  },
];

/** What a digest-shaped surface would name as searchable. */
const SEARCHED: readonly QueryField<Row>[] = [
  (row) => row.title,
  (row) => row.source,
];

/** The same, plus the nullable column, for the null-field cases. */
const SEARCHED_WITH_VERDICT: readonly QueryField<Row>[] = [
  ...SEARCHED,
  (row) => row.verdict,
];

/** A verdict ladder as a domain would order it, strongest first. */
const VERDICT_OPTIONS: readonly SelectOption[] = [
  { value: 'adopt', label: 'Adopt' },
  { value: 'trial', label: 'Trial' },
  { value: 'hold', label: 'Hold' },
];

describe('the row table', () => {
  it('carries the near-misses the cases below turn on', () => {
    // Arrange, Act
    const nullVerdicts = ROWS.filter((row) => row.verdict === null);
    const spanningTwoFields = ROWS.filter(
      (row) => row.title.toLowerCase().includes('rust')
        && row.source.toLowerCase().includes('mailing'),
    );
    const verdictOnly = ROWS.filter(
      (row) => row.verdict === 'trial'
        && !row.title.toLowerCase().includes('trial'),
    );

    // Assert
    expect(ROWS.length).toBe(4);
    expect(nullVerdicts.map((row) => row.id)).toEqual([4]);
    expect(spanningTwoFields.map((row) => row.id)).toEqual([2]);
    expect(verdictOnly.map((row) => row.id)).toEqual([2]);
  });
});

describe('normalizeQuery', () => {
  it('trims and folds case', () => {
    // Arrange
    const raw = '  PostgreS ';

    // Act
    const folded = normalizeQuery(raw);

    // Assert
    expect(folded).toBe('postgres');
  });

  it('answers empty for text that says nothing', () => {
    // This is the reading a page's empty state needs: an empty answer
    // means the box is not filtering, so "no rows" is the surface being
    // empty rather than the query matching nothing.
    // Arrange
    const blanks = ['', ' ', '   ', '\t'];

    // Act
    const folded = blanks.map((raw) => normalizeQuery(raw));

    // Assert
    expect(folded).toEqual(['', '', '', '']);
  });

  it('leaves the inside of a query alone', () => {
    // Only the ends are trimmed: a two-word query is two words, and
    // collapsing the space between them would change what a substring
    // match means without saying so.
    // Arrange
    const raw = ' vector  search ';

    // Act
    const folded = normalizeQuery(raw);

    // Assert
    expect(folded).toBe('vector  search');
  });
});

describe('filterByQuery', () => {
  it('answers every row for an empty query', () => {
    // A search box is a narrowing of the list, not a gate in front of
    // it: the surface renders its rows before anything is typed.
    // Arrange
    const query = '';

    // Act
    const matched = filterByQuery(ROWS, query, SEARCHED);

    // Assert
    expect(ROWS.length).toBe(4);
    expect(matched.map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  it('answers every row for a whitespace-only query', () => {
    // Clearing a box can leave a space behind, and a page that then
    // showed nothing would look broken with no visible cause.
    // Arrange
    const query = '   ';

    // Act
    const matched = filterByQuery(ROWS, query, SEARCHED);

    // Assert
    expect(matched.map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  it('answers nothing for a query no field carries', () => {
    // Arrange
    const query = 'graphql';

    // Act
    const matched = filterByQuery(ROWS, query, SEARCHED);

    // Assert
    expect(ROWS.length).toBe(4);
    expect(matched).toEqual([]);
  });

  it('answers the subset a query matches, in the table order', () => {
    // Arrange
    const query = 'postgres';

    // Act
    const matched = filterByQuery(ROWS, query, SEARCHED);

    // Assert
    expect(ROWS.length).toBe(4);
    expect(matched.map((row) => row.id)).toEqual([1, 4]);
  });

  it('matches regardless of case or surrounding whitespace', () => {
    // The same subset as the case above, reached from four spellings an
    // operator can produce without noticing the difference.
    // Arrange
    const queries = ['postgres', 'Postgres', 'POSTGRES', '  Postgres  '];

    // Act
    const matched = queries.map((query) => ({
      query,
      ids: filterByQuery(ROWS, query, SEARCHED).map((row) => row.id),
    }));

    // Assert
    expect(queries.length).toBe(4);
    expect(matched.filter(
      (entry) => entry.ids.join() !== '1,4',
    )).toEqual([]);
  });

  it('matches on any of the fields it is given', () => {
    // `Mailing` is a source, not a title, so a search reading only the
    // first field would answer nothing here.
    // Arrange
    const query = 'mailing';

    // Act
    const matched = filterByQuery(ROWS, query, SEARCHED);

    // Assert
    expect(matched.map((row) => row.id)).toEqual([2]);
  });

  it('does not match a needle spanning two fields', () => {
    // Row 2's title ends `kernel` and its source begins `Mailing`, so a
    // derivation that joined the fields before comparing would report
    // this row for a query no single column contains — a hit an
    // operator cannot see the reason for.
    // Arrange
    const query = 'kernel mailing';

    // Act
    const matched = filterByQuery(ROWS, query, SEARCHED);

    // Assert
    expect(matched).toEqual([]);
  });

  it('searches only the fields it is given', () => {
    // `trial` is row 2's verdict and nothing else, so this is the case
    // that says the field vector is the whole search surface — a page
    // adding a column has to add its reader too.
    // Arrange
    const query = 'trial';

    // Act
    const matched = filterByQuery(ROWS, query, SEARCHED);

    // Assert
    expect(matched).toEqual([]);
  });

  it('reads a nullable field as saying nothing rather than throwing', () => {
    // Row 4's verdict is null. The field reader hands that straight
    // over, so the null has to be absorbed here or every page naming a
    // nullable column would need a `?? ''` of its own.
    // Arrange
    const query = 'adopt';

    // Act
    const matched = filterByQuery(ROWS, query, SEARCHED_WITH_VERDICT);

    // Assert
    expect(matched.map((row) => row.id)).toEqual([1, 3]);
  });

  it('answers nothing when no field is searched', () => {
    // A page that forgot its field vector shows an empty list rather
    // than an unfiltered one: the quieter failure is the one where
    // typing changes nothing at all.
    // Arrange
    const query = 'postgres';

    // Act
    const matched = filterByQuery(ROWS, query, []);

    // Assert
    expect(matched).toEqual([]);
  });

  it('answers every row for an empty query even with no fields', () => {
    // The two rules above meet here, and only one of them can win: an
    // empty query matches every row UNCONDITIONALLY, ahead of the field
    // vector being consulted at all. Without that order a page whose
    // columns are still being wired renders empty before anyone types,
    // which reads as no data rather than as no readers.
    // Arrange
    const query = '';

    // Act
    const matched = filterByQuery(ROWS, query, []);

    // Assert
    expect(matched.map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  it('hands back a fresh array a caller can sort in place', () => {
    // The cast is deliberate: `readonly` is a compile-time claim and
    // the value handed over is an ordinary array any consumer can
    // reorder, so spreading before sorting would sort a copy of a copy
    // and the test could never fail.
    // Arrange
    const before = ROWS.map((row) => row.id);

    // Act
    const matched = filterByQuery(ROWS, '', SEARCHED) as Row[];

    matched.sort((left, right) => right.id - left.id);

    // Assert
    expect(matched.map((row) => row.id)).toEqual([4, 3, 2, 1]);
    expect(ROWS.map((row) => row.id)).toEqual(before);
  });
});

describe('matchesSelect', () => {
  it('passes every value under the sentinel', () => {
    // Including the null one: a select filtering nothing must not
    // quietly drop the rows that have not been ruled on.
    // Arrange
    const values = ['adopt', 'trial', '', null, undefined];

    // Act
    const passed = values.map(
      (value) => matchesSelect(value, ALL_FILTER_VALUE),
    );

    // Assert
    expect(values.length).toBe(5);
    expect(passed).toEqual([true, true, true, true, true]);
  });

  it('passes only the chosen value', () => {
    // Arrange
    const values = ['adopt', 'trial', 'hold'];

    // Act
    const passed = values.map((value) => matchesSelect(value, 'adopt'));

    // Assert
    expect(passed).toEqual([true, false, false]);
  });

  it('compares the sentinel exactly', () => {
    // `All` is a verdict a domain could have configured, not the
    // sentinel — a comparison that trimmed or folded case would let it
    // through and stop the control filtering anything.
    // Arrange
    const nearMisses = ['All', 'ALL', ' all', 'all ', ''];

    // Act
    const passed = nearMisses.map((selected) => ({
      selected,
      passes: matchesSelect('adopt', selected),
    }));

    // Assert
    expect(nearMisses.length).toBe(5);
    expect(passed.filter((entry) => entry.passes)).toEqual([]);
  });

  it('never passes a null value under a chosen filter', () => {
    // The schema's reading: an unruled row is not a member of any of
    // the classes the select offers, so choosing one drops it.
    // Arrange
    const absent = [null, undefined];

    // Act
    const passed = absent.map((value) => matchesSelect(value, 'adopt'));

    // Assert
    expect(passed).toEqual([false, false]);
  });
});

describe('filterBySelect', () => {
  it('answers every row under the sentinel', () => {
    // Act
    const matched = filterBySelect(
      ROWS,
      ALL_FILTER_VALUE,
      (row) => row.verdict,
    );

    // Assert
    expect(ROWS.length).toBe(4);
    expect(matched.map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  it('answers the subset carrying the chosen value', () => {
    // Act
    const matched = filterBySelect(ROWS, 'adopt', (row) => row.verdict);

    // Assert
    expect(ROWS.length).toBe(4);
    expect(matched.map((row) => row.id)).toEqual([1, 3]);
  });

  it('answers nothing for a value no row carries', () => {
    // `hold` is an option the ladder offers and nothing has been ruled
    // — an empty list is the honest answer, not a bug.
    // Act
    const matched = filterBySelect(ROWS, 'hold', (row) => row.verdict);

    // Assert
    expect(matched).toEqual([]);
  });

  it('drops the rows whose column says nothing', () => {
    // Row 4 is unruled, so it survives the sentinel and every text
    // search and disappears the moment a verdict is chosen.
    // Act
    const under = ROWS.map((row) => row.id);
    const matched = ['adopt', 'trial', 'hold'].flatMap(
      (verdict) => filterBySelect(ROWS, verdict, (row) => row.verdict),
    );

    // Assert
    expect(under).toContain(4);
    expect(matched.map((row) => row.id)).toEqual([1, 3, 2]);
  });

  it('chains with filterByQuery in either order', () => {
    // Three controls on one surface narrow three times, so the passes
    // have to compose — and give the same answer whichever way a page
    // happens to write them.
    // Arrange
    const query = 'postgres';

    // Act
    const queryFirst = filterBySelect(
      filterByQuery(ROWS, query, SEARCHED),
      'adopt',
      (row) => row.verdict,
    );
    const selectFirst = filterByQuery(
      filterBySelect(ROWS, 'adopt', (row) => row.verdict),
      query,
      SEARCHED,
    );

    // Assert
    expect(queryFirst.map((row) => row.id)).toEqual([1]);
    expect(selectFirst.map((row) => row.id)).toEqual([1]);
  });

  it('hands back a fresh array a caller can sort in place', () => {
    // Arrange
    const before = ROWS.map((row) => row.id);

    // Act
    const matched = filterBySelect(
      ROWS,
      ALL_FILTER_VALUE,
      (row) => row.verdict,
    ) as Row[];

    matched.sort((left, right) => right.id - left.id);

    // Assert
    expect(matched.map((row) => row.id)).toEqual([4, 3, 2, 1]);
    expect(ROWS.map((row) => row.id)).toEqual(before);
  });
});

describe('withAllOption', () => {
  it('leads with the sentinel under the label it is given', () => {
    // Act
    const options = withAllOption('All verdicts', VERDICT_OPTIONS);

    // Assert
    expect(options.map((option) => option.value)).toEqual([
      ALL_FILTER_VALUE,
      'adopt',
      'trial',
      'hold',
    ]);
    expect(options.map((option) => option.label)).toEqual([
      'All verdicts',
      'Adopt',
      'Trial',
      'Hold',
    ]);
  });

  it('keeps the caller order rather than sorting', () => {
    // A verdict ladder runs strongest to weakest, which is not
    // alphabetical — re-sorting on the way to the control would turn a
    // meaningful order into an arbitrary one.
    // Arrange
    const ladder = VERDICT_OPTIONS.map((option) => option.value);

    // Act
    const options = withAllOption('All verdicts', VERDICT_OPTIONS);

    // Assert
    expect(ladder).toEqual(['adopt', 'trial', 'hold']);
    expect(options.slice(1).map((option) => option.value)).toEqual(ladder);
  });

  it('serves a control with no options of its own', () => {
    // A domain whose vocabulary is empty still gets a usable select
    // rather than one showing `Select…`.
    // Act
    const options = withAllOption('All kinds', []);

    // Assert
    expect(options).toEqual([
      { value: ALL_FILTER_VALUE, label: 'All kinds' },
    ]);
  });

  it('never writes through the options it is given', () => {
    // Act
    const options = withAllOption('All verdicts', VERDICT_OPTIONS);

    options.push({ value: 'assess', label: 'Assess' });

    // Assert
    expect(options.length).toBe(5);
    expect(VERDICT_OPTIONS.length).toBe(3);
  });
});

describe('ALL_FILTER_VALUE across the URL', () => {
  // The constant's whole reason to exist is that one string has to be
  // the select's unfiltered option, the search-param fallback and the
  // value `matchesSelect` lets everything past. These two cases are
  // that claim, driven through the helpers a page actually calls
  // rather than restated as a comment.

  it('leaves no trace in the URL while it is filtering nothing', () => {
    // Arrange
    const params = new URLSearchParams('q=postgres&verdict=adopt');

    // Act
    const next = serializeSearchParam(
      params,
      'verdict',
      ALL_FILTER_VALUE,
      ALL_FILTER_VALUE,
    );
    const read = parseSearchParam(next, 'verdict', ALL_FILTER_VALUE);
    const matched = filterBySelect(ROWS, read, (row) => row.verdict);

    // Assert
    expect(next.toString()).toBe('q=postgres');
    expect(read).toBe(ALL_FILTER_VALUE);
    expect(matched.map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  it('reads a chosen value back as the same choice it filtered on', () => {
    // Arrange
    const params = new URLSearchParams('q=postgres');

    // Act
    const next = serializeSearchParam(
      params,
      'verdict',
      'adopt',
      ALL_FILTER_VALUE,
    );
    const read = parseSearchParam(next, 'verdict', ALL_FILTER_VALUE);
    const matched = filterBySelect(ROWS, read, (row) => row.verdict);

    // Assert
    expect(next.toString()).toBe('q=postgres&verdict=adopt');
    expect(read).toBe('adopt');
    expect(matched.map((row) => row.id)).toEqual([1, 3]);
  });
});
