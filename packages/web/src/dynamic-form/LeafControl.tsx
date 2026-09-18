/**
 * @packageDocumentation
 * The LEAF half of one member's control: a kind, switched to a box.
 *
 * `./FieldControl.tsx` owns the def union's split and the container
 * row that split reaches; this file is the half it reaches for a
 * leaf — split out of it so neither file has to grow past the
 * other's reading. Nothing crossed the boundary but the code:
 * {@link LeafValue} and `FieldControlProps` are still declared
 * there, so every importer still names that file and the narrowing
 * {@link LeafControlProps.def} arrives with is the caller's, never
 * re-read here.
 *
 * Four of the five kinds are drawn here; the fifth, `choice`, is
 * `./ChoiceField.tsx`'s, split out under the same 800-line law that
 * split this file out of that one, and switched to below.
 *
 * What is drawn is the KIND `./registry.ts` names, which is the
 * last link of a four-module chain: `./fieldDef.ts` says what a
 * field IS, `./registry.ts` says which control kind draws that
 * type, `./readers.ts` says what the text in one box READS as, and
 * this file is where a kind becomes an `@ar/ui` component. Nothing
 * here decides which control a type deserves and nothing here holds
 * a rule about a value; both live one module back, in a `.ts`, for
 * the reason the next section gives.
 *
 * ## No test in this package reaches this file
 *
 * A fact about the runner rather than an omission, and the one
 * `./FieldControl.tsx` records for itself: `@ar/web` runs vitest
 * over `src` in a NODE environment with an include of `*.test.ts`,
 * so a `.tsx` is neither collected nor renderable there — there
 * is no DOM, and a colocated `LeafControl.test.tsx` would not be
 * picked up if one were written. `lint` and `check-types` read this
 * file and no test does.
 *
 * So everything worth asserting has been pushed out of it: which
 * control draws a type is `CONTROL_KIND_BY_TYPE`, pinned row by row
 * in `./registry.test.ts`, and what a control reports reads as is
 * the five readers, pinned refusal by refusal in
 * `./readers.test.ts`.
 * What is left is composition — which component, wired to which
 * reader, inside which envelope — and two things measure it,
 * each reaching what the other cannot.
 *
 * `check-types` proves the bindings. Measured from inside
 * `packages/web`, each leg at EXIT 2, and each landing in THIS file
 * after the split: a container def reaching a leaf control is
 * TS2322 at the JSX prop site, one per case; a member dropped from
 * {@link LeafValue} is TS2322 at every reader that still answers
 * it; and a reader answering an object is TS2322. TS2322 rather
 * than the TS2345 an exhaustive switch answers with — these are
 * assignability faults at a prop, not a discriminant with no case.
 * The legs that land in the container half instead are listed in
 * `./FieldControl.tsx`'s own header.
 *
 * Its RENDERING is measurable with no runner at all, through the
 * offline static-render probe `../../` supports: `react-dom/server`
 * over `./FieldControl.tsx`'s component prints the real markup, and
 * a leaf def mounts what is below, so those readings cover this
 * file as much as that one. They are what says the numeric box
 * carries no `type="number"`, that the toggle is named by
 * `aria-labelledby` and not by a `<label for>` that would not reach
 * it, and that the container row's accessible name is the label
 * alone. Measured 40 of 40 such readings, with eleven mutation legs
 * driven against them to show they discriminate — the six-type
 * count this measurement predates `enum`.
 *
 * The `choice` case was read separately, three readings taken
 * through the same offline probe and not folded into that count;
 * they moved with the control to `./ChoiceField.tsx`, whose header
 * holds them.
 *
 * What NEITHER reaches is the keystroke: a static render fires no
 * `onChange`, so reporting a value WITHOUT reading it is a leg that
 * reds nothing in either gate — measured, and recorded here
 * rather than smoothed over, because it names exactly the line
 * where the Playwright specs under `../../tests/e2e/` take over.
 * They drive a real browser over the assembled form and are the
 * only thing that can.
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
 * labelable control and nothing else. Three of the five leaf kinds
 * are an `<input>` and take it. `toggle` is `Switch`, which renders
 * a `button`, and `../pages/sources/SourceEditorModal.tsx` already
 * ruled that `<label for>` does not reach it — so the toggle and
 * the drill-in row carry `aria-labelledby` pointing at a labelling
 * element instead, which is that file's own `ControlRow` shape
 * restated. The envelope is not a style choice here: it follows
 * from what the control IS.
 *
 * `choice` takes NEITHER spelling, which is a fact about `@ar/ui`'s
 * `Select` rather than a preference: it is a Radix menu trigger
 * taking no `id` and no `aria-labelledby`, so its name comes off
 * `ariaLabel` and it loses the `aria-describedby` every other kind
 * has. That measurement, and what it costs, moved to
 * `./ChoiceField.tsx` with the control.
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
 * ## An action draws a third thing inside the field's envelope
 *
 * A leaf def may name one — `./fieldDef.ts`'s `action`, an id and
 * a label — and where it is DRAWN is this file's decision, since
 * the envelope is. The button goes beside the control and inside
 * the same `FormField`, so the field's label row, its hint and its
 * error slot cover both: an `IconButton` named by `action.label`,
 * which is its whole accessible name because the glyph is
 * `aria-hidden`, and the refusal a rejected run leaves behind
 * rendered in the error slot the reader's refusals already use.
 * `./useFieldAction.tsx` holds the button, the run, the pending
 * flag and that refusal, and its header carries the labelling
 * measurement, the contract, and the static-render readings taken
 * over both — including the one that says an actionless field's
 * markup is byte-identical to what it was before any of this.
 *
 * Two consequences belong here rather than there:
 *
 * - The refusal is shown AHEAD of the reader's own sentence, since
 *   it is about the more recent event, and the box's `aria-invalid`
 *   follows the READING alone — an action that failed says nothing
 *   about the text an operator typed.
 * - `toggle` is the one kind whose envelope is not a `FormField`,
 *   so its row carries the button and a refusal line by hand. The
 *   alternative was a declared action drawing nothing, and
 *   `ToggleField`'s own doc says why that was refused.
 *
 * What NEITHER gate reaches is the press, exactly as neither
 * reaches the keystroke: `check-types` proves the bindings and the
 * static render fires no event, so the run, the write and the
 * refusal arriving are reachable only from a real browser. No spec
 * under `../../tests/e2e/` drives one yet, which means that path is
 * covered by NOTHING today — `./useFieldAction.tsx`'s header says
 * so at length rather than leaving it to be assumed.
 *
 * ## The kind is switched, and its `drill-in` case is a real guard
 *
 * The switch below is over the KIND rather than over `def.type`,
 * which is the whole reason `./registry.ts` exists: three of the
 * five leaf kinds are the same box, and which reader each takes is
 * that table's distinction to make once. Its `drill-in` case is no
 * formality — it is what a registry edit mapping `string` onto
 * the container kind reaches, and drawing that member as a box
 * while reporting nothing is the quietest way this form could lose
 * a field. The opposite disagreement, a container mapped onto a
 * leaf kind, is guarded in `./registry.test.ts`, which pins both
 * container rows to one kind distinct from every leaf kind.
 * Guarding it here as well would be two readings of one property,
 * the shape where either can be deleted with everything still
 * green.
 *
 * ## Spelling a value as box text is the readers read backwards
 *
 * {@link boxText} is the last rule-shaped thing left in this file;
 * `./ChoiceField.tsx`'s `choiceText` is this one narrowed to the
 * single shape a select can hold, and its own header says where the
 * two part. What follows is one line per JSON scalar: a string is
 * itself, a number is its `String`, and anything else — `null`, an absent member, a
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

import type { FieldActionTable } from './actions';
import type { LeafValue } from './FieldControl';
import type { LeafFieldDef } from './fieldDef';
import type { NodePath } from './nodePath';
import type { FieldReading } from './readers';

import { FormField, Switch, TextInput } from '@ar/ui';
import { useId, useState } from 'react';

import { ChoiceField } from './ChoiceField';
import {
  readBooleanField,
  readDatetimeField,
  readNumberField,
  readStringField,
} from './readers';
import { controlKindFor } from './registry';
import { useFieldAction } from './useFieldAction';

/**
 * The branch a total switch over the control kinds has nothing left
 * for.
 *
 * The parameter is `never` while the five leaf kinds are all a leaf
 * def can resolve to, so a sixth reddens the CALL rather than
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
  /** The action table, for a def naming one. */
  readonly actions: FieldActionTable | undefined;
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
  actions,
  onValueChange,
}: TextFieldProps) => {
  const fieldId = useId();
  const faultId = `${fieldId}-fault`;

  // `undefined` until this box is typed into, which is what lets it
  // follow a value edited elsewhere until then. See the header.
  const [typed, setTyped] = useState<string | undefined>(undefined);

  const { withAction, refusal, forgetRefusal } = useFieldAction({
    def,
    path,
    value,
    actions,
    onValueChange,
    // Dropped so the box shows what the action answered rather than
    // the text it was holding — the hold wins while it exists.
    onWrote: () => {
      setTyped(undefined);
    },
  });

  const text = typed ?? boxText(value);
  const reading = read(text);
  const unread = reading.ok
    ? undefined
    : reading.sentence;
  // The action's refusal first: it is about the more recent event,
  // and it is gone by the next keystroke either way.
  const fault = refusal ?? unread;

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
      {withAction(
        <TextInput
          id={fieldId}
          value={text}
          inputMode={inputMode}
          // The library's `invalid` variant paints the border and
          // sets no ARIA state, so the state is set here. It follows
          // the READING alone: an action's refusal is about the
          // action, and says nothing about the text in the box.
          invalid={unread !== undefined}
          aria-invalid={unread !== undefined}
          aria-describedby={fault === undefined
            ? undefined
            : faultId}
          onChange={(next) => {
            // Held first and unconditionally: what was typed stays
            // visible whether or not it reads.
            setTyped(next);
            forgetRefusal();

            const accepted = read(next);

            if (accepted.ok) {
              onValueChange(path, accepted.value);
            }
          }}
        />,
      )}
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
  /** The action table, for a def naming one. */
  readonly actions: FieldActionTable | undefined;
  /** Report the next state. */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
}

/**
 * A switch, and the label it is named by.
 *
 * No refusal from its READER and no typed text, because there is
 * neither to have: `readBooleanField` is total and a switch has no
 * text to be between two states of. An action can still refuse, and
 * the section below says where that sentence goes. It still crosses that reader, so the claim
 * that every leaf value reaches the draft through one stays true.
 *
 * A switch also has no cleared position, which is where it and the
 * select part from the three text readers — a `boolean | null`
 * member cannot be cleared here, and the save path's schema is what
 * says whether that matters. `./readers.ts` holds that split. A
 * value that is not a boolean draws OFF rather than refusing, for
 * the same reason {@link boxText} shows an empty box: naming a
 * member of the wrong shape is the schema's job.
 *
 * An ACTION still draws, and this is the one kind whose envelope is
 * not a `FormField` — so the button sits in the row beside the
 * switch and the refusal takes the hint's place below it, which is
 * what `FormField` does for the other four by itself. The
 * alternative was drawing nothing for a def that declares one, and
 * a declared action silently absent is the quietest way this form
 * could lose a control. The sentence carries no warning mark, since
 * `@ar/ui`'s stroke-icon helper is internal — the same gap
 * `./FieldControl.tsx`'s chevron records.
 *
 * @param props - The def, its path, its value, the action table,
 * and where the next state goes.
 * @returns The named row, its switch, and the rule a run broke.
 */
const ToggleField = ({
  def,
  path,
  value,
  actions,
  onValueChange,
}: ToggleFieldProps) => {
  const labelId = useId();
  const hintId = `${labelId}-hint`;
  const faultId = `${labelId}-fault`;

  const { withAction, refusal, forgetRefusal } = useFieldAction({
    def,
    path,
    value,
    actions,
    onValueChange,
  });

  // The refusal displaces the hint, which is what `FormField` does
  // for the other four kinds and is restated by hand here.
  const hinted = def.description === undefined
    ? undefined
    : hintId;
  const describedBy = refusal === undefined
    ? hinted
    : faultId;

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

        {def.description !== undefined && refusal === undefined && (
          // `tokens.css` puts a direct rule on `p`, so the size, the
          // colour and the margin are all restated here rather than
          // inherited from the column.
          <p id={hintId} className="m-0 mt-0.5 text-xs text-fg3">
            {def.description}
          </p>
        )}
      </div>

      {withAction(
        <Switch
          checked={value === true}
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          onChange={(next) => {
            forgetRefusal();

            const accepted = readBooleanField(next);

            if (accepted.ok) {
              onValueChange(path, accepted.value);
            }
          }}
        />,
      )}

      {refusal !== undefined && (
        // `basis-full` inside the wrapping row above, which is what
        // puts the sentence on its own line under both columns.
        <p id={faultId} className="m-0 basis-full text-xs text-danger">
          {refusal}
        </p>
      )}
    </div>
  );
};

/** What the leaf half of `./FieldControl.tsx` is given. */
interface LeafControlProps {
  /** The member, narrowed to a leaf by the caller's own guard. */
  readonly def: LeafFieldDef;
  /** Where it sits, reported back with every accepted value. */
  readonly path: NodePath;
  /** The value at that path. */
  readonly value: unknown;
  /**
   * The handlers a def's `action` ref is matched against.
   *
   * Optional and threaded from `./DynamicForm.tsx`, which is where
   * `./actions.ts`'s `assertActions` refuses a def naming an id
   * nothing holds. Passed on untouched: which kind draws a button
   * is not this switch's distinction, it is
   * `./useFieldAction.tsx`'s reading of the def.
   */
  readonly actions?: FieldActionTable;
  /** Report a value that read. */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
}

/**
 * The registry's kind, switched to a component.
 *
 * The switch is over the KIND rather than over `def.type`, which is
 * the whole reason `./registry.ts` exists: three of these five kinds
 * are the same box, and which reader each takes is that table's
 * distinction to make once. The `drill-in` case is a real guard —
 * the header says which registry edit reaches it — and the default
 * branch's `never` is what makes a sixth leaf kind a compile error
 * here. The `choice` case carries a second guard of its own, for
 * the narrowing a kind cannot make; the comment there says why.
 *
 * @param props - The leaf def, its path, its value, and where an
 * accepted value goes.
 * @returns The control that kind draws as.
 * @throws If the kind is the container kind, if it is `choice` at a
 * def carrying no options, or if it is outside the union.
 */
export const LeafControl = ({
  def,
  path,
  value,
  actions,
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
          actions={actions}
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
          actions={actions}
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
          actions={actions}
          onValueChange={onValueChange}
        />
      );
    case 'toggle':
      return (
        <ToggleField
          def={def}
          path={path}
          value={value}
          actions={actions}
          onValueChange={onValueChange}
        />
      );
    case 'choice':
      // The narrowing the kind cannot make: `controlKindFor` reads
      // `def.type` and answers a kind, which leaves `def` the whole
      // leaf union. Only `enum` carries options, and only `enum`'s
      // row names this kind — so a def arriving here at another
      // type is a registry row re-pointed, the same fault the
      // `drill-in` case below reports from the other side.
      if (def.type !== 'enum') {
        throw new Error(
          `Field '${def.key}' draws as a choice and carries no options`,
        );
      }

      return (
        <ChoiceField
          def={def}
          path={path}
          value={value}
          actions={actions}
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
