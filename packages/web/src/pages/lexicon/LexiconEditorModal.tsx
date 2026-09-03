/**
 * @packageDocumentation
 * The lexicon's term editor: one category's vocabulary, drawn as the
 * three polarity buckets, with every gesture that moves a term
 * between them available without a pointer.
 *
 * Opened at the lexicon's `:entityId/edit` sub-route, over the grid
 * the card was clicked on. It composes `../../components/EditorModal`
 * for the frame — header, footer, unsaved sentence, relative close —
 * and holds no decision `./terms.ts` could hold: the split into
 * buckets, the two movers, the control's vocabulary and the weight
 * field's refusals all live next door, where the unit runner can
 * reach them. What is left here is one list per bucket, one call per
 * gesture, and the read states.
 *
 * ## Three lists, three GROUPS — not one
 *
 * `Sortable` decides what a drop MEANS from the drag's data type,
 * which it builds as its own prefix plus the list's `group`. A drop
 * whose type the receiving list recognises as its own is an internal
 * reorder; one carrying some other sort type is a cross-list receive.
 *
 * So three lists sharing one `group` would classify every
 * cross-bucket drop as INTERNAL: `onReceive` would never fire, and
 * `onReorder` would run instead with an index taken from the list the
 * term came from applied to the list it landed in. Measured against
 * the shipped component, one group per bucket over a shared prefix is
 * what makes a cross-bucket drop a receive — same-bucket `internal`,
 * either sibling `cross`.
 *
 * The prefix is the library's own and therefore app-wide, so a
 * receive would also fire for a drag out of any OTHER `Sortable`
 * mounted at the same time. Nothing else in this modal is one, and
 * the modal is the whole of what is mounted over the grid.
 *
 * ## The drag is an enhancement, and the control is the mechanism
 *
 * Every row carries a polarity control, and choosing from it performs
 * exactly the move a drag into that bucket performs — one call to
 * {@link withTermPolarity} either way, because a bucket IS a
 * polarity and `./terms.ts` says so at length.
 *
 * That is what answers WCAG 2.2 SC 2.5.7 (Dragging Movements): the
 * dragging gesture has a single-pointer, keyboard-reachable
 * equivalent that is not a second implementation of the same
 * behaviour and so cannot drift away from it. The control's options
 * are TOTAL over the union for the same reason — a bucket a term can
 * be dragged into and not chosen into would be the criterion broken
 * in the one direction nothing here would report.
 *
 * `onReorder` is required by the component and deliberately does
 * nothing. `./terms.ts` states why: a bucket lists its terms in the
 * order the list gave them, honouring a drop index would need a
 * column recording it, and `terms` has none. The rows snap back
 * because there is nothing to store, not because a handler was
 * forgotten.
 *
 * ## The weight field refuses rather than coerces
 *
 * A row's weight is text while it is being typed and a number in the
 * draft, and {@link readTermWeight} is the only thing that crosses
 * between them. Text that does not read as a weight is NOT written:
 * the field goes on showing what was typed, states the rule it
 * breaks, and the draft keeps the last readable value.
 *
 * The consequence is worth stating rather than discovering. A save
 * can be offered while a weight field shows a refusal — the two are
 * about different things, since the refusal means the last keystroke
 * did not reach the draft and the save is of what did. What cannot
 * happen is a save storing an unreadable weight, because no such
 * value is ever in the draft. `Number('')` being `0` is the case
 * that makes this worth a field rather than a coercion.
 *
 * The typed text is held beside the draft rather than in it, because
 * the draft holds rows and a row's weight is a number. It is keyed by
 * `terms.id` and lives as long as the modal does.
 *
 * ## What the draft is, and why one member
 *
 * The row this editor edits is the category's whole term LIST, held
 * as a single-member object so the shared holder in
 * `../../components/editorDraft.ts` can compare it by value.
 *
 * One member is the honest granularity here rather than a shortcut:
 * `saveCategoryTerms` is eventually a PUT that REPLACES the
 * collection, so there is exactly one thing that is or is not
 * unsaved, and the footer says so. A holder keyed per term would
 * report a count the write cannot act on.
 *
 * The holder is derived during render from the read's answer, and the
 * every-transition-answers-the-same-holder rule is what makes that
 * safe rather than a render loop. Writes are based off the DERIVED
 * holder and never off the state updater's argument: before the first
 * edit the state is still the empty holder, and a write based on it
 * would have no draft to change and would be silently dropped.
 *
 * ## Two reads, one refusal
 *
 * The terms come from `useTerms` and the category's name from
 * `useCategory`. `../../data/api.ts` refuses BOTH with the category's
 * own message for a category this domain does not carry, which is the
 * reason the body can be gated on the term read alone: the two cannot
 * answer differently about the same id, so there is no state where a
 * name renders over an error or the reverse.
 *
 * Loading, empty and rejected each get their own body. Empty is a
 * category that exists and carries no vocabulary — not a refusal, and
 * not three empty buckets either, since a bucket an operator can drag
 * nothing into is a picture of a list rather than a way into one. The
 * paste panel below is the way in that state offers instead, and it
 * stays under the buckets once there are terms to put in them.
 *
 * ## The bulk-paste panel
 *
 * A collapsed disclosure under the buckets, holding a box that takes
 * the seed's own format one term per line. Its button reads the block
 * through {@link parseTermBlock}, states what the parse did through
 * {@link describeTermBlockReading}, lists whatever was refused a line
 * at a time, and merges the accepted candidates through
 * {@link mergeTermCandidates}.
 *
 * None of that writes anything. The merge appends rows to the SAME
 * draft the per-term controls edit, so a paste is unsaved work like
 * every other edit here and the footer counts it as one — which is
 * also why the draft is a list rather than a set of controls.
 * `./terms.ts` mints each appended row a negative id, and
 * {@link isDraftTerm} reads it back, which is what puts a badge on a
 * row nothing has stored.
 *
 * ## What a merged row does not survive
 *
 * `../../data/drafts.ts` records edits to rows that EXIST and never
 * inserts one, so `saveCategoryTerms` records nothing for a merged
 * candidate and reopening this editor does not show it. That is the
 * fixture seam's limit rather than the endpoint's, and it is
 * deliberately not hidden: the rows carry a badge, and the sentence
 * under the box calls them unsaved rows rather than terms.
 *
 * ## Two things the library decides about the panel's markup
 *
 * `AccordionItem` renders its children inside a `<p>`, so everything
 * inside the disclosure is PHRASING content — a label, the box, a
 * hint and the button, laid out with spans. That is why the field is
 * not wrapped in FormKit's `FormField`, which renders a `div`. The
 * result region is a `div` too, so it sits OUTSIDE the disclosure,
 * which is also what leaves it readable once the panel is collapsed.
 *
 * Radix unmounts a closed item's children, so the box does not exist
 * while the panel is shut. The typed block lives in the panel
 * component, which stays mounted through a collapse, so collapsing it
 * keeps what was typed. Switching PRESENTATION does not: that swap
 * unmounts the whole template branch, and the section below says why
 * discarding a block nobody has read yet is the honest half of
 * "switching loses no edit".
 *
 * ## Pressing the button twice
 *
 * A parse reads the block against the terms the draft holds NOW,
 * which includes whatever the last press merged. So a second press
 * over an unchanged block refuses every line it took the first time
 * as a duplicate — the service's (category, pattern) uniqueness
 * arriving one edit early, which is exactly the rule `./terms.ts`
 * says a duplicate is. Editing the box retires the previous result
 * instead of leaving it: a sentence names a LINE NUMBER, and a
 * keystroke can move the line it points at.
 *
 * ## The JSON fallback, and what it is a stand-in for
 *
 * A control at the top of the body chooses between the fixed template
 * above and the payload itself in a box, validated by `./schema.ts`.
 * The template is the answer for the shape a category usually has;
 * the box is the v1 answer for every shape it cannot express — a note
 * carrying the separator the paste format splits on, a weight typed
 * beside forty others, a vocabulary being moved between two
 * deployments by copy and paste.
 *
 * v1 is the operative word. `../../components/JsonEditor.tsx` is
 * deliberately thin because the dynamic form provider replaces this
 * whole branch: it renders editable fields from a type definition, so
 * the shapes this box exists for get real controls and nobody edits
 * punctuation to change a weight. On the day it lands this file swaps
 * one component for another and keeps everything around it — the
 * payload, the schema and the two projections are what the
 * replacement takes too, which is the whole reason that seam is three
 * props wide.
 *
 * ## Both presentations write the ONE draft
 *
 * That is what makes switching free, and it is why the fallback is a
 * PRESENTATION rather than a second editor. {@link toTermPayload}
 * reads the draft into the box's value and {@link withTermPayload}
 * writes an accepted payload back, so an edit made in either drawing
 * is an edit the other opens on. Neither branch knows the other
 * exists, and no third state records which one made a change.
 *
 * What a swap DOES discard is text that is not yet an edit: the box's
 * unparsed characters and whatever is typed into the paste panel,
 * both of which live in a component the swap unmounts. Nothing there
 * ever reached the draft — the box reports a payload only once it
 * parses AND satisfies the schema — so the draft is exactly what the
 * footer counts and what a save writes, whichever drawing is up.
 *
 * The re-association is BY POSITION and `./terms.ts` carries its
 * three consequences: a reorder moves the vocabulary and leaves the
 * ids, an entry past the last row is minted an unsaved row, and a row
 * past the last entry is gone. The last two run into the same seam
 * limit the paste panel does, and the badge reads both the same way.
 *
 * ## What no test in this package reaches
 *
 * Nothing in this file. The unit suite is node-only and collects
 * `.ts` alone — this file's decisions are next door, its bindings are
 * proven by a `check-types` mutation grid, and what it renders falls
 * to the Playwright specs.
 */

import type { TermPayload } from './schema';
import type {
  TermBlockReading,
  TermBucket,
  TermCandidate,
  TermPresentation,
} from './terms';
import type { EditorDraft } from '../../components/editorDraft';
import type { Term, TermPolarity } from '../../data/types';

import {
  Accordion,
  AccordionItem,
  Badge,
  Banner,
  Button,
  EmptyState,
  Segmented,
  Select,
  Skeleton,
  Sortable,
  SortableRow,
  TextInput,
  Textarea,
  cn,
} from '@ar/ui';
import { useId, useState } from 'react';
import { useParams } from 'react-router';

import {
  EMPTY_EDITOR_DRAFT,
  withDraftValues,
  withLoadedRow,
} from '../../components/editorDraft';
import { EditorModal } from '../../components/EditorModal';
import { JsonEditor } from '../../components/JsonEditor';
import {
  useCategory,
  useSaveCategoryTerms,
  useTerms,
} from '../../data/hooks';

import { termPayloadSchema } from './schema';
import {
  describeTermBlockReading,
  isDraftTerm,
  mergeTermCandidates,
  parseTermBlock,
  readTermPolarity,
  readTermPresentation,
  readTermWeight,
  splitTermBuckets,
  termPolarityOptions,
  termPresentationIndex,
  termPresentationOptions,
  toTermPayload,
  withTermPayload,
  withTermPolarity,
  withTermWeight,
} from './terms';

/**
 * What every bucket's drag `group` starts with.
 *
 * The three groups differ only by the polarity appended to this, and
 * the difference is what makes a cross-bucket drop a RECEIVE — see
 * the header, which carries the measurement.
 */
const DRAG_GROUP_PREFIX = 'lexicon-terms-';

/** How wide the polarity control's dropdown panel is drawn. */
const POLARITY_PANEL_WIDTH = 160;

/** What the header says while the category's own read is in flight. */
const PENDING_TITLE = 'Category terms';

/** Which `AccordionItem` the paste panel's disclosure opens. */
const PASTE_ITEM_VALUE = 'paste';

/** What the disclosure is called while it is shut. */
const PASTE_PANEL_TITLE = 'Paste terms';

/** What the box itself is called. */
const PASTE_FIELD_LABEL = 'Seed lines';

/**
 * The format, spelled out under the box.
 *
 * `./terms.ts` is what enforces every clause of this, and its header
 * is where the reasoning lives. Restated here because an operator
 * about to paste forty rows cannot read a docblock.
 */
const PASTE_FORMAT_HINT = 'One term per line, as pattern, weight, '
  + 'polarity and an optional note, separated by a pipe or a tab.';

/** An example line, shown in the empty box. */
const PASTE_PLACEHOLDER = 'message queue | 3 | positive | Worth watching.';

/** What the button that reads the block says. */
const PASTE_ACTION_LABEL = 'Add these terms';

/** How tall the box opens; `Textarea` carries `resize-y` over it. */
const PASTE_ROWS = 6;

/**
 * What the banner over the refused lines is titled.
 *
 * Neither 'some' nor 'all': the banner lists exactly the lines that
 * were not taken, and both readings have to be true of the same
 * sentence.
 */
const PASTE_REFUSED_TITLE = 'These lines were not added';

/** What marks a row this editor minted and no save will keep. */
const DRAFT_ROW_LABEL = 'Unsaved';

/**
 * What the presentation control is called.
 *
 * `Segmented` renders a `tablist`, and a tablist with no accessible
 * name is a set of unexplained tabs to anyone not looking at the two
 * words on them. Its own labels say WHICH drawing; this says what
 * they are drawings of.
 */
const PRESENTATION_LABEL = 'Term editor presentation';

/**
 * What the fallback's box is called.
 *
 * The payload's own name, matching `./schema.ts`'s vocabulary rather
 * than the surface's: what is in the box is the whole category's
 * vocabulary as one value, and 'Terms' would read as the box holding
 * the same thing the buckets do one row at a time.
 */
const JSON_FIELD_LABEL = 'Term payload';

/**
 * A category's vocabulary, as the draft holder carries it.
 *
 * One member, because the write behind this editor replaces the
 * collection — see the header on why that is the honest granularity
 * and not a shortcut.
 */
interface TermsRow {
  /** Every term of the category, as the operator has them. */
  readonly terms: readonly Term[];
}

/** What an operator has typed into a weight field, by `terms.id`. */
type WeightTexts = Readonly<Record<string, string>>;

/**
 * What a drop that only reordered one bucket does: nothing.
 *
 * Named rather than written inline at three call sites, so the
 * reason is stated once. See the header: there is no column recording
 * a term's position within its bucket, so a drop index is a gesture
 * about a picture and the rows snap back to the stored order.
 */
const ignoreReorder = () => undefined;

/**
 * The lexicon's term editor.
 *
 * @returns The modal: the category's three buckets over the draft, or
 * whichever of the three read states the term list is in.
 */
export const LexiconEditorModal = () => {
  const { domainSlug, entityId } = useParams<{
    domainSlug?: string;
    entityId?: string;
  }>();

  // `:entityId` is a required segment so it cannot arrive empty, but a
  // segment that is not a number is a live address: `Number` answers
  // `NaN`, no category carries it, and both reads refuse — which is
  // the rejected state below rather than a special case.
  const categoryId = Number(entityId);

  const categoryRead = useCategory(domainSlug, categoryId);
  const termsRead = useTerms(domainSlug, categoryId);
  const save = useSaveCategoryTerms(domainSlug);

  const [held, setHeld] = useState<EditorDraft<TermsRow>>(EMPTY_EDITOR_DRAFT);
  const [weightTexts, setWeightTexts] = useState<WeightTexts>({});

  const loaded = termsRead.data;

  // Derived on EVERY render from whatever the read holds, which is
  // what `withLoadedRow` is built for: it answers the same holder by
  // identity when nothing moved, so a fresh wrapper here is a
  // comparison rather than a state update.
  const draft = withLoadedRow(
    held,
    loaded === undefined
      ? undefined
      : { terms: loaded },
  );
  const edited = draft.draft?.terms;

  // Based off the DERIVED holder rather than the state updater's
  // argument: before the first edit the state is still the empty
  // holder, and a write against that one would be dropped.
  const writeTerms = (terms: readonly Term[]) => {
    setHeld(withDraftValues(draft, { terms }));
  };

  const handlePolarityChange = (termId: number, polarity: TermPolarity) => {
    if (edited === undefined) {
      return;
    }

    writeTerms(withTermPolarity(edited, termId, polarity));
  };

  const handleWeightTextChange = (termId: number, text: string) => {
    setWeightTexts((current) => ({ ...current, [String(termId)]: text }));

    const reading = readTermWeight(text);

    if (!reading.ok || edited === undefined) {
      return;
    }

    writeTerms(withTermWeight(edited, termId, reading.weight));
  };

  // The merge is a draft write like the other two, which is the whole
  // of what the paste panel does to the editor: nothing here reaches
  // `../../data/`, and the footer counts the appended rows as
  // unsaved work exactly as it counts a moved polarity.
  const handleCandidates = (candidates: readonly TermCandidate[]) => {
    if (edited === undefined || candidates.length === 0) {
      return;
    }

    writeTerms(mergeTermCandidates(edited, candidates, categoryId));
  };

  // The fallback's write, and the third of the three that reach this
  // one draft. It fires only over a payload that parsed AND satisfied
  // the schema — `../../components/JsonEditor.tsx` refuses everything
  // else — so nothing unreadable is ever in what a save reads.
  const handlePayload = (payload: TermPayload) => {
    if (edited === undefined) {
      return;
    }

    writeTerms(withTermPayload(edited, payload, categoryId));
  };

  return (
    <EditorModal
      size="lg"
      title={categoryRead.data?.name ?? PENDING_TITLE}
      draft={draft}
      saving={save.isPending}
      saveError={save.error}
      onSave={(close) => {
        if (edited === undefined) {
          return;
        }

        // The frame hands its own close in rather than this file
        // re-deriving the relative navigation. Closing on success is
        // this surface's choice: the grid behind it counts the very
        // terms that were saved.
        save.mutate(edited, { onSuccess: close });
      }}
    >
      <LexiconEditorBody
        failed={termsRead.isError}
        terms={edited}
        weightTexts={weightTexts}
        onPolarityChange={handlePolarityChange}
        onWeightTextChange={handleWeightTextChange}
        onAddCandidates={handleCandidates}
        onPayloadChange={handlePayload}
      />
    </EditorModal>
  );
};

/** What the editor shows in place of its buckets. */
interface LexiconEditorBodyProps {
  /** Whether the term read rejected — an unknown category, today. */
  readonly failed: boolean;
  /** The vocabulary as edited, or undefined until the read settles. */
  readonly terms: readonly Term[] | undefined;
  /** What has been typed into each row's weight field. */
  readonly weightTexts: WeightTexts;
  /** Report a term being filed under a different polarity. */
  readonly onPolarityChange: (
    termId: number,
    polarity: TermPolarity,
  ) => void;
  /** Report a weight field's text moving. */
  readonly onWeightTextChange: (termId: number, text: string) => void;
  /** Report the candidates a pasted block was read into. */
  readonly onAddCandidates: (candidates: readonly TermCandidate[]) => void;
  /** Report a payload the fallback parsed and the schema accepted. */
  readonly onPayloadChange: (payload: TermPayload) => void;
}

/**
 * The editor's body: the buckets and the paste panel, or the reason
 * there are no buckets.
 *
 * Split out of the modal rather than written as nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and very little
 * else.
 *
 * The two states that mean the category was READ share the panel: a
 * category with no vocabulary is the one that most needs a bulk
 * gesture, so the empty state stands where the buckets would and the
 * panel sits under either.
 *
 * Which PRESENTATION is up is held here rather than in the modal,
 * because it is not a draft: it changes nothing an operator could
 * save, and the footer would have to learn to ignore it. Held above
 * the early returns so a read settling does not put the editor back
 * on a drawing nobody chose, and so the hook order does not depend on
 * which state the read is in.
 *
 * @param props - Which state the read is in, and what to render with.
 * @returns The buckets and the panel, the empty state and the panel,
 * the payload in a box, or whichever read state is standing.
 */
const LexiconEditorBody = ({
  failed,
  terms,
  weightTexts,
  onPolarityChange,
  onWeightTextChange,
  onAddCandidates,
  onPayloadChange,
}: LexiconEditorBodyProps) => {
  const [presentation, setPresentation] = useState<TermPresentation>(
    'template',
  );

  if (failed) {
    return (
      <EmptyState
        title="This category could not be read"
        description="Nothing in this domain answers to that category. Close this and pick one from the grid."
      />
    );
  }

  if (terms === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/*
        `self-start` because the track is `inline-flex` and a flex
        child stretches by default, which would draw a two-option
        switch the width of the modal.

        The library wires no `aria-controls` per tab and offers no way
        to, so what follows is a plain region rather than a
        `tabpanel`: half a tab relationship reads worse to assistive
        technology than none, and closing it properly is a change to
        `@ar/ui` and not to this file.
      */}
      <Segmented
        size="sm"
        className="self-start"
        aria-label={PRESENTATION_LABEL}
        items={termPresentationOptions()}
        index={termPresentationIndex(presentation)}
        onChange={(index) => {
          // Narrowed next door rather than asserted here: the control
          // reports a position, and a position nothing offered leaves
          // the editor on the drawing it is already showing.
          const next = readTermPresentation(index);

          if (next !== undefined) {
            setPresentation(next);
          }
        }}
      />

      {presentation === 'json'
        ? (
          // Seeded from the draft at mount and owned by the box from
          // then on — the swap that gets here is the remount its own
          // header names as the way a caller re-seeds it. Nothing is
          // keyed: the two branches are different element types, so
          // React unmounts either way round.
          <JsonEditor
            label={JSON_FIELD_LABEL}
            value={toTermPayload(terms)}
            schema={termPayloadSchema}
            onChange={onPayloadChange}
          />
        )
        : (
          <>
            {terms.length === 0
              ? (
                <EmptyState
                  title="No terms yet"
                  description="This category carries no vocabulary. A term is what the pipeline matches on, and its polarity is what the match is worth. Paste a block below to start one."
                />
              )
              : (
                <div className="flex flex-col gap-4">
                  {splitTermBuckets(terms).map((bucket) => (
                    <BucketList
                      key={bucket.polarity}
                      bucket={bucket}
                      weightTexts={weightTexts}
                      onPolarityChange={onPolarityChange}
                      onWeightTextChange={onWeightTextChange}
                    />
                  ))}
                </div>
              )}

            <TermPastePanel terms={terms} onAdd={onAddCandidates} />
          </>
        )}
    </div>
  );
};

/** What the bulk-paste panel is given. */
interface TermPastePanelProps {
  /**
   * The vocabulary as the draft holds it.
   *
   * What a pasted pattern has to be new against, which includes the
   * rows an earlier press of this panel's own button appended — see
   * the header on what a second press therefore does.
   */
  readonly terms: readonly Term[];
  /** Report the candidates a block was read into, in paste order. */
  readonly onAdd: (candidates: readonly TermCandidate[]) => void;
}

/**
 * The bulk-paste panel: a block in, candidates and sentences out.
 *
 * It holds the typed block and the last reading, and decides nothing
 * else — `./terms.ts` reads the lines, phrases the refusals, counts
 * what happened and mints the rows. What is left here is when to
 * parse, when to retire a result, and where the two halves are drawn.
 *
 * The block lives HERE rather than in the modal because it is not a
 * draft: nothing about it is unsaved work, and the footer would have
 * to learn to ignore it. Radix unmounts a closed disclosure's
 * children, so holding it here is also what survives collapsing the
 * panel.
 *
 * @param props - The terms a pattern must be new against, and where
 * to report the candidates.
 * @returns The disclosure, and the result of the last parse under it.
 */
const TermPastePanel = ({ terms, onAdd }: TermPastePanelProps) => {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const resultId = `${fieldId}-result`;

  const [block, setBlock] = useState('');
  const [reading, setReading] = useState<TermBlockReading | undefined>(
    undefined,
  );

  return (
    <section className="flex flex-col">
      <Accordion mode="single">
        <AccordionItem value={PASTE_ITEM_VALUE} title={PASTE_PANEL_TITLE}>
          {/* Everything in here is PHRASING content: `AccordionItem`
              renders its children inside a `<p>`, so a `div` — and
              with it FormKit's `FormField` — would be markup no
              parser accepts. The header carries the measurement. */}
          <span className="flex flex-col items-start gap-2">
            <label
              htmlFor={fieldId}
              className="text-[13px] font-semibold text-fg1"
            >
              {PASTE_FIELD_LABEL}
            </label>

            <Textarea
              id={fieldId}
              value={block}
              rows={PASTE_ROWS}
              placeholder={PASTE_PLACEHOLDER}
              spellCheck={false}
              aria-describedby={`${hintId} ${resultId}`}
              className="font-mono text-[13px]"
              onChange={(next) => {
                setBlock(next);

                // A sentence names a LINE NUMBER, so a keystroke can
                // move the line one points at. The whole result is
                // retired rather than left addressing a block that
                // has since changed under it.
                setReading(undefined);
              }}
            />

            <span id={hintId} className="text-[11.5px] text-fg3">
              {PASTE_FORMAT_HINT}
            </span>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // Read against the draft's CURRENT terms, which is
                // what makes the duplicate rule cover rows an earlier
                // press appended as well as stored ones.
                const next = parseTermBlock(block, terms);

                setReading(next);
                onAdd(next.candidates);
              }}
            >
              {PASTE_ACTION_LABEL}
            </Button>
          </span>
        </AccordionItem>
      </Accordion>

      {/*
        Outside the disclosure on two counts: `Banner` is a `div` and
        could not live in that `<p>`, and a result an operator can
        still read after collapsing the panel is the more useful one.
        Rendered from mount rather than arriving with its first
        sentence — assistive technology watches regions that already
        exist, and one inserted with its content is routinely missed.
      */}
      <div id={resultId} role="status">
        {reading !== undefined && (
          <p className="m-0 mt-3 text-[12.5px] text-fg2">
            {describeTermBlockReading(reading)}
          </p>
        )}

        {reading !== undefined && reading.sentences.length > 0 && (
          <Banner
            className="mt-2"
            tone="warning"
            title={PASTE_REFUSED_TITLE}
          >
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {reading.sentences.map((sentence, index) => (
                // Keyed by position: the list is rebuilt whole on
                // every parse and never reordered, and two lines are
                // free to break the same rule.
                <li key={index}>{sentence}</li>
              ))}
            </ul>
          </Banner>
        )}
      </div>
    </section>
  );
};

/** What one polarity bucket is given. */
interface BucketListProps {
  /** The polarity, its reading, and the terms filed under it. */
  readonly bucket: TermBucket;
  /** What has been typed into each row's weight field. */
  readonly weightTexts: WeightTexts;
  /** Report a term being filed under a different polarity. */
  readonly onPolarityChange: (
    termId: number,
    polarity: TermPolarity,
  ) => void;
  /** Report a weight field's text moving. */
  readonly onWeightTextChange: (termId: number, text: string) => void;
};

/**
 * One polarity's terms, as a list a term can be dragged into.
 *
 * Its `group` carries the polarity, which is what makes a drop from
 * either sibling a RECEIVE rather than a reorder — the header carries
 * the measurement behind that, and it is the one detail of this
 * component that is not obvious from its props.
 *
 * @param props - The bucket, the typed weights, and the two gestures
 * a row reports.
 * @returns The section: its heading, and the droppable list under it.
 */
const BucketList = ({
  bucket,
  weightTexts,
  onPolarityChange,
  onWeightTextChange,
}: BucketListProps) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1.5">
      {/* `tokens.css` puts a direct rule on every heading level, and a
          direct element rule beats the inherited one this column
          would otherwise set — so the size and the margin are
          restated here, exactly as `EntityCard`'s own title does. */}
      <h3
        id={headingId}
        className={cn(
          'm-0 flex items-center gap-2',
          'text-[12.5px] font-semibold text-fg1',
        )}
      >
        <span
          aria-hidden
          className={cn('size-2 rounded-full', bucket.fillClass)}
        />
        {bucket.label}
        <span className="font-mono font-normal text-fg3">
          {bucket.terms.length}
        </span>
      </h3>

      <Sortable
        group={`${DRAG_GROUP_PREFIX}${bucket.polarity}`}
        items={bucket.terms}
        getKey={(term) => String(term.id)}
        onReorder={ignoreReorder}
        onReceive={(term) => {
          onPolarityChange(term.id, bucket.polarity);
        }}
        emptyHint={`Nothing is ${bucket.label.toLowerCase()} yet`}
        renderItem={(term) => (
          <TermRow
            term={term}
            weightText={weightTexts[String(term.id)]}
            onPolarityChange={onPolarityChange}
            onWeightTextChange={onWeightTextChange}
          />
        )}
      />
    </section>
  );
};

/** What one term's row is given. */
interface TermRowProps {
  /** The term, as the draft has it. */
  readonly term: Term;
  /** What has been typed here, or undefined where nothing has. */
  readonly weightText: string | undefined;
  /** Report this term being filed under a different polarity. */
  readonly onPolarityChange: (
    termId: number,
    polarity: TermPolarity,
  ) => void;
  /** Report this row's weight field moving. */
  readonly onWeightTextChange: (termId: number, text: string) => void;
};

/**
 * One term: what it matches, which bucket it is in, what it is worth.
 *
 * The polarity control here is the pointer-free equivalent of
 * dragging this row into another list, and it is the same call — see
 * the header on why that is what SC 2.5.7 asks for.
 *
 * A row the paste panel appended carries a badge, read straight off
 * its id by {@link isDraftTerm}. It is not decoration: the fixture
 * seam cannot insert a row, so a save keeps this one for exactly as
 * long as the modal is open, and the header says so at length.
 *
 * @param props - The term, its typed weight, and the two gestures it
 * reports.
 * @returns The row.
 */
const TermRow = ({
  term,
  weightText,
  onPolarityChange,
  onWeightTextChange,
}: TermRowProps) => {
  const faultId = useId();
  const text = weightText ?? String(term.weight);
  const reading = readTermWeight(text);
  const fault = reading.ok
    ? undefined
    : reading.sentence;

  return (
    <SortableRow
      className="items-start"
      trailing={(
        <div className="flex shrink-0 items-start gap-2">
          <Select
            value={term.polarity}
            options={termPolarityOptions()}
            width={POLARITY_PANEL_WIDTH}
            ariaLabel={`Polarity of ${term.pattern}`}
            onChange={(next) => {
              // Narrowed next door rather than asserted here: the
              // control reports a string, and a value none of its
              // options carry moves nothing.
              const polarity = readTermPolarity(next);

              if (polarity !== undefined) {
                onPolarityChange(term.id, polarity);
              }
            }}
          />

          <div className="flex w-24 flex-col gap-1">
            <TextInput
              value={text}
              inputMode="decimal"
              // The library's `invalid` variant paints the border and
              // sets no ARIA state, so the state is set here.
              invalid={fault !== undefined}
              aria-invalid={fault !== undefined}
              aria-describedby={fault === undefined
                ? undefined
                : faultId}
              aria-label={`Weight of ${term.pattern}`}
              // `Sortable` puts `draggable` on the wrapper around this
              // row, and a drag started inside a text field is a drag
              // instead of a selection. Opting the input out is what
              // leaves it selectable without the row losing its grip.
              draggable={false}
              onChange={(next) => {
                onWeightTextChange(term.id, next);
              }}
            />

            {fault !== undefined && (
              <span id={faultId} className="text-[11.5px] text-danger">
                {fault}
              </span>
            )}
          </div>
        </div>
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate font-mono text-[12.5px] text-fg1">
          {term.pattern}
        </span>

        {isDraftTerm(term) && (
          <Badge tone="warning" size="sm" className="shrink-0">
            {DRAFT_ROW_LABEL}
          </Badge>
        )}
      </span>
    </SortableRow>
  );
};
