/**
 * @packageDocumentation
 * The fallback presentation an editor offers for a payload its fixed
 * template cannot express: the JSON itself, in a box, with whatever
 * the schema refused stated underneath it.
 *
 * ## Thin on purpose, and what "thin" is protecting
 *
 * The dynamic form provider replaces this file. It renders editable
 * fields from a type definition, so the shapes this box exists for
 * get real controls and nobody edits punctuation to change a weight.
 * Until it lands an operator still needs SOME way to reach a shape
 * the fixed templates do not cover, and a textarea over the payload
 * is the smallest thing that is honest about being one.
 *
 * So nothing is built here that the replacement would not want.
 * There is no bracket matching, no gutter, no reformat-as-you-type,
 * no undo stack of its own. Each of them is work thrown away on the
 * day the provider arrives, and each of them is a decision living in
 * a `.tsx`, which is where no test in this package can reach it.
 *
 * ## `value`, `onChange` and `schema` are the whole contract
 *
 * Those three are the entire seam between a page and this editor,
 * and keeping it to three is the point. The replacement takes a
 * value, reports a new one, and is told what a value has to satisfy;
 * it takes nothing else from a page either. So swapping it in is an
 * edit to this file and to the import beside it — a COMPONENT change
 * — rather than an edit to each editor that composes one.
 *
 * Everything else here is presentation and is deliberately not part
 * of that bargain: that the value is shown as text, that a refusal
 * is a banner, that the box opens at a fixed height. A page that
 * never learned any of it cannot be broken by changing it.
 *
 * That is also why {@link JsonEditorProps.value} is the PAYLOAD and
 * not the editor's text. A form provider edits a value; a page
 * holding text instead would have to learn to parse it on the day
 * the provider landed, which is exactly the page change this seam
 * exists to avoid. The lexicon editor is the worked example: its
 * template branch and this one write the SAME draft, so switching
 * presentation loses no edit, and neither branch knows the other
 * exists.
 *
 * ## The text is seeded once and is this component's from then on
 *
 * A JSON textarea cannot be re-derived from its value on every
 * render. Half of what an operator types is not parseable — a payload
 * is between two valid states on nearly every keystroke — so a value
 * that only advances over accepted text would rewrite the box back
 * to the last good payload under the cursor, and their whitespace
 * and key order with it.
 *
 * So the text is seeded from `value` at mount, through
 * {@link formatJsonDraft}, and owned here for as long as this
 * component is mounted. A caller that needs it re-seeded from a
 * value edited elsewhere remounts the editor — a `key`, or the
 * branch swap a presentation toggle already performs. Nothing about
 * the swapped-in provider makes that shape wrong: a form provider
 * holds per-field working state for the same reason.
 *
 * ## What the save path refuses, and the one thing it cannot
 *
 * {@link JsonEditorProps.onChange} fires over a payload that parsed
 * AND satisfied the schema, and over nothing else. Unparseable text
 * and a refused payload both stop here, so no editor composing this
 * one can put either on the path to a save: the draft a save reads
 * only ever held values this schema accepted.
 *
 * What this cannot do is disable the Save button, which belongs to
 * `./EditorModal` and is gated on whether the DRAFT differs from the
 * row that was loaded. While the box holds text that does not parse,
 * the draft still holds the last payload accepted from it, and that
 * payload is saveable. The banner is what stands between the two,
 * which is why it states the consequence rather than only the fault.
 *
 * Closing that gap would take a fourth prop reporting validity
 * upward, and a fourth prop is the one thing the contract above
 * cannot afford: a form provider has no such thing to report, so
 * every page taking it would have to change on the day of the swap.
 * The gap is named here rather than paid for there.
 *
 * ## The non-editing presentation, and why it is not a fourth prop
 *
 * {@link JsonEditorProps.readOnly} draws the same box with typing
 * turned off. It is PRESENTATION and sits with the rest of it —
 * outside the three-prop bargain above — because the replacement
 * renders fields from a type definition and will need exactly the
 * same thing: a document being ruled on rather than edited.
 *
 * The one caller today is the sources surface's config approval,
 * where a proposal is accepted or refused as a ROW and the two
 * documents on it are what an operator is deciding about. Offering
 * them for editing there would let an approval rewrite the very
 * `parser_config` it was approving, which is the whole thing that
 * gate exists to prevent.
 *
 * `readOnly` rather than `disabled`: a document under review is read
 * closely and copied out of, so it stays focusable, selectable and in
 * the tab order. What it loses is the caret, and the two class
 * overrides below are what say so on screen — a box that looked
 * editable and refused every keystroke would be worse than either.
 *
 * {@link JsonEditorProps.onChange} stays required and is never
 * called: a `readonly` textarea fires no change event at all. A
 * caller in this mode passes a named no-op with the reason beside it,
 * which is the binding a required-but-unused callback already gets
 * elsewhere in this app.
 *
 * The schema still runs, and that is the point rather than a
 * leftover: a STORED document this app cannot even read as an object
 * is exactly what somebody ruling on it needs told, before they rule.
 * The banner says a different thing in this mode, because the
 * consequence is different — there is no save to be stopped.
 *
 * ## Where the decisions are
 *
 * `./jsonDraft` holds them: reading text as a value, writing a value
 * back as text, and turning a schema refusal into sentences that
 * quote nothing from the payload. That module's header carries the
 * reasoning and its colocated tests carry the proof.
 *
 * This file composes those three in one direction — parse, then
 * check, then whichever refused — and that composition is the only
 * decision it makes. It is written as {@link readPayload} so it is
 * at least readable in one place, but the two-runner law means no
 * test in this package reaches it: the unit runner collects `.ts`
 * files under `src` in a node environment. Its bindings are proven
 * by a `check-types` mutation grid and its behaviour by the
 * Playwright specs. A second decision arriving here belongs next
 * door, in `./jsonDraft`, where a test can have it.
 */

import type { ZodType } from 'zod';

import { Banner, FormField, Textarea } from '@ar/ui';
import { useId, useState } from 'react';

import {
  describeSchemaIssues,
  formatJsonDraft,
  parseJsonDraft,
} from './jsonDraft';

/**
 * How tall the box opens.
 *
 * A payload rather than a sentence, so the library's three-row
 * default would show an operator a keyhole. `Textarea` carries
 * `resize-y`, so this is a starting height and not a cap.
 */
const EDITOR_ROWS = 14;

/**
 * What the banner over a refused payload is titled.
 *
 * The CONSEQUENCE, because the sentences under it already carry the
 * fault. "Cannot" rather than "is not": an accepted payload is also
 * unsaved until somebody presses Save, and the distinction an
 * operator needs is that this one has no way through.
 */
const REFUSED_TITLE = 'This cannot be saved';

/**
 * What the banner over a refused payload says in the read-only
 * presentation.
 *
 * Its neighbour above names a save this mode does not have. What is
 * wrong here is the document itself, and the operator's next move is
 * to refuse it rather than to fix a keystroke.
 */
const READ_ONLY_REFUSED_TITLE = 'This is not a readable document';

/** What the label says under a box nothing can be typed into. */
const READ_ONLY_HINT = 'Shown exactly as stored. Nothing here writes.';

/**
 * How the box is drawn when it cannot be typed into.
 *
 * `cn` is tailwind-merge, so these genuinely REPLACE the atom's own
 * `bg-surface-1` and `resize-y` rather than stacking on them — this
 * file knowing what is in `Textarea`'s class list, which is the first
 * thing a promotion of this mode into `@ar/ui` would take over as a
 * CVA variant. Sunk rather than tinted, because that surface already
 * means "not where you type" everywhere else in the app.
 */
const READ_ONLY_CLASSES = 'bg-surface-sunk resize-none';

/** What the editor's contents were read as. */
type PayloadReading<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly sentences: string[] };

/**
 * Read the box's contents as a payload the schema accepts.
 *
 * Parse first and check second, which is the only order available:
 * a schema is handed a value, and text that is not JSON produces
 * none. The refusal sentences are whichever step refused, so an
 * operator is never told about a rule while the text they are
 * looking at cannot be read at all.
 *
 * Both branches answer sentences built entirely from the schema's
 * own vocabulary and the path to the fault. `./jsonDraft` states why
 * neither the engine's parse message nor a zod issue's own `message`
 * may be surfaced.
 *
 * @typeParam T - What the schema accepts.
 * @param text - The box's contents, exactly as typed.
 * @param schema - What a payload has to satisfy.
 * @returns The payload, or the sentences explaining the refusal.
 */
function readPayload<T>(
  text: string,
  schema: ZodType<T>,
): PayloadReading<T> {
  const parsed = parseJsonDraft(text);

  if (!parsed.ok) {
    return { ok: false, sentences: parsed.sentences };
  }

  const checked = schema.safeParse(parsed.value);

  return checked.success
    ? { ok: true, value: checked.data }
    : { ok: false, sentences: describeSchemaIssues(checked.error) };
}

/**
 * What an editor hands the JSON fallback.
 *
 * The header states which of these are the contract the dynamic form
 * provider inherits — {@link JsonEditorProps.value},
 * {@link JsonEditorProps.onChange} and {@link JsonEditorProps.schema}
 * — and which is presentation this file owns.
 *
 * @typeParam T - The payload being edited. Structural: this editor
 * sits below every fixture type and reads nothing off one.
 */
export interface JsonEditorProps<T extends object> {
  /**
   * What the box is called, on a label bound to it.
   *
   * Required, and a string: an editor showing two payloads at once
   * (a parser config beside its contract) would otherwise offer two
   * boxes named the same nothing. Presentation rather than contract
   * — the replacement labels its fields too, but from the type
   * definition rather than from here.
   */
  readonly label: string;
  /**
   * The payload as it stands, read ONCE to seed the box.
   *
   * The header says why: text that only advanced over accepted
   * payloads would rewrite itself under the cursor. A caller with a
   * value edited elsewhere remounts rather than expecting this to
   * follow it.
   */
  readonly value: T;
  /**
   * Report a payload that parsed and satisfied the schema.
   *
   * Fires on nothing else, which is the whole of the refusal this
   * editor performs. The header names what it therefore cannot do.
   */
  readonly onChange: (next: T) => void;
  /**
   * What a payload has to satisfy before it is reported.
   *
   * Supplied by the page rather than inferred here, because the page
   * is what knows the shape it is editing — and because the same
   * schema is what the provider replacing this file will render its
   * fields from.
   */
  readonly schema: ZodType<T>;
  /**
   * Draw the box with typing turned off.
   *
   * Presentation, not contract — the header says why, why the mode
   * is `readOnly` rather than `disabled`, and why
   * {@link JsonEditorProps.onChange} stays required while being
   * unreachable.
   *
   * Absent means editable, which is what every caller that is not
   * ruling on a document wants.
   */
  readonly readOnly?: boolean;
}

/**
 * The JSON fallback: the payload as text, and what the schema said.
 *
 * @typeParam T - The payload being edited.
 * @param props - The label, the payload, the report, the schema, and
 * whether the box can be typed into.
 * @returns The labelled box, and the refusal under it while there is
 * one.
 */
export const JsonEditor = <T extends object>({
  label,
  value,
  onChange,
  schema,
  readOnly = false,
}: JsonEditorProps<T>) => {
  const fieldId = useId();
  const issuesId = `${fieldId}-issues`;

  // Seeded from the payload and owned here afterwards. The lazy form
  // matters: the initialiser runs on the first render alone, which is
  // what "seeded once" means in the header.
  const [text, setText] = useState(() => formatJsonDraft(value));

  // Derived rather than mirrored in state, so the box and the banner
  // cannot disagree about the same text. It also means a STORED
  // payload the schema refuses is reported on arrival, before an
  // operator has touched anything.
  const read = readPayload(text, schema);
  const refused = !read.ok;

  return (
    // No gap: the live region below is empty most of the time, and a
    // flex gap would hold a space open for a banner that is not
    // there. The margin travels with the banner instead.
    <div className="flex flex-col">
      <FormField
        label={label}
        htmlFor={fieldId}
        hint={readOnly
          ? READ_ONLY_HINT
          : undefined}
      >
        <Textarea
          id={fieldId}
          value={text}
          readOnly={readOnly}
          onChange={(next) => {
            setText(next);

            const reading = readPayload(next, schema);

            if (reading.ok) {
              onChange(reading.value);
            }
          }}
          rows={EDITOR_ROWS}
          invalid={refused}
          aria-invalid={refused}
          aria-describedby={issuesId}
          spellCheck={false}
          className={readOnly
            ? `font-mono text-[13px] ${READ_ONLY_CLASSES}`
            : 'font-mono text-[13px]'}
        />
      </FormField>

      {/*
        The region is rendered from mount rather than arriving with
        its first sentence: assistive technology watches regions that
        already exist, and one inserted at the same moment as its
        content is routinely missed. Polite rather than assertive —
        it changes while an operator is typing, and interrupting them
        mid-word to read back a rule is worse than not reading it.
      */}
      <div id={issuesId} role="status">
        {!read.ok && (
          <Banner
            className="mt-3"
            tone="danger"
            title={readOnly
              ? READ_ONLY_REFUSED_TITLE
              : REFUSED_TITLE}
          >
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {read.sentences.map((sentence, index) => (
                // Keyed by position: the list is rebuilt whole on
                // every read and never reordered, and two issues are
                // free to phrase the same sentence twice.
                <li key={index}>{sentence}</li>
              ))}
            </ul>
          </Banner>
        )}
      </div>
    </div>
  );
};
