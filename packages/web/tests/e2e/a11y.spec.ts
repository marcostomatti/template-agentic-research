import type { Locator, Page } from '@playwright/test';

import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import {
  fetchCategorySummaries,
  fetchConnectors,
  fetchFindings,
  fetchPersonas,
  fetchSourceFailures,
  fetchSourceProposals,
  fetchSources,
} from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import {
  SINGLE_DOMAIN_BASE,
  SURFACES,
  withBase,
} from '../../src/routes/paths';

// An axe scan of every address this app answers at: the six surfaces
// and the seven modal sub-routes below them. Every path is built from
// `routes/paths.ts` and every row id is read out of the app's own
// accessors, so this file spells no fixture value and no address of
// its own — a surface added to `SURFACES` joins the sweep with
// nothing here edited.
//
// ## What the assertion is, and why it is not a bare zero
//
// The claim each case makes is that the SET of axe rule ids violated
// at the serious and critical impact levels is exactly the set this
// file declares for that address. Rule ids rather than a count,
// because a count says a scan went red and never says what broke;
// and set EQUALITY rather than a subset, for two separate reasons.
//
// A rule id the ledger does not carry reds the case — that is the
// gate, and it is what a new violation on a new page trips.
//
// A ledger rule that has STOPPED being violated reds it too, which is
// the half an allowlist cannot do. The three entries below are debt
// against `@ar/ui`, and the day one of them is repaired this file has
// to be told: an allowlist would silently keep passing and the ledger
// would rot into a list of rules nobody is still failing.
//
// ## Why the ledger is not empty
//
// All three entries are carried in rather than introduced here, and
// all three are owned by `@ar/ui` — measured, not assumed:
// `git log -1` names commit `cabcf16` (the umbrella reintegration) for
// `Modal.tsx`, `Overlay.tsx` and `SidebarWeekSummary.tsx`, and the
// only file this branch changed under `packages/ui` is `EntityCard`.
// None of the three is reachable from `packages/web` at all: two are
// missing accessible names on elements only `@ar/ui` renders, and
// their call sites are inside it too, and the third is a pair of
// colour tokens in `Badge.variants.ts`. See {@link UNNAMED_PROGRESSBAR},
// {@link UNNAMED_DIALOG} and {@link LOW_CONTRAST} for the per-rule
// reading, and `progress.txt` for the debt.
//
// ## The ledger is also this file's liveness control
//
// A scan that read a blank page, an unmounted app or a document that
// never navigated answers ZERO violations, which is indistinguishable
// from a clean sweep. Here it is not: every address carries at least
// one rule the tree really violates, so a scan that reached nothing
// answers an EMPTY set and reds against a non-empty expectation. That
// control runs on every execution rather than once.
//
// Two more guards sit beside it, because the ledger alone would still
// pass against a page showing only its loading stand-ins. Every scan
// asserts axe reported PASSING rules as well as failing ones, and
// every address is settled before it is read — see
// {@link SKELETON}.
//
// ## What is pinned by node count and what is not
//
// {@link LedgerEntry.nodes} is stated only for the two rules whose
// subject is MARKUP: exactly one unnamed progressbar, exactly one
// unnamed dialog. Those readings are renderer-independent, and pinning
// them is what stops a second unnamed dialog or progressbar from
// hiding behind a rule id that was already expected.
//
// `color-contrast` deliberately carries no count. Axe resolves a
// contrast reading from rendered colour, and a node it cannot resolve
// moves to `incomplete` rather than to `violations` — so the count
// is a property of the renderer as well as of the tree, and pinning it
// would make a hosted runner red for a reason nobody changed. The
// residual gap is stated rather than closed: a NEW low-contrast
// element under an address that already expects `color-contrast` is
// not caught by this file. Its node count is printed in every failure
// message, so a run that goes red for another reason still shows it.
//
// ## Deep links rather than clicks
//
// Each modal address is reached by `page.goto`, not by driving the
// list behind it. The address IS the subject here — every modal is
// a routed child that mounts on a direct navigation, which the six
// surface specs already drive through their own cards and menus. A goto also
// resets `src/data/drafts.ts`, so no case can inherit an edit another
// one recorded.
//
// ## What this file deliberately does not claim
//
// That the domain base scans clean. Both bases are built from one
// `routesBelowBase()` factory and `src/routes/router.test.ts` pins
// that every declared pair resolves under both, so the SURFACE markup
// is the same tree — but the shell chrome is not identical under a
// slug, and one case per address here would double the sweep to cover
// it. Recorded as the gap it is.
//
// That the app is accessible. Axe is an automated scan and reaches
// roughly the machine-checkable half; keyboard order, focus return and
// the drag alternative are `keyboard.spec.ts`, and motion is
// `reduced-motion.spec.ts`.

/**
 * The class `@ar/ui`'s `Skeleton` renders its shimmer with.
 *
 * The settled-state handle for the whole app, and unique to that
 * component (measured: one declaration in `Skeleton.variants.ts` and
 * one keyframe in `theme.css`, no other user). Every page and every
 * modal here renders a `Skeleton` while its read is in flight, so
 * "no shimmer anywhere" is one locator that says every stand-in has
 * resolved.
 *
 * It is a precondition rather than an assertion about loading: a
 * `Skeleton` is `aria-hidden`, so axe walks straight past one and a
 * scan taken mid-load reports a clean page having read no content at
 * all. Waiting on it is what makes the sweep non-vacuous.
 */
const SKELETON = '.animate-shimmer';

/** Which impacts this file gates on. */
const GATED_IMPACTS: readonly string[] = ['serious', 'critical'];

/** Everything one axe run answered. */
type AxeScan = Awaited<ReturnType<AxeBuilder['analyze']>>;

/** One rule axe found broken, with the nodes that broke it. */
type AxeViolation = AxeScan['violations'][number];

/**
 * One rule this tree is known to violate, and who owns it.
 *
 * A record rather than a bare rule id so a failure message can say
 * WHERE the debt lives without a reader going to look, and so the
 * two markup rules can pin their node count while the colour rule
 * states that it cannot — see the file header.
 */
interface LedgerEntry {
  /** The axe rule id, as `Result.id` spells it. */
  readonly rule: string;
  /** Which `@ar/ui` component owns it, and what the defect is. */
  readonly owner: string;
  /**
   * How many nodes break it, where that reading is renderer
   * independent. Absent for `color-contrast` alone.
   */
  readonly nodes?: number;
}

/*
 * The three carried-in violations below were each measured at this
 * commit. Attribution for all three is `git log -1 -- <file>` naming
 * commit `cabcf16`, which predates this branch; `git diff --name-only
 * $(git merge-base main HEAD)..HEAD -- packages/ui` names only the
 * `EntityCard` files. So none of them is this plan's, and none of
 * them can be repaired from `packages/web`.
 */

/**
 * `SidebarWeekSummary` renders `Progress` with `className="h-1"` and
 * no accessible name. `Progress` sets `role="progressbar"` and
 * spreads `HTMLAttributes`, so the repair is an `aria-label` at that
 * call site — which is inside `@ar/ui`, not at any call site here.
 * It is in the rail, so it is on every surface and on no modal
 * address: an open Radix dialog puts `aria-hidden` on the app root
 * and axe does not walk hidden subtrees.
 */
const UNNAMED_PROGRESSBAR: LedgerEntry = {
  rule: 'aria-progressbar-name',
  owner: '@ar/ui SidebarWeekSummary: its Progress has no accessible name',
  nodes: 1,
};

/**
 * `Modal` puts `aria-labelledby={titleId}` on its panel `div`, which
 * carries no role, while `role="dialog"` sits on the `Dialog.Content`
 * that `Overlay` renders one level up. `Overlay` takes a `label` prop
 * for exactly this and `Modal` never passes it, so every dialog in
 * the app is unnamed and no call site can name one.
 */
const UNNAMED_DIALOG: LedgerEntry = {
  rule: 'aria-dialog-name',
  owner: '@ar/ui Modal: aria-labelledby is on the panel, not on role=dialog',
  nodes: 1,
};

/**
 * `Badge.variants.ts` pairs each tone with a wash of itself —
 * `bg-success/15 text-success` reads 2.98:1, `bg-warning/20
 * text-gold-500` reads 2.22:1 and `bg-danger/15 text-danger` reads
 * 3.9:1, against the 4.5:1 that size and weight need. The `--fg3`
 * token at 11.5px reads 2.53:1 on the same scan. Both are theme
 * decisions in `@ar/ui`.
 */
const LOW_CONTRAST: LedgerEntry = {
  rule: 'color-contrast',
  owner: '@ar/ui Badge tone washes and the fg3 token',
};

/** What every one of the six surfaces is expected to violate. */
const SURFACE_LEDGER: readonly LedgerEntry[] = [
  UNNAMED_PROGRESSBAR,
  LOW_CONTRAST,
];

/**
 * What every modal address is expected to violate.
 *
 * The progressbar is absent rather than repaired: the rail it sits in
 * is inside the `aria-hidden` app root while a dialog is open, so axe
 * never reaches it. That difference between the two ledgers is itself
 * a reading — a modal address answering the SURFACE set would mean
 * the dialog never opened.
 */
const MODAL_LEDGER: readonly LedgerEntry[] = [
  UNNAMED_DIALOG,
  LOW_CONTRAST,
];

/** The domain every modal subject below is read out of. */
const SLUG = DEFAULT_DOMAIN_SLUG;

/**
 * The first member, or a failure naming what was empty.
 *
 * Every modal case derives its address from the fixtures, and an
 * empty fixture list would otherwise build a path ending in
 * `undefined` and scan the not-found page — which has no dialog,
 * so the case would red somewhere that does not name the cause.
 * `noUncheckedIndexedAccess` makes the guard obligatory anyway; this
 * is what keeps it from being a non-null assertion.
 *
 * @param values - Whatever a fixture accessor answered.
 * @param what - What was expected, for the failure message.
 * @returns The first member.
 * @throws If there is none.
 */
function firstOf<T>(values: readonly T[], what: string): T {
  const [value] = values;

  if (value === undefined) {
    throw new Error(`No ${what} in the fixtures.`);
  }

  return value;
}

/** The rule ids a ledger expects, sorted so a diff reads in order. */
function ledgerRuleIds(ledger: readonly LedgerEntry[]): readonly string[] {
  return [...ledger.map((entry) => entry.rule)].sort();
}

/** The violations at the impacts this file gates on. */
function gatedViolations(scan: AxeScan): readonly AxeViolation[] {
  return scan.violations.filter(
    (violation) => GATED_IMPACTS.includes(violation.impact ?? ''),
  );
}

/** The rule ids those violations name, sorted and without repeats. */
function violatedRuleIds(
  violations: readonly AxeViolation[],
): readonly string[] {
  return [...new Set(violations.map((violation) => violation.id))].sort();
}

/**
 * Everything a failure needs to say what broke.
 *
 * The assertion itself compares rule ids — that is the claim, and a
 * diff of two short string lists is the readable form of it. This is
 * the MESSAGE beside it, and it carries what the ids leave out: the
 * impact, how many nodes each rule caught, the help text, and the
 * first offending element. Without it a red names a rule and leaves a
 * reader to re-run the scan by hand to find the element.
 *
 * @param violations - What the scan found at the gated impacts.
 * @returns A block naming each rule and its first node.
 */
function describeViolations(violations: readonly AxeViolation[]): string {
  if (violations.length === 0) {
    return 'axe found no serious or critical violation.';
  }

  const lines = violations.map((violation) => {
    const [node] = violation.nodes;
    const first = node === undefined
      ? '(no node)'
      : node.html.slice(0, 200);

    return [
      `  ${violation.id} (${violation.impact ?? 'no impact'}, `,
      `${String(violation.nodes.length)} node(s)): ${violation.help}`,
      `\n      first: ${first}`,
    ].join('');
  });

  return `axe found:\n${lines.join('\n')}`;
}

/**
 * Wait for every loading stand-in on the page to have resolved.
 *
 * See {@link SKELETON}: a scan taken while a read is in flight walks
 * past an `aria-hidden` shimmer and reports a clean page it never
 * read.
 *
 * @param page - The page an address has been opened on.
 */
async function expectSettled(page: Page): Promise<void> {
  await expect(page.locator(SKELETON)).toHaveCount(0);
}

/**
 * Scan the page and hold what it found against a ledger.
 *
 * @param page - The page an address has been opened on, settled.
 * @param ledger - What that address is expected to violate.
 */
async function expectLedger(
  page: Page,
  ledger: readonly LedgerEntry[],
): Promise<void> {
  const scan = await new AxeBuilder({ page }).analyze();
  const violations = gatedViolations(scan);

  // Non-vacuity, and the half the ledger cannot supply: axe reporting
  // rules it PASSED is what says it ran a real ruleset against real
  // content rather than returning an empty report.
  expect(
    scan.passes.length,
    'axe reported no passing rule, so it scanned nothing.',
  ).toBeGreaterThan(0);

  expect(
    violatedRuleIds(violations),
    describeViolations(violations),
  ).toEqual(ledgerRuleIds(ledger));

  // Only the markup rules pin a count; see the file header on why
  // `color-contrast` does not.
  for (const entry of ledger.filter((member) => member.nodes !== undefined)) {
    const found = violations.find((violation) => violation.id === entry.rule);

    expect(
      found?.nodes.length,
      `${entry.rule} — ${entry.owner}`,
    ).toBe(entry.nodes);
  }
}

/**
 * Open a modal address and prove the dialog is really open.
 *
 * The dialog assertion is not decoration. A modal route whose read
 * refused, or whose element never mounted, still renders the list
 * behind it perfectly well — and that page scans against the SURFACE
 * ledger, not this one, so the case would red naming a rule set rather
 * than the missing dialog.
 *
 * @param page - A fresh page.
 * @param path - The modal address to open.
 * @returns The dialog, for a caller that wants to read it.
 */
async function openModal(page: Page, path: string): Promise<Locator> {
  const dialog = page.getByRole('dialog');

  await page.goto(path);
  await expect(dialog).toBeVisible();
  await expectSettled(page);

  return dialog;
}

test.describe('every surface', () => {
  for (const surface of SURFACES) {
    test(`${surface.id} violates only the carried-in ledger`, async ({
      page,
    }) => {
      await page.goto(withBase(SINGLE_DOMAIN_BASE, surface.id));
      await expectSettled(page);

      await expectLedger(page, SURFACE_LEDGER);
    });
  }
});

test.describe('every modal sub-route', () => {
  test('the digest detail violates only the carried-in ledger', async ({
    page,
  }) => {
    const finding = firstOf(await fetchFindings(SLUG), 'finding');

    await openModal(page, `${withBase(SINGLE_DOMAIN_BASE, 'digest')}/${
      String(finding.id)}`);

    await expectLedger(page, MODAL_LEDGER);
  });

  test('the lexicon editor violates only the carried-in ledger', async ({
    page,
  }) => {
    const summary = firstOf(
      await fetchCategorySummaries(SLUG),
      'lexicon category',
    );

    await openModal(page, `${withBase(SINGLE_DOMAIN_BASE, 'lexicon')}/${
      String(summary.category.id)}/edit`);

    await expectLedger(page, MODAL_LEDGER);
  });

  test('the source editor violates only the carried-in ledger', async ({
    page,
  }) => {
    const source = firstOf(await fetchSources(SLUG), 'source');

    await openModal(page, `${withBase(SINGLE_DOMAIN_BASE, 'sources')}/${
      String(source.id)}/edit`);

    await expectLedger(page, MODAL_LEDGER);
  });

  test('the config approval violates only the carried-in ledger', async ({
    page,
  }) => {
    // A source with a PENDING proposal, so the modal draws the two
    // documents and its two rulings rather than its empty state. The
    // empty state is `sources.spec.ts`'s case; what this one needs is
    // the address at its most populated.
    const proposals = await fetchSourceProposals(SLUG);
    const pending = firstOf(
      proposals.filter((proposal) => proposal.status === 'pending'),
      'pending config proposal',
    );

    await openModal(page, `${withBase(SINGLE_DOMAIN_BASE, 'sources')}/${
      String(pending.sourceId)}/config`);

    await expectLedger(page, MODAL_LEDGER);
  });

  test('the failures list violates only the carried-in ledger', async ({
    page,
  }) => {
    // Likewise the populated side: a source with at least one failed
    // capture, so the list has rows and their two controls to scan.
    const sources = await fetchSources(SLUG);
    const failing = await Promise.all(sources.map(async (source) => ({
      source,
      failures: await fetchSourceFailures(SLUG, source.id),
    })));
    const subject = firstOf(
      failing.filter((row) => row.failures.length > 0),
      'source with a failed capture',
    );

    await openModal(page, `${withBase(SINGLE_DOMAIN_BASE, 'sources')}/${
      String(subject.source.id)}/failures`);

    await expectLedger(page, MODAL_LEDGER);
  });

  test('the agent editor violates only the carried-in ledger', async ({
    page,
  }) => {
    const persona = firstOf(await fetchPersonas(SLUG), 'persona');

    await openModal(page, `${withBase(SINGLE_DOMAIN_BASE, 'agents')}/${
      String(persona.id)}/edit`);

    await expectLedger(page, MODAL_LEDGER);
  });

  test('the connector editor violates only the carried-in ledger', async ({
    page,
  }) => {
    const connector = firstOf(await fetchConnectors(), 'connector');

    await openModal(page, `${withBase(SINGLE_DOMAIN_BASE, 'tools')}/${
      String(connector.id)}/edit`);

    await expectLedger(page, MODAL_LEDGER);
  });
});
