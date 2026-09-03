/**
 * @packageDocumentation
 * The tools surface's editor: which service a connector reaches, and
 * what that kind of client needs in order to reach it.
 *
 * Opened at the tools `:entityId/edit` sub-route, over the grid the
 * card was clicked on. It composes `../../components/EditorModal` for
 * the frame — header, footer, unsaved sentence, relative close — and
 * holds no decision `./editor.ts` could hold: which keys each kind
 * draws a control for, what a secret field may carry, what a kind
 * change leaves standing and what a draft is refused for all live
 * next door, where the unit runner can reach them. What is left here
 * is one control per field and the read states.
 *
 * ## Two fields every connector has, then the branch
 *
 * A `connectors` row is four columns and one of them is the id. The
 * name and the kind are the two every row carries whatever it talks
 * to, so they stand above the rule. Everything below it is a key of
 * the open `config` payload, and WHICH keys are drawn is a reading of
 * the kind rather than of the row — `connectorFields` answers it.
 *
 * That is the whole of what the `Divider` marks: the controls above
 * it are the same two on every connector, and the ones below change
 * under the control immediately above them. It is unlabelled for the
 * reason `../sources/SourceEditorModal.tsx` leaves its own rule
 * unlabelled — the two halves are not two categories, they are a
 * fixed part and a part that depends on it.
 *
 * A key the table does not declare is drawn by nothing here and
 * survives a save untouched; the seeded search connector's numeric
 * `resultLimit` is the worked example and `./editor.ts` says why a
 * text control writing `"20"` where `20` was stored would be worse
 * than no control at all.
 *
 * ## A secret field is empty because the draft holds nothing
 *
 * `openConnectorDraft` takes every mask out of the row before this
 * modal ever holds it, so a secret control renders empty for the
 * strongest available reason: there is no value behind it to echo.
 * The hint under one says what a blank means — the stored value is
 * kept — and `connectorSavePayload` is what makes that true, omitting
 * a blank field from the payload rather than sending an empty string.
 *
 * The box is NOT masked, and that is deliberate. A `type="password"`
 * control would promise a confidentiality this shell cannot deliver:
 * `../../data/drafts.ts` records what was typed into the tab, and the
 * card behind this dialog draws the stored config key by key, so a
 * retyped secret is on screen in plain text the moment the modal
 * closes. `./editor.ts` states the same conclusion from the seam's
 * side and says it plainly — this is not a place to type a real
 * credential — and a control that looked like a password box would
 * be arguing the opposite.
 *
 * What it does carry is `autoComplete="off"`, so a browser does not
 * offer to remember a fixture credential or fill a real one in.
 *
 * ## The opened row is the SOURCE, and a retyped secret never settles
 *
 * `withLoadedRow` is handed the OPENED row rather than the row the
 * query answered. Comparing a normalised draft against a raw source
 * would report an untouched editor as carrying unsaved work from the
 * frame it mounted in, and the footer would never fall silent.
 *
 * The consequence worth stating is the one that follows from the
 * write-only rule itself: a secret that IS retyped leaves the draft
 * differing from every source that can ever arrive, because the
 * opener strips that key back out of whatever the read answers. So
 * the footer goes on reporting one unsaved member after a successful
 * save. Closing on success is what keeps that off the screen, and it
 * is not a fixture artefact — an endpoint would answer a mask, which
 * the opener removes for exactly the same reason. A value that cannot
 * be read back cannot be compared against.
 *
 * ## The kind control, and the gesture that would empty a config
 *
 * `Select` resolves a value none of its options carry to the FIRST
 * option, so the list is total over `ConnectorKind`. It is built from
 * `CONNECTOR_KIND_FACETS` in `./cards.ts` rather than from a builder
 * of its own, which is what `./editor.ts`'s header already states:
 * the badge on the card and the option in this control name a kind
 * with one vocabulary. `readConnectorKind` is the other half and
 * cannot be dropped — the control reports a bare string.
 *
 * `withConnectorKind` empties the config whatever kind it is handed,
 * for the reason `./editor.ts` argues at length, and a `menuitemradio`
 * re-chosen at its current value is an ordinary click. So the body
 * declines a choice that names the kind already stored: without that,
 * clicking the selected item would clear a connector's whole
 * configuration and the operator's only clue would be the fields
 * going blank.
 *
 * ## The branch fields hold their own text
 *
 * `withConnectorField` trims, and a field trimmed to nothing drops
 * its key. `./editor.ts` says why that is right for the payload and
 * why it is only safe where the modal keeps the typed text itself: a
 * control drawn straight from a trimmed draft swallows the space
 * between two words as the second one is being typed. So the body
 * holds one string per config key, shows that, and writes the trimmed
 * value underneath.
 *
 * The map is cleared by a kind change, because the fields it
 * describes are about a payload that no longer exists — `endpoint` is
 * a key of both the `llm` and the `search` branch, so text left
 * behind would be drawn over an emptied config as though it were
 * stored.
 *
 * ## The connection test reads the DRAFT
 *
 * `./connectionTest.ts` takes a kind and a config rather than a whole
 * row, which is what lets the control below the fields run it over
 * what the operator has in front of them instead of over what is
 * stored. A reading of the stored row would answer about a
 * configuration this screen is not showing, which on the one surface
 * whose job is repairing one would be the wrong subject.
 *
 * It contacts nothing — that module argues the reading at length
 * — so the button carries a sentence saying what it does read,
 * bound to it with `aria-describedby`, and both outcomes lead with
 * the same thing. An operator who presses a control called `Test
 * connection` and is told only that it passed has been told the
 * service is up, which is the one claim this shell must never make.
 *
 * Nothing gates the press. A draft can be refused by
 * `validateConnectorDraft` and still be worth testing — reading
 * an address is exactly what an operator does while a name is still
 * colliding — and the two readings answer different questions.
 *
 * ## Two outcomes, two channels
 *
 * A refusal is a sentence that has to be read before it is worth
 * acting on, and the footer's status slot truncates. So it goes to a
 * floating `Toast tone="danger"`, which is where this library puts a
 * reading that has to survive being looked away from.
 *
 * A success goes to that slot instead, through the frame's own
 * `footerStatus` prop. `REACHED_SENTENCE` is longer than the line and
 * is written front-loaded for it: an operator who reads only
 * `Nothing was contacted:` has still been told the true thing. A
 * `title` carries the whole of it to a pointer, and
 * `ModalFooterStatus` is a live region, so the announcement is whole
 * whatever the line does.
 *
 * ## One toast, and the two things that take it away
 *
 * One per modal rather than one per press: a second press replaces
 * the reading in it, so the last answer is the only one on screen and
 * a stack of stale refusals cannot build up behind the dialog.
 *
 * Persistent here means no timer and no auto-dismiss — `Toast`'s
 * own transient lifecycle is deferred in that library, and a
 * controlled one is what this surface wants anyway. Exactly two
 * things take a reading away: the dismiss, and any edit. `writeRow`
 * clears the outcome, because a refusal naming the very field an
 * operator has just repaired is a sentence about a payload that is no
 * longer on screen. The same clearing empties the footer, so neither
 * channel can report a reading of a draft that has since moved.
 *
 * The role is the library's `role="status"` overridden to `alert`,
 * and it is the one place this file argues with `@ar/ui`. The toast
 * is INSERTED along with its content — it does not exist before
 * the press — and an inserted polite region is announced
 * unreliably where an alert is what the role is specified for. It is
 * named as well, because the frame's own save-failure banner is an
 * alert too and a spec has to be able to tell them apart.
 *
 * ## The dismiss puts focus back
 *
 * `Toast`'s dismiss button unmounts itself, so activating it would
 * drop focus onto the document body — inside a Radix focus trap,
 * which is the worst place to leave a keyboard. The handler moves
 * focus to the button that raised the toast before the state that
 * renders it is cleared, which is also the control an operator would
 * reach for next.
 *
 * ## Two reads, no slug, and only one of them holds the body back
 *
 * `useConnector` takes no domain slug and neither does
 * `useSaveConnector`: `connectors` carries no `domain_id`, so a
 * connector is a fact about the installation and this editor survives
 * a domain switch behind it. Its rejection is a live address rather
 * than an error state to hide — `:entityId` is a required segment,
 * but nothing constrains it to a number a connector carries.
 *
 * `useConnectors` is the one that does NOT hold anything back. It is
 * read for the uniqueness question alone, and a list that has not
 * landed refuses nothing on its own account: the collision sentence
 * simply does not appear until it does. Holding the whole editor for
 * it would be waiting on a read that can only ever ADD a refusal.
 *
 * There is no empty state. A connector is one row, so it is either
 * read or it is not.
 *
 * ## What a refusal does, and why the save button stays live
 *
 * `validateConnectorDraft` answers one sentence per fault in the
 * order the form draws its controls, so the refusals are rendered as
 * that list — above the controls, reading down the same way they do,
 * in a region that exists from mount so assistive technology is
 * watching it before the first sentence lands.
 *
 * The save is declined while any sentence stands, in the handler
 * rather than by disabling the button. `../../components/EditorModal.tsx`
 * disables that control on exactly two readings — a draft with
 * nothing to save, and a save already in flight — and a refusal is
 * neither; reaching for `saving` would put a third meaning behind a
 * flag whose whole job is refusing a double submit. What it costs is
 * a click that is refused rather than prevented, and it buys the
 * reason being on screen before the click and after it.
 *
 * ## The header names the connector by its STORED name
 *
 * The name is the row's identity within its kind and it is also a
 * field being edited, which is why the title reads the row the query
 * answered rather than the draft: the dialog's accessible name is
 * what a spec addresses it by, and a name moving under the operator's
 * own typing is a locator that resolves to nothing half the time. It
 * is wrapped in a span that may break for the reason the sources
 * editor wraps its endpoint — `OverlayHeader` sets no wrapping rule.
 *
 * ## What no test in this package reaches
 *
 * Nothing in this file. The unit suite is node-only and collects `.ts`
 * alone — this file's decisions are next door in `./editor.ts`, its
 * bindings are proven by a `check-types` mutation grid, and what it
 * renders falls to the Playwright specs.
 */

import type { ConnectionTestOutcome } from './connectionTest';
import type { ConnectorField, ConnectorFieldRole } from './editor';
import type { EditorDraft } from '../../components/editorDraft';
import type { Connector } from '../../data/types';

import {
  Banner,
  Button,
  Divider,
  EmptyState,
  FormField,
  Select,
  Skeleton,
  TextInput,
  Toast,
} from '@ar/ui';
import { useId, useRef, useState } from 'react';
import { useParams } from 'react-router';

import {
  EMPTY_EDITOR_DRAFT,
  withDraftValues,
  withLoadedRow,
} from '../../components/editorDraft';
import { EditorModal } from '../../components/EditorModal';
import {
  useConnector,
  useConnectors,
  useSaveConnector,
} from '../../data/hooks';

import { CONNECTOR_KIND_FACETS } from './cards';
import { testConnection } from './connectionTest';
import {
  connectorFieldValue,
  connectorFields,
  connectorSavePayload,
  openConnectorDraft,
  readConnectorKind,
  validateConnectorDraft,
  withConnectorField,
  withConnectorKind,
  withConnectorName,
} from './editor';

/** What the header says while the connector's own read is in flight. */
const PENDING_TITLE = 'Connector';

/** What the two common controls are called, here and in the specs. */
const NAME_LABEL = 'Name';
const KIND_LABEL = 'Kind';

/**
 * What the name field says under itself.
 *
 * States the rule the two name refusals in `./editor.ts` enforce, in
 * the same order they are reported: what a name is FOR, then that a
 * kind names each instance once.
 */
const NAME_HINT = 'Which instance of this kind the pipeline asks for. '
  + 'A kind names each instance once.';

/**
 * What the kind row says under its label.
 *
 * The second sentence is the one an operator needs BEFORE the click
 * rather than after it: `withConnectorKind` empties the config, and a
 * control that quietly discarded an address and a credential would be
 * a gesture nobody could have predicted from its label.
 */
const KIND_DESCRIPTION = 'Selects the client that talks to this row. '
  + 'Changing it empties the configuration below, which no other '
  + 'client could use.';

/**
 * What a field says under itself, by what that field is FOR.
 *
 * Keyed by the ROLE rather than by the key, and total over the union
 * so a role added to `./editor.ts` is a `check-types` error here
 * rather than a control with nothing under it. A hint per KEY was the
 * alternative and it is the thing `./editor.ts` refuses at length: a
 * key is named by the payload, the service and the card in one
 * vocabulary, and prose explaining `notebookId` would be a second.
 * What a hint can say without paraphrasing anything is what the role
 * means, which is the same for every key that has it.
 */
const FIELD_HINTS: Readonly<Record<ConnectorFieldRole, string>> = {
  address: 'Where this connector is reached. One with anything else '
    + 'configured cannot leave this blank.',
  secret: 'Write-only, so nothing here shows what is stored. Left '
    + 'blank it stays as it is; anything typed replaces it.',
  setting: 'Configuration this kind of client takes.',
};

/** What the refusal list is titled, and what names its region. */
const REFUSED_TITLE = 'This connector cannot be saved yet';
const REFUSED_REGION_LABEL = 'Why this connector cannot be saved';

/** What the connection test's control is called, here and in the specs. */
const TEST_LABEL = 'Test connection';

/**
 * What the test says about itself before anybody presses it.
 *
 * Bound to the button with `aria-describedby`, and the header says
 * why it is there: the control is named for the gesture in the
 * operator's own words, and this is where the honesty about what the
 * gesture does lives. It leads with the reading and ends with the
 * absence, so the two clauses sit in the order they matter.
 */
const TEST_DESCRIPTION = 'Reads the configuration above for an '
  + 'address this deployment could reach. Contacts nothing.';

/** What names the region a refused reading is announced in. */
const TEST_REFUSED_REGION_LABEL = 'Connection test result';

/**
 * Geometry the kind row is drawn on.
 *
 * Restates `../agents/AgentEditorModal.tsx`'s own row treatment
 * rather than sharing it, for the reason that file gives about the
 * settings page: the shape belongs to a modal column and not to a
 * component library, and a third module extracted to hold four class
 * strings would be shared by two files that are free to diverge.
 */
const ROW_CLASS = 'flex flex-wrap items-center gap-x-4 gap-y-2';
const ROW_LEAD_CLASS = 'min-w-[12rem] flex-1';
const ROW_LABEL_CLASS = 'text-[13px] font-semibold text-fg1';

/**
 * What the kind row says under its label.
 *
 * `tokens.css` puts a direct rule on `p`, so the size, the colour and
 * the margin are all restated rather than inherited from the column.
 */
const ROW_DESCRIPTION_CLASS = 'm-0 mt-0.5 text-xs text-fg3';

/**
 * Geometry and treatment the connection test's own sentence takes.
 *
 * The kind row's lead is a label with a description beneath it; this
 * row's lead is the sentence alone, so it takes that row's flexing
 * width and the small treatment without the `mt-0.5` that spaces one
 * under a label. `tokens.css` puts a direct rule on `p`, so the size,
 * the colour and the margin are restated rather than inherited.
 */
const TEST_DESCRIPTION_CLASS = 'm-0 min-w-[12rem] flex-1 text-xs '
  + 'text-fg3';

/**
 * Where the branch fields' typed text starts: nowhere, so every
 * control draws the draft's own value.
 *
 * A module-scope constant rather than a fresh literal per mount, so
 * the empty state is one object and a reset compares equal to it.
 */
const EMPTY_TYPED: Readonly<Record<string, string>> = {};

/**
 * What the kind control offers: every kind, in the order the cards
 * describe them.
 *
 * Built here from `./cards.ts`'s facets rather than by a builder in
 * `./editor.ts`, which is what that module's own header states: a
 * kind is named once for this surface, and the badge on the card and
 * the option in this menu read the same word. Totality comes with it
 * — the facet table is a record over the union — which is what stops
 * `Select` resolving a stored kind to somebody else's option.
 *
 * Fresh per call because `SelectProps['options']` is declared
 * mutable, and the facets are a shared frozen list.
 *
 * @returns One option per kind, in surface order.
 */
const kindChoices = () => CONNECTOR_KIND_FACETS.map(
  (facet) => ({ value: facet.kind, label: facet.label }),
);

/**
 * The tools surface's editor.
 *
 * @returns The modal: the connector's two common controls and its
 * per-kind branch over the draft, or whichever of the two read states
 * its own read is in.
 */
export const ConnectorEditorModal = () => {
  const { entityId } = useParams<{ entityId?: string }>();

  // `:entityId` is a required segment so it cannot arrive empty, but a
  // segment that is not a number is a live address: `Number` answers
  // `NaN`, no connector carries it, and the read refuses — which is
  // the rejected state below rather than a special case.
  const connectorId = Number(entityId);

  const connectorRead = useConnector(connectorId);
  const connectorsRead = useConnectors();
  const save = useSaveConnector();

  const [held, setHeld] = useState<EditorDraft<Connector>>(
    EMPTY_EDITOR_DRAFT,
  );

  // The whole outcome rather than one of its sentences, because which
  // CHANNEL a reading goes to is what the discriminant decides. It is
  // held here rather than in the body because the footer is the
  // frame's and the frame is rendered from here.
  const [tested, setTested] = useState<ConnectionTestOutcome | undefined>(
    undefined,
  );

  const loaded = connectorRead.data;

  // Normalised BEFORE it becomes the holder's source, per the header:
  // every mask comes out here, so no path below can echo one back and
  // the footer is comparing two rows of the same shape.
  const opened = loaded === undefined
    ? undefined
    : openConnectorDraft(loaded);

  // Derived on EVERY render from whatever the read holds, which is
  // what `withLoadedRow` is built for: it answers the same holder by
  // identity when nothing moved, so a fresh wrapper here is a
  // comparison rather than a state update.
  const draft = withLoadedRow(held, opened);
  const edited = draft.draft;

  // The list read is allowed to be behind, per the header: an absent
  // one refuses no collision and holds nothing back.
  const connectors = connectorsRead.data ?? [];

  // Read here rather than in the body because the SAVE is gated on
  // it and the body is not what declines. Empty while the read is in
  // flight, which is the same answer as a draft with nothing wrong
  // and is the right one: there is nothing to save in either state.
  const faults = edited === undefined
    ? []
    : validateConnectorDraft(edited, connectors);

  // The two channels, split off the one discriminant. A reading is in
  // exactly one of them, and `undefined` on both sides is the state
  // before any press and after any edit — see the header.
  const reachedSentence = tested !== undefined && tested.reached
    ? tested.sentence
    : undefined;

  const refusedSentence = tested !== undefined && !tested.reached
    ? tested.sentence
    : undefined;

  // Based off the DERIVED holder rather than the state updater's
  // argument: before the first edit the state is still the empty
  // holder, and a write against that one would be dropped. The movers
  // answer a WHOLE row and `withDraftValues` takes a partial, which a
  // whole row satisfies — so nothing here reconstructs one.
  const writeRow = (next: Connector) => {
    // Any edit makes the last reading one of a payload that is no
    // longer on screen, which is the header's rule about what takes a
    // toast away. Every mover on this surface funnels through here.
    setTested(undefined);
    setHeld(withDraftValues(draft, next));
  };

  return (
    <EditorModal
      // The STORED name rather than the edited one — see the header
      // on why the dialog's own name may not move under the control
      // that changes it.
      title={loaded === undefined
        ? PENDING_TITLE
        : <span className="break-words">{loaded.name}</span>}
      draft={draft}
      saving={save.isPending}
      saveError={save.error}
      // The frame's slot reports the unsaved sentence unless somebody
      // has something else to say. `title` is what carries a sentence
      // wider than the line to a pointer; the live region announces
      // it whole either way.
      footerStatus={reachedSentence === undefined
        ? undefined
        : <span title={reachedSentence}>{reachedSentence}</span>}
      onSave={(close) => {
        if (edited === undefined || faults.length > 0) {
          return;
        }

        // `connectorSavePayload` is the write-only rule's other half:
        // a blank field is OMITTED rather than sent empty, so a save
        // that did not retype a secret leaves the stored one alone.
        //
        // The frame hands its own close in rather than this file
        // re-deriving the relative navigation. Closing on success is
        // this surface's choice: the grid behind draws the very
        // connector that was saved, name, badge and config block.
        save.mutate(connectorSavePayload(edited), { onSuccess: close });
      }}
    >
      <ConnectorEditorBody
        failed={connectorRead.isError}
        edited={edited}
        faults={faults}
        refusal={refusedSentence}
        onTest={() => {
          if (edited === undefined) {
            return;
          }

          // Over the DRAFT, which is the whole point of the control:
          // the kind and the config as the operator has them, not as
          // the row that was loaded carries them.
          setTested(testConnection(edited.kind, edited.config));
        }}
        onDismissTest={() => {
          setTested(undefined);
        }}
        onNameChange={(name) => {
          if (edited === undefined) {
            return;
          }

          writeRow(withConnectorName(edited, name));
        }}
        onKindChange={(choice) => {
          // Narrowed next door rather than asserted here: the control
          // reports a string, and a value none of its options carry
          // writes nothing. The body has already declined a choice
          // naming the kind this row is wearing.
          const kind = readConnectorKind(choice);

          if (edited === undefined || kind === undefined) {
            return;
          }

          writeRow(withConnectorKind(edited, kind));
        }}
        onFieldChange={(key, text) => {
          if (edited === undefined) {
            return;
          }

          writeRow(withConnectorField(edited, key, text));
        }}
      />
    </EditorModal>
  );
};

/** What the editor shows in place of its controls. */
interface ConnectorEditorBodyProps {
  /** Whether the connector read rejected — an unknown row, today. */
  readonly failed: boolean;
  /**
   * The connector as the operator has it, opened rather than stored,
   * or undefined until the read lands.
   */
  readonly edited: Connector | undefined;
  /** One sentence per fault, in form order; empty when savable. */
  readonly faults: readonly string[];
  /**
   * What the last connection test refused for, or `undefined` where
   * it reached or where none has been taken.
   *
   * A sentence rather than the outcome: the success went to the
   * frame's footer before this component was reached, so the only
   * reading left down here is the refusing one.
   */
  readonly refusal: string | undefined;
  /** Read the draft's configuration and report what it says. */
  readonly onTest: () => void;
  /** Take a refused reading off the screen. */
  readonly onDismissTest: () => void;
  /** Report the name moving, exactly as typed. */
  readonly onNameChange: (name: string) => void;
  /**
   * Report the kind control's answer, as it reported it.
   *
   * Only ever called with a choice that differs from the stored kind
   * — see the header on the click that would otherwise empty a
   * connector's whole configuration.
   */
  readonly onKindChange: (choice: string) => void;
  /** Report a config field's text; the mover below trims it. */
  readonly onFieldChange: (key: string, text: string) => void;
}

/**
 * The editor's body: the two common controls and the kind's own
 * fields, or the reason there are none.
 *
 * Split out of the modal rather than written as nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and very little
 * else. It is also the half a static render can reach: `Modal` is a
 * Radix dialog and renders through a portal, so a probe of the frame
 * sees nothing while a probe of this sees the whole surface.
 *
 * The branch fields' typed text is held HERE rather than in the
 * modal, because it is not a draft: `withConnectorField` trims what
 * it is given, and a control drawn straight from the trimmed value
 * could not be typed a space. See the header on why the map is
 * cleared by a kind change.
 *
 * @param props - Which state the read is in, the refusals, and the
 * three gestures.
 * @returns The controls, or whichever read state is standing.
 */
const ConnectorEditorBody = ({
  failed,
  edited,
  faults,
  refusal,
  onTest,
  onDismissTest,
  onNameChange,
  onKindChange,
  onFieldChange,
}: ConnectorEditorBodyProps) => {
  // Above the early returns, so the hook order does not depend on
  // which state the read is in.
  const nameId = useId();
  const testHintId = useId();

  // The control the toast is raised from, so its dismiss can put
  // focus back rather than dropping it on the document body.
  const testRef = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState(EMPTY_TYPED);

  if (failed) {
    return (
      <EmptyState
        title="This connector could not be read"
        description="Nothing in this deployment answers to that connector. Close this and pick one from the grid."
      />
    );
  }

  if (edited === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  const stored = edited.kind;

  const changeKind = (choice: string) => {
    // The click the header names: a `menuitemradio` re-chosen at its
    // current value reports that value, and passing it on would empty
    // the config for a kind change that did not happen.
    if (choice === stored) {
      return;
    }

    // The branch below is about to be emptied, so the text those
    // controls were showing describes a payload that no longer
    // exists.
    setTyped(EMPTY_TYPED);
    onKindChange(choice);
  };

  return (
    <div className="flex flex-col gap-5">
      {/*
        Rendered from mount rather than arriving with its first
        sentence: assistive technology watches regions that already
        exist, and one inserted with its content is routinely missed.
        Named, so a spec addresses it by name rather than by a bare
        `status` role it could share with anything else on screen.
      */}
      <div role="status" aria-label={REFUSED_REGION_LABEL}>
        {faults.length > 0 && (
          <Banner tone="warning" title={REFUSED_TITLE}>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {faults.map((sentence) => (
                // Keyed by the sentence: each is a distinct constant
                // `./editor.ts` owns, and the list is rebuilt whole
                // on every render rather than reordered.
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
          </Banner>
        )}
      </div>

      <FormField label={NAME_LABEL} htmlFor={nameId} hint={NAME_HINT}>
        <TextInput
          id={nameId}
          value={edited.name}
          // Stored exactly as typed, surrounding space included:
          // `./editor.ts` says why the mover does not trim and where
          // the trimming that matters happens instead.
          onChange={onNameChange}
        />
      </FormField>

      <div className={ROW_CLASS}>
        <div className={ROW_LEAD_CLASS}>
          <div className={ROW_LABEL_CLASS}>{KIND_LABEL}</div>
          <p className={ROW_DESCRIPTION_CLASS}>{KIND_DESCRIPTION}</p>
        </div>

        <div className="shrink-0">
          {/*
            Named from `ariaLabel` with the very words on the label
            beside it — the control spreads nothing, so it cannot
            point at that label, and two different names for one
            field is worse than one stated twice.
          */}
          <Select
            size="sm"
            value={stored}
            options={kindChoices()}
            onChange={changeKind}
            ariaLabel={KIND_LABEL}
          />
        </div>
      </div>

      {/* What every connector carries, above; what this kind of
          client takes, below. */}
      <Divider />

      {connectorFields(stored).map((field) => (
        <ConnectorFieldControl
          key={field.key}
          field={field}
          text={typed[field.key] ?? connectorFieldValue(edited, field.key)}
          onChange={(text) => {
            setTyped({ ...typed, [field.key]: text });
            onFieldChange(field.key, text);
          }}
        />
      ))}

      <div className={ROW_CLASS}>
        {/*
          Bound to the control rather than left beside it: what the
          press does is not derivable from a label reading `Test
          connection`, and a description an operator cannot reach is
          the same as none.
        */}
        <p id={testHintId} className={TEST_DESCRIPTION_CLASS}>
          {TEST_DESCRIPTION}
        </p>

        <Button
          ref={testRef}
          variant="secondary"
          size="sm"
          className="shrink-0"
          aria-describedby={testHintId}
          onClick={onTest}
        >
          {TEST_LABEL}
        </Button>
      </div>

      {refusal !== undefined && (
        /*
          One toast per modal, and the role is the library's own
          overridden — the header carries both readings. Named
          because the frame's save-failure banner is an alert too.
        */
        <Toast
          floating
          tone="danger"
          role="alert"
          aria-label={TEST_REFUSED_REGION_LABEL}
          onClose={() => {
            // Focus moves BEFORE the state that renders this button
            // is cleared, so nothing is ever focused on a node React
            // is about to unmount.
            testRef.current?.focus();
            onDismissTest();
          }}
        >
          {refusal}
        </Toast>
      )}
    </div>
  );
};

/** What one config field's control is given. */
interface ConnectorFieldControlProps {
  /** The key it writes and what that key is for. */
  readonly field: ConnectorField;
  /** What the box shows — the typed text, or the draft's own value. */
  readonly text: string;
  /** Report the box's contents, untrimmed. */
  readonly onChange: (text: string) => void;
}

/**
 * One config field: the key it writes, what the key is for, and the
 * box that writes it.
 *
 * The label is the KEY and nothing else, in the face the card's own
 * config block draws it in — `./editor.ts` argues at length that a
 * form renaming `apiKey` to `API key` would be a third vocabulary for
 * one thing, and the value is monospaced beside it for the reason the
 * sources table gives about an endpoint: a stored token is compared
 * character by character or not at all.
 *
 * A `FormField` label reaches this control, unlike the kind row's:
 * a `TextInput` renders an `input`, which `<label for>` can name.
 *
 * @param props - The field, its text, and the gesture.
 * @returns The labelled box.
 */
const ConnectorFieldControl = ({
  field,
  text,
  onChange,
}: ConnectorFieldControlProps) => {
  const fieldId = useId();

  return (
    <FormField
      label={<span className="font-mono">{field.key}</span>}
      htmlFor={fieldId}
      hint={FIELD_HINTS[field.role]}
    >
      <TextInput
        id={fieldId}
        value={text}
        className="font-mono"
        // Unmasked on purpose — the header says why a password box
        // here would promise what this shell does not do. What is
        // refused is the browser's own memory of it.
        autoComplete="off"
        onChange={onChange}
      />
    </FormField>
  );
};
