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
 * ## The leaf half lives in `./LeafControl.tsx`
 *
 * Only the CONTAINER branch is written out below. The leaf half is
 * three text kinds that differ by a reader and a keyboard hint, a
 * toggle, the spelling that turns a value back into box text, and
 * the switch over the registry's kind that picks between them —
 * enough that keeping it here left one file nobody could read
 * whole, so it sits in `./LeafControl.tsx` with the sections that
 * document it: why the two envelopes split exactly where
 * labelability does, why typed text is held BESIDE the value and
 * never in it, why the caller's `key` is load-bearing because of
 * that hold, and the static-render readings taken over both files.
 * The split moved code and nothing else: {@link LeafValue} and
 * {@link FieldControlProps} are still declared HERE, so no importer
 * changed, and the narrowing the guard below performs crosses the
 * boundary with the def rather than being re-read there.
 *
 * The labelling ruling covers both halves and is written down
 * there: `FormField`'s `htmlFor` reaches a labelable control and
 * nothing else, so the drill-in row below carries `aria-labelledby`
 * for the same reason the toggle does.
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
 * - What a control reports reads as is the five readers, pinned
 *   refusal by refusal in `./readers.test.ts`.
 * - Whether a def is a container is {@link isContainerField}, pinned
 *   over all seven types in `./fieldDef.test.ts`.
 *
 * What is left is composition: which component, wired to which
 * reader, inside which envelope. Two things measure it and each
 * reaches what the other cannot.
 *
 * Its type bindings are proven by `check-types`, which is the whole
 * of the mutation grid this plan records for the file. Measured,
 * from inside `packages/web`, every one at EXIT 2. The two legs
 * that land HERE after the split are a leaf def reaching the
 * container branch, TS2322, and {@link FieldControlProps.onDrillIn}
 * handed the def's key instead of the path, TS2345. A container def
 * reaching the leaf branch is TS2322 at five JSX prop sites — one
 * per case, which is `./LeafControl.tsx`'s, plus the caller below
 * — and the two legs over {@link LeafValue} red wholly in that
 * file, so its header lists them. TS2322 rather than the TS2345 an
 * exhaustive switch answers with: these are assignability faults at
 * a prop, not a discriminant with no case.
 *
 * Its RENDERING is measurable with no runner at all, through the
 * offline static-render probe `../../` supports: `react-dom/server`
 * over this component prints the real markup, which is what says the
 * numeric box carries no `type="number"`, that the toggle is named by
 * `aria-labelledby` and not by a `<label for>` that would not reach
 * it, and that the container row's accessible name is the label
 * alone. Measured 40 of 40 such readings, with eleven mutation legs
 * driven against them to show they discriminate. A leaf def mounts
 * `./LeafControl.tsx` from the branch below, so those readings
 * cover both files.
 *
 * What NEITHER reaches is the keystroke: a static render fires no
 * `onChange`, so reporting a value WITHOUT reading it is a leg that
 * reds nothing in either gate — measured, and recorded here rather
 * than smoothed over, because it names exactly the line where the
 * Playwright specs under `../../tests/e2e/` take over. They drive a
 * real browser over the assembled form and are the only thing that
 * can.
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
 * The kind is then switched over inside the leaf branch, which is
 * `./LeafControl.tsx`'s — including the `drill-in` case that
 * guards a registry edit mapping a leaf type onto the container
 * kind, and the `never` default a fifth leaf kind reddens. Both are
 * documented there, beside the switch that performs them.
 */

import type { ContainerFieldDef, FieldDef } from './fieldDef';
import type { NodePath } from './nodePath';

import { Touchable } from '@ar/ui';
import { useId } from 'react';

import { isContainerField } from './fieldDef';
import { LeafControl } from './LeafControl';

/**
 * What a leaf control reports, which is every scalar a leaf reads as.
 *
 * The union of the five readers' accepted types rather than
 * `unknown`, so a branch reporting an object or an array is a compile
 * error where it was written (TS2322, measured). The select's reader
 * answers a `string` and so widened it by nothing. `null` is a member
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
   * assume away. `./LeafControl.tsx`'s `boxText` is where that is
   * absorbed.
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
