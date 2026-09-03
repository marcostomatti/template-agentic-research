/**
 * @packageDocumentation
 * The agents surface's editor: what a role is asked to be, in the
 * operator's own words.
 *
 * Opened at the agents `:entityId/edit` sub-route, over the grid the
 * card was clicked on. It composes `../../components/EditorModal` for
 * the frame — header, footer, unsaved sentence, relative close — and
 * holds no decision `./editor.ts` could hold: what the role control
 * offers, what each field writes into the draft, and what a draft is
 * refused for all live next door, where the unit runner can reach
 * them. What is left here is one control per field and the read
 * states.
 *
 * ## A persona is TEXT, and three fields is the whole of what v1 needs
 *
 * `personas` is four columns and one of them is the id. There is no
 * config object to validate, no schedule, no model selection and no
 * version history: a persona is a ROLE, the standing instruction that
 * role is given, and the domain both belong to. `../../data/api.ts`
 * says the same thing from the seam's side — a persona is three
 * fields and all three are the operator's, so there is no
 * pipeline-owned member for an endpoint to ignore the way
 * `saveSource`'s has.
 *
 * So the three below are not a v1 SUBSET of a larger form arriving
 * later. They are the row. That matters because this is the surface
 * the UI spec calls deliberately small, and every plausible fourth
 * field here would be storage this shell invented: a last-run stamp
 * belongs to `runs` (`./AgentsPage.tsx` says why the card has none), a
 * model choice belongs to a connector, and a version history belongs
 * to a table nothing in this deployment has. A modal that grew any of
 * them would read as columns that exist.
 *
 * What a persona IS, then, is prose — which is why the system text is
 * the only field here given room, and why the two beside it are a
 * one-line control and a one-line reading.
 *
 * ## Two of the three are controls; the third is a reading
 *
 * The role and the system text are written. The domain is not, and
 * the reason is the seam's rather than this surface's:
 * `withPersonaDomain` in `./editor.ts` exists and no control calls it,
 * because `savePersona` is scoped by the SLUG it is called with and
 * `fetchPersonas` overlays drafts by row id over the list of the
 * domain it was asked for. A moved row would be recorded under the
 * domain it left and go on being drawn there. Rather than offer a
 * control whose result the app would then contradict, the domain is
 * stated — as a `dl` pairing, so the label and the value are one
 * reading to anything walking the accessibility tree rather than two
 * pieces of adjacent text.
 *
 * It is stated at all, rather than left to the topbar, for the reason
 * `./AgentsPage.tsx` puts it on the card: a persona is configuration
 * OF a domain, and at the `/` base nothing else in this dialog names
 * which one.
 *
 * ## Three reads, and only two of them hold the body back
 *
 * `usePersona` is the read this modal is about, and its rejection is a
 * live address rather than an error state to hide: `:entityId` is a
 * required segment, but nothing constrains it to a number a persona
 * carries, and `../../data/api.ts` refuses a foreign row with the same
 * message a missing one gets. `useDomain` is joined to it rather than
 * gated apart, on the same reasoning the page behind gives about a
 * card: the domain is part of what this dialog SAYS, and a scope line
 * that fills itself in a frame later is the defect, not the wait. It
 * costs nothing in practice — the topbar has already filed that query
 * key.
 *
 * `usePersonas` is the one that does NOT hold anything back, and
 * `./editor.ts` decided that rather than this file: the role list is
 * what the domain plays, and `personaRoleChoices` guarantees the
 * displayed role a place whatever that list holds — naming the persona
 * read settling first as one of the two ordinary states the guarantee
 * is for. So the editor opens on the row and the ladder fills in.
 *
 * There is no empty state. A persona is one row, so it is either read
 * or it is not.
 *
 * ## Every alternative the ladder offers is refused today
 *
 * `personas_domain_id_role_unique` makes a role unique within its
 * domain, the list this shell can build is exactly the roles that ARE
 * held, and `../../data/drafts.ts` records edits to rows that already
 * exist and can insert or remove none. So over the fixtures as
 * shipped, every option but the stored one collides.
 *
 * That is a property of the fixture set, `./editor.ts` argues it at
 * length and `./editor.test.ts` pins it against the shipped rows. What
 * it means HERE is that the refusal below is not a corner an operator
 * has to work to reach: it is one click into the demo, which is where
 * a sentence is actually read.
 *
 * ## What a refusal does, and why the save button stays live
 *
 * `validatePersonaDraft` answers one sentence per fault in the order
 * the form draws its fields, so the refusals are rendered as that
 * list — above the controls, reading down the same way they do, in a
 * region that exists from mount so assistive technology is watching it
 * before the first sentence lands. A region inserted along with its
 * content is routinely missed.
 *
 * The save is declined while any sentence stands. It is declined in
 * the handler rather than by disabling the button, and the choice is
 * deliberate. `../../components/EditorModal.tsx` disables the control
 * on exactly two readings — a draft with nothing to save, and a save
 * already in flight — and a refusal is neither of those; reaching for
 * `saving` to get the disabled state would put a third meaning behind
 * a flag whose whole job is refusing a double submit. What that costs
 * is a click that is refused rather than prevented, and it buys the
 * thing a disabled control cannot have: the reason is on screen, in
 * words, before the click and after it, rather than being a state an
 * operator has to account for on their own.
 *
 * ## The header names the persona by its STORED role
 *
 * A persona has no name column, so the role is its identity — and it
 * is also the field being edited, which is why the title reads the row
 * the query answered rather than the draft. The dialog's accessible
 * name is what a spec addresses it by, and a name that moved under the
 * operator's own choosing is a locator that resolves to nothing half
 * the time. It is wrapped in a span that may break for the reason
 * `../sources/SourceEditorModal.tsx` wraps its endpoint: a role is a
 * stored key with no spaces to break at, and `OverlayHeader` sets no
 * wrapping rule.
 *
 * ## What no test in this package reaches
 *
 * Nothing in this file. The unit suite is node-only and collects `.ts`
 * alone — this file's decisions are next door in `./editor.ts`, its
 * bindings are proven by a `check-types` mutation grid, and what it
 * renders falls to the Playwright specs.
 */

import type { EditorDraft } from '../../components/editorDraft';
import type { Domain, Persona } from '../../data/types';

import {
  Banner,
  Divider,
  EmptyState,
  FormField,
  Select,
  Skeleton,
  Textarea,
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
  useDomain,
  usePersona,
  usePersonas,
  useSavePersona,
} from '../../data/hooks';

import {
  personaRoleChoices,
  validatePersonaDraft,
  withPersonaRole,
  withPersonaSystemText,
} from './editor';

/** What the header says while the persona read is in flight. */
const PENDING_TITLE = 'Persona';

/** What each field is called, here and in the specs. */
const ROLE_LABEL = 'Role';
const SYSTEM_TEXT_LABEL = 'System text';
const DOMAIN_LABEL = 'Domain';

/** What the two one-line rows say under their labels. */
const ROLE_DESCRIPTION = 'Which part of a pass this persona is played '
  + 'as. A domain names each role once.';
const DOMAIN_DESCRIPTION = 'What this instruction configures. Read '
  + 'here, and moved from nowhere in this shell.';

/**
 * What the system text field says under itself.
 *
 * States when the value is used rather than what to write in it: the
 * text IS the instruction, so advice about its content would be this
 * shell having an opinion about the operator's own prompt.
 */
const SYSTEM_TEXT_HINT = 'Handed to the model at the top of every pass '
  + 'this role plays.';

/**
 * How tall the system text box is drawn.
 *
 * The seeded instructions run to about three lines at this panel
 * width, so six is the whole of a typical persona with room to add to
 * it — which is what keeps editing prose from being done through a
 * letterbox. The library's own default is three.
 */
const SYSTEM_TEXT_ROWS = 6;

/** What the refusal list is titled, and what names its region. */
const REFUSED_TITLE = 'This persona cannot be saved yet';
const REFUSED_REGION_LABEL = 'Why this persona cannot be saved';

/**
 * Geometry the role row and the domain row share.
 *
 * Held as constants rather than as a row component, because the two
 * rows are not the same ELEMENT: one is a labelled control and the
 * other is a `dl` pairing a term with its value, and a component
 * abstracting over that difference would have to take the tag as a
 * prop. `../sources/SourceEditorModal.tsx` restates the settings
 * page's row treatment for the same reason rather than sharing it —
 * the shape is a modal column's, not a library's.
 */
const ROW_CLASS = 'flex flex-wrap items-center gap-x-4 gap-y-2';
const ROW_LEAD_CLASS = 'min-w-[12rem] flex-1';
const ROW_LABEL_CLASS = 'text-[13px] font-semibold text-fg1';

/**
 * What a row says under its label.
 *
 * `tokens.css` puts a direct rule on `p`, so the size, the colour and
 * the margin are all restated rather than inherited from the column.
 */
const ROW_DESCRIPTION_CLASS = 'm-0 mt-0.5 text-xs text-fg3';

/**
 * The agents surface's editor.
 *
 * @returns The modal: the persona's two controls and its domain
 * reading over the draft, or whichever of the two read states its own
 * reads are in.
 */
export const AgentEditorModal = () => {
  const { domainSlug, entityId } = useParams<{
    domainSlug?: string;
    entityId?: string;
  }>();

  // `:entityId` is a required segment so it cannot arrive empty, but a
  // segment that is not a number is a live address: `Number` answers
  // `NaN`, no persona carries it, and the read refuses — which is the
  // rejected state below rather than a special case.
  const personaId = Number(entityId);

  const personaRead = usePersona(domainSlug, personaId);
  const domainRead = useDomain(domainSlug);
  const personasRead = usePersonas(domainSlug);
  const save = useSavePersona(domainSlug);

  const [held, setHeld] = useState<EditorDraft<Persona>>(EMPTY_EDITOR_DRAFT);

  const loaded = personaRead.data;

  // Derived on EVERY render from whatever the read holds, which is
  // what `withLoadedRow` is built for: it answers the same holder by
  // identity when nothing moved, so a fresh wrapper here is a
  // comparison rather than a state update.
  const draft = withLoadedRow(held, loaded);
  const edited = draft.draft;

  // The list read is allowed to be behind, per the header: an absent
  // one narrows the ladder to the role the row is wearing and refuses
  // nothing on its own account.
  const personas = personasRead.data ?? [];

  // Read here rather than in the body because the SAVE is gated on it
  // and the body is not what declines. Empty while the read is in
  // flight, which is the same answer as a draft with nothing wrong and
  // is the right one: there is nothing to save in either state.
  const faults = edited === undefined
    ? []
    : validatePersonaDraft(edited, personas);

  // Based off the DERIVED holder rather than the state updater's
  // argument: before the first edit the state is still the empty
  // holder, and a write against that one would be dropped. The movers
  // answer a WHOLE row and `withDraftValues` takes a partial, which a
  // whole row satisfies — so nothing here reconstructs one.
  const writeRow = (next: Persona) => {
    setHeld(withDraftValues(draft, next));
  };

  return (
    <EditorModal
      // The STORED role rather than the edited one — see the header on
      // why the dialog's own name may not move under the control that
      // changes it.
      title={loaded === undefined
        ? PENDING_TITLE
        : <span className="break-words">{loaded.role}</span>}
      draft={draft}
      saving={save.isPending}
      saveError={save.error}
      onSave={(close) => {
        if (edited === undefined || faults.length > 0) {
          return;
        }

        // The frame hands its own close in rather than this file
        // re-deriving the relative navigation. Closing on success is
        // this surface's choice: the grid behind draws the very
        // persona that was saved, heading and excerpt both.
        save.mutate(edited, { onSuccess: close });
      }}
    >
      <AgentEditorBody
        failed={personaRead.isError || domainRead.isError}
        edited={edited}
        domain={domainRead.data}
        personas={personas}
        faults={faults}
        onRoleChange={(role) => {
          if (edited === undefined) {
            return;
          }

          // Written straight through: `Select` reports a bare string,
          // the column IS a string, and `./editor.ts` says why a
          // module refusing a role here would re-close what the schema
          // left open.
          writeRow(withPersonaRole(edited, role));
        }}
        onSystemTextChange={(systemText) => {
          if (edited === undefined) {
            return;
          }

          writeRow(withPersonaSystemText(edited, systemText));
        }}
      />
    </EditorModal>
  );
};

/** What the editor shows in place of its fields. */
interface AgentEditorBodyProps {
  /** Whether either gating read rejected — an unknown row, today. */
  readonly failed: boolean;
  /** The persona as the operator has it, or undefined until it lands. */
  readonly edited: Persona | undefined;
  /** The domain it configures, or undefined until that read settles. */
  readonly domain: Domain | undefined;
  /**
   * The domain's personas, for the role ladder.
   *
   * Empty until that read settles, which narrows the ladder rather
   * than holding the body back — see the header.
   */
  readonly personas: readonly Persona[];
  /** One sentence per fault, in form order; empty when savable. */
  readonly faults: readonly string[];
  /** Report the role control's answer, as it reported it. */
  readonly onRoleChange: (role: string) => void;
  /** Report the system text moving, exactly as typed. */
  readonly onSystemTextChange: (systemText: string) => void;
}

/**
 * The editor's body: the three fields, or the reason there are none.
 *
 * Split out of the modal rather than written as nested ternaries
 * inside its JSX — the states are exclusive and each has something to
 * say, which reads as a sequence of early returns and very little
 * else. It is also the half a static render can reach: `Modal` is a
 * Radix dialog and renders through a portal, so a probe of the frame
 * sees nothing while a probe of this sees the whole surface.
 *
 * @param props - Which state the reads are in, the refusals, and the
 * two gestures.
 * @returns The fields, or whichever read state is standing.
 */
const AgentEditorBody = ({
  failed,
  edited,
  domain,
  personas,
  faults,
  onRoleChange,
  onSystemTextChange,
}: AgentEditorBodyProps) => {
  // Above the early returns, so the hook order does not depend on
  // which state the reads are in.
  const systemTextId = useId();

  if (failed) {
    return (
      <EmptyState
        title="This persona could not be read"
        description="Nothing in this domain answers to that persona. Close this and pick one from the grid."
      />
    );
  }

  if (edited === undefined || domain === undefined) {
    // `Skeleton` is aria-hidden, which is right for a frame that is
    // gone within a microtask against fixtures: announcing a loading
    // state that never gets read is noise.
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

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
                // `./editor.ts` owns, and the list is rebuilt whole on
                // every render rather than reordered.
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
          </Banner>
        )}
      </div>

      <div className={ROW_CLASS}>
        <div className={ROW_LEAD_CLASS}>
          <div className={ROW_LABEL_CLASS}>{ROLE_LABEL}</div>
          <p className={ROW_DESCRIPTION_CLASS}>{ROLE_DESCRIPTION}</p>
        </div>

        <div className="shrink-0">
          {/*
            The ladder is built against the value the control is
            SHOWING, which is what `personaRoleChoices` guarantees a
            place: `Select` resolves a value none of its options carry
            to the first option, silently, and the row would then be
            drawn wearing whichever role the domain happens to list
            first. Named from `ariaLabel` with the very words on the
            label beside it — the control spreads nothing, so it
            cannot point at that label, and two different names for
            one field is worse than one stated twice.
          */}
          <Select
            size="sm"
            value={edited.role}
            options={personaRoleChoices(personas, edited.role)}
            onChange={onRoleChange}
            ariaLabel={ROLE_LABEL}
          />
        </div>
      </div>

      <FormField
        label={SYSTEM_TEXT_LABEL}
        htmlFor={systemTextId}
        hint={SYSTEM_TEXT_HINT}
      >
        <Textarea
          id={systemTextId}
          rows={SYSTEM_TEXT_ROWS}
          value={edited.systemText}
          // Stored exactly as typed, surrounding space included:
          // `./editor.ts` says why a mover that trimmed would eat the
          // space between two words as the second one was typed.
          onChange={onSystemTextChange}
        />
      </FormField>

      {/* What the operator writes, above; what the row is scoped by,
          below. */}
      <Divider />

      {/*
        A `dl` rather than another label-and-value pair of divs: this
        row is a READING and not a control, so the pairing is the
        markup's job. Tailwind's preflight zeroes the list margins and
        `tokens.css` does not re-add them, so only the `p` needs one
        cancelled.
      */}
      <dl className={ROW_CLASS}>
        <dt className={ROW_LEAD_CLASS}>
          <div className={ROW_LABEL_CLASS}>{DOMAIN_LABEL}</div>
          <p className={ROW_DESCRIPTION_CLASS}>{DOMAIN_DESCRIPTION}</p>
        </dt>
        <dd className="shrink-0 text-sm text-fg1">{domain.name}</dd>
      </dl>
    </div>
  );
};
