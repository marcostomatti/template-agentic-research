/**
 * @packageDocumentation
 * The sources surface's editor: one feed's address, how it is read,
 * and the two flags only an operator sets.
 *
 * Opened at the sources `:entityId/edit` sub-route, over the table
 * the row menu was clicked on. It composes
 * `../../components/EditorModal` for the frame — header, footer,
 * unsaved sentence, relative close — and holds no decision
 * `./editor.ts` could hold: the kind control's vocabulary, the
 * narrowing that reads its answer back, and what the endpoint field's
 * text reads as all live next door, where the unit runner can reach
 * them. What is left here is one control per member and the read
 * states.
 *
 * ## Four members of ten, and the six it will not offer
 *
 * A `Source` mirrors the whole `sources` row, and this editor writes
 * `endpoint`, `kind`, `enabled` and `flagged`. The rest is not
 * missing: `id` and `domainId` are the row's identity, and `cursor`,
 * `consecutiveFailures`, `lastSuccessAt` and `lastFailureAt` are the
 * PIPELINE's own bookkeeping — `../../data/api.ts` says on
 * `saveSource` that an endpoint accepting this payload has to ignore
 * them rather than trust them, and the surest way to keep an operator
 * from sending a value nobody should trust is to offer no control
 * that could produce one.
 *
 * The save still hands back the whole row, because the write is
 * eventually a PUT and the draft is what was loaded with four members
 * moved. Nothing here reconstructs a row.
 *
 * The endpoint is the one of the four that is typed rather than
 * chosen, and `./editor.ts` decides when typing has produced one.
 * Text that has not is never written to the draft, so a save cannot
 * store a feed pointing at nothing — and a save can be offered while
 * the box shows a refusal, because the refusal means the last
 * keystroke did not reach the draft and the save is of what did.
 *
 * ## Clearing the flag is an operator ACT
 *
 * `sources.flagged` and `sources.enabled` are both booleans and they
 * are not the same kind of value. `enabled` is a decision start to
 * finish: nothing but an operator ever writes it, and a feed switched
 * off stays off until somebody says otherwise.
 *
 * `flagged` has two parties. It is RAISED by the pipeline — the rot
 * detector concluding a feed needs looking at — and it is lowered by
 * nobody at all: a later success resets the failure counter and
 * leaves the flag exactly where it was. `../../data/sources.ts` is
 * built around that gap, which is why `classifySource` reads the flag
 * OR the streak rather than either alone, and why the table draws a
 * `Flagged` tag beside a counter reading zero.
 *
 * So the switch below is the only thing in this app that can lower
 * it, and turning it off is a judgement being recorded rather than a
 * state being tidied: an operator saying they have looked, and this
 * feed is worth trusting again. That is why it is a control on an
 * editor with a save behind it rather than a one-click action in the
 * row menu, and why the row states the rule instead of leaving it to
 * be inferred from a switch that will not come back up on its own.
 *
 * ## Two of the four move the row's STATUS
 *
 * `classifySource` reads `enabled` and `flagged`, so either switch
 * can move a row between the four statuses — and the stat band above
 * the table is a SEPARATE read over the same rows. That is what
 * `useSaveSource` invalidates two keys for; this file names neither
 * key and does not have to.
 *
 * ## The kind control is total over the union
 *
 * `Select` resolves a value none of its options carry to the FIRST
 * option, so a control over a closed union owes a list carrying every
 * member — otherwise a source is drawn wearing somebody else's kind
 * and a save stores what the control showed. {@link sourceKindChoices}
 * is that list and `./editor.ts` carries the reading, including why
 * it is a second list rather than the toolbar's.
 *
 * ## What the read states are, and what they are not
 *
 * `useSource` is the one read this modal is about. Its rejection is a
 * live address rather than an error state to hide: `:entityId` is a
 * required segment, but nothing constrains it to a number a source
 * carries, and `../../data/api.ts` refuses a foreign row with the
 * same message a missing one gets. Both report inside the dialog
 * rather than taking the shell down.
 *
 * There is no empty state. A source is one row, so it is either read
 * or it is not.
 *
 * ## The header names the feed by its whole endpoint
 *
 * A source has no name column, so the endpoint IS its identity, and
 * the host alone does not carry it: three seeded feeds are drawn from
 * `example.org` and a dialog titled with the host would name any of
 * them. The row menu's action label takes the host and has the same
 * ambiguity; that label predates this editor and is not this file's
 * to change, but it is why the title here is not simply the same
 * string.
 *
 * ## What no test in this package reaches
 *
 * Nothing in this file. The unit suite is node-only and collects
 * `.ts` alone — this file's decisions are next door in `./editor.ts`,
 * its bindings are proven by a `check-types` mutation grid, and what
 * it renders falls to the Playwright specs.
 */

import type { EditorDraft } from '../../components/editorDraft';
import type { Source } from '../../data/types';
import type { ReactNode } from 'react';

import {
  Divider,
  EmptyState,
  FormField,
  Select,
  Skeleton,
  Switch,
  TextInput,
} from '@ar/ui';
import { useId, useState } from 'react';
import { useParams } from 'react-router';

import {
  EMPTY_EDITOR_DRAFT,
  withDraftValues,
  withLoadedRow,
} from '../../components/editorDraft';
import { EditorModal } from '../../components/EditorModal';
import { useSaveSource, useSource } from '../../data/hooks';

import {
  readSourceEndpoint,
  readSourceKind,
  sourceKindChoices,
} from './editor';

/** What the header says while the source's own read is in flight. */
const PENDING_TITLE = 'Source';

/** What each control is called, here and in the specs. */
const ENDPOINT_LABEL = 'Endpoint';
const KIND_LABEL = 'Kind';
const ENABLED_LABEL = 'Enabled';
const FLAGGED_LABEL = 'Flagged';

/**
 * What the endpoint field says under itself.
 *
 * Restates `Source.endpoint`'s own column note rather than inventing
 * a rule: the `push` half is the one an operator typing a URL into
 * this box would otherwise get wrong.
 */
const ENDPOINT_HINT = 'What to request. A push source names where a '
  + 'payload lands instead.';

/** What the three rows below the rule say under their labels. */
const KIND_DESCRIPTION = 'Selects the adapter that reads this feed. '
  + 'Its cursor was written by the one reading it now.';
const ENABLED_DESCRIPTION = 'Whether the pipeline reads this feed at '
  + 'all. A feed switched off keeps its cursor and its counters.';
const FLAGGED_DESCRIPTION = 'Marked for review. The pipeline raises '
  + 'this and never lowers it, so clearing it is a decision.';

/** How wide the kind control's dropdown panel is drawn. */
const KIND_PANEL_WIDTH = 160;

/**
 * The sources surface's editor.
 *
 * @returns The modal: the source's four controls over the draft, or
 * whichever of the two read states its own read is in.
 */
export const SourceEditorModal = () => {
  const { domainSlug, entityId } = useParams<{
    domainSlug?: string;
    entityId?: string;
  }>();

  // `:entityId` is a required segment so it cannot arrive empty, but a
  // segment that is not a number is a live address: `Number` answers
  // `NaN`, no source carries it, and the read refuses — which is the
  // rejected state below rather than a special case.
  const sourceId = Number(entityId);

  const sourceRead = useSource(domainSlug, sourceId);
  const save = useSaveSource(domainSlug);

  const [held, setHeld] = useState<EditorDraft<Source>>(EMPTY_EDITOR_DRAFT);

  const loaded = sourceRead.data;

  // Derived on EVERY render from whatever the read holds, which is
  // what `withLoadedRow` is built for: it answers the same holder by
  // identity when nothing moved, so a fresh wrapper here is a
  // comparison rather than a state update.
  const draft = withLoadedRow(held, loaded);
  const edited = draft.draft;

  // Based off the DERIVED holder rather than the state updater's
  // argument: before the first edit the state is still the empty
  // holder, and a write against that one would be dropped.
  const write = (changes: Partial<Source>) => {
    setHeld(withDraftValues(draft, changes));
  };

  return (
    <EditorModal
      // The endpoint WHOLE, and as STORED rather than as edited.
      // Whole because it is the row's identity and the host alone is
      // not — three seeded feeds share one — and stored because the
      // dialog's accessible name is what a spec addresses it by, and
      // a name that moved under the operator's own typing is a
      // locator that resolves to nothing half the time. Wrapped in a
      // span that may break, since `OverlayHeader` sets no wrapping
      // rule and an endpoint has no spaces to break at.
      title={loaded === undefined
        ? PENDING_TITLE
        : <span className="break-words">{loaded.endpoint}</span>}
      draft={draft}
      saving={save.isPending}
      saveError={save.error}
      onSave={(close) => {
        if (edited === undefined) {
          return;
        }

        // The frame hands its own close in rather than this file
        // re-deriving the relative navigation. Closing on success is
        // this surface's choice: the table behind it draws the very
        // row that was saved, and the band above it recounts.
        save.mutate(edited, { onSuccess: close });
      }}
    >
      <SourceEditorBody
        failed={sourceRead.isError}
        edited={edited}
        onEndpointChange={(endpoint) => {
          write({ endpoint });
        }}
        onKindChange={(choice) => {
          // Narrowed next door rather than asserted here: the control
          // reports a string, and a value none of its options carry
          // writes nothing.
          const kind = readSourceKind(choice);

          if (kind !== undefined) {
            write({ kind });
          }
        }}
        onEnabledChange={(enabled) => {
          write({ enabled });
        }}
        onFlaggedChange={(flagged) => {
          write({ flagged });
        }}
      />
    </EditorModal>
  );
};

/** What the editor shows in place of its controls. */
interface SourceEditorBodyProps {
  /** Whether the source read rejected — an unknown row, today. */
  readonly failed: boolean;
  /** The source as the operator has it, or undefined until it lands. */
  readonly edited: Source | undefined;
  /**
   * Report an endpoint the field accepted; refused text never
   * reaches this.
   */
  readonly onEndpointChange: (endpoint: string) => void;
  /** Report the kind control's answer, as it reported it. */
  readonly onKindChange: (choice: string) => void;
  /** Report the enable switch moving. */
  readonly onEnabledChange: (enabled: boolean) => void;
  /** Report the flag switch moving. */
  readonly onFlaggedChange: (flagged: boolean) => void;
}

/**
 * The editor's body: the four controls, or the reason there are none.
 *
 * Split out of the modal rather than written as nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and very little
 * else. It is also the half a static render can reach: `Modal` is a
 * Radix dialog and renders through a portal, so a probe of the frame
 * sees nothing while a probe of this sees the whole surface.
 *
 * The endpoint field's typed text is held HERE rather than in the
 * modal, because it is not a draft: text that does not read as an
 * endpoint is never written, so nothing about it is unsaved work and
 * the footer would have to learn to ignore it. `./editor.ts` carries
 * what that costs and why the alternative is worse.
 *
 * @param props - Which state the read is in, and the four gestures.
 * @returns The controls, or whichever read state is standing.
 */
const SourceEditorBody = ({
  failed,
  edited,
  onEndpointChange,
  onKindChange,
  onEnabledChange,
  onFlaggedChange,
}: SourceEditorBodyProps) => {
  const endpointId = useId();
  const faultId = `${endpointId}-fault`;

  // Above the early returns, so the hook order does not depend on
  // which state the read is in.
  const [typed, setTyped] = useState<string | undefined>(undefined);

  if (failed) {
    return (
      <EmptyState
        title="This source could not be read"
        description="Nothing in this domain answers to that source. Close this and pick one from the table."
      />
    );
  }

  if (edited === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-56 w-full rounded-xl" />;
  }

  const text = typed ?? edited.endpoint;
  const reading = readSourceEndpoint(text);
  const fault = reading.ok
    ? undefined
    : reading.sentence;

  return (
    <div className="flex flex-col gap-5">
      <FormField
        label={ENDPOINT_LABEL}
        htmlFor={endpointId}
        hint={ENDPOINT_HINT}
        // The id rides INSIDE the slot rather than on the span
        // FormField wraps it in, which is what leaves the message
        // addressable by `aria-describedby` below.
        error={fault === undefined
          ? undefined
          : <span id={faultId}>{fault}</span>}
      >
        <TextInput
          id={endpointId}
          value={text}
          // A feed is identified by this string and nothing else, so
          // it is drawn in the face the table's own source cell uses.
          className="font-mono"
          // The library's `invalid` variant paints the border and
          // sets no ARIA state, so the state is set here.
          invalid={fault !== undefined}
          aria-invalid={fault !== undefined}
          aria-describedby={fault === undefined
            ? undefined
            : faultId}
          onChange={(next) => {
            setTyped(next);

            const accepted = readSourceEndpoint(next);

            if (accepted.ok) {
              onEndpointChange(accepted.endpoint);
            }
          }}
        />
      </FormField>

      {/* What the pipeline reads, above; what an operator decided,
          below. An unlabelled rule because the two rows under it are
          not one category — the header says why the flag has two
          parties and the switch beside it has one. */}
      <Divider />

      <ControlRow
        label={KIND_LABEL}
        description={KIND_DESCRIPTION}
        // Declares no parameter: `Select` names its trigger from
        // `ariaLabel` alone and spreads nothing, so it cannot point
        // at the label beside it. Naming it with the very words on
        // that label is what keeps the two readings one.
        control={() => (
          <Select
            size="sm"
            value={edited.kind}
            options={sourceKindChoices()}
            onChange={onKindChange}
            width={KIND_PANEL_WIDTH}
            ariaLabel={KIND_LABEL}
          />
        )}
      />

      <ControlRow
        label={ENABLED_LABEL}
        description={ENABLED_DESCRIPTION}
        control={(labelId) => (
          <Switch
            checked={edited.enabled}
            onChange={onEnabledChange}
            aria-labelledby={labelId}
          />
        )}
      />

      <ControlRow
        label={FLAGGED_LABEL}
        description={FLAGGED_DESCRIPTION}
        control={(labelId) => (
          <Switch
            checked={edited.flagged}
            onChange={onFlaggedChange}
            aria-labelledby={labelId}
          />
        )}
      />
    </div>
  );
};

/** What one label-and-control row is given. */
interface ControlRowProps {
  /** What the control is called, and its accessible name. */
  readonly label: string;
  /** The line under it: what the value means to the pipeline. */
  readonly description: string;
  /**
   * The control itself, handed the label's own id to point at.
   *
   * The shape `../settings/SettingsPage.tsx` uses for the same job. A
   * control that names itself — `Select` does, from `ariaLabel` —
   * declares no parameter and is assignable unchanged.
   */
  readonly control: (labelId: string) => ReactNode;
}

/**
 * One row: what the value is called and what it means, then the
 * control that writes it.
 *
 * Restates the settings page's own row treatment rather than sharing
 * it. That one is a `SectionCard` row and carries the separators a
 * card of them needs; this one stands in a modal column that already
 * states its rhythm, and a component library taking either would be
 * taking both.
 *
 * The label is a `div` with an id rather than a `<label>`, because
 * neither control below it is labelable: `Switch` renders a `button`
 * and `Select` renders a menu trigger, and `<label for>` reaches
 * neither.
 *
 * @param props - What to call the value, what to say about it, and
 * the control.
 * @returns The row.
 */
const ControlRow = ({ label, description, control }: ControlRowProps) => {
  const labelId = useId();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-[12rem] flex-1">
        <div id={labelId} className="text-[13px] font-semibold text-fg1">
          {label}
        </div>
        {/* `tokens.css` puts a direct rule on `p`, so the size, the
            colour and the margin are all restated rather than
            inherited from the column. */}
        <p className="m-0 mt-0.5 text-xs text-fg3">{description}</p>
      </div>

      <div className="shrink-0">{control(labelId)}</div>
    </div>
  );
};
