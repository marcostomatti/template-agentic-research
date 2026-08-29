/**
 * @packageDocumentation
 * The digest surface: what this domain's pipeline has read lately, what
 * it made of each item, and what an operator does about it.
 *
 * The first of the six surfaces and the one the app opens on. Its rows
 * are findings — readings, not documents — because one document can be
 * read into several, and a digest of documents would hide the ones that
 * disagree.
 *
 * ## Four reads, joined here
 *
 * A row shows a finding's verdict and score, the document it was read
 * from, the source that fetched that document, and the taxonomy bucket
 * its subject was matched under. Those are four tables in the schema
 * and four reads through `../../data/hooks`, and this page performs the
 * join — the arrangement `../../data/digest.ts` documents, so that a
 * q15 endpoint answers with the tables it has rather than a flattened
 * row shape invented for this component.
 *
 * The join itself lives in `./rows`, not here: it is pure, and the node
 * unit suite reaches a `.ts` module where nothing reaches a `.tsx`.
 * What is left in this file is which cell renders which column.
 *
 * ## Filters live in the URL
 *
 * Four controls, four search parameters, no component state at all —
 * `../../routes/useSearchParamState` is the whole of it. A filtered
 * digest is therefore a link, a reload keeps it, and the back button
 * undoes the last change.
 *
 * Three of the four are equality filters over a column and go through
 * `../filters`; the time window is a cutoff rather than a value and
 * lives in `./timeWindow` beside this page, for the reason `../filters`
 * gives.
 *
 * The verdict and category options come from the DOMAIN rather than
 * from the rows on screen: a control offering only what is already
 * visible cannot say that a domain has a verdict nothing carries yet,
 * and it would change shape under the operator as they filtered.
 *
 * ## No sort
 *
 * The rows arrive newest first — ordering is part of what the digest
 * means, so `listFindings` owns it — and no column is marked sortable.
 * `Table` owns its sort state internally, so a sorted view would be a
 * reading of this page that a shared link could not carry, which is
 * exactly the property the URL-as-state rule exists to protect. A
 * sortable digest arrives with a controlled sort, not before.
 *
 * ## Three states, not two
 *
 * A reader that has not settled is not the same as a domain with no
 * findings, and neither is a slug nothing answers to — `/d/nope/digest`
 * matches the domain pattern, passes `DomainGuard`, and rejects at the
 * data layer. Each gets its own body.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the Playwright
 * specs.
 */

import type { DigestRow } from './rows';
import type { Column, SelectOption } from '@ar/ui';

import {
  EmptyState,
  Select,
  SearchInput,
  Skeleton,
  Table,
  Tag,
  ToolbarSep,
  renderCellContent,
} from '@ar/ui';
import { useNavigate, useParams } from 'react-router';

import { ListPage } from '../../components/ListPage';
import {
  useCategorySummaries,
  useDocuments,
  useEntities,
  useFindings,
  useSources,
  useVerdicts,
} from '../../data/hooks';
import { FIXTURE_NOW } from '../../data/types';
import { getSurface } from '../../routes/paths';
import { useSearchParamState } from '../../routes/useSearchParamState';
import {
  ALL_FILTER_VALUE,
  filterByQuery,
  filterBySelect,
  withAllOption,
} from '../filters';

import {
  DIGEST_QUERY_FIELDS,
  UNRATED_VERDICT_LABEL,
  buildDigestRows,
  rowCountLabel,
  tagLine,
  verdictTone,
} from './rows';
import { TIME_WINDOW_OPTIONS, withinTimeWindow } from './timeWindow';

/** Which surface this is — the page's title comes off the same table. */
const SURFACE_ID = 'digest';

/** The search parameter each control owns. */
const QUERY_PARAM = 'q';
const VERDICT_PARAM = 'verdict';
const CATEGORY_PARAM = 'category';
const WINDOW_PARAM = 'window';

/**
 * The locale every formatted value on this page is rendered in.
 *
 * Pinned rather than left to the browser, for the reason `FIXTURE_NOW`
 * is pinned: a score rendered `8,5` on one machine and `8.5` on another
 * makes the rendered text a property of who is looking rather than of
 * the data. This shell is English throughout; the day it is not, this
 * is one constant and a settings read.
 */
const DISPLAY_LOCALE = 'en-US';

/** Fraction digits a score is shown to — the scale is one decimal. */
const SCORE_PRECISION = 1;

/** What the title cell says for a payload carrying no summary text. */
const NO_SUMMARY = 'No summary';

/** What the score cell says where nothing has scored the finding yet. */
const UNSCORED = 'Unscored';

/** Column widths, in px. The title column takes what is left. */
const VERDICT_WIDTH = 128;
const SCORE_WIDTH = 92;
const SOURCE_WIDTH = 210;
const AGE_WIDTH = 124;
const MENU_WIDTH = 52;

/** Read the column each filter select narrows. */
const readVerdict = (row: DigestRow) => row.verdict;
const readCategory = (row: DigestRow) => row.categoryKey;

/**
 * The digest surface.
 *
 * @returns The page: its head, its filter bar, its table, and the
 * `Outlet` an opened row's modal arrives in.
 */
export const DigestPage = () => {
  const { domainSlug } = useParams<{ domainSlug?: string }>();
  const navigate = useNavigate();

  const findingsRead = useFindings(domainSlug);
  const documentsRead = useDocuments(domainSlug);
  const entitiesRead = useEntities(domainSlug);
  const sourcesRead = useSources(domainSlug);
  const verdictsRead = useVerdicts(domainSlug);
  const categoriesRead = useCategorySummaries(domainSlug);

  const query = useSearchParamState(QUERY_PARAM, '');
  const verdict = useSearchParamState(VERDICT_PARAM, ALL_FILTER_VALUE);
  const category = useSearchParamState(CATEGORY_PARAM, ALL_FILTER_VALUE);
  const window = useSearchParamState(WINDOW_PARAM, ALL_FILTER_VALUE);

  // The four reads the rows are joined from, named as constants so the
  // check below narrows all four at once — `useCache` answers
  // `T | undefined` until it settles, and a property access is not
  // something the compiler can narrow through a flag.
  const findings = findingsRead.data;
  const documents = documentsRead.data;
  const entities = entitiesRead.data;
  const sources = sourcesRead.data;

  // Read together rather than gated one at a time: a row IS the join,
  // so a partial one would render a source column that fills itself in
  // a frame later.
  const joined = findings !== undefined
    && documents !== undefined
    && entities !== undefined
    && sources !== undefined;

  const rows = joined
    ? buildDigestRows({ findings, documents, entities, sources })
    : [];

  const searched = filterByQuery(rows, query.value, DIGEST_QUERY_FIELDS);
  const byVerdict = filterBySelect(searched, verdict.value, readVerdict);
  const byCategory = filterBySelect(byVerdict, category.value, readCategory);
  const visible = byCategory.filter(
    (row) => withinTimeWindow(row.createdAt, window.value, FIXTURE_NOW),
  );

  // Options come from the domain, not from the rows — see the header.
  // The ladder keeps its own order; the labels are the domain's own
  // words, shown as it configured them rather than title-cased into
  // something it never said.
  const verdictOptions = withAllOption(
    'All verdicts',
    (verdictsRead.data ?? []).map((name) => ({ value: name, label: name })),
  );

  const categoryOptions: SelectOption[] = withAllOption(
    'All categories',
    (categoriesRead.data ?? []).map((summary) => ({
      value: summary.category.key,
      label: summary.category.name,
    })),
  );

  const columns: Column<DigestRow>[] = [
    {
      key: 'finding',
      header: 'Finding',
      // The cell truncates each of its two lines itself; `truncate`
      // here is what gives the clipped text the table's own tooltip.
      overflow: 'truncate',
      cell: (row) => renderCellContent('double-line', {
        title: row.summary ?? NO_SUMMARY,
        subtitle: tagLine(row.tags),
      }),
    },
    {
      key: 'verdict',
      header: 'Verdict',
      width: VERDICT_WIDTH,
      cell: (row) => renderCellContent('badge', {
        label: row.verdict ?? UNRATED_VERDICT_LABEL,
        tone: verdictTone(row.verdict),
      }),
    },
    {
      key: 'score',
      header: 'Score',
      width: SCORE_WIDTH,
      align: 'end',
      // Never scored and scored to zero are different readings, and a
      // column showing `0` for both would erase the distinction the
      // schema keeps.
      cell: (row) => (row.score === null
        ? renderCellContent('value', {
          align: 'end',
          children: <span className="text-[12.5px] text-fg3">{UNSCORED}</span>,
        })
        : renderCellContent('value', {
          align: 'end',
          value: row.score,
          short: false,
          precision: SCORE_PRECISION,
          locale: DISPLAY_LOCALE,
        })),
    },
    {
      key: 'source',
      header: 'Source',
      width: SOURCE_WIDTH,
      // The indicator carries the document's parse state, which is the
      // other half of where a row came from: a source whose contract
      // has drifted still yields findings, and this is where that shows
      // without spending a column on it.
      cell: (row) => renderCellContent('status', {
        tone: row.parseFailed
          ? 'warn'
          : 'ok',
        text: row.sourceLabel,
        label: row.parseFailed
          ? 'Parsed with errors'
          : 'Parsed cleanly',
      }),
    },
    {
      key: 'age',
      header: 'Found',
      width: AGE_WIDTH,
      cell: (row) => renderCellContent('relative-time', {
        date: row.createdAt,
        // The fixtures are dated against this instant, so the ladder
        // reads the same today as the day they were written.
        now: FIXTURE_NOW,
        locale: DISPLAY_LOCALE,
      }),
    },
    {
      key: 'menu',
      header: '',
      width: MENU_WIDTH,
      align: 'end',
      cell: (row) => renderCellContent('context-menu', {
        // One action, and it is the one that works: opening a row is a
        // navigation to this surface's modal sub-route. Setting a
        // verdict and sending to research are mutations, and this
        // round has no seam to write through — a menu item that did
        // nothing would be worse than one that is not there.
        actions: [
          {
            icon: 'eye',
            title: 'Open',
            onClick: () => {
              // Relative, so one expression serves both route bases.
              void navigate(String(row.id));
            },
          },
        ],
        entityType: 'finding',
        entityName: row.summary ?? NO_SUMMARY,
      }),
    },
  ];

  return (
    <ListPage
      title={getSurface(SURFACE_ID).title}
      // Undefined rather than `false` while the reads are in flight:
      // the head renders its tag row for anything that is not null,
      // and `false` would give it an empty one to space around.
      tags={joined
        ? <Tag tone="neutral">{rowCountLabel(visible.length, rows.length)}</Tag>
        : undefined}
      controls={(
        <>
          <SearchInput
            value={query.value}
            onChange={query.setValue}
            placeholder="Search findings…"
          />

          <ToolbarSep />

          <Select
            value={verdict.value}
            options={verdictOptions}
            onChange={verdict.setValue}
            ariaLabel="Filter by verdict"
          />

          <Select
            value={category.value}
            options={categoryOptions}
            onChange={category.setValue}
            ariaLabel="Filter by category"
          />

          <Select
            value={window.value}
            options={TIME_WINDOW_OPTIONS}
            onChange={window.setValue}
            ariaLabel="Filter by time window"
          />
        </>
      )}
    >
      <DigestBody
        failed={findingsRead.isError}
        joined={joined}
        rows={rows}
        visible={visible}
        columns={columns}
      />
    </ListPage>
  );
};

/** What the digest shows in place of its table. */
interface DigestBodyProps {
  /** Whether the findings read rejected — an unknown domain, today. */
  readonly failed: boolean;
  /** Whether all four reads behind a row have settled. */
  readonly joined: boolean;
  /** Every row of the domain, before the filters. */
  readonly rows: readonly DigestRow[];
  /** The rows the filters left. */
  readonly visible: readonly DigestRow[];
  /** The table's columns, built by the page. */
  readonly columns: Column<DigestRow>[];
}

/**
 * The page's body: the table, or the reason there is not one.
 *
 * Split out of the page rather than written as three nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and as very little
 * else.
 *
 * @param props - Which state the reads are in, and what to render with.
 * @returns The table, an empty state, or the loading stand-in.
 */
const DigestBody = ({
  failed,
  joined,
  rows,
  visible,
  columns,
}: DigestBodyProps) => {
  if (failed) {
    return (
      <EmptyState
        title="This domain could not be read"
        description="Nothing in this deployment answers to that domain. Pick one from the switcher above."
      />
    );
  }

  if (!joined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No findings yet"
        description="This domain has read nothing, or nothing it read matched its lexicon. Configure a source to start it off."
      />
    );
  }

  if (visible.length === 0) {
    // A different sentence from the one above on purpose: an operator
    // who has narrowed the list to nothing needs to know the rows are
    // still there, not that the domain is empty.
    return (
      <EmptyState
        title="Nothing matches these filters"
        description="Every finding is filtered out. Clear the search box or widen a filter to bring them back."
      />
    );
  }

  return (
    <Table
      columns={columns}
      data={visible}
      getRowId={(row) => String(row.id)}
      density="comfortable"
    />
  );
};
