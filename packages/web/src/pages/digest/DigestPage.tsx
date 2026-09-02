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
 * Four controls, four search parameters, no state of their own —
 * `../../routes/useSearchParamState` is the whole of it. A filtered
 * digest is therefore a link, a reload keeps it, and the back button
 * undoes the last change. The page does hold one piece of component
 * state, but it belongs to the row menu rather than to a filter: see
 * below.
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
 * ## What a row action does
 *
 * The trailing column is a `RowContextAction`, and its menu is the
 * whole of what this surface writes. Three things sit on it and they
 * are of two kinds: opening a row is a navigation to this surface's
 * modal sub-route and needs nothing but the router, while ruling on a
 * finding and queueing one for research are mutations. `./actions`
 * holds both transitions as pure functions and `../../data/hooks`
 * holds the write and its invalidation, so what is left here is which
 * item is offered and what is said about the answer.
 *
 * The ruling a row already carries is not offered. `verdictChoices`
 * guarantees a stored verdict a place because a `Select` resolves a
 * value none of its options carry to the first one; a menu holds no
 * value, so that guarantee has nothing to protect here and an item
 * writing back what is already there would be a save with nothing to
 * save.
 *
 * Queueing is the one action whose result reaches no cell — `./rows`
 * reads none of the payload it writes, deliberately — so its outcome
 * is said in a `Banner` above the table, and that notice is the
 * component state the filter section above disclaims. BOTH outcomes
 * are said, not just the refusal: a queued finding that looked exactly
 * like an unqueued one is what makes an operator ask for it twice,
 * which is the very thing `sendToResearch`'s guard is there to refuse.
 *
 * A save cannot fail from here, so nothing renders one. Every write in
 * `../../data/api` rejects on one thing, a domain slug nothing answers
 * to, and a slug like that has already failed the findings read — the
 * body below is then the could-not-be-read state and there is no table
 * to open a menu on.
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
import type { Finding } from '../../data/types';
import type { Column, RowContextActionItem, SelectOption } from '@ar/ui';

import {
  Banner,
  EmptyState,
  Select,
  SearchInput,
  Skeleton,
  Table,
  Tag,
  ToolbarSep,
  renderCellContent,
} from '@ar/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ListPage } from '../../components/ListPage';
import {
  useCategorySummaries,
  useDocuments,
  useEntities,
  useFindings,
  useSaveFinding,
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
  NO_VERDICT_VALUE,
  readVerdictChoice,
  sendToResearch,
  verdictChoices,
  verdictSelectValue,
  withVerdict,
} from './actions';
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

/** What the notice says once an intention has been recorded. */
const QUEUED_TITLE = 'Queued for research';
const QUEUED_BODY = 'A later pass drains the queue a few rows at a '
  + 'time. Nothing on this screen moves in the meantime: the digest '
  + 'lists what the pipeline has read, not what it has been asked to '
  + 'look into.';

/** What it says when the guard refused a second intention. */
const NOT_QUEUED_TITLE = 'Not queued again';

/**
 * The accessible name the row-action notice is addressed by.
 *
 * A live region here needs a name of its own, and the reason is
 * measured rather than defensive: the source cell's `StatusIndicator`
 * carries `role="status"` on every row, so a digest of six findings
 * already has six of them and a bare `getByRole('status')` resolves to
 * a fistful of decorative dots. Naming this one is what keeps the
 * notice addressable — to a spec and to anything reading the page
 * region by region — without touching a library component six
 * surfaces share.
 */
const NOTICE_LABEL = 'Row action result';

/** Read the column each filter select narrows. */
const readVerdict = (row: DigestRow) => row.verdict;
const readCategory = (row: DigestRow) => row.categoryKey;

/**
 * One offered ruling, as a row-menu item.
 *
 * Taking a ruling back is not the same gesture as making one — the
 * column permits both and this is the only control in the shell that
 * offers the first — so the unruled option gets its own words and its
 * own glyph rather than reading as a verdict named `unrated`.
 *
 * The title carries the value rather than `./actions`'s label, and the
 * two agree: every label there IS the domain's own word, and the one
 * that is not belongs to the branch above.
 *
 * @param value - An option value from {@link verdictChoices}.
 * @param onClick - What choosing it does.
 * @returns The item, ready for the menu's data contract.
 */
const rulingAction = (
  value: string,
  onClick: () => void,
): RowContextActionItem => (value === NO_VERDICT_VALUE
  ? { icon: 'undo-2', title: 'Clear verdict', onClick }
  : { icon: 'gavel', title: `Set verdict: ${value}`, onClick });

/** What the row menu leaves on screen after a send. */
interface ActionNotice {
  /** `success` where the intention was recorded, `info` where not. */
  readonly tone: 'success' | 'info';
  /** The outcome, in three words. */
  readonly title: string;
  /** Which finding it is about — the title that row shows. */
  readonly name: string;
  /** What happened, in the words of whatever decided it. */
  readonly body: string;
}

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
  const saveFinding = useSaveFinding(domainSlug);

  const query = useSearchParamState(QUERY_PARAM, '');
  const verdict = useSearchParamState(VERDICT_PARAM, ALL_FILTER_VALUE);
  const category = useSearchParamState(CATEGORY_PARAM, ALL_FILTER_VALUE);
  const window = useSearchParamState(WINDOW_PARAM, ALL_FILTER_VALUE);

  // The page's one piece of component state, and the header says why
  // the menu needs it: queueing a finding changes nothing a cell reads,
  // so an operator with no notice cannot tell it from a dead item.
  const [notice, setNotice] = useState<ActionNotice | null>(null);

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
  const vocabulary = verdictsRead.data ?? [];

  const verdictOptions = withAllOption(
    'All verdicts',
    vocabulary.map((name) => ({ value: name, label: name })),
  );

  const categoryOptions: SelectOption[] = withAllOption(
    'All categories',
    (categoriesRead.data ?? []).map((summary) => ({
      value: summary.category.key,
      label: summary.category.name,
    })),
  );

  // The actions write FINDINGS and the menu hangs off joined rows, so
  // the two have to be reconnected: `./rows` flattens a finding into
  // cells and drops the payload `./actions` transitions. Indexed once
  // per render rather than searched per click, since every visible row
  // builds a menu of its own.
  const findingsById = new Map(
    (findings ?? []).map((finding): [number, Finding] => [
      finding.id,
      finding,
    ]),
  );

  /**
   * Record a ruling on one row.
   *
   * Silent for a row whose finding is not in this render's index. The
   * two can only disagree while a read is in flight — the menu is
   * built from rows that were joined out of the very list indexed here
   * — and doing nothing is what a row nobody can name means.
   *
   * @param row - The row the menu was opened on.
   * @param choice - The option value chosen, as `./actions` spells it.
   */
  const ruleOn = (row: DigestRow, choice: string) => {
    const finding = findingsById.get(row.id);

    if (finding === undefined) {
      return;
    }

    // A ruling supersedes whatever the last send said: the notice
    // names one finding, and leaving it up while another row moves
    // invites reading it as this action's answer.
    setNotice(null);
    saveFinding.mutate(withVerdict(finding, readVerdictChoice(choice)));
  };

  /**
   * Ask for one row's finding to be researched.
   *
   * Both outcomes are reported — see the header on why the refusal
   * alone would be the wrong half.
   *
   * @param row - The row the menu was opened on.
   */
  const queueForResearch = (row: DigestRow) => {
    const finding = findingsById.get(row.id);

    if (finding === undefined) {
      return;
    }

    const name = row.summary ?? NO_SUMMARY;
    // The shell's pinned instant, which is the same `now` every
    // relative time on this page is rendered against: a wall-clock
    // read here would date the intention off the ladder the rest of
    // the surface is measured on.
    const outcome = sendToResearch(finding, FIXTURE_NOW);

    if (!outcome.sent) {
      setNotice({
        tone: 'info',
        title: NOT_QUEUED_TITLE,
        name,
        body: outcome.reason,
      });

      return;
    }

    setNotice({
      tone: 'success',
      title: QUEUED_TITLE,
      name,
      body: QUEUED_BODY,
    });
    saveFinding.mutate(outcome.finding);
  };

  /**
   * The menu one row offers.
   *
   * Built per row rather than once per page: every item closes over
   * the finding it acts on, and which rulings are on offer depends on
   * the one that row already carries.
   *
   * @param row - The row the menu hangs off.
   * @returns Its items, rulings first.
   */
  const rowActions = (row: DigestRow): RowContextActionItem[] => {
    const held = verdictSelectValue(row.verdict);

    const rulings = verdictChoices(vocabulary, row.verdict)
      .filter((choice) => choice.value !== held)
      .map((choice) => rulingAction(choice.value, () => {
        ruleOn(row, choice.value);
      }));

    return [
      ...rulings,
      {
        icon: 'eye',
        title: 'Open',
        onClick: () => {
          // Relative, so one expression serves both route bases.
          void navigate(String(row.id));
        },
      },
      {
        icon: 'flask-conical',
        title: 'Send to research',
        onClick: () => {
          queueForResearch(row);
        },
      },
    ];
  };

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
        // The three the surface offers, of two kinds: the rulings and
        // the queue request write through `../../data/hooks`, opening
        // a row is a navigation this page performs itself. Which
        // ruling is left off, and where a queue request is answered,
        // are both in the header.
        actions: rowActions(row),
        entityType: 'finding',
        // The trigger's accessible name is `Actions for <this>`, and a
        // row's own name is the run-together text of its cells, so
        // naming the menu after the finding is what makes the whole
        // row addressable by title: `getByRole('row', { name })`.
        // The leading cell is then asserted separately, because that
        // row name also carries the verdict, the score and the source
        // and says nothing about which cell the title landed in.
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
      <>
        {notice != null && (
          <Banner
            // Polite rather than assertive: the operator asked for
            // this, so it is a report and not an interruption. Named,
            // for the reason {@link NOTICE_LABEL} sets out.
            role="status"
            aria-label={NOTICE_LABEL}
            tone={notice.tone}
            title={notice.title}
            onClose={() => {
              setNotice(null);
            }}
          >
            <span className="font-semibold text-fg1">{notice.name}</span>
            {' — '}
            {notice.body}
          </Banner>
        )}

        <DigestBody
          failed={findingsRead.isError}
          joined={joined}
          rows={rows}
          visible={visible}
          columns={columns}
        />
      </>
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
