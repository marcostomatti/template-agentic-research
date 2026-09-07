/**
 * The acyclicity rule held against every statement this package can
 * run, over the two surfaces that carry one: the workflows it
 * builds and the modules under `src/`.
 *
 * `research-acyclicity.ts` next door says what the rule is and why
 * it is INSERT-shaped, `workflow-dist.ts` says what a built
 * workflow is and refuses a tree there is nothing to read in, and
 * `queryParametersOf` is the reading that turns a node into a
 * statement. This is where all three meet `workflows/dist/`, which
 * `pretest` rebuilds for the `test` script so a default run reads a
 * tree a real bun process wrote, and the source tree beside it.
 *
 * THE VERDICT IS A ZERO, which decides the shape of everything
 * here. `derivationEdges` answers an empty list over this tree, and
 * an empty list is what a reading pointed at the wrong directory
 * answers, what a needle that stopped matching answers, and what a
 * roster emptied of its tables answers. So the zero is surrounded
 * rather than asserted: the surfaces are refused when they hold
 * nothing, both halves of the rule are shown finding something real
 * before the verdict is read, and both sides of the allowance are
 * driven on plants in the same call as the real statements.
 *
 * WHAT THE TWO HALVES FIND, measured at the time of writing and
 * every figure off a run. The write half has six live subjects and
 * all six are workflow nodes: `ar-capture` `Store Raw Capture` and
 * `Write Capture Finding`, `ar-ingest` `Write Documents`,
 * `Write Findings` and `Raise Research Intentions`, and `ar-score`
 * `Raise Research Intentions`. No module under `src/` carries an
 * `INSERT INTO` naming a rostered table in any casing, in code or
 * in prose, so over that surface the write half has no live subject
 * at all. The read half is the other way round: no built statement
 * reads `entity_research` and 14 of the 218 modules do, which is
 * ordinary — the entities and findings stores project its columns
 * and the schema argues about it in prose.
 *
 * SO NEITHER SURFACE PROVES BOTH HALVES, and that is why both are
 * read rather than whichever one carries the rule today. A run over
 * the built tree alone would be a rule whose read detector matched
 * nothing; a run over `src/` alone would be a rule whose write
 * detector matched nothing. Together every needle in the reading
 * has an occurrence in this tree that is not a plant.
 *
 * THE SEVENTH SITE, and it is worth naming because the count moves
 * with the shape of the reading rather than with the tree. Under a
 * WRITE-shaped reading there are seven statements that write one of
 * these tables: `ar-research` `Record Research` reaches
 * `research_pool` by UPDATE and INSERTs `entity_research`. Under
 * the INSERT-shaped reading this rule is built on there are six,
 * that statement writing no rostered table with an INSERT. Both
 * counts are correct about their own question and a case below
 * pins the seventh site's shape, so a reader meeting either figure
 * elsewhere can see which reading produced it.
 *
 * THE ALLOWANCE HAS NO LIVE SUBJECT and both sides of it rest on
 * plants, which the header next door states and this file measures:
 * across all 258 statements, not one read of `entity_research` sits
 * inside a `NOT EXISTS`. The built tree carries five anti-joins and
 * none of them is over that table — four guard a raise against
 * `research_pool` and the fifth reads a CTE — so the span walk runs
 * and reports nothing every time. A planted pair is the only thing
 * that can say the classifier tells the two apart, and it is driven
 * in the same call as the real statements rather than beside them —
 * one answer carrying the tree's zero and the plant's edge is the
 * one shape where the zero cannot be a reading that never ran.
 *
 * THE TWO HALVES WERE DRIVEN AGAINST THE SHIPPED STATEMENT and not
 * only against the plants, and the two red sets are DISJOINT, which
 * is what says the allowance is a branch this rule takes rather
 * than a read it never sees. Both legs edited one site, the
 * `Raise Research Intentions` node of `ar-ingest` under
 * `workflows/src/`, which `pretest` rebuilt into the tree read
 * here.
 *
 * A `JOIN entity_research er` added to that write — reading the
 * answers already recorded and inserting from them — reddens the
 * two cases under the verdict, `writes nothing upstream out of a
 * research read` and `reports a planted read that feeds an
 * upstream write`, each naming
 * `ar-ingest.json:Raise Research Intentions`, and leaves both
 * anti-join cases alone.
 *
 * The same table read inside a second `NOT EXISTS` beside the guard
 * already there leaves the VERDICT green, no edge being reported,
 * and moves exactly one case: `finds no anti-joined read in either
 * surface`. That is the measurement working rather than the rule
 * failing — the plant is the live subject that case records the
 * absence of — so WHICH case moved is the reading there, and a
 * red suite is not. Measured over the fifteen cases here, each
 * leg against a green run of this package.
 *
 * WHAT THIS FILE DOES NOT COVER, each named so a later widening is
 * a decision rather than a discovery. The reading over `src/` is a
 * reading of SQL TEXT, so a row written through the drizzle builder
 * is invisible to it; the gap is argued where the detector lives.
 * Its failure direction over that surface is the other one — a
 * module whose prose spells an upstream INSERT reads as a statement
 * that runs one — and no case here would tell that apart from a
 * real write. And the classifier's string tracking is a SQL reading
 * applied to TypeScript, where an apostrophe in prose opens a
 * literal that never closes: measured, two of the 14 modules the
 * word reading finds classify to no read at all for that reason.
 * That is blindness rather than a false finding, it costs nothing
 * while no module under `src/` writes upstream, and the case below
 * pins the DIRECTION it can fail in rather than the two modules,
 * which move.
 */
import type { ResearchStatement } from './research-acyclicity.js';

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  EmptyStatementSurfaceError,
  RESEARCH_TABLE,
  UPSTREAM_TABLES,
  classifyResearchReads,
  derivationEdges,
  insertedUpstreamTables,
  readsResearchTable,
} from './research-acyclicity.js';
import { loadBuiltWorkflows } from './workflow-dist.js';
import { queryParametersOf } from './workflow-rosters.js';

// ---------------------------------------------------------------------------
// The two surfaces
// ---------------------------------------------------------------------------

/** Root of `@ar/service`, two levels above `tests/invariants/`. */
const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** The tree the SQL-in-TypeScript half of the rule is read over. */
const SRC_ROOT = 'src';

/** What a module under {@link SRC_ROOT} is called. */
const MODULE_SUFFIX = '.ts';

/**
 * Every built workflow, read once for the whole file.
 *
 * At module scope for the reason `dispatch-sql.test.ts` reads its
 * own there: a read that comes back with nothing to assert over
 * throws, and that failure belongs to the file rather than to one
 * case. No directory is named, so this is the tree this package
 * builds, and the refusals over trees a caller controls are driven
 * in `workflow-dist.test.ts`.
 */
const BUILT_WORKFLOWS = loadBuiltWorkflows();

/**
 * Every statement a built node runs, named `<artifact>:<node>`.
 *
 * The name is what a failure prints and the only thing that says
 * which file to open, so it carries the artifact as well as the
 * node: a node name is unique on one canvas and several of these
 * workflows spell `Raise Research Intentions`.
 */
const WORKFLOW_STATEMENTS: readonly ResearchStatement[] = BUILT_WORKFLOWS
  .flatMap((workflow) => workflow.nodes.flatMap(
    (node) => queryParametersOf(node).map((query) => ({
      origin: `${workflow.file}:${node.name}`,
      statement: query,
    })),
  ));

/**
 * Every file beneath one directory, whatever its extension.
 *
 * Recursive, sorted at each level so the list is the same on every
 * machine, and building its paths with a literal `/` so what comes
 * back is package-relative and slash-separated whatever the
 * platform. A symlink is skipped rather than followed: following
 * one either re-walks a tree already covered or leaves the package,
 * and neither is a file a write can be fixed in.
 *
 * Unfiltered, which is what lets the suffix be a subtraction a case
 * can read rather than a prune only this function knows about.
 */
function walkFiles(relativeDir: string): readonly string[] {
  const entries = readdirSync(join(PACKAGE_ROOT, relativeDir), {
    withFileTypes: true,
  });

  return [...entries]
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const relativePath = `${relativeDir}/${entry.name}`;

      if (entry.isDirectory()) {
        return walkFiles(relativePath);
      }

      return entry.isFile()
        ? [relativePath]
        : [];
    });
}

/** The unfiltered source tree, against which modules are a subset. */
const SRC_FILES = walkFiles(SRC_ROOT);

/**
 * Every module the rule is read over, relative to the package root.
 *
 * Test modules included, deliberately. The rule needs BOTH halves
 * of an edge, so a fixture that spells an upstream INSERT is not a
 * finding on its own, and a surface that stopped at production
 * modules would be a prune nobody declared with a fixture able to
 * carry a real write behind it.
 */
const SRC_MODULES = SRC_FILES.filter(
  (file) => file.endsWith(MODULE_SUFFIX),
);

/** Every source module as a statement, named by its own path. */
const SRC_STATEMENTS: readonly ResearchStatement[] = SRC_MODULES.map(
  (module) => ({
    origin: module,
    statement: readFileSync(join(PACKAGE_ROOT, module), 'utf8'),
  }),
);

/**
 * Both surfaces as one list, which is what the verdict is read
 * over.
 *
 * One call rather than two, so the answer a case asserts is empty
 * is the same answer the plants are added to. Two calls would let
 * the plant prove one reading live while the other one answered
 * about nothing.
 */
const ALL_STATEMENTS: readonly ResearchStatement[] = [
  ...WORKFLOW_STATEMENTS,
  ...SRC_STATEMENTS,
];

// ---------------------------------------------------------------------------
// The plants
// ---------------------------------------------------------------------------

/**
 * A statement that raises intentions out of the answers already
 * recorded, which is exactly the edge the rule exists to refuse.
 *
 * Modelled on `ar-ingest`'s raise so the shape is the one a writer
 * would actually reach for — a CTE naming `entity_research` and an
 * INSERT beneath it reading that CTE — rather than a minimal
 * string that only exercises two needles. The read sits on line 3,
 * which a case asserts: a record naming the wrong line is a
 * classifier whose offsets have come apart from its text, and no
 * assertion over the edge's existence would report it.
 */
const PLANTED_DERIVATION = [
  'WITH answered AS (',
  '  SELECT er.entity_id, er.domain_id',
  '  FROM entity_research er',
  '  WHERE er.status = \'done\'',
  ')',
  'INSERT INTO research_pool (domain_id, entity_id, search_terms)',
  'SELECT a.domain_id, a.entity_id, \'[]\'::jsonb',
  'FROM answered a',
].join('\n');

/** 1-based line {@link PLANTED_DERIVATION} reads the table on. */
const PLANTED_DERIVATION_LINE = 3;

/**
 * A statement whose only read of the table is the freshness guard
 * the schema points a writer at, which the allowance covers.
 *
 * The same write as the plant above and the same table read, so the
 * pair differs in one thing: where the read sits. That is what
 * makes it a control rather than a second sample — a classifier
 * that had stopped walking spans, or a rule that had quietly
 * dropped the allowance, reports this one too, and nothing about
 * the two statements except the anti-join could explain it.
 *
 * The subquery closes on a nested parenthesis, which is the shape
 * the span walk exists for: a search for the next `)` would end the
 * span inside the predicate and read the table as unguarded.
 */
const PLANTED_ANTI_JOIN = [
  'INSERT INTO research_pool (domain_id, entity_id, search_terms)',
  'SELECT e.domain_id, e.id, \'[]\'::jsonb',
  'FROM entities e',
  'WHERE NOT EXISTS (',
  '  SELECT 1',
  '  FROM entity_research er',
  '  WHERE er.entity_id = e.id',
  '    AND (er.status = \'done\' OR er.status = \'running\'))',
].join('\n');

/** Where the plants say they came from, in a failure message. */
const PLANTED_DERIVATION_ORIGIN = 'planted:derivation';

/** The origin of the plant no answer is allowed to carry. */
const PLANTED_ANTI_JOIN_ORIGIN = 'planted:anti-join';

/** Both plants, in the order a case adds them to the real list. */
const PLANTED_STATEMENTS: readonly ResearchStatement[] = [
  { origin: PLANTED_DERIVATION_ORIGIN, statement: PLANTED_DERIVATION },
  { origin: PLANTED_ANTI_JOIN_ORIGIN, statement: PLANTED_ANTI_JOIN },
];

// ---------------------------------------------------------------------------
// The surfaces are populated and are the ones the rule names
// ---------------------------------------------------------------------------

describe('research acyclicity — surfaces', () => {
  // A count of statements says a read happened; this says every
  // artifact contributed one. A build that wrote an artifact
  // carrying no Postgres node would leave the total plausible and
  // that workflow unread.
  it('reads a statement off every built workflow', () => {
    const silent = BUILT_WORKFLOWS.filter((workflow) => !WORKFLOW_STATEMENTS
      .some((subject) => subject.origin.startsWith(`${workflow.file}:`)));

    expect(BUILT_WORKFLOWS.length).toBeGreaterThan(0);
    expect(silent.map((workflow) => workflow.file)).toEqual([]);
  });

  // Set difference rather than arithmetic over two counts: the
  // counts agree at the wrong membership, and what a failure has to
  // say is which module left the surface. The subtraction is real
  // here rather than an identity — the source tree carries two
  // `.json` payload fixtures the suffix drops — so a filter that
  // let everything through fails this.
  it('reads every module the source tree holds', () => {
    const skipped = SRC_FILES.filter(
      (file) => !SRC_MODULES.includes(file),
    );

    expect(SRC_MODULES.length).toBeGreaterThan(0);
    expect(skipped.every((file) => !file.endsWith(MODULE_SUFFIX)))
      .toBe(true);
  });

  // A populated surface is not the same as the right one, and this
  // is the cheap difference: the modules that actually read the
  // table, by name. A walk pointed at any populated directory
  // satisfies the equalities above and fails this.
  it('covers the stores that read the research table', () => {
    const named = [
      'src/entities/db-store.ts',
      'src/entities/store.ts',
      'src/findings/db-store.ts',
    ];

    expect(named.filter((module) => !SRC_MODULES.includes(module)))
      .toEqual([]);
  });

  // The refusal that stands where a zero would otherwise be
  // unearned, driven on both shapes it covers. Nothing handed over
  // and nothing carrying a SQL word are one fact, and `handed` is
  // what parts them without a reader going to look.
  it('refuses a reading handed nothing to read', () => {
    expect(() => derivationEdges([])).toThrow(EmptyStatementSurfaceError);
    expect(() => derivationEdges([
      { origin: 'planted:comment-only', statement: '-- no SQL here\n' },
    ])).toThrow(EmptyStatementSurfaceError);
  });
});

// ---------------------------------------------------------------------------
// The write half, found before the verdict is read
// ---------------------------------------------------------------------------

/**
 * Every statement in this tree that INSERTs into a rostered table,
 * as measured, in artifact then node order.
 *
 * Written out rather than derived, which is the whole point of it:
 * a roster read off the same detector the verdict uses agrees with
 * whatever that detector happens to answer, including a detector
 * that answers nothing. These six are what a run found, and the
 * case below is what says the reading still finds them.
 *
 * Six and not seven. The seventh write site under a WRITE-shaped
 * reading is `ar-research` `Record Research`, which reaches
 * `research_pool` by UPDATE, and the case beneath this one pins
 * that shape so the difference between the two counts is in the
 * file rather than in a reader's head.
 */
const UPSTREAM_INSERT_SITES: readonly {
  readonly origin: string;
  readonly tables: readonly string[];
}[] = [
  { origin: 'ar-capture.json:Store Raw Capture', tables: ['documents'] },
  { origin: 'ar-capture.json:Write Capture Finding', tables: ['findings'] },
  { origin: 'ar-ingest.json:Write Documents', tables: ['documents'] },
  { origin: 'ar-ingest.json:Write Findings', tables: ['findings'] },
  {
    origin: 'ar-ingest.json:Raise Research Intentions',
    tables: ['research_pool'],
  },
  {
    origin: 'ar-score.json:Raise Research Intentions',
    tables: ['research_pool'],
  },
];

/** What the write detector finds over both surfaces, right now. */
const FOUND_INSERT_SITES = ALL_STATEMENTS
  .map((subject) => ({
    origin: subject.origin,
    tables: insertedUpstreamTables(subject.statement),
  }))
  .filter((site) => site.tables.length > 0);

describe('research acyclicity — the write half is live', () => {
  // The must-find control, and it is read before any verdict below.
  // The rule's passing answer is an empty list, so a write detector
  // that had stopped matching — a roster emptied, a table renamed,
  // the reduction changed under it — would green every case in this
  // file while looking at nothing.
  it('finds every measured upstream INSERT site', () => {
    expect([...FOUND_INSERT_SITES].sort(
      (left, right) => left.origin.localeCompare(right.origin),
    )).toEqual([...UPSTREAM_INSERT_SITES].sort(
      (left, right) => left.origin.localeCompare(right.origin),
    ));
  });

  // An entry with no live subject is a needle nobody could ever
  // fail on, which a roster-wide count cannot report: three tables
  // and six sites reconcile just as well with one table unwritten.
  it('finds a site for every table on the roster', () => {
    const written = new Set(FOUND_INSERT_SITES.flatMap(
      (site) => site.tables,
    ));

    expect(UPSTREAM_TABLES.filter((entry) => !written.has(entry.table)))
      .toEqual([]);
  });

  // The seventh site, and the one reading that says why it is not
  // on the roster above. It writes the pool by UPDATE, so the
  // INSERT-shaped detector answers nothing for it, and it names the
  // research table only as the target of its own INSERT, which is
  // not a read.
  it('leaves the recorded pass off an INSERT-shaped roster', () => {
    const record = WORKFLOW_STATEMENTS.find(
      (subject) => subject.origin === 'ar-research.json:Record Research',
    );

    expect(record).toBeDefined();
    expect(insertedUpstreamTables(record?.statement ?? '')).toEqual([]);
    expect(readsResearchTable(record?.statement ?? '')).toBe(false);
    expect(record?.statement).toContain(RESEARCH_TABLE);
  });

  // The write half over `src/` is the empty half, and saying so is
  // part of the reading rather than a gap left unmentioned: the
  // whole surface answers nothing, so no zero this file reports
  // about that tree is backed by a detector shown live on it.
  it('finds no upstream INSERT under the source tree', () => {
    const writing = SRC_STATEMENTS.filter(
      (subject) => insertedUpstreamTables(subject.statement).length > 0,
    );

    expect(writing.map((subject) => subject.origin)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The read half, found before the verdict is read
// ---------------------------------------------------------------------------

describe('research acyclicity — the read half is live', () => {
  // The other must-find control, and it has to be taken over
  // `src/`: no built statement reads the table at all, so the
  // built tree alone would leave the read needle unexercised and
  // the verdict resting on a detector that matched nothing.
  it('finds modules that read the research table', () => {
    const reading = SRC_STATEMENTS.filter(
      (subject) => readsResearchTable(subject.statement),
    );

    expect(reading.length).toBeGreaterThan(0);
    expect(reading.map((subject) => subject.origin))
      .toContain('src/entities/store.ts');
  });

  // The direction the two readings are documented to stand in, and
  // the one a run can hold: the word reading is the wider, so it is
  // safe as the gate the structural walk sits behind. Pinned as a
  // direction and not as two counts — the classifier legitimately
  // finds fewer, an apostrophe in TypeScript prose opening a
  // literal that never closes, and which modules that hits moves
  // with the prose.
  it('classifies a read only where the words find one', () => {
    const unseen = ALL_STATEMENTS.filter(
      (subject) => classifyResearchReads(subject.statement).length > 0
        && !readsResearchTable(subject.statement),
    );

    expect(unseen.map((subject) => subject.origin)).toEqual([]);
  });

  // The allowance has no live subject, which is a measurement worth
  // keeping rather than a fact to rediscover: the day this case
  // fails, a real statement has started reading the table behind a
  // guard and the plants below have stopped being the only thing
  // holding that half of the rule up.
  it('finds no anti-joined read in either surface', () => {
    const guarded = ALL_STATEMENTS.filter(
      (subject) => classifyResearchReads(subject.statement)
        .some((read) => read.antiJoined),
    );

    expect(guarded.map((subject) => subject.origin)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The verdict, and the plants that make it a reading
// ---------------------------------------------------------------------------

describe('research acyclicity — the verdict', () => {
  // The invariant itself. The site roster is re-read inside the
  // case rather than left to the block above, so the zero and the
  // evidence that the reading can find something are one assertion
  // pair a reader cannot take apart.
  it('writes nothing upstream out of a research read', () => {
    expect(FOUND_INSERT_SITES.length).toBe(UPSTREAM_INSERT_SITES.length);
    expect(derivationEdges(ALL_STATEMENTS)).toEqual([]);
  });

  // The plant, added to the real statements rather than driven on
  // its own: one answer carrying the tree's zero and the plant's
  // edge is the shape where the zero cannot be a reading that never
  // ran. The line number is asserted too, a record naming the wrong
  // line being a classifier whose offsets have come apart from its
  // text.
  it('reports a planted read that feeds an upstream write', () => {
    const edges = derivationEdges([
      ...ALL_STATEMENTS,
      ...PLANTED_STATEMENTS,
    ]);

    expect(edges).toEqual([{
      origin: PLANTED_DERIVATION_ORIGIN,
      tables: ['research_pool'],
      reads: [{
        lineNumber: PLANTED_DERIVATION_LINE,
        antiJoined: false,
      }],
    }]);
  });

  // The other side of the allowance, read off the same answer. The
  // two plants write the same table and read the same one, so an
  // answer naming the guarded plant could only mean the span walk
  // stopped covering it.
  it('leaves a planted anti-join out of the answer', () => {
    const edges = derivationEdges([
      ...ALL_STATEMENTS,
      ...PLANTED_STATEMENTS,
    ]);

    expect(edges.map((edge) => edge.origin))
      .not.toContain(PLANTED_ANTI_JOIN_ORIGIN);
  });

  // What the guarded plant IS, so its absence above is an allowance
  // rather than a statement the readings never reached. Both halves
  // of an edge are present in it and the only thing keeping it out
  // of the answer is where its read sits.
  it('sees both halves of the edge in the anti-join plant', () => {
    expect(insertedUpstreamTables(PLANTED_ANTI_JOIN))
      .toEqual(['research_pool']);
    expect(readsResearchTable(PLANTED_ANTI_JOIN)).toBe(true);
    expect(classifyResearchReads(PLANTED_ANTI_JOIN))
      .toEqual([{ lineNumber: 6, antiJoined: true }]);
  });
});
