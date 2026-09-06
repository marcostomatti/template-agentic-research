import type { CategorySummary } from '../../src/data/lexicon';
import type { TermPolarity } from '../../src/data/types';
import type {
  FieldDef,
  FieldType,
  ListFieldDef,
} from '../../src/dynamic-form/fieldDef';
import type { FieldReading } from '../../src/dynamic-form/readers';
import type {
  TermPayload,
  TermPayloadEntry,
} from '../../src/pages/lexicon/schema';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from '@playwright/test';

import { describeSchemaIssues } from '../../src/components/jsonDraft';
import { fetchCategorySummaries, fetchTerms } from '../../src/data/api';
import { DEFAULT_DOMAIN_SLUG } from '../../src/data/domains';
import {
  readNumberField,
  readStringField,
} from '../../src/dynamic-form/readers';
import {
  CONTROL_KIND_BY_TYPE,
  controlKindFor,
} from '../../src/dynamic-form/registry';
import { buildFormTree, treeNavNodes } from '../../src/dynamic-form/tree';
import { POLARITY_FACETS } from '../../src/pages/lexicon/cards';
import { fieldDefsForTermPayload } from '../../src/pages/lexicon/fieldDefs';
import { termPayloadSchema } from '../../src/pages/lexicon/schema';
import { toTermPayload } from '../../src/pages/lexicon/terms';
import { SINGLE_DOMAIN_BASE, withBase } from '../../src/routes/paths';

// What the fields presentation draws, what it takes, and what it
// refuses.
//
// `dynamic-form/readers.test.ts` already drives every reader's own
// refusal and `components/jsonDraft.test.ts` the sentences a schema
// refusal produces, so neither is restated here. What only a browser
// can answer is the ASSEMBLY: that an edit the schema will not take
// reaches the screen as a sentence naming the member, that it leaves
// the footer shut while it stands, that the sentence retires once the
// member reads again, and that an address the presentation cannot be
// reached at leaves the surface behind it standing.
//
// ## Both refusals here are the SCHEMA's, and that is the point
//
// The two members driven below are `string` typed, and
// `dynamic-form/readers.ts` accepts every text a `string` box can
// hold — an empty one included, which it answers `null` for. So
// neither edit is refused by the control it was typed into: both are
// applied to the payload, refused over the WHOLE candidate, and
// reported through the one banner `DynamicForm` builds from
// `describeSchemaIssues`. Each case reads the box's own invalid state
// while that banner is up, which is what keeps the two channels
// distinguishable instead of letting one stand for the other.
//
// A cleared `pattern` is the provider's stated decision made visible:
// an empty box writes `null` rather than `''`, so clearing a member
// the schema requires is a refusal naming it. An out-of-union
// `polarity` is the degradation `pages/lexicon/fieldDefs.ts` records:
// v1 carries no enumerated type, so the box takes any word and the
// save path is what says which words are real.
//
// ## What is derived, and what is spelled
//
// Every sentence comes from the app's own `describeSchemaIssues`, and
// every label an operator reads is derived — the boxes from the def
// list `fieldDefsForTermPayload` answers, the rows from the tree
// `buildFormTree` projects. A member renamed in one place therefore
// moves this file with it rather than leaving a locator matching
// nothing. What is SPELLED is the handful of names the surface owns
// outright: the segment, the footer's two controls and the two
// titles, each a constant beside the control it addresses.
//
// ## The modal hides the surface from every role locator
//
// `Modal` is a Radix dialog and an open one sets `aria-hidden` on the
// app root, so `page.getByRole('main')` resolves to ZERO elements
// while an editor is up and every locator scoped under it goes the
// same way. No assertion about the grid is made while a dialog
// stands, and the dialog itself is asserted visible before anything
// inside it is addressed.
//
// ## What the accepting path adds, and why it is read after a walk
//
// Every PURE module under `src/dynamic-form/` carries its own cases
// and none of them is restated here either. What is only true once the
// shell is assembled is that the structure column draws one row per
// entry, that a click mounts that entry's own form and no other,
// that the breadcrumb walks back to the level above, and that a box
// typed into moves the member it is over and leaves its neighbours
// where they were.
//
// That last claim needs the REMOUNT to be readable at all.
// `FieldControl` holds what was typed beside the value it reported,
// so a box showing text is evidence about the box and never about
// the draft — a control reporting nothing at all would leave every
// keystroke on the screen. `DynamicForm` keys the mounted form by
// the node's path, so walking out to the list level and back in
// unmounts the controls and draws them again from the VALUE. Every
// acceptance below is therefore read after that walk rather than at
// the keystroke, and the walk is the same breadcrumb the case above
// it is about.
//
// ## All six types, and the two with no site in this payload
//
// `dynamic-form/registry.ts` is total over the six and its own
// cases are what prove it. What only this file can add is the
// accounting for THIS payload: the def list
// `fieldDefsForTermPayload` answers uses four of the six, and the
// lexicon editor is the whole of what mounts the provider, so
// `boolean` and `datetime` have no control anywhere in the app.
// The split is DERIVED — the defs walked for the types they carry,
// crossed against `CONTROL_KIND_BY_TYPE` — so a member that later
// takes one of the two moves this file's accounting with it rather
// than leaving a sentence here asserting the old count.
//
// Only ONE of the two absences is observable in the DOM, and saying
// which is the difference between a reading and a coincidence.
// `boolean` draws as a `Switch`, so a zero count of `role="switch"`
// reports it. `datetime` draws as the same box `string` draws, so
// nothing in the markup separates them; what stands in for it is
// the textbox COUNT held against the leaf defs, which a stray box
// of any kind would move.
//
// ## The number box is text on purpose
//
// `FieldControl` leaves it at `TextInput`'s default `type="text"`
// with `inputMode="decimal"`, which is what the source doc's table
// asks a `number` for: a native number input filters keystrokes and
// forces a spinner an operator never asked for. So the case driving
// it presses one character at a time and reads the box back after
// each, which is the only shape that reports a keystroke the
// control swallowed — a box asserted once at the end agrees with a
// control that rewrote the text on the way through.
// ## The reorder: three gestures, one arrival
//
// `NodeForm.tsx` reaches ONE report from both gestures and the shell
// answers it with one `withListReordered` call, so what a browser is
// needed for is that the two ARRIVALS agree: a pointer drag and a
// keyboard-reachable control landing the same entry in the same
// position. Only the pointer path owes a translation — `Sortable`
// reports a drop as the whole next ORDER and works in insertion GAPS
// — and that translation is the one place the two can still drift.
// Nothing in either gate reaches it, a static render firing no drop.
//
// The drag takes TWO moves over the row it lands on, which is a
// property of `Sortable` rather than of the driver. Its container
// claims a slot on the FIRST `dragover` of a drag and its row claims
// one on every `dragover`, and both read the same not-yet-committed
// state — so a single move leaves the dragged row at the END of the
// list rather than where the pointer is. Measured both ways. A
// one-move drag is therefore A reorder and not the one under test,
// which is exactly the shape that would pass while measuring nothing.
//
// ## What an order is read OFF, and what it is not read off
//
// A list item's label is POSITIONAL — `tree.ts` numbers it from
// where it sits — so the form's rows, the tree's items and the move
// controls all keep their names through a move, and none of them says
// which ENTRY is where. That splits the reading in two and both
// halves are load-bearing:
//
// - The ROSTER, off the move controls' own accessible names in DOM
//   order. Invariant under a move by construction, which is the
//   point: it is what reports a row lost, duplicated or misnumbered.
// - The CONTENT, off each entry's own boxes after drilling in. It is
//   what MOVED, and it is a form VALUE rather than rendered prose —
//   deliberately, prose on a surface being free to carry a stamp and
//   `@ar/ui`'s same-day relative-time rung rendering a LOCAL clock
//   time, which is why `playwright.config.ts` pins a timezone at all.
//
// ## A drag from outside the list
//
// Exactly one `Sortable` is mounted here at a time: the template
// presentation draws three of its own, and only one presentation
// renders. So a cross-list drag cannot be made with a pointer and is
// SYNTHESIZED instead — a real `dragstart` on a row, which is what
// makes `Sortable` write its own drag type onto the transfer, then a
// drop carrying that type under another list's name. Neither the
// prefix nor the group is spelled here: both come off the component's
// own answer, so a renamed group cannot leave this case dropping
// something no list would ever have sent.
//
// Its control is the same dispatch carrying the list's OWN type,
// which varies exactly the axis under test and is the only thing that
// says the synthesized events reach the component at all. It lands
// the row at the END, per the one-`dragover` reading above.

/** Which surface this is — the list path comes off the same table. */
const LEXICON_SURFACE_ID = 'lexicon';

/**
 * The segment the editor sub-route occupies under a category id.
 *
 * Spelled rather than imported: `routes/router.tsx` builds the pattern
 * and is a `.tsx` this file may not load. The router's own unit suite
 * is what holds the two in step; here it is one literal, named once.
 */
const EDIT_SEGMENT = 'edit';

/** What the segment that swaps to the fields presentation is called. */
const FIELDS_TAB_NAME = 'Fields';

/** The footer control that writes, addressed by name in every case. */
const SAVE_NAME = 'Save';

/** The footer control that closes without writing. */
const CANCEL_NAME = 'Cancel';

/** How the editor titles a category read that came back rejected. */
const REJECTED_TITLE = 'This category could not be read';

/**
 * What the provider titles the banner over an edit it would not take.
 *
 * Retyped rather than imported, which is the rule this repo splits
 * user-visible text from structural spellings by: a case importing
 * the constant agrees with whatever it says, and a reworded title
 * would then travel to an operator with nothing reporting it.
 */
const REFUSED_TITLE = 'This cannot be saved';

/**
 * The app-wide settled-state handle.
 *
 * `@ar/ui`'s `Skeleton` is its only user and the editor draws one
 * while its term read is in flight. A stand-in is `aria-hidden`, so a
 * locator taken mid-load addresses a body that has not arrived and
 * reports the absence as a fault in the app.
 */
const SKELETON = '.animate-shimmer';

/** Which entry of the payload every refusal below is made in. */
const REFUSED_ENTRY_INDEX = 0;

/**
 * A polarity spelling the schema's enum does not carry.
 *
 * Asserted absent from `POLARITY_FACETS` in the Arrange rather than
 * assumed: a spelling that had quietly become real would make the
 * refusal case measure an acceptance and still pass its locators.
 */
const OUT_OF_UNION_POLARITY = 'sideways';

/**
 * A pattern that repairs a cleared one.
 *
 * This file's own, and asserted to collide with no stored term, so
 * the write it produces is a change the draft can only have taken
 * from this case.
 */
const REPAIRED_PATTERN = 'spec repaired pattern';

/**
 * What the trail above the mounted form is called.
 *
 * `@ar/ui`'s `Breadcrumb` names its own landmark, so this is a word
 * an operator's screen reader says and is retyped for the reason
 * every other sentence here is: a case importing the library's
 * constant agrees with whatever that constant says.
 */
const BREADCRUMB_NAME = 'Breadcrumb';

/**
 * A pattern this file writes, colliding with no seeded term.
 *
 * Distinct from {@link REPAIRED_PATTERN} so a value left behind by
 * one case cannot satisfy another's reading of the draft.
 */
const EDITED_PATTERN = 'spec edited pattern';

/** A note this file writes; the member opens empty in the seed. */
const EDITED_NOTE = 'spec edited note';

/**
 * How much an accepted weight edit moves the stored magnitude.
 *
 * A half rather than a whole, which the schema's own header states
 * is accepted: a weight is a magnitude and nothing here rounds it.
 * Derived onto the stored value rather than written flat, so the
 * edited spelling differs from the stored one whatever the fixtures
 * carry.
 */
const WEIGHT_STEP = 0.5;

/**
 * A weight far past anything a spinner would be stepped to.
 *
 * Its digits are what the number case presses one at a time, so the
 * text is chosen to round-trip through `Number` exactly — asserted
 * in that case's Arrange rather than assumed, the reading after the
 * walk being the value's spelling and not the typed text.
 */
const LARGE_WEIGHT_TEXT = '987654321.5';

/**
 * The six types v1 renders, as this file states them.
 *
 * Annotated `readonly FieldType[]`, which is the REMOVAL direction:
 * a type dropped from the union reddens at the spelling here that
 * outlived it. The ADDITION direction is the length crossing in the
 * accounting case below, against `CONTROL_KIND_BY_TYPE`'s own keys
 * — a table total over the union by its annotation, so a seventh
 * type is a key it gains and a member this literal is short of.
 * Neither artifact reports the other's direction.
 */
const FIELD_TYPES: readonly FieldType[] = [
  'string',
  'boolean',
  'number',
  'datetime',
  'list',
  'object',
];

/** What the tree calls the payload and each entry under it. */
interface TreeLabels {
  /** The root node's label — the payload itself. */
  readonly root: string;
  /** One label per entry, in the order the tree draws them. */
  readonly entries: readonly string[];
}

/** What one refusal the fields presentation makes is driven with. */
interface FieldRefusal {
  /** Names the claim, so a failing title says which leg it is. */
  readonly what: string;
  /**
   * Which member's box is typed into.
   *
   * Also what the schema's sentence has to name, which is the whole
   * of "an operator is told where to go" — keyed by the payload's own
   * member type, so a member that drifts is a `check-types` failure
   * here rather than a locator that stops matching.
   */
  readonly member: keyof TermPayloadEntry;
  /** What goes in that box to be refused. */
  readonly typed: string;
  /**
   * The entry that edit produces, as THIS file states it.
   *
   * Written out rather than derived through `values.ts`, so the
   * candidate is an independent statement of what the app should do
   * with the text rather than a second run of the app's own
   * arithmetic. {@link readRefusal} crosses it against the box's
   * reader, which is what keeps the statement from being a guess.
   */
  readonly refused: (entry: TermPayloadEntry) => Record<string, unknown>;
  /** What goes in the box to make the member read again. */
  readonly repaired: (entry: TermPayloadEntry) => string;
}

/** What one refusal reads as, and what it produces. */
interface RefusalReading {
  /** What the box's own reader answers for the typed text. */
  readonly read: string | null;
  /** What this file says the entry carries at that member. */
  readonly written: unknown;
  /** Every sentence the schema's refusal produces, in order. */
  readonly sentences: readonly string[];
}

/** What one edit the fields presentation TAKES is driven with. */
interface FieldAcceptance {
  /** Names the claim, so a failing title says which leg it is. */
  readonly what: string;
  /**
   * Which member's box is typed into.
   *
   * Keyed by the payload's own member type, exactly as
   * {@link FieldRefusal.member} is: a member that drifts is a
   * `check-types` failure here rather than a locator that quietly
   * stops matching anything.
   */
  readonly member: keyof TermPayloadEntry;
  /**
   * What goes in that box.
   *
   * Derived from the entry rather than flat, so the typed text
   * differs from the stored spelling whatever the fixtures carry —
   * which is the whole of what keeps the reading after the walk
   * from being satisfied by a box that never changed.
   */
  readonly typed: (entry: TermPayloadEntry) => string;
  /**
   * The reader that box's kind uses.
   *
   * Named per row rather than switched on the type: which reader a
   * kind takes is `dynamic-form/registry.ts`'s distinction, and the
   * case crosses this answer against {@link FieldAcceptance.accepted}
   * so the entry below is a consequence of the typed text.
   */
  readonly read: (text: string) => FieldReading<string | number | null>;
  /**
   * The entry that edit produces, as THIS file states it.
   *
   * Typed as the payload's own entry rather than a loose record,
   * unlike {@link FieldRefusal.refused} — a refusal is by definition
   * a shape the schema will not take, and an acceptance is one it
   * will, so the compiler can carry half the claim here.
   */
  readonly accepted: (entry: TermPayloadEntry) => TermPayloadEntry;
}

/**
 * The first member, or a failure naming what was empty.
 *
 * Every case here derives its subject from the fixtures, and an empty
 * fixture list would otherwise leave a loop that asserts nothing and
 * passes. `noUncheckedIndexedAccess` makes the guard obligatory
 * anyway; this is what keeps it from being a non-null assertion.
 *
 * @param values - Whatever a fixture accessor answered.
 * @param what - What was expected, for the failure message.
 * @returns The first member.
 * @throws If there is none.
 */
function first<T>(values: readonly T[], what: string): T {
  const [value] = values;

  if (value === undefined) {
    throw new Error(`No ${what} in the fixtures.`);
  }

  return value;
}

/** The lexicon list path under a base. */
function listPath(base: string): string {
  return withBase(base, LEXICON_SURFACE_ID);
}

/** One category's editor path under a base. */
function editPath(base: string, categoryId: number): string {
  return `${listPath(base)}/${categoryId}/${EDIT_SEGMENT}`;
}

/**
 * One category's card, located from the heading that names it.
 *
 * `EntityCard` renders a `div` with no role and no landmark, so the
 * only stable way in is its heading — which IS a role, and IS the
 * card's name. Two steps up from there is the card root.
 *
 * @param main - The content landmark.
 * @param name - The category's name.
 * @returns The card root.
 */
function categoryCard(main: Locator, name: string): Locator {
  return main
    .getByRole('heading', { level: 2, name, exact: true })
    .locator('xpath=../..');
}

/**
 * The seeded domain's taxonomy, through the page's own accessor.
 *
 * @returns Its summaries, in seed order.
 * @throws If the fixture domain carries none.
 */
async function seededSummaries(): Promise<readonly CategorySummary[]> {
  const summaries = await fetchCategorySummaries(DEFAULT_DOMAIN_SLUG);

  // A taxonomy that lost its rows would leave every case below with
  // no address to open and no card to look for afterwards.
  expect(summaries.length).toBeGreaterThan(0);

  return summaries;
}

/**
 * The defs the fields presentation draws a term payload from.
 *
 * The reading the modal itself takes, so a shape v1 stopped being
 * able to express is a failure NAMING that rather than a case whose
 * every locator has silently moved to the JSON box.
 *
 * @returns The list def.
 * @throws If v1 cannot express the payload at all.
 */
function entryDefs(): ListFieldDef {
  const defs = fieldDefsForTermPayload();

  if (defs === null) {
    throw new Error('v1 cannot express the term payload.');
  }

  return defs;
}

/**
 * What one member's box is called, from the member it writes.
 *
 * The crossing `pages/lexicon/fieldDefs.ts` says only a runtime
 * reading can make: a def's `key` is a plain string, so the member a
 * box writes and the word above it are two facts and this is where
 * they are held together. It is also what keeps every locator below
 * addressing a member rather than a label somebody may reword.
 *
 * @param defs - The list def the presentation draws from.
 * @param member - The payload member whose box is wanted.
 * @returns The label that box carries.
 * @throws If the item is not an object, or draws no such member.
 */
function memberLabel(
  defs: ListFieldDef,
  member: keyof TermPayloadEntry,
): string {
  const { item } = defs;

  if (item.type !== 'object') {
    throw new Error('The entry def does not draw members.');
  }

  const field = item.fields.find((each) => each.key === member);

  if (field === undefined) {
    throw new Error(`No def draws the ${member} member.`);
  }

  return field.label;
}

/**
 * What the tree calls the payload and each entry under it.
 *
 * Through the projection the shell hands its tree, so a list item's
 * positional label is the app's own answer rather than a rule this
 * file re-implements — `dynamic-form/tree.ts` is where the numbering
 * lives and its own cases are what pin it.
 *
 * @param defs - The list def the presentation draws from.
 * @param payload - The payload the form opens on.
 * @returns The root's label and one label per entry.
 * @throws If the projection carries no root.
 */
function treeLabels(
  defs: ListFieldDef,
  payload: TermPayload,
): TreeLabels {
  const [root] = treeNavNodes(buildFormTree(defs, payload));

  if (root === undefined) {
    throw new Error('The projected tree carries no root node.');
  }

  return {
    root: root.label,
    entries: root.children.map((child) => child.label),
  };
}

/**
 * What typing a refusal's text into its box means.
 *
 * Two readings and a guard. The box's own reader answers what the
 * text becomes; this file's own statement answers what the entry then
 * carries; and the schema is asked what it makes of the whole
 * candidate. The caller holds the first two against each other, which
 * is what makes the sentences below a consequence of the typed text
 * rather than a guess beside it.
 *
 * @param payload - The payload the form opens on.
 * @param refusal - The leg being driven.
 * @returns The reader's answer, this file's answer, and the sentences.
 * @throws If the reader refused the text, or the schema accepted the
 * candidate — either leaves the case measuring something else.
 */
function readRefusal(
  payload: TermPayload,
  refusal: FieldRefusal,
): RefusalReading {
  const reading = readStringField(refusal.typed);

  if (!reading.ok) {
    throw new Error(`The box refused the sample: ${refusal.what}.`);
  }

  const entry = first(payload, 'entry in the stored payload');
  const written = refusal.refused(entry);
  const candidate = payload.map((held, index) => (
    index === REFUSED_ENTRY_INDEX
      ? written
      : held
  ));
  const checked = termPayloadSchema.safeParse(candidate);

  if (checked.success) {
    throw new Error(`The schema took the sample: ${refusal.what}.`);
  }

  return {
    read: reading.value,
    written: written[refusal.member],
    sentences: describeSchemaIssues(checked.error),
  };
}

/**
 * Wait for every loading stand-in on the page to have resolved.
 *
 * See {@link SKELETON}. A precondition rather than an assertion about
 * loading: the editor's own body is a shimmer until its term read
 * settles, and nothing inside it is addressable before then.
 *
 * @param page - The page an address has been opened on.
 */
async function expectSettled(page: Page): Promise<void> {
  await expect(page.locator(SKELETON)).toHaveCount(0);
}

/**
 * Open one category's editor and swap it to the fields presentation.
 *
 * @param page - The page to drive.
 * @param categoryId - Which category's editor to open.
 * @returns The open dialog.
 */
async function openFields(
  page: Page,
  categoryId: number,
): Promise<Locator> {
  await page.goto(editPath(SINGLE_DOMAIN_BASE, categoryId));

  const dialog = page.getByRole('dialog');

  // The dialog first, then the settled state, and only then anything
  // inside: a locator taken against a body that has not arrived burns
  // the whole test budget and reports the exhaustion against whatever
  // assertion comes next.
  await expect(dialog).toBeVisible();
  await expectSettled(page);
  await dialog.getByRole('tab', { name: FIELDS_TAB_NAME }).click();

  return dialog;
}

/**
 * The one mounted form, addressed by the node it is drawing.
 *
 * `NodeForm` names its group after that node, so the form, the tree's
 * selected row and the breadcrumb's last step all carry one word —
 * which is what lets a locator say WHICH node's members it is
 * reaching rather than trusting that only one form is up.
 *
 * @param dialog - The open editor.
 * @param label - The node's label.
 * @returns The form's group.
 */
function nodeForm(dialog: Locator, label: string): Locator {
  return dialog.getByRole('group', { name: label, exact: true });
}

/**
 * What a box opens showing, for a value the payload holds.
 *
 * This file's own statement of the convention `FieldControl` spells
 * — a string as itself, a number through `String`, and anything
 * else (a note stored as `null`) as an empty box. Written out
 * rather than imported for the reason the refusal table's own
 * candidates are: a case reading the app's spelling back off the
 * app agrees with whatever that spelling becomes.
 *
 * @param value - The value at a member's path.
 * @returns The text its box shows before anybody types.
 */
function spellStored(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

/**
 * The trail above the mounted form, through its own landmark.
 *
 * Named as well as scoped. The shell draws two more `nav` landmarks
 * of its own — the sidebar's and its quick access — and while a
 * dialog stands Radix hides both along with `main`, so an unnamed
 * locator would pass today and start matching the shell the moment
 * anything here is read outside a modal.
 *
 * @param dialog - The open editor.
 * @returns The breadcrumb's landmark.
 */
function breadcrumb(dialog: Locator): Locator {
  return dialog.getByRole('navigation', {
    name: BREADCRUMB_NAME,
    exact: true,
  });
}

/**
 * Every row the structure column draws, at any depth.
 *
 * `TreeNav` pins each row's name with `aria-label`, so a branch is
 * named after itself rather than after its whole open subtree and a
 * name locator addresses one row. The tree's rows and the mounted
 * form's drill-in rows carry the same words and never collide: one
 * is a `treeitem` and the other a `button`.
 *
 * @param dialog - The open editor.
 * @returns Every row in the tree.
 */
function treeRows(dialog: Locator): Locator {
  return dialog.getByRole('treeitem');
}

/**
 * The members one entry is drawn from, in draw order.
 *
 * @param defs - The list def the presentation draws from.
 * @returns The item's own fields.
 * @throws If the item is not an object.
 */
function entryFields(defs: ListFieldDef): readonly FieldDef[] {
  const { item } = defs;

  if (item.type !== 'object') {
    throw new Error('The entry def does not draw members.');
  }

  return item.fields;
}

/**
 * Every type a def tree uses, root first and duplicates kept.
 *
 * The switch is over the DESTRUCTURED discriminant, which is what
 * narrows `def` to the member carrying `item` or `fields` with no
 * cast — and what makes a seventh type an error naming the type
 * rather than one about a property that no longer exists.
 *
 * @param def - The def to walk.
 * @returns Its type, then every type under it.
 */
function usedFieldTypes(def: FieldDef): readonly FieldType[] {
  const { type } = def;

  switch (type) {
    case 'list':
      return [type, ...usedFieldTypes(def.item)];
    case 'object':
      return [type, ...def.fields.flatMap(usedFieldTypes)];
    default:
      return [type];
  }
}

/**
 * A polarity the entry does not already carry.
 *
 * So an accepted polarity edit is a real change to the payload
 * whichever way the fixtures are edited: a write back to the stored
 * value would leave every reading after the walk ambiguous.
 *
 * @param entry - The entry being edited.
 * @returns Some other spelling the union carries.
 * @throws If the union carries only the stored one.
 */
function otherPolarity(entry: TermPayloadEntry): TermPolarity {
  return first(
    POLARITY_FACETS.filter((facet) => facet.polarity !== entry.polarity),
    'polarity other than the stored one',
  ).polarity;
}

/**
 * Drill into one entry through the mounted form's own row.
 *
 * @param dialog - The open editor.
 * @param rootLabel - What the list level is called.
 * @param entryLabel - Which entry to open.
 * @returns That entry's mounted form.
 */
async function drillInto(
  dialog: Locator,
  rootLabel: string,
  entryLabel: string,
): Promise<Locator> {
  await nodeForm(dialog, rootLabel)
    .getByRole('button', { name: entryLabel, exact: true })
    .click();

  const form = nodeForm(dialog, entryLabel);

  await expect(form).toBeVisible();

  return form;
}

/**
 * Walk back to the list level through the breadcrumb's first step.
 *
 * The remount every acceptance below is read after — see the header
 * on why a box read at the keystroke says nothing about the draft.
 *
 * @param dialog - The open editor.
 * @param rootLabel - What the list level is called.
 * @returns The list level's own mounted form.
 */
async function walkBack(
  dialog: Locator,
  rootLabel: string,
): Promise<Locator> {
  await breadcrumb(dialog)
    .getByRole('button', { name: rootLabel, exact: true })
    .click();

  const form = nodeForm(dialog, rootLabel);

  await expect(form).toBeVisible();

  return form;
}

/**
 * The two ways an edit reaches the schema and is turned back.
 *
 * Neither is refused by the box it was typed into — see the header on
 * why that is the design rather than a gap, and why both therefore
 * arrive in one banner.
 */
const FIELD_REFUSALS: readonly FieldRefusal[] = [
  {
    what: 'a cleared required member',
    member: 'pattern',
    typed: '',
    // The provider's stated decision: an empty box is `null` and
    // never `''`, so a required member becomes a refusal naming it
    // instead of two spellings of one empty state.
    refused: (entry) => ({ ...entry, pattern: null }),
    repaired: () => REPAIRED_PATTERN,
  },
  {
    what: 'an out-of-union polarity',
    member: 'polarity',
    typed: OUT_OF_UNION_POLARITY,
    refused: (entry) => ({
      ...entry,
      polarity: OUT_OF_UNION_POLARITY,
    }),
    // A polarity the entry does not already carry, so the repair is a
    // real change to the payload whichever way the fixtures are
    // edited — a write back to the stored value would leave the
    // footer's own reading ambiguous.
    repaired: (entry) => first(
      POLARITY_FACETS.filter((facet) => facet.polarity !== entry.polarity),
      'polarity other than the stored one',
    ).polarity,
  },
];

test.describe('the fields presentation', () => {
  for (const refusal of FIELD_REFUSALS) {
    test(
      `refuses ${refusal.what} and offers no save while it stands`,
      async ({ page }) => {
        // Arrange — the payload the form itself opens on, so what is
        // refused below is this category's own entry out of bounds
        // rather than an invented shape.
        const summary = first(await seededSummaries(), 'category summary');
        const terms = await fetchTerms(
          DEFAULT_DOMAIN_SLUG,
          summary.category.id,
        );

        // A category carrying no vocabulary draws no entry to drill
        // into, which would leave every locator below addressing
        // nothing.
        expect(terms.length).toBeGreaterThan(0);

        const payload = toTermPayload(terms);
        const entry = first(payload, 'entry in the stored payload');
        const defs = entryDefs();
        const labels = treeLabels(defs, payload);
        const entryLabel = first(labels.entries, 'entry in the tree');
        const boxLabel = memberLabel(defs, refusal.member);
        const reading = readRefusal(payload, refusal);
        const naming = reading.sentences.filter(
          (sentence) => sentence.includes(refusal.member),
        );

        // Four guards, every one of them about vacuity rather than
        // about the app. A refusal producing no sentence would leave
        // the loops below asserting nothing. A sentence naming no
        // member would leave an operator with nowhere to go, which is
        // the claim this file exists to make. The box's reader
        // answering something other than what this file put in the
        // candidate would make the sentences a coincidence. And a
        // repair the schema also refuses would make the retirement
        // below unmeasurable.
        expect(reading.sentences.length).toBeGreaterThan(0);
        expect(naming.length).toBeGreaterThan(0);
        expect(reading.written).toBe(reading.read);
        expect(
          POLARITY_FACETS.map((facet) => facet.polarity),
        ).not.toContain(OUT_OF_UNION_POLARITY);

        // Act — open the fields presentation. A member has a box only
        // inside an entry: the root node is the LIST, and its form
        // draws one drill-in row per entry rather than any value.
        const dialog = await openFields(page, summary.category.id);
        const save = dialog.getByRole('button', { name: SAVE_NAME });

        // Nothing has been edited, so the footer offers no write. On
        // its own that is also what a form wired to nothing would
        // leave behind; the repair at the end of this case is what
        // separates the two.
        await expect(save).toBeDisabled();

        await nodeForm(dialog, labels.root)
          .getByRole('button', { name: entryLabel, exact: true })
          .click();

        const box = nodeForm(dialog, entryLabel)
          .getByRole('textbox', { name: boxLabel, exact: true });

        await expect(box).toBeVisible();
        await box.fill(refusal.typed);

        // Assert — every sentence the schema produced is on the
        // screen, phrased exactly as the app's own describer phrased
        // it, under the title that says what they add up to.
        await expect(
          dialog.getByText(REFUSED_TITLE, { exact: true }),
        ).toBeVisible();

        for (const sentence of reading.sentences) {
          await expect(
            dialog.getByText(sentence, { exact: true }),
          ).toBeVisible();
        }

        // The refusal is the SCHEMA's and not the box's: the reader
        // took this text, so the control carries no invalid state and
        // the banner is the whole of the channel. Without this the
        // case cannot tell a member only the whole payload can refuse
        // from one the box refuses on its own.
        await expect(box).toHaveAttribute('aria-invalid', 'false');

        // And nothing reached the draft, so there is still nothing to
        // save. The editor opened clean, which is the state where a
        // refusal is the whole of the answer — `JsonEditor` states
        // that a draft already dirtied by an accepted payload stays
        // saveable while a later edit is refused, and the same holds
        // here.
        await expect(save).toBeDisabled();

        // Act — make the member read again.
        await box.fill(refusal.repaired(entry));

        // Assert — the sentences retire rather than accumulating, and
        // the write the schema now takes reaches the draft. This is
        // the control for the two shut footers above, varying exactly
        // the axis under test: the same box, the same form, a value
        // the schema accepts.
        await expect(
          dialog.getByText(REFUSED_TITLE, { exact: true }),
        ).toHaveCount(0);

        for (const sentence of reading.sentences) {
          await expect(
            dialog.getByText(sentence, { exact: true }),
          ).toHaveCount(0);
        }

        await expect(save).toBeEnabled();
      },
    );
  }
});

test.describe('an address the fields presentation is unreachable at', () => {
  test('leaves the surface standing behind it', async ({ page }) => {
    // Arrange — an id past every seeded one, so a fixture that grows
    // cannot quietly make this address a real category. The first
    // seeded category is the control this case ends on.
    const summaries = await seededSummaries();
    const summary = first(summaries, 'category summary');
    const missingId = Math.max(
      ...summaries.map((each) => each.category.id),
    ) + 1;

    // Act
    await page.goto(editPath(SINGLE_DOMAIN_BASE, missingId));

    const dialog = page.getByRole('dialog');

    await expect(dialog).toBeVisible();
    await expectSettled(page);

    // Assert — the read was refused, so the body stands IN FOR every
    // drawing rather than being one of them: there is no presentation
    // control at all, which is what makes the fields presentation
    // unreachable here rather than merely unchosen. A control offered
    // over a category nothing answers to would be an invitation to
    // edit a payload that is not there.
    await expect(
      dialog.getByText(REJECTED_TITLE, { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByRole('tablist')).toHaveCount(0);
    await expect(
      dialog.getByRole('tab', { name: FIELDS_TAB_NAME }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: SAVE_NAME }),
    ).toBeDisabled();

    // Act — close it. The grid cannot be read while the dialog is up:
    // an open Radix dialog sets `aria-hidden` on the app root and the
    // content landmark goes with it.
    await dialog.getByRole('button', { name: CANCEL_NAME }).click();

    // Assert — the close landed back on the list with every card
    // where it was. An address that had taken the surface down with
    // it would fail here rather than above.
    await expect(page).toHaveURL(listPath(SINGLE_DOMAIN_BASE));

    const main = page.getByRole('main');

    for (const { category } of summaries) {
      await expect(categoryCard(main, category.name)).toBeVisible();
    }

    // The control for the two zero counts above, in the same case and
    // varying exactly the axis under test: at a REACHABLE address the
    // very same locators find the control and the segment. Reached by
    // CLICKING rather than by a second `goto`, so the surface is
    // shown live rather than merely painted.
    await main
      .getByRole('button', { name: summary.category.name, exact: true })
      .click();

    const reopened = page.getByRole('dialog');

    await expect(reopened).toBeVisible();
    await expectSettled(page);
    await expect(reopened.getByRole('tablist')).toHaveCount(1);
    await expect(
      reopened.getByRole('tab', { name: FIELDS_TAB_NAME }),
    ).toHaveCount(1);
  });
});

test.describe('the structure the fields presentation navigates', () => {
  test('draws one row per term, and walks in and back out', async ({
    page,
  }) => {
    // Arrange
    const summary = first(await seededSummaries(), 'category summary');
    const terms = await fetchTerms(
      DEFAULT_DOMAIN_SLUG,
      summary.category.id,
    );

    expect(terms.length).toBeGreaterThan(0);

    const payload = toTermPayload(terms);
    const defs = entryDefs();
    const labels = treeLabels(defs, payload);

    // Two guards. The projection covering every entry is what makes
    // the count below a reading of the payload rather than of the
    // tree's own arithmetic. A single-entry payload would leave the
    // drill-in and the walk back measuring the row already selected.
    expect(labels.entries).toHaveLength(payload.length);
    expect(labels.entries.length).toBeGreaterThan(1);

    // A label one position past the last, so a tree that drew a row
    // per something other than an entry is caught. Built off the
    // projection's own FIRST label with its number replaced, rather
    // than spelled, which is what keeps it a near miss rather than a
    // stranger after the numbering is reworded.
    const target = first(
      [...labels.entries].reverse(),
      'entry in the tree',
    );
    const overrun = `${first(labels.entries, 'entry in the tree')
      .replace(/\d+$/u, '')}${labels.entries.length + 1}`;

    // Act
    const dialog = await openFields(page, summary.category.id);

    // Assert — one row per entry, plus the list level they hang
    // under, and each addressable by the name the projection gives
    // it. The overrun is the control that says the name locator
    // discriminates rather than matching whatever it is handed.
    await expect(treeRows(dialog)).toHaveCount(
      labels.entries.length + 1,
    );
    await expect(
      dialog.getByRole('treeitem', { name: labels.root, exact: true }),
    ).toHaveCount(1);

    for (const label of labels.entries) {
      await expect(
        dialog.getByRole('treeitem', { name: label, exact: true }),
      ).toHaveCount(1);
      await expect(
        nodeForm(dialog, labels.root)
          .getByRole('button', { name: label, exact: true }),
      ).toHaveCount(1);
    }

    await expect(
      dialog.getByRole('treeitem', { name: overrun, exact: true }),
    ).toHaveCount(0);

    // The trail opens at the list level and is one step long: the
    // form mounted is the root's, and the breadcrumb says so.
    const steps = breadcrumb(dialog).getByRole('button');

    await expect(steps).toHaveCount(1);
    await expect(steps.first()).toHaveAttribute('aria-current', 'page');

    // Act — click the tree's own row rather than the form's, which
    // is the gesture no other case here makes.
    await dialog
      .getByRole('treeitem', { name: target, exact: true })
      .click();

    // Assert — exactly one form is mounted, and it is that entry's.
    // The zero count is the closed recursion question made visible:
    // a form per level would leave the list level's standing under
    // this one.
    await expect(nodeForm(dialog, target)).toBeVisible();
    await expect(nodeForm(dialog, labels.root)).toHaveCount(0);

    await expect(steps).toHaveCount(2);
    await expect(steps.nth(0)).toHaveText(labels.root);
    await expect(steps.nth(1)).toHaveText(target);
    await expect(steps.nth(0)).not.toHaveAttribute('aria-current', 'page');
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'page');

    // Single-select: one row carries the state, and it is that one.
    await expect(
      dialog.locator('[role="treeitem"][aria-selected="true"]'),
    ).toHaveCount(1);
    await expect(
      dialog.getByRole('treeitem', { name: target, exact: true }),
    ).toHaveAttribute('aria-selected', 'true');

    // Act — walk back through the breadcrumb's first step.
    await walkBack(dialog, labels.root);

    // Assert — the list level is mounted again, the entry's form is
    // gone, and the tree still draws every row it drew before: a
    // walk back that had collapsed the branch would take the rows
    // with it and leave a spec addressing nothing.
    await expect(nodeForm(dialog, target)).toHaveCount(0);
    await expect(steps).toHaveCount(1);
    await expect(treeRows(dialog)).toHaveCount(
      labels.entries.length + 1,
    );
    await expect(
      dialog.getByRole('treeitem', { name: labels.root, exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  test('accounts for all six types, drawing the four in use', async ({
    page,
  }) => {
    // Arrange
    const summary = first(await seededSummaries(), 'category summary');
    const terms = await fetchTerms(
      DEFAULT_DOMAIN_SLUG,
      summary.category.id,
    );

    expect(terms.length).toBeGreaterThan(0);

    const payload = toTermPayload(terms);
    const defs = entryDefs();
    const labels = treeLabels(defs, payload);
    const entryLabel = first(labels.entries, 'entry in the tree');
    const used = new Set(usedFieldTypes(defs));
    const unused = FIELD_TYPES.filter((type) => !used.has(type));
    const fields = entryFields(defs);
    const boxKinds = fields.map((def) => controlKindFor(def.type));
    const unusedKinds = unused.map((type) => controlKindFor(type));

    // The union's two directions, one artifact each. The literal
    // is short of a type dropped from the union; the table gains a
    // key for one added to it, so the lengths disagreeing is what
    // reports a seventh type nobody accounted for here.
    expect(FIELD_TYPES).toHaveLength(
      Object.keys(CONTROL_KIND_BY_TYPE).length,
    );

    // The accounting is TOTAL and the two halves are disjoint, so
    // every one of the six is either drawn below or named as
    // having no site. A type used but outside the roster would
    // leave the sum right and the membership wrong.
    expect([...used].every((type) => FIELD_TYPES.includes(type)))
      .toBe(true);
    expect(used.size + unused.length).toBe(FIELD_TYPES.length);

    // What makes the second half non-vacuous, and a measurement of
    // this payload rather than of the provider: `boolean` is the
    // one absence the markup can report. A def list that later
    // draws all six should delete this guard and the reads under
    // it rather than leaving them passing over nothing.
    expect(unused.length).toBeGreaterThan(0);
    expect(unusedKinds).toContain('toggle');

    // Act
    const dialog = await openFields(page, summary.category.id);
    const form = await drillInto(dialog, labels.root, entryLabel);

    // Assert — every member is drawn as the control its type's row
    // names, addressed by the label its def carries. That crossing
    // is the one `pages/lexicon/fieldDefs.ts` says only a runtime
    // reading can make.
    for (const def of fields) {
      const role = controlKindFor(def.type) === 'toggle'
        ? 'switch'
        : 'textbox';

      await expect(
        form.getByRole(role, { name: def.label, exact: true }),
      ).toHaveCount(1);
    }

    // And nothing else is drawn. `datetime` shares `string`'s box,
    // so no role count can report its absence — the count of boxes
    // against the defs that ask for one is what stands in for it.
    await expect(form.getByRole('textbox')).toHaveCount(
      boxKinds.filter((kind) => kind !== 'toggle').length,
    );

    // The absence that IS observable.
    await expect(form.getByRole('switch')).toHaveCount(0);

    // The two container types are the columns themselves: the list
    // is the level walked back to, and the object is the form
    // standing here. Asserted through the tree and the trail so
    // neither is taken on the def walk's word alone.
    expect(used.has('list')).toBe(true);
    expect(used.has('object')).toBe(true);
    await expect(breadcrumb(dialog).getByRole('button')).toHaveCount(2);
    await expect(treeRows(dialog)).toHaveCount(
      labels.entries.length + 1,
    );
  });
});

/**
 * The four edits the fields presentation takes, one per member.
 *
 * Total over what one entry draws — the accounting case asserts the
 * arity — so "each of the four leaf controls edits its member" is a
 * loop over this table rather than a claim in a comment. Each row
 * states the whole entry its edit produces, which is what lets the
 * reading after the walk cover the members the edit did NOT touch
 * with the same derivation as the one it did.
 */
const ACCEPTED_EDITS: readonly FieldAcceptance[] = [
  {
    what: 'a pattern',
    member: 'pattern',
    typed: () => EDITED_PATTERN,
    read: readStringField,
    accepted: (entry) => ({ ...entry, pattern: EDITED_PATTERN }),
  },
  {
    what: 'a weight',
    member: 'weight',
    typed: (entry) => String(entry.weight + WEIGHT_STEP),
    read: readNumberField,
    accepted: (entry) => ({
      ...entry,
      weight: entry.weight + WEIGHT_STEP,
    }),
  },
  {
    what: 'a polarity',
    member: 'polarity',
    typed: (entry) => otherPolarity(entry),
    read: readStringField,
    accepted: (entry) => ({ ...entry, polarity: otherPolarity(entry) }),
  },
  {
    what: 'a note',
    member: 'notes',
    typed: () => EDITED_NOTE,
    read: readStringField,
    accepted: (entry) => ({ ...entry, notes: EDITED_NOTE }),
  },
];

test.describe('what the fields presentation takes', () => {
  for (const edit of ACCEPTED_EDITS) {
    test(`takes ${edit.what} and moves that member alone`, async ({
      page,
    }) => {
      // Arrange
      const summary = first(await seededSummaries(), 'category summary');
      const terms = await fetchTerms(
        DEFAULT_DOMAIN_SLUG,
        summary.category.id,
      );

      expect(terms.length).toBeGreaterThan(0);

      const payload = toTermPayload(terms);
      const entry = first(payload, 'entry in the stored payload');
      const defs = entryDefs();
      const labels = treeLabels(defs, payload);
      const entryLabel = first(labels.entries, 'entry in the tree');
      const members = ACCEPTED_EDITS.map((each) => each.member);
      const typed = edit.typed(entry);
      const written = edit.accepted(entry);
      const reading = edit.read(typed);

      // The table is total over what one entry draws, so the loop
      // after the walk reads every box the form holds rather than a
      // subset that happens to include the edited one.
      expect(members).toHaveLength(entryFields(defs).length);

      if (!reading.ok) {
        throw new Error(`The box refused the sample: ${edit.what}.`);
      }

      // Four guards, every one about vacuity. The box's reader has
      // to answer what this file says the entry then carries, or the
      // reads below are a coincidence beside the typed text. The
      // edited member's spelling has to MOVE, or a box that never
      // changed satisfies the reading after the walk. Its neighbours
      // have to be left alone by the table itself, or "that member
      // alone" is being asserted of a row that moved two. And the
      // schema has to take the candidate, or this is a refusal case
      // wearing an acceptance's title.
      expect(written[edit.member]).toBe(reading.value);
      expect(spellStored(written[edit.member]))
        .not.toBe(spellStored(entry[edit.member]));

      for (const member of members.filter((each) => each !== edit.member)) {
        expect(written[member]).toBe(entry[member]);
      }

      const candidate = payload.map((held, index) => (
        index === REFUSED_ENTRY_INDEX
          ? written
          : held
      ));

      expect(termPayloadSchema.safeParse(candidate).success).toBe(true);

      // Act
      const dialog = await openFields(page, summary.category.id);
      const save = dialog.getByRole('button', { name: SAVE_NAME });

      await expect(save).toBeDisabled();

      const form = await drillInto(dialog, labels.root, entryLabel);
      const box = form.getByRole('textbox', {
        name: memberLabel(defs, edit.member),
        exact: true,
      });

      await expect(box).toHaveValue(spellStored(entry[edit.member]));
      await box.fill(typed);

      // Assert — the box took the text, nothing was refused, and the
      // write reached the draft. The shut footer this case opened on
      // is what makes the enabled one a change rather than a state
      // the editor was already in.
      await expect(box).toHaveValue(typed);
      await expect(box).toHaveAttribute('aria-invalid', 'false');
      await expect(
        dialog.getByText(REFUSED_TITLE, { exact: true }),
      ).toHaveCount(0);
      await expect(save).toBeEnabled();

      // Act — walk out and back in, which unmounts every control and
      // draws them again from the VALUE. See the header: until this
      // happens the box above is evidence about the box.
      await walkBack(dialog, labels.root);

      const redrawn = await drillInto(dialog, labels.root, entryLabel);

      // Assert — every member reads as this file says it should,
      // which is the edited one moved and the other three left where
      // they were. One loop rather than two: the same derivation
      // covers both, so a case cannot pass by checking only the
      // member it typed into.
      for (const member of members) {
        await expect(
          redrawn.getByRole('textbox', {
            name: memberLabel(defs, member),
            exact: true,
          }),
        ).toHaveValue(spellStored(written[member]));
      }

      await expect(save).toBeEnabled();
    });
  }

  test('takes a large weight typed as text, losing no keystroke', async ({
    page,
  }) => {
    // Arrange
    const summary = first(await seededSummaries(), 'category summary');
    const terms = await fetchTerms(
      DEFAULT_DOMAIN_SLUG,
      summary.category.id,
    );

    expect(terms.length).toBeGreaterThan(0);

    const payload = toTermPayload(terms);
    const entry = first(payload, 'entry in the stored payload');
    const defs = entryDefs();
    const labels = treeLabels(defs, payload);
    const entryLabel = first(labels.entries, 'entry in the tree');
    const numeric = first(
      entryFields(defs).filter((def) => def.type === 'number'),
      'def of the number type',
    );
    const reading = readNumberField(LARGE_WEIGHT_TEXT);

    if (!reading.ok) {
      throw new Error('The box refused the large weight.');
    }

    // The reading after the walk is the VALUE's spelling, so the
    // text has to round-trip through it or that read would be
    // measuring a reformatting rather than a lost digit. Asserted
    // rather than assumed: a text this file chose badly would make
    // the case fail at the wrong claim.
    expect(spellStored(reading.value)).toBe(LARGE_WEIGHT_TEXT);
    expect(LARGE_WEIGHT_TEXT).not.toBe(spellStored(entry.weight));
    expect(controlKindFor(numeric.type)).toBe('numeric');
    expect(
      termPayloadSchema.safeParse(payload.map((held, index) => (
        index === REFUSED_ENTRY_INDEX
          ? { ...entry, weight: reading.value }
          : held
      ))).success,
    ).toBe(true);

    // Act
    const dialog = await openFields(page, summary.category.id);
    const save = dialog.getByRole('button', { name: SAVE_NAME });
    const form = await drillInto(dialog, labels.root, entryLabel);
    const box = form.getByRole('textbox', {
      name: numeric.label,
      exact: true,
    });

    // Assert — the control BEFORE anything is typed. A `number`
    // draws as a plain text box with a decimal keyboard hint, so
    // there is no spinner anywhere to be interacted with and no
    // keystroke filter between the key and the value.
    await expect(box).toHaveAttribute('type', 'text');
    await expect(box).toHaveAttribute('inputmode', 'decimal');
    await expect(dialog.getByRole('spinbutton')).toHaveCount(0);

    // Act — select the stored magnitude and type over it, one
    // character at a time, reading the box back after each. A box
    // asserted once at the end agrees with a control that rewrote
    // the text on the way through.
    await box.click();
    await box.press('ControlOrMeta+a');

    let sofar = '';

    for (const character of LARGE_WEIGHT_TEXT) {
      await box.pressSequentially(character);
      sofar += character;

      await expect(box).toHaveValue(sofar);
    }

    // Assert — every character survived, nothing was refused on
    // the way, and the draft took the edit.
    expect(sofar).toBe(LARGE_WEIGHT_TEXT);
    await expect(box).toHaveValue(LARGE_WEIGHT_TEXT);
    await expect(box).toHaveAttribute('aria-invalid', 'false');
    await expect(dialog.getByRole('spinbutton')).toHaveCount(0);
    await expect(
      dialog.getByText(REFUSED_TITLE, { exact: true }),
    ).toHaveCount(0);
    await expect(save).toBeEnabled();

    // Act — the remount, which is what separates the box holding
    // the text from the value having taken every digit of it.
    await walkBack(dialog, labels.root);

    const redrawn = await drillInto(dialog, labels.root, entryLabel);

    // Assert
    await expect(
      redrawn.getByRole('textbox', { name: numeric.label, exact: true }),
    ).toHaveValue(spellStored(reading.value));
  });
});
/**
 * The verb both move controls open their accessible name with.
 *
 * Retyped rather than imported, the rule this file splits
 * user-visible text from structural spellings by: a case importing
 * `NodeForm.tsx`'s own constant agrees with whatever that constant
 * says, and a reworded control would travel to an operator with
 * nothing reporting it.
 */
const MOVE_VERB = 'Move';

/** The word the control moving a row towards the top ends with. */
const MOVE_UP_WORD = 'up';

/** The word the control moving a row towards the end ends with. */
const MOVE_DOWN_WORD = 'down';

/**
 * The two direction words, in the order a row draws its controls.
 *
 * The ORDER is the claim — the roster read off the rendered
 * controls is compared against a roster built from this, so a pair
 * drawn the other way round is a mismatch naming both positions.
 */
const MOVE_WORDS: readonly string[] = [MOVE_UP_WORD, MOVE_DOWN_WORD];

/** Which row every gesture below moves. Not an end, deliberately. */
const MOVED_ROW_INDEX = 1;

/** Where the pointer path lands it: the position above. */
const LANDED_ROW_INDEX = 0;

/**
 * How far into a row the press that starts a drag goes.
 *
 * Into `SortableRow`'s grip, which it draws first inside the row's
 * own left padding and which `NodeForm.tsx` leaves as the only
 * thing a drag starts from, its content and its move controls both
 * opting out. A press that missed it would start no drag at all,
 * and the order read afterwards is what says it did not.
 */
const GRIP_OFFSET_X = 18;

/**
 * How far below a row's top the drop goes.
 *
 * `Sortable` reads a slot from which half of the row the pointer is
 * over, so this has to be the half ABOVE its midpoint for the drag
 * to mean "land it here" rather than "land it after".
 */
const DROP_OFFSET_Y = 4;

/** How far the press moves before leaving the row it started on. */
const DRAG_LIFT_Y = 6;

/**
 * What makes a synthesized drop come from ANOTHER list.
 *
 * Appended to the drag type `Sortable` wrote itself, so what lands
 * is a type under the library's own namespace naming a group this
 * list does not have — which is the CROSS case rather than a
 * foreign format the component would ignore for a different reason.
 */
const OTHER_LIST_SUFFIX = '-elsewhere';

/** What one synthesized drop put on the wire, and under what name. */
interface SynthesizedDrop {
  /** Every type `Sortable` wrote when the drag started. */
  readonly types: readonly string[];
  /** The type the drop carried; empty if the drag wrote none. */
  readonly dropped: string;
}

/**
 * One list with one item moved, as THIS file states the move.
 *
 * Written out rather than taken from `dynamic-form/values.ts`,
 * which is the module the app answers a move with: a spec deriving
 * its expectation from the code under test cannot report that
 * code's own fault. `to` is where the item LANDS, the convention
 * that module documents and both gestures report in.
 *
 * @param items - The list as it stands.
 * @param from - Where the moved item is now.
 * @param to - Where it lands.
 * @returns The list after the move.
 * @throws If there is no item at `from`.
 */
function movedTo<T>(
  items: readonly T[],
  from: number,
  to: number,
): readonly T[] {
  const moved = items[from];

  if (moved === undefined) {
    throw new Error(`No item at position ${from} to move.`);
  }

  const rest = items.filter((_item, at) => at !== from);

  return [...rest.slice(0, to), moved, ...rest.slice(to)];
}

/** What one row's move control in one direction is called. */
function moveControlName(label: string, word: string): string {
  return `${MOVE_VERB} ${label} ${word}`;
}

/**
 * Every move control's name, in the order the rows draw them.
 *
 * Derived from the tree's own labels rather than spelled, so a
 * renumbering moves this with it — and POSITIONAL by
 * construction, which is the whole point: it is what reports a row
 * lost, duplicated or misnumbered and never what moved.
 *
 * @param labels - What the tree calls the payload and its entries.
 * @returns One name per row per direction.
 */
function moveRoster(labels: TreeLabels): readonly string[] {
  return labels.entries.flatMap(
    (label) => MOVE_WORDS.map((word) => moveControlName(label, word)),
  );
}

/**
 * Every move control of one mounted list form, in DOM order.
 *
 * Matched on the verb rather than listed by name, so a control the
 * form drew and this file did not predict is a roster mismatch
 * rather than an absence nothing looks for.
 *
 * @param form - The list level's own mounted form.
 * @returns Its move controls.
 */
function moveControls(form: Locator): Locator {
  return form.getByRole('button', {
    name: new RegExp(`^${MOVE_VERB} `, 'u'),
  });
}

/**
 * What a set of controls is CALLED, in DOM order.
 *
 * The attribute rather than the computed name, and the two are the
 * same string for both callers: a move control is a `Touchable`
 * whose only content is an `aria-hidden` glyph, and a `TreeNav` row
 * pins its own name with the attribute for the reason that module
 * records. Every other locator in this file addresses these
 * controls through `getByRole`, so the role channel is exercised
 * either way; this is the only reading that answers an ORDER.
 *
 * @param controls - The controls to read.
 * @returns One name per control, in the order the DOM holds them.
 */
async function ariaLabels(
  controls: Locator,
): Promise<readonly (string | null)[]> {
  return controls.evaluateAll(
    (nodes) => nodes.map((node) => node.getAttribute('aria-label')),
  );
}

/**
 * Every draggable row of one mounted list form, in DOM order.
 *
 * Structural rather than by role, because a drag handle has none:
 * `Sortable` puts `draggable` on a bare wrapper around each row,
 * and that wrapper is what a press has to land in. The form's only
 * child is the sortable container and its children are the rows, so
 * the count held against the payload is what says this is still
 * addressing them.
 *
 * @param form - The list level's own mounted form.
 * @returns Its row wrappers.
 */
function dragRows(form: Locator): Locator {
  return form.locator('> div > div');
}

/**
 * What the tree calls the entry at one position.
 *
 * @param labels - What the tree calls the payload and its entries.
 * @param index - The position wanted.
 * @returns Its label.
 * @throws If the tree draws no entry there.
 */
function entryLabelAt(labels: TreeLabels, index: number): string {
  const label = labels.entries[index];

  if (label === undefined) {
    throw new Error(`The tree draws no entry at position ${index}.`);
  }

  return label;
}

/**
 * What one entry reads as, member by member, as a payload holds it.
 *
 * Every member rather than the identifying one: an order compared
 * on `pattern` alone agrees with a reorder that moved the patterns
 * and rebuilt the rest, which is a different bug wearing the same
 * green.
 *
 * @param entry - The entry to spell.
 * @param members - The members one entry draws, in draw order.
 * @returns Its members as their boxes would show them.
 */
function entrySpelling(
  entry: TermPayloadEntry,
  members: readonly (keyof TermPayloadEntry)[],
): readonly string[] {
  return members.map((member) => spellStored(entry[member]));
}

/**
 * What one entry's mounted form shows, member by member.
 *
 * @param form - That entry's own mounted form.
 * @param defs - The list def the presentation draws from.
 * @param members - The members one entry draws, in draw order.
 * @returns One box value per member, in draw order.
 */
async function readEntry(
  form: Locator,
  defs: ListFieldDef,
  members: readonly (keyof TermPayloadEntry)[],
): Promise<readonly string[]> {
  const spelling: string[] = [];

  for (const member of members) {
    const box = form.getByRole('textbox', {
      name: memberLabel(defs, member),
      exact: true,
    });

    spelling.push(await box.inputValue());
  }

  return spelling;
}

/**
 * What the list holds, position by position, read off the boxes.
 *
 * The CONTENT half of the reading the header splits in two: the
 * roster says the rows are still the rows, and this says which
 * entry each one is now over. It drills in and walks back out per
 * position, which is also the remount every other case here reads
 * an acceptance after.
 *
 * @param dialog - The open editor.
 * @param defs - The list def the presentation draws from.
 * @param labels - What the tree calls the payload and its entries.
 * @param members - The members one entry draws, in draw order.
 * @returns One spelling per position, in the order the list holds
 * them.
 */
async function readOrder(
  dialog: Locator,
  defs: ListFieldDef,
  labels: TreeLabels,
  members: readonly (keyof TermPayloadEntry)[],
): Promise<readonly (readonly string[])[]> {
  const order: (readonly string[])[] = [];

  for (const label of labels.entries) {
    const form = await drillInto(dialog, labels.root, label);

    order.push(await readEntry(form, defs, members));
    await walkBack(dialog, labels.root);
  }

  return order;
}

/**
 * Drag one row onto the half above another row's midpoint.
 *
 * Four moves rather than a single `dragTo`, and the count is the
 * measurement rather than a precaution — see the header on why a
 * one-move drag lands the row at the END of the list instead. The
 * press goes into the grip; the two moves over the target are what
 * let `Sortable`'s row handler claim the slot its container claimed
 * first.
 *
 * @param page - The page to drive.
 * @param source - The row wrapper to drag.
 * @param target - The row wrapper to drop it above.
 * @throws If either row has no box on screen.
 */
async function dragRowOnto(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  const held = await source.boundingBox();
  const onto = await target.boundingBox();

  if (held === null || onto === null) {
    throw new Error('A row being dragged is not on screen.');
  }

  const grip = held.y + (held.height / 2);

  await page.mouse.move(held.x + GRIP_OFFSET_X, grip);
  await page.mouse.down();
  await page.mouse.move(held.x + GRIP_OFFSET_X, grip - DRAG_LIFT_Y);
  await page.mouse.move(onto.x + GRIP_OFFSET_X, onto.y + DROP_OFFSET_Y);
  await page.mouse.move(onto.x + GRIP_OFFSET_X, onto.y + DROP_OFFSET_Y - 1);
  await page.mouse.up();
}

/**
 * Drop one row onto its own list, under a type of this file's
 * choosing.
 *
 * The drag type is never spelled here: a real `dragstart` on the
 * row is what makes `Sortable` write its own, and the suffix is
 * appended to whatever came back. So the same call is the refusal
 * and its control, varying exactly the axis under test.
 *
 * No `dragover` is dispatched, which is what makes the accepting
 * form land the row at the END rather than somewhere it has to
 * predict — the same reading the header takes of a one-move drag.
 *
 * @param row - The row wrapper to start the drag on.
 * @param suffix - Appended to the drag's own type; empty leaves it.
 * @returns What the drag wrote, and what the drop carried.
 */
async function dropFromList(
  row: Locator,
  suffix: string,
): Promise<SynthesizedDrop> {
  return row.evaluate((node, tail: string) => {
    const started = new DataTransfer();

    node.dispatchEvent(new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: started,
    }));

    const types = [...started.types];
    const [own] = types;

    if (own === undefined) {
      return { types, dropped: '' };
    }

    const dropped = `${own}${tail}`;
    const carried = new DataTransfer();

    carried.setData(dropped, started.getData(own));
    node.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: carried,
    }));

    return { types, dropped };
  }, suffix);
}

test.describe('the reorder the fields presentation makes', () => {
  test('reaches one order by drag, by move up and by move down', async ({
    page,
  }) => {
    // Arrange
    const summary = first(await seededSummaries(), 'category summary');
    const terms = await fetchTerms(
      DEFAULT_DOMAIN_SLUG,
      summary.category.id,
    );

    expect(terms.length).toBeGreaterThan(0);

    const payload = toTermPayload(terms);
    const defs = entryDefs();
    const labels = treeLabels(defs, payload);
    const members = ACCEPTED_EDITS.map((each) => each.member);
    const stored = payload.map((entry) => entrySpelling(entry, members));
    const expected = movedTo(stored, MOVED_ROW_INDEX, LANDED_ROW_INDEX);
    const roster = moveRoster(labels);
    const movedLabel = entryLabelAt(labels, MOVED_ROW_INDEX);
    const landedLabel = entryLabelAt(labels, LANDED_ROW_INDEX);

    // Six guards, every one about vacuity rather than about the app.
    // The spelling has to cover every box one entry draws, or two
    // entries could differ in a member nothing reads. Every entry has
    // to spell DIFFERENTLY, or an order comparison cannot report a
    // move at all. The projection has to cover the payload, and the
    // row being moved has to exist. The move has to CHANGE the order,
    // or all three gestures agree with a form that did nothing. And
    // the schema has to take what it produces, or the enabled footer
    // below is asserting the wrong outcome.
    expect(members).toHaveLength(entryFields(defs).length);
    expect(new Set(stored.map((each) => each.join(' '))).size)
      .toBe(stored.length);
    expect(labels.entries).toHaveLength(payload.length);
    expect(payload.length).toBeGreaterThan(MOVED_ROW_INDEX);
    expect(expected).not.toEqual(stored);
    expect(
      termPayloadSchema.safeParse(
        movedTo(payload, MOVED_ROW_INDEX, LANDED_ROW_INDEX),
      ).success,
    ).toBe(true);

    // Act — the pointer path. `Sortable` has no keyboard path of its
    // own, so this is the gesture the controls are the equivalent OF
    // rather than the other way round.
    const dragged = await openFields(page, summary.category.id);
    const dragForm = nodeForm(dragged, labels.root);
    const rows = dragRows(dragForm);

    await expect(rows).toHaveCount(payload.length);

    // The editor opens on the stored order, which is the control for
    // every reading below: without it a form that draws the moved
    // order from the start would pass the same assertions.
    expect(await readOrder(dragged, defs, labels, members))
      .toEqual(stored);

    await dragRowOnto(
      page,
      rows.nth(MOVED_ROW_INDEX),
      rows.nth(LANDED_ROW_INDEX),
    );

    // Assert — the drop reached the draft, and the rows behind it are
    // the same rows renumbered rather than a set that lost one.
    await expect(
      dragged.getByRole('button', { name: SAVE_NAME }),
    ).toBeEnabled();

    const afterDrag = await readOrder(dragged, defs, labels, members);

    expect(await ariaLabels(moveControls(dragForm))).toEqual(roster);
    expect(afterDrag).toEqual(expected);

    // Act — the same move with no pointer, from the control on the
    // row that moves.
    const upward = await openFields(page, summary.category.id);
    const upForm = nodeForm(upward, labels.root);
    const moveUp = upForm.getByRole('button', {
      name: moveControlName(movedLabel, MOVE_UP_WORD),
      exact: true,
    });

    expect(await readOrder(upward, defs, labels, members)).toEqual(stored);
    await moveUp.click();

    // Assert
    await expect(
      upward.getByRole('button', { name: SAVE_NAME }),
    ).toBeEnabled();

    const afterUp = await readOrder(upward, defs, labels, members);

    expect(await ariaLabels(moveControls(upForm))).toEqual(roster);
    expect(afterUp).toEqual(expected);

    // Act — the same move again, from the OTHER control on the OTHER
    // row. Moving the row above down and the row below up are one
    // move, so this is the third arrival at one order rather than a
    // second claim.
    const downward = await openFields(page, summary.category.id);
    const downForm = nodeForm(downward, labels.root);
    const moveDown = downForm.getByRole('button', {
      name: moveControlName(landedLabel, MOVE_DOWN_WORD),
      exact: true,
    });

    expect(await readOrder(downward, defs, labels, members))
      .toEqual(stored);
    await moveDown.click();

    // Assert
    await expect(
      downward.getByRole('button', { name: SAVE_NAME }),
    ).toBeEnabled();

    const afterDown = await readOrder(downward, defs, labels, members);

    expect(await ariaLabels(moveControls(downForm))).toEqual(roster);
    expect(afterDown).toEqual(expected);

    // Assert — the claim the three legs above exist for, stated
    // between the MEASURED orders rather than between each of them
    // and this file's own expectation: the pointer path owes a
    // translation the other two do not, and this is where a drift in
    // it would show.
    expect(afterDrag).toEqual(afterUp);
    expect(afterUp).toEqual(afterDown);
  });

  test('renumbers its rows and the tree, and shuts both ends', async ({
    page,
  }) => {
    // Arrange
    const summary = first(await seededSummaries(), 'category summary');
    const terms = await fetchTerms(
      DEFAULT_DOMAIN_SLUG,
      summary.category.id,
    );

    expect(terms.length).toBeGreaterThan(0);

    const payload = toTermPayload(terms);
    const defs = entryDefs();
    const labels = treeLabels(defs, payload);
    const members = ACCEPTED_EDITS.map((each) => each.member);
    const stored = payload.map((entry) => entrySpelling(entry, members));
    const roster = moveRoster(labels);
    const treeNames = [labels.root, ...labels.entries];
    const movedLabel = entryLabelAt(labels, MOVED_ROW_INDEX);
    const landedLabel = entryLabelAt(labels, LANDED_ROW_INDEX);
    const lastLabel = entryLabelAt(labels, payload.length - 1);
    const movedSpelling = stored[MOVED_ROW_INDEX];

    // Three guards. A payload of one row draws no move that is not
    // also an end, so both ends and the middle would be one control.
    // The moved row has to have a spelling to be looked for
    // afterwards. And the roster has to have a control per row per
    // direction, or the ends read below are not ends of anything.
    expect(payload.length).toBeGreaterThan(MOVED_ROW_INDEX + 1);
    expect(movedSpelling).toBeDefined();
    expect(roster).toHaveLength(payload.length * MOVE_WORDS.length);

    // Act
    const dialog = await openFields(page, summary.category.id);
    const form = nodeForm(dialog, labels.root);
    const firstUp = form.getByRole('button', {
      name: moveControlName(entryLabelAt(labels, 0), MOVE_UP_WORD),
      exact: true,
    });
    const lastDown = form.getByRole('button', {
      name: moveControlName(lastLabel, MOVE_DOWN_WORD),
      exact: true,
    });
    const middleUp = form.getByRole('button', {
      name: moveControlName(movedLabel, MOVE_UP_WORD),
      exact: true,
    });

    // Assert — the ends before anything moves. The enabled middle is
    // the control for the two disabled reads: without it a form that
    // shut every move would pass both.
    await expect(firstUp).toBeDisabled();
    await expect(lastDown).toBeDisabled();
    await expect(middleUp).toBeEnabled();
    expect(await ariaLabels(treeRows(dialog))).toEqual(treeNames);

    // Act
    await middleUp.click();

    // Assert — the tree draws the same rows in the same order, which
    // is what POSITIONAL labels mean: nothing about the structure
    // column moved, and what moved is which entry each row is over.
    await expect(
      dialog.getByRole('button', { name: SAVE_NAME }),
    ).toBeEnabled();
    await expect(treeRows(dialog)).toHaveCount(labels.entries.length + 1);
    expect(await ariaLabels(treeRows(dialog))).toEqual(treeNames);
    expect(await ariaLabels(moveControls(form))).toEqual(roster);

    // And the ends are still the ends, the list being the same length.
    await expect(firstUp).toBeDisabled();
    await expect(lastDown).toBeDisabled();

    // The trail is untouched: a reorder is not a move between nodes,
    // and the list level is still what is mounted.
    await expect(breadcrumb(dialog).getByRole('button')).toHaveCount(1);

    // Act — through the TREE's own row rather than the form's, which
    // is what makes this a reading of the structure column.
    await dialog
      .getByRole('treeitem', { name: landedLabel, exact: true })
      .click();

    // Assert — the first position is over the entry that moved into
    // it. The tree's node order followed the value rather than the
    // selection following the item that was there.
    expect(
      await readEntry(nodeForm(dialog, landedLabel), defs, members),
    ).toEqual(movedSpelling);
  });

  test('refuses a drag from another list, and takes its own', async ({
    page,
  }) => {
    // Arrange
    const summary = first(await seededSummaries(), 'category summary');
    const terms = await fetchTerms(
      DEFAULT_DOMAIN_SLUG,
      summary.category.id,
    );

    expect(terms.length).toBeGreaterThan(0);

    const payload = toTermPayload(terms);
    const defs = entryDefs();
    const labels = treeLabels(defs, payload);
    const members = ACCEPTED_EDITS.map((each) => each.member);
    const stored = payload.map((entry) => entrySpelling(entry, members));
    const roster = moveRoster(labels);
    const lastIndex = payload.length - 1;
    const expected = movedTo(stored, MOVED_ROW_INDEX, lastIndex);

    // Three guards. A drop carrying no `dragover` lands the row at the
    // END, so the row being dropped must not already be there or the
    // control below is satisfied by a refusal. The order it produces
    // has to differ from the stored one for the same reason. And
    // every entry has to spell differently, or neither reading can
    // report a move.
    expect(lastIndex).toBeGreaterThan(MOVED_ROW_INDEX);
    expect(expected).not.toEqual(stored);
    expect(new Set(stored.map((each) => each.join(' '))).size)
      .toBe(stored.length);

    // Act
    const dialog = await openFields(page, summary.category.id);
    const form = nodeForm(dialog, labels.root);
    const rows = dragRows(form);
    const save = dialog.getByRole('button', { name: SAVE_NAME });

    await expect(rows).toHaveCount(payload.length);
    await expect(save).toBeDisabled();
    expect(await readOrder(dialog, defs, labels, members)).toEqual(stored);

    const foreign = await dropFromList(
      rows.nth(MOVED_ROW_INDEX),
      OTHER_LIST_SUFFIX,
    );
    const own = first(foreign.types, 'type the drag wrote');

    // Assert — what was dropped was a drag from ANOTHER list and not
    // a foreign format the component would ignore for a different
    // reason: it carries the library's own namespace under a group
    // this list does not have. The single type is the liveness of the
    // whole dispatch — a `dragstart` that reached nothing would
    // leave the transfer empty and everything below vacuous.
    expect(foreign.types).toHaveLength(1);
    expect(foreign.dropped.startsWith(own)).toBe(true);
    expect(foreign.dropped).not.toBe(own);

    // Assert — nothing landed. `NodeForm.tsx` offers the list one
    // group and no receiver, which is what refuses it; the shut
    // footer is the reading with the least room to be a coincidence,
    // a landed reorder being a write to the draft.
    await expect(save).toBeDisabled();
    expect(await ariaLabels(moveControls(form))).toEqual(roster);
    expect(await readOrder(dialog, defs, labels, members)).toEqual(stored);

    // Act — the control, varying exactly the axis under test: the
    // same dispatch on the same row, carrying the list's OWN type.
    const mine = await dropFromList(rows.nth(MOVED_ROW_INDEX), '');

    // Assert — the dispatch does reach the component, so the refusal
    // above is the group being wrong rather than the events going
    // nowhere.
    expect(mine.dropped).toBe(first(mine.types, 'type the drag wrote'));
    await expect(save).toBeEnabled();
    expect(await ariaLabels(moveControls(form))).toEqual(roster);
    expect(await readOrder(dialog, defs, labels, members))
      .toEqual(expected);
  });
});
