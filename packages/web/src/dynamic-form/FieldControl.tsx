/**
 * @packageDocumentation
 * One member of the mounted node's flat form: the control kind
 * `./registry.ts` names, drawn.
 *
 * The chain behind one box is four modules long and this is its
 * last link. `./fieldDef.ts` says what a field IS, `./registry.ts`
 * says which control KIND draws that type, `./readers.ts` says what
 * the text in one box READS as, and this file is where a kind
 * becomes an `@ar/ui` component. Nothing here decides which control
 * a type deserves and nothing here holds a rule about a value: both
 * live one module back, in a `.ts`, for the reason the next section
 * gives.
 *
 * ## No test in this package reaches this file
 *
 * That is a fact about the runner rather than an omission. `@ar/web`
 * runs vitest over `src/**` in a NODE environment with an include of
 * `*.test.ts`, so a `.tsx` is neither collected nor renderable
 * there — there is no DOM, and a colocated `FieldControl.test.tsx`
 * would not be picked up if one were written. `lint` and
 * `check-types` read this file and no test does.
 *
 * So the file is deliberately thin, and everything it would be worth
 * asserting about has been pushed out of it:
 *
 * - Which control draws a type is `CONTROL_KIND_BY_TYPE`, pinned row
 *   by row in `./registry.test.ts`.
 * - What a box's text reads as is the four readers, pinned refusal
 *   by refusal in `./readers.test.ts`.
 * - Whether a def is a container is {@link isContainerField}, pinned
 *   over all six types in `./fieldDef.test.ts`.
 *
 * What is left is composition: which component, wired to which
 * reader, inside which envelope. Two things measure it and each
 * reaches what the other cannot.
 *
 * Its type bindings are proven by `check-types`, which is the whole
 * of the mutation grid this plan records for the file. Measured, from
 * inside `packages/web`, every one at EXIT 2: a container def
 * reaching the leaf branch is TS2322 at the JSX prop site (five of
 * them, one per case plus the caller); a leaf def reaching the
 * container branch is TS2322; a member dropped from
 * {@link LeafValue} is TS2322 at every reader that still answers it;
 * a reader answering an object is TS2322; and
 * {@link FieldControlProps.onDrillIn} handed the def's key instead of
 * the path is TS2345. TS2322 rather than the TS2345 an
 * exhaustive switch answers with — these are assignability faults at
 * a prop, not a discriminant with no case.
 *
 * Its RENDERING is measurable with no runner at all, through the
 * offline static-render probe `../../` supports: `react-dom/server`
 * over this component prints the real markup, which is what says the
 * numeric box carries no `type="number"`, that the toggle is named by
 * `aria-labelledby` and not by a `<label for>` that would not reach
 * it, and that the container row's accessible name is the label
 * alone. Measured 40 of 40 such readings, with eleven mutation legs
 * driven against them to show they discriminate.
 *
 * What NEITHER reaches is the keystroke: a static render fires no
 * `onChange`, so reporting a value WITHOUT reading it is a leg that
 * reds nothing in either gate — measured, and recorded here rather
 * than smoothed over, because it names exactly the line where the
 * Playwright specs under `../../tests/e2e/` take over. They drive a
 * real browser over the assembled form and are the only thing that
 * can.
 *
 * ## Typed text is held BESIDE the value, never in it
 *
 * The one thing this file does hold state for, and the reason it is
 * a component rather than a function of props. A box shows what was
 * TYPED; the form reports what READ. Those are two different things
 * on every keystroke that is not yet a value, and collapsing them
 * loses one of them:
 *
 * - Derive the box from the value alone, and text that does not read
 *   as a value cannot be shown at all. A half-typed stamp, a lone
 *   minus sign, a `1e` on the way to `1e6` — each would be
 *   rewritten back to the last accepted value under the cursor.
 * - Report the text instead of the reading, and the draft takes
 *   values the schema will refuse. `Number('')` is `0`, which is the
 *   case that makes this a rule rather than a preference.
 *
 * So the text is held here and the reading is reported. Text that
 * refuses stays VISIBLE, states the rule it breaks, and reaches
 * {@link FieldControlProps.onValueChange} not at all — the draft
 * keeps the last value that read.
 *
 * `../pages/lexicon/LexiconEditorModal.tsx` reaches the same rule
 * for a term's weight and `../pages/sources/SourceEditorModal.tsx`
 * for a feed's endpoint; this is that shape generalised over the
 * def, not a third mechanism. The consequence both of them state is
 * worth restating: a save can be OFFERED while a box shows a
 * refusal, because the refusal means the last keystroke did not
 * reach the draft and the save is of what did.
 *
 * The hold is `undefined` until something is typed, which is what
 * lets the box follow a value edited elsewhere — the JSON
 * presentation, a reorder — up until the moment an operator takes
 * the box over. From then on it is theirs for as long as the control
 * is mounted.
 *
 * ### Which makes the caller's `key` load-bearing
 *
 * The hold's lifetime is this component's mount, and that is the
 * correct lifetime only if a different member is a different mount.
 * `./NodeForm.tsx` therefore keys each control by `pathKey(path)`:
 * without it React reuses the control at a position when the
 * selected node changes, and one member's half-typed text would
 * appear in another's box. Nothing in this file can enforce that,
 * which is why it is written down.
 *
 * ## Two envelopes, split exactly where labelability does
 *
 * `FormField` owns labelling through `htmlFor`, which reaches a
 * labelable control and nothing else. Three of the four leaf kinds
 * are an `<input>` and take it. The fourth is `Switch`, which
 * renders a `button`, and `../pages/sources/SourceEditorModal.tsx`
 * already ruled that `<label for>` does not reach it — so the
 * toggle and the drill-in row carry `aria-labelledby` pointing at a
 * labelling element instead, which is that file's own `ControlRow`
 * shape restated. The envelope is not a style choice here: it
 * follows from what the control IS.
 *
 * A def's `description` is the hint under the box. `FormField`
 * REPLACES that hint with the error while there is one, which is its
 * behaviour and is the right trade — while a box states a rule, the
 * rule matters more than the clarification. The refusal carries the
 * id INSIDE the error slot rather than on the span `FormField` wraps
 * it in, which is what leaves it addressable by `aria-describedby`;
 * the hint has no id and is wired to nothing, exactly as the two
 * editors above leave theirs.
 *
 * ## A container row reports a PATH, and reads no value at all
 *
 * The two container kinds share one row because the two-column
 * decision leaves nothing for a second one to vary: a container is
 * never drawn inline, so the row's whole job is to name the node and
 * report where it is. It calls
 * {@link FieldControlProps.onDrillIn} with the path and never
 * {@link FieldControlProps.onValueChange} with anything.
 *
 * It is a function of the DEF and the PATH and not of the value,
 * which is stronger than it needs to be and is deliberate. A row
 * saying how many items a list holds would be a second reading of
 * the value, in the one file no test can reach, to say something the
 * form on the other side of the drill-in says for itself. The
 * trailing chevron is `aria-hidden`, so the row's accessible name
 * is the def's label EXACTLY — which is what keeps a Playwright
 * locator addressing one row rather than a concatenation of its
 * contents, and what keeps the visible label and the accessible
 * name the same string.
 *
 * ## Why the def narrows before the kind is switched
 *
 * {@link isContainerField} runs first, and not because the kind is
 * insufficient. It is the only thing that narrows `def` — the kind
 * comes off `def.type` and says nothing about the union — and the
 * narrowing is what lets the container branch reach `item` and
 * `fields` with no cast and what makes handing it a leaf def a
 * compile error rather than a runtime one.
 *
 * The kind is then switched over inside the leaf branch, where its
 * `drill-in` case is a real guard and not a formality: it is what a
 * registry edit mapping `string` onto the container kind reaches,
 * and drawing that member as a box while reporting nothing is the
 * quietest way this form could lose a field. The opposite
 * disagreement — a container mapped onto a leaf kind — is guarded
 * in `./registry.test.ts`, which pins both container rows to one
 * kind distinct from every leaf kind. Guarding it here as well would
 * be two readings of one property, the shape where either can be
 * deleted with everything still green.
 *
 * ## Spelling a value as box text is the readers read backwards
 *
 * {@link boxText} is the only rule-shaped thing left in this file,
 * and it is one line per JSON scalar: a string is itself, a number
 * is its `String`, and anything else — `null`, an absent member, a
 * value of the wrong shape — is an EMPTY box. That last clause is
 * not a fallback. It is the readers' own convention read in the
 * other direction: an empty box reads as `null`, so `null` spells as
 * an empty box, and the two directions round-trip.
 *
 * A value of the WRONG shape at a leaf member therefore shows as
 * empty rather than as itself, and the save path's schema is what
 * names it — the same division of labour `./readers.ts` states. It
 * is local rather than promoted to a `.ts` because it is the inverse
 * of a module that already exists and has no second caller; a
 * reader that needs it elsewhere should move it to `./readers.ts`
 * beside the readers it mirrors, not copy it.
 */

import type {
  ContainerFieldDef,
  FieldDef,
  LeafFieldDef,
} from './fieldDef';
import type { NodePath } from './nodePath';
import type { FieldReading } from './readers';

import { FormField, Switch, TextInput, Touchable } from '@ar/ui';
import { useId, useState } from 'react';

import { isContainerField } from './fieldDef';
import {
  readBooleanField,
  readDatetimeField,
  readNumberField,
  readStringField,
} from './readers';
import { controlKindFor } from './registry';

/**
 * What a leaf control reports, which is every scalar a leaf reads as.
 *
 * The union of the four readers' accepted types rather than
 * `unknown`, so a branch reporting an object or an array is a compile
 * error where it was written (TS2322, measured). `null` is a member
 * because a cleared box answers it — see `./readers.ts` on why
 * that is the cleared state rather than `''`.
 *
 * Which direction this binds is worth stating, because only one of
 * them does. NARROWING it reddens: dropping `number` reds the numeric
 * branch and dropping `null` reds all three text branches, each at
 * the reader that still answers the member. WIDENING
 * {@link FieldControlProps.onValueChange}'s parameter to `unknown`
 * reds NOTHING and cannot — a handler taking `unknown` accepts every
 * `LeafValue`, which is contravariance rather than a missing guard.
 * So this union constrains what a BRANCH may report and says nothing
 * about what a caller must accept; a caller wanting the narrower
 * contract enforced states it on its own handler.
 */
export type LeafValue = string | number | boolean | null;

/** What one member of a node's flat form is given. */
export interface FieldControlProps {
  /**
   * The member to draw.
   *
   * The whole union: the branch below narrows it, and a caller that
   * had to narrow first would be doing this file's job.
   */
  readonly def: FieldDef;
  /**
   * Where this member sits, absolute from the tree's root.
   *
   * Reported back with every edit and with every drill-in, so a
   * caller writes through `./values.ts` without tracking which
   * control it handed which path.
   */
  readonly path: NodePath;
  /**
   * The value at {@link FieldControlProps.path}, as the draft has it.
   *
   * `unknown` because a def describes a shape the value is only
   * SUPPOSED to have: it arrives from a payload, and a member of the
   * wrong shape is a state this form has to survive rather than
   * assume away. {@link boxText} is where that is absorbed.
   *
   * Unread by the container branch — see the header.
   */
  readonly value: unknown;
  /**
   * Report a value that READ, at the path it belongs to.
   *
   * Fires on nothing else, which is the whole of the refusal a leaf
   * control performs. Text that does not read moves no value and
   * calls nothing.
   */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
  /**
   * Report that a container row was pressed.
   *
   * A path and never a value: the shell answers by mounting that
   * node's own form. Unreachable from a leaf control.
   */
  readonly onDrillIn: (path: NodePath) => void;
}

/**
 * The branch a total switch over the control kinds has nothing left
 * for.
 *
 * The parameter is `never` while the four leaf kinds are all a leaf
 * def can resolve to, so a fifth reddens the CALL rather than
 * reaching the throw. It still throws for the reason every guard in
 * this directory does: the compiler's guarantee stops at this app's
 * boundary, and a def out of a payload can carry a type whose row
 * resolves to a kind no case claims.
 *
 * @param kind - The kind no case above claimed.
 * @returns Never; the call does not return.
 * @throws Always, naming the kind that reached it.
 */
function unreachableLeafKind(kind: never): never {
  throw new Error(`No leaf control for kind: ${String(kind)}`);
}

/**
 * Spell a value as the text its box opens with.
 *
 * Total over every value a payload can hold, and the readers'
 * emptiness convention read backwards — see the header for why the
 * `''` is a round trip rather than a fallback.
 *
 * @param value - The value at this member's path.
 * @returns Its spelling, or `''` for a value no box can show.
 */
function boxText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

/** What one text-shaped leaf box is given. */
interface TextFieldProps {
  /** The member, narrowed to a leaf so no container reaches here. */
  readonly def: LeafFieldDef;
  /** Where it sits, reported back with every accepted value. */
  readonly path: NodePath;
  /** The value at that path, spelled by {@link boxText}. */
  readonly value: unknown;
  /**
   * The reader this kind's text crosses to become a value.
   *
   * A parameter rather than a switch inside this component: which
   * reader a kind uses is `./registry.ts`'s distinction between
   * `text`, `numeric` and `timestamp`, and reading it twice is what
   * that table exists to avoid.
   */
  readonly read: (text: string) => FieldReading<LeafValue>;
  /**
   * The keyboard a touch device should offer, where one helps.
   *
   * Set for `numeric` alone. A stamp carries letters, so a decimal
   * keypad would be the wrong one, and prose has no hint to give.
   */
  readonly inputMode?: 'decimal';
  /** Report a value that read. */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
}

/**
 * A leaf box: what was typed, what it read as, and what it broke.
 *
 * One component for all three text kinds, which differ by their
 * reader and by a keyboard hint and in nothing else. The box is left
 * at `TextInput`'s default `type="text"` for every one of them,
 * `numeric` included: a native number input filters keystrokes and
 * forces a spinner, and the source doc's own table asks a `number`
 * for direct manual text entry. Every guard over that text is
 * `readNumberField`'s, which is where it can be tested.
 *
 * @param props - The def, its path, its value, the reader, the
 * keyboard hint, and where an accepted value goes.
 * @returns The labelled box, and the rule it breaks while it does.
 */
const TextField = ({
  def,
  path,
  value,
  read,
  inputMode,
  onValueChange,
}: TextFieldProps) => {
  const fieldId = useId();
  const faultId = `${fieldId}-fault`;

  // `undefined` until this box is typed into, which is what lets it
  // follow a value edited elsewhere until then. See the header.
  const [typed, setTyped] = useState<string | undefined>(undefined);

  const text = typed ?? boxText(value);
  const reading = read(text);
  const fault = reading.ok
    ? undefined
    : reading.sentence;

  return (
    <FormField
      label={def.label}
      htmlFor={fieldId}
      hint={def.description}
      // The id rides INSIDE the slot rather than on the span
      // FormField wraps it in, which is what leaves the sentence
      // addressable by `aria-describedby` below.
      error={fault === undefined
        ? undefined
        : <span id={faultId}>{fault}</span>}
    >
      <TextInput
        id={fieldId}
        value={text}
        inputMode={inputMode}
        // The library's `invalid` variant paints the border and sets
        // no ARIA state, so the state is set here.
        invalid={fault !== undefined}
        aria-invalid={fault !== undefined}
        aria-describedby={fault === undefined
          ? undefined
          : faultId}
        onChange={(next) => {
          // Held first and unconditionally: what was typed stays
          // visible whether or not it reads.
          setTyped(next);

          const accepted = read(next);

          if (accepted.ok) {
            onValueChange(path, accepted.value);
          }
        }}
      />
    </FormField>
  );
};

/** What one toggle row is given. */
interface ToggleFieldProps {
  /** The member, narrowed to a leaf so no container reaches here. */
  readonly def: LeafFieldDef;
  /** Where it sits, reported back with the next state. */
  readonly path: NodePath;
  /** The value at that path; anything but `true` draws it off. */
  readonly value: unknown;
  /** Report the next state. */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
}

/**
 * A switch, and the label it is named by.
 *
 * No refusal slot and no typed text, because there is neither to
 * have: `readBooleanField` is total and a switch has no text to be
 * between two states of. It still crosses that reader, so the claim
 * that every leaf value reaches the draft through one stays true.
 *
 * A switch also has no cleared position, which is the one place the
 * four readers disagree — a `boolean | null` member cannot be
 * cleared here, and the save path's schema is what says whether that
 * matters. A value that is not a boolean draws OFF rather than
 * refusing, for the same reason {@link boxText} shows an empty box:
 * naming a member of the wrong shape is the schema's job.
 *
 * @param props - The def, its path, its value, and where the next
 * state goes.
 * @returns The named row and its switch.
 */
const ToggleField = ({
  def,
  path,
  value,
  onValueChange,
}: ToggleFieldProps) => {
  const labelId = useId();
  const hintId = `${labelId}-hint`;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <div className="min-w-[10rem] flex-1">
        {/* A div rather than a `<label>`: `Switch` renders a button
            and `<label for>` does not reach it, which is the ruling
            `../pages/sources/SourceEditorModal.tsx` already made. */}
        <div
          id={labelId}
          className="text-[13px] font-semibold text-fg1"
        >
          {def.label}
        </div>

        {def.description !== undefined && (
          // `tokens.css` puts a direct rule on `p`, so the size, the
          // colour and the margin are all restated here rather than
          // inherited from the column.
          <p id={hintId} className="m-0 mt-0.5 text-xs text-fg3">
            {def.description}
          </p>
        )}
      </div>

      <Switch
        checked={value === true}
        aria-labelledby={labelId}
        aria-describedby={def.description === undefined
          ? undefined
          : hintId}
        onChange={(next) => {
          const accepted = readBooleanField(next);

          if (accepted.ok) {
            onValueChange(path, accepted.value);
          }
        }}
      />
    </div>
  );
};

/**
 * The chevron's own chrome.
 *
 * The step right is a TRANSFORM, which is the only kind of motion
 * this repo's web rules allow on hover, and `group-hover:` is what
 * reaches it from the row — the glyph is not the button's child in
 * the cascade, so nothing else would.
 */
const DRILL_IN_CHEVRON = 'shrink-0 text-fg3 transition-transform '
  + 'group-hover:translate-x-0.5';

/**
 * The chevron a drill-in row ends with.
 *
 * Drawn here rather than taken from `@ar/ui`, whose stroke-icon
 * helper is internal and never re-exported — `@ar/ui`'s own
 * `Breadcrumb` draws its separator the same way for the same reason.
 * `aria-hidden`, so the row's accessible name stays the def's label
 * exactly.
 *
 * @returns The glyph, hidden from the accessibility tree.
 */
const DrillInChevron = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={DRILL_IN_CHEVRON}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/**
 * The drill-in row's own chrome, hoisted off the call.
 *
 * `Touchable` is interaction-only and supplies no fill, so the
 * surface, the border, the padding and the alignment are this
 * row's. Hoisted because the list is what pushes the JSX line past
 * the width this directory holds, which no formatter here reflows.
 *
 * Sunk rather than tinted, for the reason
 * `../components/JsonEditor.tsx` gives about the same token: that
 * surface already means "not where you type" everywhere in this
 * app, and a row you descend THROUGH is exactly that.
 *
 * The hover state is the border firming and the chevron stepping
 * right — a transform rather than a layout property, and `group`
 * is what carries it from the button to a glyph that is not its
 * child in the cascade. `Touchable` supplies the focus ring and
 * the press transform, so those are not restated.
 */
const DRILL_IN_ROW = 'group justify-between gap-3 rounded-md border '
  + 'border-border-soft bg-surface-sunk px-3 py-2 text-left '
  + 'transition-colors hover:border-border-strong';

/** What one container row is given. */
interface DrillInRowProps {
  /**
   * The member, narrowed to a container.
   *
   * Which is what makes handing this branch a leaf def a compile
   * error — the binding the plan's mutation grid drives.
   */
  readonly def: ContainerFieldDef;
  /** The path this row reports, and the only thing it reports. */
  readonly path: NodePath;
  /** Report that the row was pressed. */
  readonly onDrillIn: (path: NodePath) => void;
}

/**
 * A container: the row that opens its own form.
 *
 * One row for a `list` and for an `object` both, reading no value
 * and reporting no value — see the header on why that is the whole
 * of it. `Touchable` supplies the button semantics, the focus ring
 * and the press transform; the description sits OUTSIDE the button
 * and is wired by `aria-describedby`, so the accessible name is the
 * label and not the label plus everything under it.
 *
 * @param props - The container def, its path, and where the press
 * goes.
 * @returns The pressable row, and its description under it.
 */
const DrillInRow = ({ def, path, onDrillIn }: DrillInRowProps) => {
  const hintId = useId();

  return (
    <div className="flex flex-col gap-[7px]">
      <Touchable
        stretch
        aria-describedby={def.description === undefined
          ? undefined
          : hintId}
        className={DRILL_IN_ROW}
        onClick={() => {
          onDrillIn(path);
        }}
      >
        <span className="text-[13px] font-semibold text-fg1">
          {def.label}
        </span>
        <DrillInChevron />
      </Touchable>

      {def.description !== undefined && (
        <span id={hintId} className="text-xs text-fg3">
          {def.description}
        </span>
      )}
    </div>
  );
};

/** What the leaf half of {@link FieldControl} is given. */
interface LeafControlProps {
  /** The member, narrowed to a leaf by the caller's own guard. */
  readonly def: LeafFieldDef;
  /** Where it sits, reported back with every accepted value. */
  readonly path: NodePath;
  /** The value at that path. */
  readonly value: unknown;
  /** Report a value that read. */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
}

/**
 * The registry's kind, switched to a component.
 *
 * The switch is over the KIND rather than over `def.type`, which is
 * the whole reason `./registry.ts` exists: three of these four kinds
 * are the same box, and which reader each takes is that table's
 * distinction to make once. The `drill-in` case is a real guard —
 * the header says which registry edit reaches it — and the default
 * branch's `never` is what makes a fifth leaf kind a compile error
 * here.
 *
 * @param props - The leaf def, its path, its value, and where an
 * accepted value goes.
 * @returns The control that kind draws as.
 * @throws If the kind is the container kind, or outside the union.
 */
const LeafControl = ({
  def,
  path,
  value,
  onValueChange,
}: LeafControlProps) => {
  // A local const rather than `controlKindFor(def.type)` inline in
  // the switch: narrowing works on the const, and the default
  // branch is what carries the exhaustiveness.
  const kind = controlKindFor(def.type);

  switch (kind) {
    case 'text':
      return (
        <TextField
          def={def}
          path={path}
          value={value}
          read={readStringField}
          onValueChange={onValueChange}
        />
      );
    case 'numeric':
      return (
        <TextField
          def={def}
          path={path}
          value={value}
          read={readNumberField}
          inputMode="decimal"
          onValueChange={onValueChange}
        />
      );
    case 'timestamp':
      return (
        <TextField
          def={def}
          path={path}
          value={value}
          read={readDatetimeField}
          onValueChange={onValueChange}
        />
      );
    case 'toggle':
      return (
        <ToggleField
          def={def}
          path={path}
          value={value}
          onValueChange={onValueChange}
        />
      );
    case 'drill-in':
      throw new Error(
        `Leaf field '${def.key}' resolved to the container control`,
      );
    default:
      return unreachableLeafKind(kind);
  }
};

/**
 * One member of a node's flat form.
 *
 * The narrowing runs before the kind is switched, for the reason the
 * header gives: {@link isContainerField} is the only thing that
 * splits the def union, and the split is what lets each branch reach
 * its own members with no cast.
 *
 * @param props - The def, its path, its value, and the two reports
 * a member can make.
 * @returns A leaf control, or the row that drills into a container.
 */
export const FieldControl = ({
  def,
  path,
  value,
  onValueChange,
  onDrillIn,
}: FieldControlProps) => {
  if (isContainerField(def)) {
    return <DrillInRow def={def} path={path} onDrillIn={onDrillIn} />;
  }

  return (
    <LeafControl
      def={def}
      path={path}
      value={value}
      onValueChange={onValueChange}
    />
  );
};
