/**
 * @packageDocumentation
 * The sources surface: which feeds this domain is allowed to read, how
 * each one is doing, and how far through it the pipeline has got.
 *
 * A row per source, because a source is a thing an operator configures
 * and then lives with — the digest shows what came OUT of these feeds,
 * and this is where somebody answers why one of them stopped
 * producing.
 *
 * ## A band above the list
 *
 * Three `SmallStatCard`s sit above the page head rather than inside
 * the list skeleton, which is the one place this surface departs from
 * its neighbours. The band is a reading of the whole deployment slice
 * — how many feeds are working, how many are not, how many have never
 * run — and the table under it is the detail behind those three
 * figures. Putting it inside the body would file it as one more thing
 * the filters narrow, which it is not: the cards count the DOMAIN,
 * while the head chip and the table count what the controls left.
 *
 * The heading still follows it, and that costs nothing an operator
 * notices: the topbar already names the surface, so the `h1` is a
 * document landmark here rather than the first thing anybody reads.
 *
 * The column wrapper is this page's own because `AppShellContent`
 * contributes padding and scrolling but no vertical rhythm — the gap
 * matches the one `ListPage` uses internally, so the band, the head,
 * the toolbar and the table sit on a single ladder.
 *
 * ## Two reads, gated separately
 *
 * The band reads `useSourceStatusCounts` and the table reads
 * `useSources`. They could be one read and a count in the browser;
 * they are not, for the reason `summarizeSources` gives — the cards
 * and the table have to agree, and a second reading of the four
 * stored health columns is exactly what that module exists to
 * prevent.
 *
 * Two reads mean two loading states, and they are deliberately not
 * joined: the band and the table are independent statements, so
 * whichever settles first renders, and neither waits on the other.
 * The digest joins its four reads because a digest ROW is the join;
 * nothing here is.
 *
 * ## Filters live in the URL
 *
 * Three controls, three search parameters, no component state at all
 * — `../../routes/useSearchParamState` is the whole of it. A narrowed
 * list is therefore a link, a reload keeps it, and the back button
 * undoes the last change.
 *
 * The status control carries a count per option, and those counts are
 * measured over the rows the OTHER two controls have already left: a
 * figure promising three rows is only true if everything else stays
 * where it is. The kind control carries none, because its options are
 * the closed schema union rather than a reading of the data.
 *
 * ## No sort
 *
 * Sources arrive in configuration order — the order an operator added
 * them in, which `listSources` owns — and no column is marked
 * sortable. `Table` owns its sort state internally, so a sorted view
 * would be a reading of this page that a shared link could not carry,
 * which is the property the URL-as-state rule exists to protect.
 *
 * ## No enable switch, and no approve action
 *
 * `sources.enabled` is a real column and the UI spec has a menu that
 * writes to it, alongside approving a pending config and reviewing a
 * feed's failures. None of the three is offered here, and a control
 * that silently did nothing would be worse than one that is not there.
 * What the menu does offer is the one gesture that works — a
 * navigation to this surface's editor sub-route.
 *
 * The reason has narrowed since this was written and the sentence is
 * worth keeping accurate: there IS a write seam now
 * (`../../data/api.ts`'s `saveSource` and `approveSourceConfig`,
 * reached through `../../data/hooks.ts` like every read). What is
 * missing is the editor and the two modals that would call it, so the
 * controls stay absent for the same reason and not for the old one.
 *
 * ## Three states, not two
 *
 * A read that has not settled is not the same as a domain with no
 * feeds, and neither is a slug nothing answers to — `/d/nope/sources`
 * matches the domain pattern, passes `DomainGuard`, and rejects at the
 * data layer. Each gets its own body. The empty one is reachable in
 * the running demo by switching to the sparse domain, which carries no
 * sources at all.
 *
 * Nothing in this file is reachable from the unit suite, which is
 * node-only and collects `.ts` alone. Its bindings are proven by a
 * `check-types` mutation grid; what it renders falls to the Playwright
 * specs.
 */

import type { SourceStatusCounts } from '../../data/sources';
import type { Source } from '../../data/types';
import type { Column } from '@ar/ui';

import {
  EmptyState,
  FormattedRelativeTime,
  Grid,
  SearchInput,
  Select,
  Skeleton,
  SmallStatCard,
  StatusIndicator,
  Table,
  Tag,
  ToolbarSep,
  cn,
  renderCellContent,
} from '@ar/ui';
import { useNavigate, useParams } from 'react-router';

import { ListPage } from '../../components/ListPage';
import { useSourceStatusCounts, useSources } from '../../data/hooks';
import { classifySource, countSourceStatuses } from '../../data/sources';
import { FIXTURE_NOW } from '../../data/types';
import { getSurface } from '../../routes/paths';
import { useSearchParamState } from '../../routes/useSearchParamState';
import { ALL_FILTER_VALUE, filterByQuery, filterBySelect } from '../filters';

import {
  SOURCE_QUERY_FIELDS,
  SOURCE_STAT_CARDS,
  cursorLabel,
  failureStreakLabel,
  kindOptions,
  kindTone,
  sourceCountLabel,
  splitEndpoint,
  statusFacet,
  statusOptions,
} from './rows';

/** Which surface this is — the page title comes off the same table. */
const SURFACE_ID = 'sources';

/** The search parameter each control owns. */
const QUERY_PARAM = 'q';
const KIND_PARAM = 'kind';
const STATUS_PARAM = 'status';

/** The sub-route a row's edit action opens, relative to this surface. */
const EDIT_SEGMENT = 'edit';

/**
 * The locale every formatted value on this page is rendered in.
 *
 * Pinned rather than left to the browser, for the reason `FIXTURE_NOW`
 * is pinned: a figure rendered one way on one machine and another way
 * on the next makes the text a property of who is looking rather than
 * of the data.
 */
const DISPLAY_LOCALE = 'en-US';

/** What the cursor cell leads with for a feed nothing has read yet. */
const NEVER_FETCHED = 'Never fetched';

/** What the health cell says for a feed that has never come back bad. */
const NEVER_FAILED = 'Never failed';

/** Column widths, in px. The source column takes what is left. */
const KIND_WIDTH = 92;
const STATUS_WIDTH = 124;
const HEALTH_WIDTH = 188;
const CURSOR_WIDTH = 208;
const MENU_WIDTH = 52;

/** The stat band's own tracks: stacked on a narrow viewport, three across. */
const STAT_BAND_COLUMNS = 'md:grid-cols-3';

/** Read the column each filter select narrows. */
const readKind = (source: Source) => source.kind;
const readStatus = (source: Source) => classifySource(source);

/**
 * The sources surface.
 *
 * @returns The page: its stat band, its head, its filter bar, its
 * table, and the `Outlet` an opened row's editor arrives in.
 */
export const SourcesPage = () => {
  const { domainSlug } = useParams<{ domainSlug?: string }>();
  const navigate = useNavigate();

  const sourcesRead = useSources(domainSlug);
  const countsRead = useSourceStatusCounts(domainSlug);

  const query = useSearchParamState(QUERY_PARAM, '');
  const kind = useSearchParamState(KIND_PARAM, ALL_FILTER_VALUE);
  const status = useSearchParamState(STATUS_PARAM, ALL_FILTER_VALUE);

  // Named rather than read through the hook result at each use: the
  // body branches on whether the read has settled, and `data` is
  // `T | undefined` until it has.
  const sources = sourcesRead.data;

  const rows = sources ?? [];
  const searched = filterByQuery(rows, query.value, SOURCE_QUERY_FIELDS);
  const byKind = filterBySelect(searched, kind.value, readKind);
  const visible = filterBySelect(byKind, status.value, readStatus);

  // Measured over what the other two controls left, not over the
  // domain: an option promising three rows has to be counting the
  // list the operator would actually get.
  const statusCounts = countSourceStatuses(byKind);

  const columns: Column<Source>[] = [
    {
      key: 'source',
      header: 'Source',
      // A source has no name column — the endpoint is its identity —
      // so the cell splits it and `truncate` gives the clipped half
      // the table's own tooltip.
      overflow: 'truncate',
      cell: (source) => {
        const { host, path } = splitEndpoint(source.endpoint);

        return renderCellContent('double-line', {
          title: host,
          subtitle: path ?? undefined,
        });
      },
    },
    {
      key: 'kind',
      header: 'Kind',
      width: KIND_WIDTH,
      // Mono, because the kind is the stored token rather than a word
      // this surface chose.
      cell: (source) => (
        <Tag tone={kindTone(source.kind)}>{source.kind}</Tag>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: STATUS_WIDTH,
      // No `label`: the visible text already IS the status, and
      // `CellStatus` would give the dot the same name to announce a
      // second time.
      cell: (source) => renderCellContent('status', {
        tone: statusFacet(classifySource(source)).tone,
        text: statusFacet(classifySource(source)).label,
      }),
    },
    {
      key: 'health',
      header: 'Health',
      width: HEALTH_WIDTH,
      cell: (source) => <HealthCell source={source} />,
    },
    {
      key: 'cursor',
      header: 'Cursor',
      width: CURSOR_WIDTH,
      overflow: 'truncate',
      // How old the position is over what the position says. The age
      // is the reading an operator scans for; the token is the detail
      // they check once they have stopped on a row.
      cell: (source) => renderCellContent('double-line', {
        title: source.lastSuccessAt === null
          ? NEVER_FETCHED
          : (
            <FormattedRelativeTime
              date={source.lastSuccessAt}
              now={FIXTURE_NOW}
              locale={DISPLAY_LOCALE}
            />
          ),
        subtitle: (
          <span className="font-mono">{cursorLabel(source.cursor)}</span>
        ),
      }),
    },
    {
      key: 'menu',
      header: '',
      width: MENU_WIDTH,
      align: 'end',
      cell: (source) => renderCellContent('context-menu', {
        // One action, and it is the one that works — see the header on
        // the three the spec names and this round cannot honour.
        actions: [
          {
            icon: 'square-pen',
            title: 'Edit source',
            onClick: () => {
              // Relative, so one expression serves both route bases.
              void navigate(`${source.id}/${EDIT_SEGMENT}`);
            },
          },
        ],
        entityType: 'source',
        entityName: splitEndpoint(source.endpoint).host,
      }),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatBand failed={countsRead.isError} counts={countsRead.data} />

      <ListPage
        title={getSurface(SURFACE_ID).title}
        // Undefined rather than `false` while the read is in flight:
        // the head renders its tag row for anything that is not null,
        // and `false` would give it an empty one to space around.
        tags={sources === undefined
          ? undefined
          : (
            <Tag tone="neutral">
              {sourceCountLabel(visible.length, rows.length)}
            </Tag>
          )}
        controls={(
          <>
            <SearchInput
              value={query.value}
              onChange={query.setValue}
              placeholder="Search sources…"
            />

            <ToolbarSep />

            <Select
              value={kind.value}
              options={kindOptions()}
              onChange={kind.setValue}
              ariaLabel="Filter by kind"
            />

            <Select
              value={status.value}
              options={statusOptions(statusCounts)}
              onChange={status.setValue}
              ariaLabel="Filter by status"
            />
          </>
        )}
      >
        <SourcesBody
          failed={sourcesRead.isError}
          sources={sources}
          visible={visible}
          columns={columns}
        />
      </ListPage>
    </div>
  );
};

/** What the stat band is given. */
interface StatBandProps {
  /** Whether the counts read rejected — an unknown domain, today. */
  readonly failed: boolean;
  /** A count per status, or undefined until the read settles. */
  readonly counts: SourceStatusCounts | undefined;
}

/**
 * The three figures above the list.
 *
 * Drops out entirely when the read rejected: the body below already
 * says the domain could not be read, and three tiles reading zero
 * would be a confident answer to a question nobody could answer.
 *
 * @param props - Which state the counts read is in.
 * @returns The band, its loading stand-in, or nothing.
 */
const StatBand = ({ failed, counts }: StatBandProps) => {
  if (failed) {
    return null;
  }

  if (counts === undefined) {
    return (
      <Grid cols="1" className={STAT_BAND_COLUMNS}>
        {SOURCE_STAT_CARDS.map((card) => (
          // `Skeleton` is aria-hidden, which is right for a frame that
          // is gone within a microtask against fixtures: announcing a
          // loading state that never gets read is noise. The height is
          // the tile's own minimum, so nothing moves when it settles.
          <Skeleton
            key={card.status}
            className="h-[130px] w-full rounded-lg"
          />
        ))}
      </Grid>
    );
  }

  return (
    <Grid cols="1" className={STAT_BAND_COLUMNS}>
      {SOURCE_STAT_CARDS.map((card) => (
        <SmallStatCard
          key={card.status}
          title={card.title}
          value={counts[card.status]}
          // These are counts of rows, not quantities: `12` must never
          // become `12K`, and a locale keeps the separator off the
          // machine looking at it.
          short={false}
          locale={DISPLAY_LOCALE}
          // The same dot the matching table rows carry, so the tile
          // and the rows it counts read as one thing. Unlabelled: the
          // title beside it already names the status.
          decoration={(
            <StatusIndicator
              tone={statusFacet(card.status).tone}
              size="lg"
            />
          )}
          footer={card.caption}
        />
      ))}
    </Grid>
  );
};

/** What one row's health cell is given. */
interface HealthCellProps {
  /** The feed this row is about. */
  readonly source: Source;
}

/**
 * A feed's health: the current failure streak, the flag, and when it
 * last came back bad.
 *
 * The two lines are one reading and neither works alone. The counter
 * resets on a success, so `No failures` over `Never failed` is a feed
 * that has always worked and `No failures` over a real date is one
 * that recovered. The flag is the third state: it survives a success,
 * only an operator clears it, and without it a flagged-but-recovered
 * row would show a clean counter beside a failing status with nothing
 * explaining the gap.
 *
 * @param props - The source.
 * @returns The cell.
 */
const HealthCell = ({ source }: HealthCellProps) => (
  <div className="flex flex-col items-start gap-1">
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          'font-mono text-[12.5px]',
          source.consecutiveFailures > 0 && 'text-danger',
        )}
      >
        {failureStreakLabel(source.consecutiveFailures)}
      </span>

      {source.flagged && (
        // The body face rather than mono: this is a word this surface
        // chose, where the kind tag carries a stored token.
        <Tag tone="warning" mono={false}>Flagged</Tag>
      )}
    </div>

    <span className="text-[11.5px] text-fg3">
      {source.lastFailureAt === null
        ? NEVER_FAILED
        : (
          <>
            Failed
            {' '}
            <FormattedRelativeTime
              date={source.lastFailureAt}
              now={FIXTURE_NOW}
              locale={DISPLAY_LOCALE}
            />
          </>
        )}
    </span>
  </div>
);

/** What the sources surface shows in place of its table. */
interface SourcesBodyProps {
  /** Whether the sources read rejected — an unknown domain, today. */
  readonly failed: boolean;
  /** The domain's feeds, or undefined until the read settles. */
  readonly sources: readonly Source[] | undefined;
  /** The rows the filters left. */
  readonly visible: readonly Source[];
  /** The table's columns, built by the page. */
  readonly columns: Column<Source>[];
}

/**
 * The page's body: the table, or the reason there is not one.
 *
 * Split out of the page rather than written as four nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and as very little
 * else.
 *
 * @param props - Which state the read is in, and what to render with.
 * @returns The table, an empty state, or the loading stand-in.
 */
const SourcesBody = ({
  failed,
  sources,
  visible,
  columns,
}: SourcesBodyProps) => {
  if (failed) {
    return (
      <EmptyState
        title="This domain could not be read"
        description="Nothing in this deployment answers to that domain. Pick one from the switcher above."
      />
    );
  }

  if (sources === undefined) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  if (sources.length === 0) {
    return (
      <EmptyState
        title="No sources yet"
        description="A source is a feed the pipeline is allowed to read — the first one gives this domain something to find."
      />
    );
  }

  if (visible.length === 0) {
    // A different sentence from the one above on purpose: an operator
    // who has narrowed the list to nothing needs to know the rows are
    // still there, not that the domain has no feeds.
    return (
      <EmptyState
        title="Nothing matches these filters"
        description="Every source is filtered out. Clear the search box or widen a filter to bring them back."
      />
    );
  }

  return (
    <Table
      columns={columns}
      data={visible}
      getRowId={(source) => String(source.id)}
      density="comfortable"
    />
  );
};
