/**
 * Cases for the contract in `./index.ts`, which has no runtime half at
 * all: every export there is a type, so what this file pins is a shape
 * rather than a behaviour.
 *
 * TWO GATES OWN TWO HALVES OF IT, and only one of them is vitest's. A
 * package `test` run transpiles each file and type-checks nothing, so
 * every `satisfies` and every `const X: SomePin = true` below is read
 * by `bun run check-types` and by nothing else — green here is no
 * evidence about them. The cases are what vitest owns: the key
 * rosters, the fixture's own discriminating values, and the one
 * behaviour a conforming renderer has.
 *
 * THE DOUBLES ARE THE PIN. Each fixture below is an object literal
 * declared with `satisfies`, which closes the drift in both
 * directions at once: a member added to one of the interfaces leaves
 * the literal no longer satisfying it, and a member the interface
 * does not declare is an excess property. That is the direction a
 * key roster alone cannot reach — a list is as green as no list when
 * the type it describes grows — so {@link EVERY_KEY_LISTED} closes
 * the other one and the two are read together.
 *
 * THE ROW SHAPES ARE HELD AGAINST THE TABLES rather than against a
 * reading of them. `./index.ts` declares four interfaces mirroring
 * `domains`, `briefings`, `findings` and `export_subscriptions`, and
 * a hand-written mirror is a second authority that drifts silently:
 * `scripts/seed-schemas.ts` already carries one nothing compares.
 * {@link STORED_ROWS_FIT} compares this one, by asking whether each
 * table's own `$inferSelect` is assignable to the interface named
 * for it — which reddens on a column renamed, a column whose type
 * moved, and a member the table never had. It says nothing about a
 * column ADDED, and it should not: three of the four are deliberate
 * slices, argued at each interface.
 *
 * {@link CONTROL_DOES_NOT_FIT} is what makes that reading discriminate.
 * A conditional type answering `true` for everything satisfies four
 * pins exactly as one that checks does, so a shape the tables plainly
 * do not have is declared `false` beside them in the same helper.
 */
import type {
  ExportArtifact,
  ExportBriefingRow,
  ExportDomainRow,
  ExportFindingRow,
  ExportRenderInput,
  ExportRenderer,
  ExportSubscriptionRow,
} from './index.js';
import type { domains } from '../db/schema/domains.js';
import type { findings } from '../db/schema/findings.js';
import type { briefings } from '../db/schema/runs.js';
import type { exportSubscriptions } from '../db/schema/scheduling.js';
import type { DigestFinding } from '../lib/digest-assemble.js';

import { describe, expect, it } from 'vitest';

import { orderFindings } from '../lib/digest-assemble.js';

// ---------------------------------------------------------------------------
// The type-level pins
// ---------------------------------------------------------------------------

/**
 * `true` only while `L` names every key of `T`.
 *
 * The tuple wrapper is load-bearing rather than decoration: without
 * it the union distributes over the conditional and the answer is
 * `boolean`, which accepts `true` as an initializer and pins nothing
 * at all.
 *
 * @typeParam T - The type whose keys must all be named.
 * @typeParam L - The list naming them, as `typeof <the const>`.
 */
type CoversEveryKey<T, L extends readonly PropertyKey[]> =
  [Exclude<keyof T, L[number]>] extends [never] ? true : false;

/**
 * `true` only while a value of `Row` can be handed in where `Declared`
 * is expected.
 *
 * Wrapped in tuples for {@link CoversEveryKey}'s reason and one more:
 * `Row` here is a table's `$inferSelect`, and a naked conditional
 * over an object type that later becomes a union would start
 * answering per member with nothing saying it had.
 *
 * @typeParam Row - The stored shape, as the ORM infers it.
 * @typeParam Declared - The interface `./index.ts` declares for it.
 */
type Fits<Row, Declared> = [Row] extends [Declared] ? true : false;

/**
 * Each of the four row interfaces, held against the table it mirrors.
 *
 * A column renamed, or one whose type moved under it, turns this into
 * `never` and reddens {@link STORED_ROWS_FIT} rather than leaving four
 * hand-written mirrors agreeing with a schema they no longer describe.
 */
type StoredRowsFit =
  Fits<typeof domains.$inferSelect, ExportDomainRow>
  & Fits<typeof briefings.$inferSelect, ExportBriefingRow>
  & Fits<typeof findings.$inferSelect, ExportFindingRow>
  & Fits<typeof exportSubscriptions.$inferSelect, ExportSubscriptionRow>;

/**
 * The same helper over a shape no table here has, so the four pins
 * above are shown to discriminate.
 *
 * `domains.slug` is `text NOT NULL` and so a `string`; asking whether
 * a domain row fits an interface wanting a `number` there has to
 * answer `false`, and a helper that had drifted into answering `true`
 * for everything fails at THIS initializer while the four beside it
 * stay green.
 */
type ControlDoesNotFit = Fits<
  typeof domains.$inferSelect,
  { readonly slug: number }
>;

/**
 * The findings a renderer is handed are the findings the digest
 * ordered, rather than two shapes that happen to agree today.
 *
 * `ExportRenderInput.findings` says in prose that the order is the one
 * `orderFindings` fixed; this is what makes the sentence checkable. A
 * required member added to `DigestFinding` that a `findings` row
 * cannot supply reddens here, which is the moment the prose would
 * otherwise have quietly stopped being true.
 */
type FindingIsADigestFinding = Fits<ExportFindingRow, DigestFinding>;

/**
 * The members of every interface a case below reads keys off.
 *
 * Written out rather than derived, because an interface has no
 * runtime form to read keys off — and pinned in BOTH directions,
 * since a one-directional list is exactly as green as no list at all
 * against the drift that matters. `satisfies` closes the direction
 * where a list names a member the interface lacks;
 * {@link EVERY_KEY_LISTED} closes the one where the interface grows a
 * member nothing here learned about.
 */
const DOMAIN_KEYS = [
  'id',
  'name',
  'settings',
  'slug',
] as const satisfies readonly (keyof ExportDomainRow)[];

/** The whole `briefings` row, which is the one input carried whole. */
const BRIEFING_KEYS = [
  'body',
  'domainId',
  'generatedAt',
  'id',
  'payload',
  'runId',
] as const satisfies readonly (keyof ExportBriefingRow)[];

/** The whole `findings` row, for the reason the briefing is whole. */
const FINDING_KEYS = [
  'createdAt',
  'documentId',
  'domainId',
  'entityId',
  'fields',
  'id',
  'score',
  'scoreVersion',
] as const satisfies readonly (keyof ExportFindingRow)[];

/**
 * The four identity columns of `export_subscriptions`, and none of the
 * five schedulable ones — a renderer that could read `nextRunAt` could
 * lay a period out by when the next render falls due.
 */
const SUBSCRIPTION_KEYS = [
  'connectorId',
  'domainId',
  'format',
  'id',
] as const satisfies readonly (keyof ExportSubscriptionRow)[];

/** The four inputs, which is the whole of what a renderer is given. */
const INPUT_KEYS = [
  'briefing',
  'domain',
  'findings',
  'subscription',
] as const satisfies readonly (keyof ExportRenderInput)[];

/**
 * The two members a renderer has. A third that delivered would land
 * here first, which is why the roster is asserted rather than the
 * arity.
 */
const RENDERER_KEYS = [
  'format',
  'render',
] as const satisfies readonly (keyof ExportRenderer)[];

/** The four members of one rendered artifact. */
const ARTIFACT_KEYS = [
  'body',
  'format',
  'mediaType',
  'path',
] as const satisfies readonly (keyof ExportArtifact)[];

/** Every list above, held against the type it describes. */
type EveryKeyListed =
  CoversEveryKey<ExportDomainRow, typeof DOMAIN_KEYS>
  & CoversEveryKey<ExportBriefingRow, typeof BRIEFING_KEYS>
  & CoversEveryKey<ExportFindingRow, typeof FINDING_KEYS>
  & CoversEveryKey<ExportSubscriptionRow, typeof SUBSCRIPTION_KEYS>
  & CoversEveryKey<ExportRenderInput, typeof INPUT_KEYS>
  & CoversEveryKey<ExportRenderer, typeof RENDERER_KEYS>
  & CoversEveryKey<ExportArtifact, typeof ARTIFACT_KEYS>;

/**
 * The half of the drift guard `check-types` owns.
 *
 * A member added to any of the seven interfaces and to none of the
 * lists above turns {@link EveryKeyListed} into `never`, and this
 * initializer is then a TS2322 at this line — before any case can
 * compare a fixture against a set that has quietly stopped describing
 * it. Read in a case below so it is a symbol this file uses rather
 * than one lint reports.
 */
const EVERY_KEY_LISTED: EveryKeyListed = true;

/** The four row mirrors, held against the tables. See the header. */
const STORED_ROWS_FIT: StoredRowsFit = true;

/** {@link ControlDoesNotFit}, which is `false` or the pins are dead. */
const CONTROL_DOES_NOT_FIT: ControlDoesNotFit = false;

/** {@link FindingIsADigestFinding}, read in the ordering case below. */
const FINDING_IS_A_DIGEST_FINDING: FindingIsADigestFinding = true;

/** {@link DOMAIN_KEYS}, sorted at use rather than by hand. */
const DOMAIN_KEY_SET: readonly string[] = [...DOMAIN_KEYS].sort();

/** {@link BRIEFING_KEYS}, sorted. */
const BRIEFING_KEY_SET: readonly string[] = [...BRIEFING_KEYS].sort();

/** {@link FINDING_KEYS}, sorted. */
const FINDING_KEY_SET: readonly string[] = [...FINDING_KEYS].sort();

/** {@link SUBSCRIPTION_KEYS}, sorted. */
const SUBSCRIPTION_KEY_SET: readonly string[] =
  [...SUBSCRIPTION_KEYS].sort();

/** {@link INPUT_KEYS}, sorted. */
const INPUT_KEY_SET: readonly string[] = [...INPUT_KEYS].sort();

/** {@link RENDERER_KEYS}, sorted. */
const RENDERER_KEY_SET: readonly string[] = [...RENDERER_KEYS].sort();

/** {@link ARTIFACT_KEYS}, sorted. */
const ARTIFACT_KEY_SET: readonly string[] = [...ARTIFACT_KEYS].sort();

/**
 * A member none of the seven interfaces declares, as a key.
 *
 * Assembled from parts so that a member genuinely named this would
 * still not be spelled anywhere in this file, and asserted absent from
 * every roster in the same case the rosters are compared in: a set
 * equality holds against a list that has stopped discriminating, and
 * only a key known to be outside it says otherwise.
 */
const ABSENT_KEY = ['deliv', 'ered', 'At'].join('');

// ---------------------------------------------------------------------------
// One neutral digest, as four stored rows
// ---------------------------------------------------------------------------

/**
 * The domain the fixture below belongs to: rainfall bulletins, which
 * is a subject with a taxonomy and no relation to anything this
 * pipeline was ported from.
 *
 * It declares `findingsDisplayName`, the one `DomainSettings` member a
 * renderer reads, so a heading case has something other than the
 * neutral fallback to find.
 */
const RAINFALL_DOMAIN = {
  id: 4,
  slug: 'rainfall-bulletin',
  name: 'Rainfall bulletin',
  settings: { findingsDisplayName: 'Readings' },
} satisfies ExportDomainRow;

/** The stored digest a render is of. */
const STORED_BRIEFING = {
  id: 11,
  domainId: RAINFALL_DOMAIN.id,
  runId: 90,
  body: 'Two gauges reported and one did not.',
  payload: { sections: [] },
  generatedAt: new Date('2026-08-30T00:00:00.000Z'),
} satisfies ExportBriefingRow;

/**
 * The same briefing with no prose, which is a stored state and not a
 * malformed one: `briefings.body` is nullable because a pass whose
 * drafting step answered nothing still has a digest.
 */
const UNDRAFTED_BRIEFING = {
  ...STORED_BRIEFING,
  body: null,
} satisfies ExportBriefingRow;

/**
 * The findings the pass selected: one scored zero and one not scored
 * at all.
 *
 * That pairing is the fixture's whole discrimination and a case below
 * asserts it is still there. A fixture whose scores are all numbers,
 * or all null, is satisfied by a renderer that reads a missing score
 * as a zero — which is the one arithmetic mistake
 * `ExportFindingRow.score` is written to stop.
 */
const SELECTED_FINDINGS = [
  {
    id: 501,
    domainId: RAINFALL_DOMAIN.id,
    documentId: 88,
    entityId: null,
    fields: { gauge: 'north ridge' },
    score: 0,
    scoreVersion: 2,
    createdAt: new Date('2026-08-29T06:00:00.000Z'),
  },
  {
    id: 502,
    domainId: RAINFALL_DOMAIN.id,
    documentId: 89,
    entityId: 17,
    fields: { gauge: 'south flat' },
    score: null,
    scoreVersion: null,
    createdAt: new Date('2026-08-29T07:00:00.000Z'),
  },
] satisfies readonly ExportFindingRow[];

/** The standing request this render answers. */
const STANDING_SUBSCRIPTION = {
  id: 7,
  domainId: RAINFALL_DOMAIN.id,
  format: 'obsidian_md',
  connectorId: 3,
} satisfies ExportSubscriptionRow;

/** The four rows as one renderer input. */
const RENDER_INPUT = {
  domain: RAINFALL_DOMAIN,
  briefing: STORED_BRIEFING,
  findings: SELECTED_FINDINGS,
  subscription: STANDING_SUBSCRIPTION,
} satisfies ExportRenderInput;

/** The same input over a briefing nobody drafted prose for. */
const UNDRAFTED_INPUT = {
  ...RENDER_INPUT,
  briefing: UNDRAFTED_BRIEFING,
} satisfies ExportRenderInput;

/**
 * A renderer that conforms, and does the least a renderer can.
 *
 * Its whole job here is to be a shape: two members, a pure `render`,
 * and a return value that is the only way anything leaves it. What it
 * does with a NULL body is the one decision it makes, and it makes the
 * one `ExportBriefingRow.body` argues for — no prose produced answers
 * no artifact, rather than an artifact whose body is `''` and which a
 * surface then renders as a blank document.
 */
const MINIMAL_RENDERER = {
  format: 'obsidian_md',
  render(input: ExportRenderInput): ExportArtifact[] {
    const { body } = input.briefing;

    if (body === null) {
      return [];
    }

    return [{
      format: 'obsidian_md',
      path: `${input.domain.slug}/${String(input.briefing.id)}.md`,
      mediaType: 'text/markdown',
      body,
    }];
  },
} satisfies ExportRenderer;

// ---------------------------------------------------------------------------
// The cases
// ---------------------------------------------------------------------------

describe('the narrowed render input', () => {
  it('is four stored rows and nothing else', () => {
    expect(Object.keys(RENDER_INPUT).sort()).toStrictEqual(INPUT_KEY_SET);
  });

  it('carries each row under the columns its table has', () => {
    expect(Object.keys(RENDER_INPUT.domain).sort())
      .toStrictEqual(DOMAIN_KEY_SET);
    expect(Object.keys(RENDER_INPUT.briefing).sort())
      .toStrictEqual(BRIEFING_KEY_SET);
    expect(Object.keys(RENDER_INPUT.subscription).sort())
      .toStrictEqual(SUBSCRIPTION_KEY_SET);

    for (const finding of RENDER_INPUT.findings) {
      expect(Object.keys(finding).sort()).toStrictEqual(FINDING_KEY_SET);
    }
  });

  it('leaves the schedulable columns off the subscription', () => {
    // The five are named here rather than derived, because the claim
    // is about columns this row deliberately does NOT carry: a
    // derivation would read the interface and agree with whatever it
    // says. `nextRunAt` is the one that matters — a renderer holding
    // it could lay a period out by when the next render falls due.
    const schedulable = [
      'enabled',
      'intervalSeconds',
      'maxIntervalSeconds',
      'minIntervalSeconds',
      'nextRunAt',
    ];

    for (const column of schedulable) {
      expect(SUBSCRIPTION_KEY_SET).not.toContain(column);
    }
  });

  it('keeps a measured zero apart from an unmeasured score', () => {
    const scores = RENDER_INPUT.findings.map((finding) => finding.score);

    // Anti-vacuity for every later renderer case over this fixture:
    // a selection whose scores are all numbers, or all null, cannot
    // report a renderer that reads absence as zero.
    expect(scores).toContain(0);
    expect(scores).toContain(null);
  });

  it('holds findings the digest ordering can already sort', () => {
    // The runtime half of {@link FindingIsADigestFinding}: these rows
    // go into the ordering the assembly fixed, unchanged and with no
    // shape in between. An empty answer, or one that lost a row,
    // would say the two shapes had come apart.
    expect(FINDING_IS_A_DIGEST_FINDING).toBe(true);

    const ordered = orderFindings(RENDER_INPUT.findings);

    // A scored finding ahead of an unscored one, which is absence
    // sorted LAST rather than lowest.
    expect(ordered.map((finding) => finding.id)).toStrictEqual([501, 502]);
  });
});

describe('a renderer conforming to the contract', () => {
  it('answers artifacts and returns nothing else', () => {
    const artifacts = MINIMAL_RENDERER.render(RENDER_INPUT);

    expect(artifacts).toHaveLength(1);

    for (const artifact of artifacts) {
      expect(Object.keys(artifact).sort()).toStrictEqual(ARTIFACT_KEY_SET);
      expect(artifact.format).toBe(MINIMAL_RENDERER.format);
    }
  });

  it('names a destination-relative path and no absolute one', () => {
    const [artifact] = MINIMAL_RENDERER.render(RENDER_INPUT);

    expect(artifact?.path).toBe('rainfall-bulletin/11.md');
    expect(artifact?.path.startsWith('/')).toBe(false);
    expect(artifact?.path).not.toContain('..');
  });

  it('answers no artifact where a briefing has no prose', () => {
    // The NULL is a stored state, so the contract has to leave a
    // renderer able to say nothing rather than to say `''`.
    expect(MINIMAL_RENDERER.render(UNDRAFTED_INPUT)).toStrictEqual([]);
  });

  it('leaves the input it was handed exactly as it was', () => {
    const before = JSON.stringify(RENDER_INPUT);

    MINIMAL_RENDERER.render(RENDER_INPUT);

    expect(JSON.stringify(RENDER_INPUT)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// The guards: what a later edit to this file has to keep true
// ---------------------------------------------------------------------------

describe('the tables this file asserts against', () => {
  it('lists every key of every type a set is read from', () => {
    // Reading the pins is what keeps them symbols this file USES.
    // Their values are never in doubt — the claim is that
    // `check-types` could not have produced any other ones, since a
    // member added to any of the seven interfaces and to none of the
    // rosters turns the type into `never` and reddens the
    // initializer rather than this line.
    expect(EVERY_KEY_LISTED).toBe(true);
    expect(STORED_ROWS_FIT).toBe(true);
    // The control beside them, which is what says the four row pins
    // discriminate rather than answering `true` for any shape.
    expect(CONTROL_DOES_NOT_FIT).toBe(false);
  });

  it('keeps a key none of the interfaces declares outside them', () => {
    const rosters = [
      ARTIFACT_KEY_SET,
      BRIEFING_KEY_SET,
      DOMAIN_KEY_SET,
      FINDING_KEY_SET,
      INPUT_KEY_SET,
      RENDERER_KEY_SET,
      SUBSCRIPTION_KEY_SET,
    ];

    for (const roster of rosters) {
      // Anti-vacuity: a roster emptied by an edit satisfies every set
      // comparison above for nobody's reason, and a roster that has
      // stopped discriminating satisfies them all the same.
      expect(roster.length).toBeGreaterThan(0);
      expect(roster).not.toContain(ABSENT_KEY);
    }

    expect(rosters).toHaveLength(7);
  });

  it('names the two members a renderer is allowed', () => {
    expect(RENDERER_KEY_SET).toStrictEqual(['format', 'render']);
    expect(Object.keys(MINIMAL_RENDERER).sort()).toStrictEqual(
      RENDERER_KEY_SET,
    );
  });
});
