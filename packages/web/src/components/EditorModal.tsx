/**
 * @packageDocumentation
 * The frame the editor modals are built in: the header that names the
 * row, the surface's own controls, and the footer that says whether
 * there is anything to save and offers to save it.
 *
 * Every editor this wave adds opens over the list it hangs under and
 * wants the same three things — a header carrying the surface and the
 * row, two footer buttons, and a close that gets back to the list. So
 * they live here, once. What an editor EDITS is its own, and what it
 * DECIDES belongs in a `.ts` beside it.
 *
 * ## It holds no draft of its own
 *
 * The working copy arrives as a prop, and every question this frame
 * asks of one is answered by `./editorDraft`: {@link isDirty} for
 * whether the save is offered at all, {@link describeUnsaved} for the
 * sentence the footer states. Nothing here compares a row, counts a
 * change, or phrases a status.
 *
 * That is the two-runner law showing up in a component signature
 * rather than as a preference. The unit runner collects `.ts` files
 * under `src` in a node environment, so a decision written into this
 * file is reachable by no test in this package — its bindings are
 * proven by a `check-types` mutation grid, and what it renders falls
 * to the Playwright specs. The same decision moved next door gets a
 * colocated test that runs in milliseconds. `./editorDraft` holds the
 * ones every editor shares; a surface-specific one goes in that
 * page's own module.
 *
 * ## Closing is a navigation, and it is relative
 *
 * `Modal` is controlled and this one is never handed `false` — the
 * route matching IS the open state, and the component is unmounted
 * the moment it stops matching. So closing cannot flip a flag; it
 * navigates to the parent route.
 *
 * The target is `..`, the `relative: 'route'` mode is stated rather
 * than inherited, and it pushes rather than replaces. All three are
 * load-bearing and `./PlaceholderModal` carries the full reading: one
 * expression serves both route bases, route-relative pops the whole
 * matched route (so a two-segment `:entityId/edit` climbs BOTH
 * segments instead of landing on a path no route declares, i.e. the
 * catch-all), and pushing is what keeps an operator who deep-linked
 * straight into a row from being walked out of the app.
 *
 * The two files spell it out separately rather than sharing it. That
 * neighbour is the element behind the modal registrations this wave
 * REPLACES, surface by surface; a third module extracted to be shared
 * between a component and its own replacement outlives one of them by
 * about a task.
 *
 * ## Three affordances, one behaviour, and the one that is missing
 *
 * The header's close button, Escape and the footer's Cancel are all
 * the same navigation. The backdrop deliberately is not: `dismiss` is
 * narrowed from the library's default `both`, because an editor holds
 * work an operator has typed and a stray click outside the panel is
 * the one dismissal nobody means to make. Escape stays — a dialog has
 * to be dismissable from the keyboard, and the keyboard spec asserts
 * exactly that.
 *
 * Nothing confirms the discard. The footer states what is unsaved for
 * as long as it is unsaved, and that is the warning; a modal that
 * refused to close would be a second state fighting the route, which
 * is already the state. The draft is this modal's own and dies with
 * it — `./editorDraft` is the working copy, `../data/drafts` is what
 * a completed save recorded, and only a save moves a value between
 * them.
 *
 * ## What the save does, and what it does not
 *
 * It calls the handler it was given, and nothing else. It does not
 * close: a save that succeeded invalidates its keys, the read
 * re-answers with the row that was just stored, `withLoadedRow`
 * records it as the new source, and the footer falls silent on its
 * own. `./editorDraft` says why that ending is free.
 *
 * An editor that WANTS to close on a save says so, and is handed the
 * close rather than re-deriving it — the handler takes this frame's
 * own close as its argument, which is what keeps the relative
 * navigation above authored in one place. A handler with no use for
 * it declares no parameter and is assignable unchanged.
 *
 * The handler fires only from a save that is OFFERED, which is to say
 * over a draft that differs from the row that was loaded: the button
 * is disabled otherwise, and `isDirty` is the whole of that reading.
 *
 * ## Why a save in flight is not a label
 *
 * `saving` disables the button and stops there. The label is what the
 * Playwright specs address the control BY, and a name that changes
 * under the very click being asserted is a locator that resolves to
 * nothing half the time.
 *
 * There is also nothing to report yet: the write accessors resolve on
 * a microtask, so the pending window is not observable in this app at
 * all. The flag is bound anyway, so on the day the seam points at
 * HTTP a double submit is already refused here rather than in five
 * editors separately.
 *
 * ## The footer's status slot has a default, not a monopoly
 *
 * `describeUnsaved` is what that slot says when nobody else has
 * anything to say, which is nearly always. An editor that DOES —
 * `../pages/tools/ConnectorEditorModal.tsx` reports what its
 * connection test read there — passes `footerStatus` and stands in
 * the slot for as long as its own reading is current.
 *
 * The two readings take turns rather than sharing the line, because
 * the slot truncates: two sentences in it would leave both
 * ellipsised. Which one wins is not arbitrary either. The unsaved
 * sentence is derivable from the draft on any render and comes back
 * the moment the caller stops passing one, so the slot goes to the
 * reading that would otherwise be lost.
 *
 * `ModalFooterStatus` is `aria-live="polite"`, so whatever stands
 * there is announced whole when it changes, however narrow the line
 * is. Reading truthfully once TRUNCATED is the caller's problem, and
 * `../pages/tools/connectionTest.ts` says how it solved it.
 *
 * ## The eyebrow, and where a failure is reported
 *
 * The eyebrow is the surface's own title derived from the PATH,
 * exactly as `./PlaceholderModal` and the topbar derive theirs, and
 * never from state — a back button and the domain switcher's base
 * swap both change the surface without passing through anything here.
 *
 * A failed SAVE is reported in the body as a `Banner` rather than in
 * the footer, because the footer's status slot truncates on one line:
 * the right shape for a sentence about unsaved work, the wrong one
 * for a reason. It carries no dismiss — the next save resets the
 * mutation's error itself, and a banner that can be waved away is one
 * an operator waves away.
 *
 * A failed READ is not this frame's to report at all. The editor's
 * own body holds the loading, empty and rejected states, because what
 * is missing in each of them is that surface's.
 */

import type { EditorDraft } from './editorDraft';
import type { ModalProps } from '@ar/ui';
import type { ReactNode } from 'react';

import { Banner, Button, Modal } from '@ar/ui';
import { useLocation, useNavigate } from 'react-router';

import { activeSurfaceId, getSurface } from '../routes/paths';

import { describeUnsaved, isDirty } from './editorDraft';

/**
 * The route an editor closes to: the list surface it hangs under.
 *
 * See the header on why it is relative, and on why the resolution
 * mode below is spelled out rather than left to its default.
 */
const CLOSE_TO = '..';

/** Resolve `..` against the ROUTE tree, not against the path. */
const CLOSE_OPTIONS = { relative: 'route' } as const;

/**
 * Which dismissals close an editor.
 *
 * Narrowed from the library's `both`: Escape closes, the backdrop
 * does not. The header explains why the one an operator makes by
 * accident is the one that is gone.
 */
const DISMISS = 'escape';

/** What the footer's two buttons are addressed by, here and in the specs. */
const CANCEL_LABEL = 'Cancel';
const SAVE_LABEL = 'Save';

/** What the body says over a save that came back rejected. */
const SAVE_FAILED_TITLE = 'Save failed';

/**
 * What an editor hands its frame.
 *
 * @typeParam T - The row being edited, whatever the surface reads and
 * writes. Structural: this frame is below every fixture type and
 * knows none of them, and reads nothing off the row itself.
 */
export interface EditorModalProps<T extends object> {
  /**
   * What the header calls the row — a source's endpoint, a persona's
   * role, a category's name.
   *
   * A node rather than a string, and required rather than optional:
   * `Modal` draws its header, and with it the close button and the
   * dialog's accessible name, only when it is given a title. An
   * editor with none would be an unnamed dialog dismissable by
   * Escape alone.
   */
  readonly title: ReactNode;
  /**
   * The row as loaded and as edited, straight from
   * `./editorDraft`.
   *
   * The frame reads it twice and decides nothing from it: whether
   * the save is offered, and what the footer says about unsaved
   * work. Both answers come from that module.
   */
  readonly draft: EditorDraft<T>;
  /**
   * Save what the draft holds.
   *
   * Called only over a dirty draft — the button is disabled
   * otherwise — and handed this frame's own close, so an editor that
   * closes on a successful save (`mutate(row, { onSuccess: close })`)
   * does not re-derive the relative navigation. One that stays open
   * declares no parameter.
   */
  readonly onSave: (close: () => void) => void;
  /**
   * Whether a save is in flight — the mutation's `isPending`.
   *
   * Refuses a second submit and nothing else; the header says why it
   * is not also a label.
   */
  readonly saving: boolean;
  /**
   * Why the last save was rejected, or `null` — the mutation's
   * `error`.
   *
   * `null` rather than optional, because that is what the hook
   * answers with before the first save and after a successful one. A
   * prop that could also be absent would be a third state with no
   * source.
   */
  readonly saveError: Error | null;
  /**
   * What the footer's status slot says instead of the unsaved
   * sentence.
   *
   * Absent for every editor with nothing of its own to report, which
   * is the common case: the frame then derives the slot from the
   * draft. See the header on why the two readings take turns, and on
   * what a caller owes a sentence that outgrows the line.
   */
  readonly footerStatus?: ReactNode;
  /**
   * How wide the panel is, forwarded to the library's own variant.
   *
   * The editors differ by more than a token: a term list in three
   * buckets and a persona's three fields are not the same shape. The
   * vocabulary is `Modal`'s, so it is forwarded rather than
   * restated, and left unset where the default is right.
   */
  readonly size?: ModalProps['size'];
  /**
   * The surface's own controls, and its own read states.
   *
   * Everything between the header and the footer: the fields, and
   * whatever stands in for them while the read is pending, empty or
   * rejected. The frame renders them in a column on the modal body's
   * rhythm and holds no opinion about what they are.
   */
  readonly children: ReactNode;
}

/**
 * The frame an editor modal is built in.
 *
 * @typeParam T - The row being edited.
 * @param props - The row's name, the draft, the save and its state,
 * and the controls.
 * @returns The modal: header, body, and the footer that reports and
 * offers the save.
 */
export const EditorModal = <T extends object>({
  title,
  draft,
  onSave,
  saving,
  saveError,
  footerStatus,
  size,
  children,
}: EditorModalProps<T>) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const surfaceId = activeSurfaceId(pathname);

  const close = () => {
    void navigate(CLOSE_TO, CLOSE_OPTIONS);
  };

  return (
    <Modal
      open
      onClose={close}
      dismiss={DISMISS}
      size={size}
      eyebrow={surfaceId === undefined
        ? undefined
        : getSurface(surfaceId).title}
      title={title}
      footerStatus={footerStatus ?? describeUnsaved(draft)}
      footer={(
        <>
          <Button variant="ghost" onClick={close}>
            {CANCEL_LABEL}
          </Button>
          <Button
            variant="primary"
            disabled={saving || !isDirty(draft)}
            onClick={() => {
              onSave(close);
            }}
          >
            {SAVE_LABEL}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        {saveError !== null && (
          // Announced on arrival rather than politely: it lands in
          // response to the operator's own click, and it is the
          // reason the thing they asked for did not happen.
          <Banner role="alert" tone="danger" title={SAVE_FAILED_TITLE}>
            {saveError.message}
          </Banner>
        )}

        {children}
      </div>
    </Modal>
  );
};
