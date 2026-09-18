/**
 * @packageDocumentation
 * The action beside a leaf: the button, the run, and the two pieces
 * of state one press can leave behind.
 *
 * `./fieldDef.ts` says a leaf def MAY name an action, `./actions.ts`
 * says what a handler IS and refuses a def naming an id the table
 * does not hold, and this file is where a press becomes a call. It
 * is the only module in this directory that RUNS one — the two
 * above read ids and declare types, and `./LeafControl.tsx` draws
 * boxes.
 *
 * `.specs/q20b-0-dynamic-form-enum-and-actions.md` decisions 2 and 4
 * are the authority; the second is quoted in `./actions.ts`'s header
 * beside the type it constrains and is not restated whole here.
 *
 * It is a hook and not a component because what an action needs from
 * a field is not one node: the button goes BESIDE the control, and
 * the refusal goes in the field's own error slot, which is
 * `FormField`'s and which the field already owns. A component
 * wrapping both would have to own the labelling too, and labelling
 * is the one thing `./LeafControl.tsx` documents as following from
 * what each control IS.
 *
 * ## A separate file because of the 800-line law
 *
 * `./LeafControl.tsx` is the caller and the natural home; it sits
 * near enough the cap that the button, the glyph, the run and the
 * prose below would push it past. Split for room, exactly as that
 * file was split out of `./FieldControl.tsx` — so nothing here is
 * a new layer, and the leaf props it takes are the field's own.
 *
 * ## The button's name IS `action.label`, and nothing else
 *
 * `@ar/ui`'s `IconButton` renders a `button` carrying no text: its
 * `label` prop becomes `aria-label` and the glyph is the child.
 * Measured against the component as shipped — `aria-label={label}`
 * on the element, `type="button"` fixed, and the rest of
 * `ButtonHTMLAttributes` spread, which is what lets `disabled` and
 * `aria-busy` through from here.
 *
 * So the accessible name of the control is the def's
 * {@link FieldActionRef.label} EXACTLY, with no contribution from
 * the glyph below, which is `aria-hidden` for that reason. Two
 * things follow and both are why it is written down:
 *
 * - A Playwright locator can address the button as
 *   `getByRole('button', { name: <label>, exact: true })` inside the
 *   `role="group"` `./NodeForm.tsx` draws, with no collision against
 *   a drill-in row (named after a CONTAINER's label) or a `TreeNav`
 *   row (a `span`, not a `button`).
 * - The label is the whole of what an operator without sight of the
 *   glyph is told, which is why `./fieldDef.ts` carries it on the
 *   DEF rather than leaving it to the handler.
 *
 * ## The press is covered ONLY by e2e, and that is measured
 *
 * The two gates this directory's `.tsx` files live under both stop
 * short of the click, and neither can be made to reach it:
 *
 * - `check-types` proves the bindings and nothing about behaviour.
 *   Three legs measured from inside `packages/web`, each at EXIT 2
 *   and each restored byte-identical (`shasum -a 256 -c`): the
 *   answer reported without the `undefined` narrowing is TS2345,
 *   `Argument of type 'LeafValue | undefined' is not assignable to
 *   parameter of type 'LeafValue'`; the context assembled without
 *   `def` is TS2345 against `FieldActionContext` at the call, which
 *   is decision 4's three members held by the signature;
 *   {@link heldValue} answering an object is TS2322 against
 *   `LeafValue | undefined`. What none of the three says is what a
 *   press DOES.
 * - The offline static-render probe `../../context/testing.md`
 *   describes prints the real markup, and it was run: a leaf whose
 *   def carries an action prints a `button` with
 *   `aria-label="Normalise URL"` — the label, alone, since the
 *   glyph is `aria-hidden="true"` — beside the box in one grid
 *   row, and `aria-busy="false"` with no `disabled` at rest. The
 *   same def with no `action` prints markup BYTE-IDENTICAL to
 *   HEAD's, diffed against the same probe run over the files as
 *   they were — read for a text box and for a toggle, which are
 *   the two envelopes — and that is what says an actionless field
 *   is untouched by any of this. Two state legs reach what a static render
 *   cannot start: the pending hold seeded `true` prints
 *   `disabled=""` and `aria-busy="true"`, and the refusal hold
 *   seeded with a sentence prints it in the error slot with
 *   `aria-describedby` pointing at it while `aria-invalid` stays
 *   `"false"` — both restored byte-identical afterward.
 * - What the probe still cannot do is fire the event.
 *   `renderToStaticMarkup` has no click, so everything below the
 *   `onClick` is unreached by it: the call, the flag flipping of
 *   its own accord, the write, the hold being dropped, and the
 *   refusal arriving from a rejection rather than from a seed.
 *
 * That is the same line `./LeafControl.tsx` records for the
 * keystroke, for the same reason, and the Playwright specs under
 * `../../tests/e2e/` are the only thing on the other side of it. A
 * spec driving one is the plan item that closes it; until such a
 * spec exists, the run path is covered by NOTHING, and saying so
 * here is the point of this section.
 *
 * ## Why the state is here and adds no unit case
 *
 * Two `useState` holds — pending and the last refusal — and no
 * third. The unit runner collects `.ts` under `src` in a node
 * environment and reaches no `.tsx` at all, so state in this file is
 * state no case can read; the spec caps this wave's unit growth at
 * the cases it names, and inventing a runner to reach two booleans
 * would buy a reading the e2e spec above takes anyway.
 *
 * What was kept OUT of here is the part that could be pinned:
 * `./actions.ts` holds the handler's shape and the reading that a
 * def list and a table agree, with colocated cases over both. The
 * division is the directory's standing one — a decision in a `.ts`,
 * a composition in a `.tsx` — and this file is the composition
 * half.
 *
 * ## The handler is resolved at RENDER, through `Object.hasOwn`
 *
 * {@link handlerFor} runs while the field draws rather than inside
 * the click, so a def naming an id nothing answers refuses where
 * `./actions.ts`'s `assertActions` refuses — at mount, before an
 * operator presses anything — instead of drawing a button that
 * fails when used. `./DynamicForm.tsx` asserting over the whole def
 * list is what makes that unreachable in a form; this throw is what
 * covers a control mounted with no table at all.
 *
 * The membership test is `Object.hasOwn` and not an index read, for
 * the reason `./actions.ts`'s header states at length: a table is a
 * caller's plain object, and `'toString'`, `'valueOf'` and
 * `'constructor'` all answer a FUNCTION through it. Reading the
 * index alone would hand `Object.prototype`'s own method to an
 * operator's press. The check is spelled twice on purpose — once
 * over the def list and once at the lookup — because the two run
 * at different times over different inputs, and the lookup is the
 * one that produces the function that gets CALLED.
 *
 * ## What a run does with what it gets back
 *
 * Decision 4, as this file performs it:
 *
 * - A value is reported through the field's existing change report,
 *   which is `./values.ts`'s `withValueAt` at the other end — the
 *   path a keystroke takes, not a second write path.
 * - The field's typed hold is dropped first
 *   ({@link FieldActionProps.onWrote}), so the box shows what the
 *   action answered rather than what was half-typed before it. That
 *   ordering is the whole of "replaces the held typed text": the
 *   hold wins over the value while it exists, so leaving it standing
 *   would hide the write.
 * - `undefined` does neither, and changes nothing at all.
 * - A rejection — and a synchronous throw, which `await` turns into
 *   one — becomes the sentence in {@link FieldActionHold.refusal}
 *   and is never re-thrown.
 *
 * The refusal is cleared at the START of the next run and by the
 * next keystroke, which is {@link FieldActionHold.forgetRefusal}'s
 * only caller. Both directions matter: a field must not show the
 * last refusal while the next run is out, and a sentence about a
 * press must not outlive the text it was about.
 *
 * ## A value of the wrong shape is handed over as ABSENT
 *
 * {@link heldValue} is the one rule-shaped function here and is
 * local for the reason `./LeafControl.tsx`'s `boxText` is: it is
 * that absorption again, at a different boundary, with no second
 * caller. A draft member arrives as `unknown` — a def describes a
 * shape a payload is only SUPPOSED to have — while decision 4's
 * context declares `LeafValue | undefined`, so an object or an array
 * at a leaf path has to become one of the two. It becomes
 * `undefined`, the spelling for absent, and never `null`, which is
 * what a cleared box answers and would be a lie about what is
 * stored. It is the same reading `boxText` makes when it shows an
 * empty box for a value no box can show.
 */

import type { FieldAction, FieldActionTable } from './actions';
import type { LeafValue } from './FieldControl';
import type { FieldActionRef, LeafFieldDef } from './fieldDef';
import type { NodePath } from './nodePath';
import type { ReactNode } from 'react';

import { IconButton } from '@ar/ui';
import { useState } from 'react';

/**
 * The glyph the action button holds.
 *
 * Drawn here rather than taken from `@ar/ui`, whose stroke-icon
 * helper is internal and never re-exported —
 * `./FieldControl.tsx`'s chevron is the same call made for the same
 * reason. `aria-hidden`, so the button's accessible name stays
 * `action.label` exactly.
 *
 * One glyph for every action, because a def names an id and a label
 * and no icon: what an action DOES is opaque to this package, so
 * there is nothing here to pick a second glyph from.
 *
 * An ELEMENT rather than a component, and the row below is inlined
 * for the same reason: a file whose only export is a hook may
 * declare no component at all, or fast refresh cannot reach one
 * (`react-refresh/only-export-components`, measured here). A
 * constant element costs nothing — it is drawn once and shared by
 * every button this hook makes.
 */
const ACTION_GLYPH = (
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
    className="shrink-0"
  >
    <path d="M5 3v4M3 5h4M6 17v4M4 19h4" />
    <path d="M13 3l2.4 6.6L22 12l-6.6 2.4L13 21l-2.4-6.6L4 12l6.6-2.4z" />
  </svg>
);

/**
 * The button's own chrome, beyond `IconButton`'s square.
 *
 * `shrink-0` so the control beside it takes the whole of the free
 * width, and the pending look is OPACITY — the one property this
 * repo's web rules put a disabled state on without touching layout.
 */
const ACTION_BUTTON = 'shrink-0 disabled:cursor-default '
  + 'disabled:opacity-60';

/**
 * The row a control and its action share.
 *
 * A grid rather than a flex row, and that is a measured constraint
 * rather than taste: `@ar/ui`'s `TextInput` puts its `className` on
 * the INPUT and wraps it in a `span` this file cannot reach, so a
 * flex item would size to that span's intrinsic width and the box
 * would shrink to its default character count. A `minmax(0, 1fr)`
 * track gives the span a definite width for the input's own
 * `w-full` to resolve against, and `auto` keeps the 32px button
 * square.
 */
const ACTION_ROW = 'grid grid-cols-[minmax(0,1fr)_auto] items-center '
  + 'gap-2';

/**
 * The handler a def's ref names, or the refusal for one nothing
 * answers.
 *
 * `Object.hasOwn` before the index read — see the header on the
 * ids `Object.prototype` would otherwise answer for.
 *
 * @param actions - The table the form was handed, if it was handed
 * one.
 * @param def - The field carrying the ref, for its key.
 * @param action - The ref itself.
 * @returns The handler the table holds for that id.
 * @throws If no table was supplied, or if it does not hold the id.
 */
function handlerFor(
  actions: FieldActionTable | undefined,
  def: LeafFieldDef,
  action: FieldActionRef,
): FieldAction {
  const handler = actions !== undefined && Object.hasOwn(actions, action.id)
    ? actions[action.id]
    : undefined;

  if (handler === undefined) {
    throw new Error(
      `Field '${def.key}' names action '${action.id}', `
      + 'which the form holds no handler for',
    );
  }

  return handler;
}

/**
 * Read a draft member as the value an action is handed.
 *
 * Total over everything a payload can hold — see the header on why
 * a shape no leaf can carry arrives as absent rather than as `null`.
 *
 * @param value - The value at this field's path, as the draft has it.
 * @returns The scalar there, or `undefined` for absent and for a
 * value no leaf can hold.
 */
function heldValue(value: unknown): LeafValue | undefined {
  if (value === null) {
    return null;
  }

  if (
    typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return value;
  }

  return undefined;
}

/**
 * Spell a rejection as the sentence the field's error slot shows.
 *
 * The message the handler rejected with, because this package knows
 * nothing about what an action does and so has nothing better to
 * say. A rejection carrying no message at all still has to say
 * something — an empty error slot draws `FormField`'s warning mark
 * beside no words — so the label answers for it.
 *
 * @param action - The ref, for its label.
 * @param cause - Whatever the handler rejected with.
 * @returns A non-empty sentence.
 */
function refusalSentence(action: FieldActionRef, cause: unknown): string {
  const message = cause instanceof Error
    ? cause.message
    : String(cause);

  return message.trim() === ''
    ? `${action.label} could not be run.`
    : message;
}

/** What a field hands the hook that draws its action. */
interface FieldActionProps {
  /**
   * The field, for its {@link FieldActionRef} and its key.
   *
   * A leaf def: decision 5 keeps actions off containers, and
   * `./fieldDef.ts` makes that a type error rather than a check.
   */
  readonly def: LeafFieldDef;
  /** Where the field sits, handed to the action and written at. */
  readonly path: NodePath;
  /**
   * The value at that path, as the draft has it.
   *
   * `unknown` for the reason every control here takes it so, and
   * read by {@link heldValue} on the way into the context.
   */
  readonly value: unknown;
  /**
   * The table the form was handed, if it was handed one.
   *
   * Optional so a control mounted outside `./DynamicForm.tsx` still
   * draws; a def naming an action with no table is the throw
   * {@link handlerFor} performs.
   */
  readonly actions: FieldActionTable | undefined;
  /** The field's existing change report, unchanged. */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
  /**
   * Drop whatever typed text the field is holding.
   *
   * Called before the value is reported and only when there is one,
   * so a control holding text beside the value shows what the action
   * answered. Absent from the controls that hold no text.
   */
  readonly onWrote?: () => void;
}

/** What a field gets back for drawing its action. */
export interface FieldActionHold {
  /**
   * Draw a control with its action button beside it.
   *
   * The control UNCHANGED when the def names no action, so a field
   * without one renders exactly the markup it did before this hook
   * existed — which is what keeps the visual baselines of every
   * actionless field byte-identical.
   *
   * @param control - The control the field would have drawn.
   * @returns It, or it and the button in one row.
   */
  readonly withAction: (control: ReactNode) => ReactNode;
  /**
   * What the last run rejected with, if it did.
   *
   * The field puts it in its error slot, ahead of whatever its own
   * reader says — the refusal is about the more recent event. It
   * is gone by the next keystroke and by the next run.
   */
  readonly refusal: string | undefined;
  /**
   * Forget a refusal, because the field changed.
   *
   * Called from the field's own change handler, which is the
   * "cleared by the next keystroke" half of decision 4's contract.
   * Safe to call when there is nothing to forget and when the def
   * names no action.
   */
  readonly forgetRefusal: () => void;
}

/**
 * The action beside one field, drawn and run.
 *
 * Called unconditionally by every leaf control, including the ones
 * whose def names no action: the state is held either way and
 * {@link FieldActionHold.withAction} answers the control untouched,
 * which is what keeps this a hook call rather than a conditional
 * one.
 *
 * @param props - The field, where it sits, what it holds, the
 * table, and the two ways it reports.
 * @returns The button wrapper, the last refusal, and the way to
 * forget it.
 * @throws While rendering, if the def names an id the table does
 * not hold.
 */
export function useFieldAction({
  def,
  path,
  value,
  actions,
  onValueChange,
  onWrote,
}: FieldActionProps): FieldActionHold {
  const [pending, setPending] = useState(false);
  const [refusal, setRefusal] = useState<string | undefined>(undefined);

  const forgetRefusal = () => {
    setRefusal(undefined);
  };

  const { action } = def;

  if (action === undefined) {
    return {
      withAction: (control) => control,
      refusal: undefined,
      forgetRefusal,
    };
  }

  // Resolved while drawing rather than inside the click — see the
  // header on where a def naming nothing is refused.
  const handler = handlerFor(actions, def, action);

  const run = async () => {
    // Cleared before the call rather than after it, so the field does
    // not show the last refusal while the next run is out.
    setRefusal(undefined);
    setPending(true);

    try {
      const answered = await handler({
        path,
        def,
        value: heldValue(value),
      });

      if (answered !== undefined) {
        // The hold first: it wins over the value while it exists, so
        // a box left holding text would hide the write below it.
        onWrote?.();
        onValueChange(path, answered);
      }
    } catch (cause) {
      setRefusal(refusalSentence(action, cause));
    } finally {
      setPending(false);
    }
  };

  const button = (
    <IconButton
      label={action.label}
      icon={ACTION_GLYPH}
      disabled={pending}
      aria-busy={pending}
      className={ACTION_BUTTON}
      onClick={() => {
        void run();
      }}
    />
  );

  return {
    withAction: (control) => (
      <div className={ACTION_ROW}>
        {control}
        {button}
      </div>
    ),
    refusal,
    forgetRefusal,
  };
}
