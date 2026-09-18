/**
 * @packageDocumentation
 * The `choice` kind's control: a select over the positions one def
 * offers.
 *
 * `./LeafControl.tsx` switches the registry's kind to a component
 * and draws four of the five itself — three text boxes that differ
 * by a reader, and a switch. This is the fifth, split out for the
 * reason that file was split out of `./FieldControl.tsx`: no file
 * under `src/` passes 800 lines, and the select carries a whole
 * section of prose about labelling that the boxes do not need.
 *
 * Nothing crossed the boundary but the code and the paragraphs that
 * describe it. The def arrives already narrowed to `enum` by the
 * caller's guard, `./readers.ts`'s `readEnumField` is still the only
 * thing that says what an option READS as, and `./values.ts`'s
 * `freshEnumValue` is still the only thing that answers a new one.
 *
 * ## No test in this package reaches this file
 *
 * The runner fact `./LeafControl.tsx` records in full: vitest
 * collects `*.test.ts` under `src` in a NODE environment, so a
 * `.tsx` is neither collected nor renderable there. `lint` and
 * `check-types` read this file and no test does, and everything
 * worth asserting sits one module back in a `.ts` — which control
 * kind draws `enum` in `./registry.test.ts`, what an option reads
 * as in `./readers.test.ts`, what a fresh one is in
 * `./values.test.ts`.
 *
 * The readings that ARE of this component were taken through the
 * offline static-render probe `../../context/testing.md` describes,
 * over `POLARITY` (the def `./readers.test.ts` declares). Held
 * `'negative'`, a listed value, prints a trigger `button` carrying
 * `aria-label="Polarity"` (its ACCESSIBLE NAME, since `Select` takes
 * no `id` for `FormField`'s `htmlFor` to reach) with the held
 * option's own label, `Negative`, as its visible text. Held
 * `'sideways'`, outside the options, prints the same trigger falling
 * back to `options[0]`'s label — `Positive`, the display gap
 * `../../context/ui-constraints.md` records — beside an error slot
 * reading `Choose one of the options listed for Polarity.`,
 * `readEnumField`'s refusal for that def. Three readings, 3 of 3,
 * taken before this file existed. The first was RE-taken after the
 * split, through the same probe and with an action attached: the
 * trigger still prints `aria-label="Polarity"` with `Negative` as
 * its text, beside the action's button. The other two were not
 * re-run — a component is the same markup wherever it is declared,
 * and that is the claim the re-taken one is the check on.
 *
 * ## How `choice` is labelled, and what that costs
 *
 * `./LeafControl.tsx` documents two envelopes — `FormField`'s
 * `htmlFor` for a labelable control, `aria-labelledby` for one that
 * is a `button` — and `choice` takes NEITHER, which is a fact
 * about `@ar/ui`'s `Select` rather than a preference here. Measured
 * against the component as shipped: `SelectProps` is a closed list
 * — `value`, `options`, `onChange`, `size`, `width`, `ariaLabel`
 * and `className` — extending no `HTMLAttributes`, and what it
 * renders is a Radix menu trigger. So it takes no `id` for a
 * `<label for>` to reach and no `aria-labelledby` to point at one,
 * and `ariaLabel` is the only name it can be given.
 *
 * The drawing therefore keeps `FormField` for the label row, the
 * hint and the error slot, and passes it NO `htmlFor`: a `<label
 * for>` naming nothing is worse than a label naming nothing, and
 * the accessible name comes off `ariaLabel={def.label}` instead.
 * The label is written twice for one control and that is the point
 * — the visible row and the accessible name are two different
 * channels here, where every other kind has them wired together.
 *
 * What it costs is the `aria-describedby` every other kind has:
 * with no attribute to pass, the refusal in the error slot is
 * VISIBLE beside the select and associated with it by nothing. The
 * id-inside-the-slot repair `./LeafControl.tsx` describes has no
 * attribute to point at, so it is not used here and the slot takes
 * the sentence bare. That covers an ACTION's refusal too, which
 * lands in the same slot through the same `error` prop. Both halves
 * are recorded in `../../context/ui-constraints.md`, which is where
 * a later `@ar/ui` wave closes them.
 *
 * ## Spelling a value as the option it opens at
 *
 * {@link choiceText} is the one rule-shaped thing in this file, and
 * it is `./LeafControl.tsx`'s `boxText` narrowed to the single shape
 * a select can hold — no option ever carries a number. It parts
 * from that function at ONE value: an absent member opens at
 * `./values.ts`'s `freshEnumValue` rather than at the empty
 * spelling, because a select has no empty position to sit at. Local
 * rather than promoted to a `.ts` for the reason `boxText` is: it is
 * the inverse of a module that already exists and has no second
 * caller.
 */

import type { FieldActionTable } from './actions';
import type { LeafValue } from './FieldControl';
import type { EnumFieldDef } from './fieldDef';
import type { NodePath } from './nodePath';

import { FormField, Select } from '@ar/ui';
import { useEffect, useRef } from 'react';

import { readEnumField } from './readers';
import { useFieldAction } from './useFieldAction';
import { freshEnumValue } from './values';

/**
 * Spell a value as the option the select opens at.
 *
 * `./LeafControl.tsx`'s `boxText` narrowed to the one shape a select
 * can hold, with the absent member split out: no option ever carries a number, so
 * a string is itself and everything else is the empty spelling
 * `readEnumField` refuses — except `undefined`, which is an
 * ABSENT member rather than a wrong one and opens at
 * `freshEnumValue`.
 *
 * The split is the readers' emptiness convention meeting a control
 * that has no empty position: a text box can sit at `''` while a
 * member holds nothing, and `Select` has nowhere to sit but an
 * option. Drawing the head and stating no rule is the only reading
 * that is not a lie about what is stored, which is why the call
 * below reports it.
 *
 * @param def - The member, for its options.
 * @param value - The value at this member's path.
 * @returns Its spelling, the fresh option, or `''`.
 */
function choiceText(def: EnumFieldDef, value: unknown): string {
  if (value === undefined) {
    return freshEnumValue(def);
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

/** What one select is given. */
interface ChoiceFieldProps {
  /** The member, narrowed to the one leaf def carrying options. */
  readonly def: EnumFieldDef;
  /** Where it sits, reported back with every accepted value. */
  readonly path: NodePath;
  /**
   * The value at that path.
   *
   * Anything the options do not carry — a value from elsewhere, a
   * member of the wrong shape — states the rule in the error slot
   * rather than being written or hidden. An ABSENT member is the
   * one exception and the only one: it is no wrong value, so it
   * draws the fresh option and is written back rather than being
   * told off for holding nothing.
   */
  readonly value: unknown;
  /** The action table, for a def naming one. */
  readonly actions: FieldActionTable | undefined;
  /** Report a value that read. */
  readonly onValueChange: (path: NodePath, next: LeafValue) => void;
}

/**
 * A select over the def's options, and the rule a held value breaks.
 *
 * No typed text and so no hold, which is what this control does not
 * need and `./LeafControl.tsx`'s text box does: a select reports an
 * option or reports nothing, so there is no half-typed state to
 * show and nothing to keep beside the value. An action's answer
 * therefore has nothing to displace here, which is why the call
 * below passes no `onWrote`.
 *
 * A held `undefined` is the one value it does not put through that
 * reader: {@link choiceText} answers the fresh option for it and
 * the effect below reports that same option, so the reading is of a
 * value the def carries by construction. Every other held value is
 * read.
 *
 * It still crosses {@link readEnumField} in both directions. What
 * the control reports is read before it is written, so a position
 * the def does not carry reaches the draft no more than a refused
 * keystroke does; and what the VALUE holds is read too, so a member
 * carrying something the options do not offer states the rule in
 * the error slot instead of passing for one of them. `Select`
 * itself would say nothing — it resolves its trigger as
 * `options.find(o => o.value === value) ?? options[0]`, drawing
 * SOMEBODY ELSE'S option for a value outside the list, which is the
 * gap `../../context/ui-constraints.md` records.
 *
 * @param props - The def, its path, its value, the action table,
 * and where an accepted value goes.
 * @returns The labelled select, and the rule its value breaks.
 */
export const ChoiceField = ({
  def,
  path,
  value,
  actions,
  onValueChange,
}: ChoiceFieldProps) => {
  const held = choiceText(def, value);

  // No `onWrote`: this control holds no text beside the value, so
  // an action's answer has nothing to displace here.
  const { withAction, refusal, forgetRefusal } = useFieldAction({
    def,
    path,
    value,
    actions,
    onValueChange,
  });

  // Reported rather than drawn and forgotten: the select shows the
  // fresh option from the first paint, so the draft has to carry
  // what an operator is already looking at. An effect and not a
  // render-time call, because this is a write into a store above.
  //
  // It does NOT settle in one pass, and the `attempted` ref below is
  // why one is needed. The optimistic reading — the write leaves
  // `value` a string, so the effect never runs twice — holds only
  // for an ACCEPTED write. `./DynamicForm.tsx`'s `report` validates
  // the WHOLE payload before calling back here, so a write this
  // effect makes can be REFUSED by a sibling member's own fault (an
  // empty `pattern` beside this member, say) with `value` left
  // exactly as it was. `./NodeForm.tsx` keys every field by its own
  // path, so this instance never sees a different `path` or `def`
  // while mounted, but `onValueChange` is handed no such guarantee —
  // `./DynamicForm.tsx`'s own copy is a fresh arrow every render, by
  // design — and a parent re-render for ANY reason (the refusal
  // banner appearing, say) would otherwise re-run this effect against
  // a `value` still `undefined`, forever: an unbounded write loop
  // with nothing in the render tree to break it. One try per mount,
  // not one try per render, closes that regardless of whether the
  // write above ever succeeds; a value still absent after the one try
  // stays absent until the operator opens the select themselves,
  // which reports through the ordinary `onChange` below and is not
  // gated by this ref at all.
  const attempted = useRef(false);

  useEffect(() => {
    if (value === undefined && !attempted.current) {
      attempted.current = true;
      onValueChange(path, freshEnumValue(def));
    }
  }, [def, path, value, onValueChange]);

  const reading = readEnumField(def, held);
  const unread = reading.ok
    ? undefined
    : reading.sentence;
  // The action's refusal first, for the reason the text box in
  // `./LeafControl.tsx` gives: it is about the more recent event.
  const fault = refusal ?? unread;

  return (
    <FormField
      // No `htmlFor`: `Select` renders a Radix menu trigger and takes
      // no id, so a `<label for>` would point at nothing. The name
      // comes off `ariaLabel` below instead, which is the whole of
      // the ARIA that component accepts.
      label={def.label}
      hint={def.description}
      error={fault}
    >
      {withAction(
        <Select
          value={held}
          // Copied because `SelectProps.options` is declared MUTABLE
          // and a def list is `readonly` — the binding-level copy
          // `../../context/ui-constraints.md` prescribes.
          options={[...def.options]}
          ariaLabel={def.label}
          onChange={(next) => {
            forgetRefusal();

            const accepted = readEnumField(def, next);

            if (accepted.ok) {
              onValueChange(path, accepted.value);
            }
          }}
        />,
      )}
    </FormField>
  );
};
