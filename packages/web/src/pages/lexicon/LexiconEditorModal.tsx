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
 * nothing into is a picture of a list rather than a way into one.
 *
 * ## What is not here yet
 *
 * The bulk-paste panel over {@link parseTermBlock} and the JSON
 * fallback over `./schema.ts` are the two branches this editor grows
 * next; both write the same draft, which is why the draft is a list
 * and not a set of controls. Nothing in this file is reachable from
 * the unit suite, which is node-only and collects `.ts` alone — its
 * decisions are next door, its bindings are proven by a
 * `check-types` mutation grid, and what it renders falls to the
 * Playwright specs.
 */

import type { TermBucket } from './terms';
import type { EditorDraft } from '../../components/editorDraft';
import type { Term, TermPolarity } from '../../data/types';

import {
  EmptyState,
  Select,
  Skeleton,
  Sortable,
  SortableRow,
  TextInput,
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
import {
  useCategory,
  useSaveCategoryTerms,
  useTerms,
} from '../../data/hooks';

import {
  readTermPolarity,
  readTermWeight,
  splitTermBuckets,
  termPolarityOptions,
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
}

/**
 * The editor's body: the three buckets, or the reason there are not
 * three buckets.
 *
 * Split out of the modal rather than written as nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and very little
 * else.
 *
 * @param props - Which state the read is in, and what to render with.
 * @returns The buckets, an empty state, or the loading stand-in.
 */
const LexiconEditorBody = ({
  failed,
  terms,
  weightTexts,
  onPolarityChange,
  onWeightTextChange,
}: LexiconEditorBodyProps) => {
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

  if (terms.length === 0) {
    return (
      <EmptyState
        title="No terms yet"
        description="This category carries no vocabulary. A term is what the pipeline matches on, and its polarity is what the match is worth."
      />
    );
  }

  return (
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
      <span className="block truncate font-mono text-[12.5px] text-fg1">
        {term.pattern}
      </span>
    </SortableRow>
  );
};
