/**
 * @packageDocumentation
 * The report draft, held OUTSIDE React so that collapsing the drawer
 * cannot throw it away.
 *
 * ## Why this module exists at all
 *
 * `src/core/Shell.tsx` draws a drawer's children as `{open ?
 * item.render({close, host}) : null}`, so a collapse UNMOUNTS the
 * feature's whole React subtree. Spec item 5 makes that collapse part
 * of the feature: starting pick mode collapses the drawer to its
 * handle so the page underneath can be clicked. `./ElementPicker.tsx`
 * writes the consequence on its own `onSelect` prop — the callback is
 * called while the drawer's subtree is gone — and the consequence is
 * bigger than the selector: a `useState` inside the drawer holds the
 * title, the answers and the captured image too, and all four would
 * go with the unmount.
 *
 * So the draft lives here, in module state a component cannot own,
 * and `./FeedbackDrawer.tsx` reads it through `useSyncExternalStore`.
 * A collapse then costs a render and nothing else: the pick writes the
 * selector into this store, the operator expands the drawer from its
 * tab, and the same draft is drawn again.
 *
 * ## Mutable module state, and the immutability rule
 *
 * One binding moves — the current draft — and the VALUE never does.
 * {@link FeedbackDraftStore.write} builds a new frozen object out of
 * the old one and the change, so a reader holding the previous draft
 * keeps exactly what it read. That is what `useSyncExternalStore`
 * demands: it re-renders when the identity changes and caches by
 * identity, so a store that mutated in place would answer a snapshot
 * React had already decided was current and the drawer would stop
 * repainting.
 *
 * The same contract is why {@link FeedbackDraftStore.read} is a plain
 * getter over the held object rather than a builder: two calls with no
 * write between them answer the SAME object, and React's tearing check
 * fails on a getter that answers a fresh object each time.
 *
 * ## The factory and the singleton
 *
 * `../../core/bus.ts`'s shape, for its reason: {@link
 * feedbackDraftStore} is the one instance the drawer uses, created on
 * first import, and {@link createFeedbackDraftStore} is the same thing
 * without the sharing. Every case below builds its own, so no case can
 * leak a title or a listener into the next one, and the drawer can be
 * handed a store of its own in a reading that must not touch the
 * shared draft.
 *
 * ## What is in the draft
 *
 * Everything the drawer's subtree must not lose: what the operator
 * typed, chose and captured; the three facts about the last submit
 * (whether one is in flight, what was sent, what came back); and what
 * `./drawerData.ts` last read off the dev server.
 *
 * {@link FeedbackDraft.sent} is kept because two controls need the
 * body AFTER the answer arrives — the "also affected" button posts it
 * as the comment, and the local-tracker block offers it as a prefilled
 * GitHub link and a copy block — and recomputing it from the form
 * would answer whatever the form says NOW rather than what the tracker
 * was told.
 *
 * The server's two answers are here for a second reason as well, and
 * it is the one that decides the shape: a React EFFECT does not run
 * under `react-dom/server`. Held in a `useState` and loaded from an
 * effect, the template list would be absent from every static frame of
 * this drawer — no form, no selector input, no screenshot notice — and
 * the `react-dom/server` readings this stage lands could not read any
 * of them. Held here, a reading writes the templates and renders.
 *
 * They are still re-read on every mount: what the store gives is a
 * drawer that draws its form immediately on the way back from a
 * collapse, not a cache. `./drawerData.ts` says the same from the
 * other side.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is no evidence a case can fail. Each leg below was
 * measured by breaking this file, running `bun x vitest run
 * src/features/feedback/drawerDraft.test.ts` from
 * `packages/dev-tools`, and restoring this file byte-identical — a
 * SHA-256 of the restored text compared against the original's, every
 * leg. The baseline is `Tests 17 passed (17)`.
 *
 * - {@link FeedbackDraftStore.write} building from
 *   {@link FEEDBACK_DRAFT_EMPTY} instead of from the held draft, so a
 *   write replaces rather than merges, answers `1 failed | 16 passed`:
 *   `keeps the members a write did not name`.
 * - Dropping the `Object.freeze` from `write` answers `1 failed | 16
 *   passed`: `freezes every draft a write builds`.
 * - A genuine in-place mutation cannot be written at all. Spelled
 *   `Object.assign(draft as Record<string, unknown>, change)` it
 *   answers `13 failed | 4 passed` — every case that reads a value
 *   after a write — because the object it would write into is frozen,
 *   and `bun x tsc --noEmit` exits `2` over the cast as well. It is
 *   the one leg either gate catches, and the freeze is why.
 * - Dropping the `attached` flag from the disposer answers `1 failed |
 *   16 passed`: `detaches once however many times the disposer is
 *   called`. That case's ORDER is load-bearing and was measured both
 *   ways: subscribe, detach, subscribe, detach reds, while subscribe,
 *   detach, detach, subscribe passes — the second delete finds nothing
 *   to remove, so only a re-registration BEFORE the stale disposer's
 *   second call reads the bug.
 * - Delivering over the live `Set` rather than a snapshot answers `1
 *   failed | 16 passed`: `delivers to the listeners registered when
 *   the write began`.
 * - Dropping the notify from {@link FeedbackDraftStore.reset} answers
 *   `1 failed | 16 passed`: `notifies every listener`.
 *
 * `bun x tsc --noEmit` exits `0` under every leg but the third: they
 * are behaviour changes over types that still line up, so
 * `check-types` would never report one and the suite is the only gate
 * that does.
 */

import type { FeedbackValues } from './body';
import type { SubmitResult } from './submit';
import type { ReportTemplate } from '../../core/reportTemplate';

/** What was actually sent, kept for the controls that come after. */
export interface FeedbackSentReport {
  /** The title as it went on the wire. */
  readonly title: string;

  /** The Markdown body as it went on the wire. */
  readonly body: string;
}

/** Everything the drawer must not lose when it collapses. */
export interface FeedbackDraft {
  /** The id the report-type select carries; `''` before one loads. */
  readonly templateId: string;

  /** The title as typed. */
  readonly title: string;

  /** Every answer the form holds, keyed by field id. */
  readonly values: FeedbackValues;

  /** The image the report will carry, or `null` while there is none. */
  readonly file: Blob | null;

  /** Whether a submit or a comment is in flight right now. */
  readonly sending: boolean;

  /** What the last submit sent, or `null` before there was one. */
  readonly sent: FeedbackSentReport | null;

  /** What came back, or `null` while nothing has been said. */
  readonly outcome: SubmitResult | null;

  /**
   * The forms the dev server served, or `null` before it has answered.
   *
   * `null` and `[]` are different things: the first means the read is
   * outstanding, the second that this repository has no issue form.
   */
  readonly templates: readonly ReportTemplate[] | null;

  /** The `owner/name` slug, or `null` when the server named none. */
  readonly repo: string | null;

  /** Why there are no forms to fill in, or `null` while there may be. */
  readonly unavailable: string | null;
}

/**
 * A draft nobody has touched.
 *
 * Frozen, and never handed out as anything a write could reach: a
 * write builds a new object from it. The colocated cases read that
 * both ways round — the constant is unchanged after a write, and the
 * store's answer is frozen.
 */
export const FEEDBACK_DRAFT_EMPTY: FeedbackDraft = Object.freeze({
  templateId: '',
  title: '',
  values: Object.freeze({}),
  file: null,
  sending: false,
  sent: null,
  outcome: null,
  templates: null,
  repo: null,
  unavailable: null,
});

/** The draft, and the three ways to reach it. */
export interface FeedbackDraftStore {
  /**
   * The draft as it stands.
   *
   * @returns The same object until the next write, which is what
   * `useSyncExternalStore` requires of a snapshot.
   */
  read(): FeedbackDraft;

  /**
   * Replace some members and keep the rest.
   *
   * @param change - The members that move. An empty change still
   * builds a new draft and still notifies, because a caller that
   * asked for a write asked for a render.
   */
  write(change: Partial<FeedbackDraft>): void;

  /** Put {@link FEEDBACK_DRAFT_EMPTY} back and notify. */
  reset(): void;

  /**
   * Be told when the draft changes.
   *
   * @param listener - Called after each write, with no arguments;
   * React reads the new draft itself.
   * @returns The detach. Idempotent, for `../../core/bus.ts`'s
   * reason: a React effect cleanup can run twice under StrictMode, and
   * a disposer that removed "whatever is registered now" would remove
   * a LATER subscriber that happened to be the same function value.
   */
  subscribe(listener: () => void): () => void;
}

/**
 * Build a draft store of its own.
 *
 * @returns The store, frozen. It holds one draft and a set of
 * listeners, and reaches nothing else — no storage, no request, no
 * timer, no React.
 */
export function createFeedbackDraftStore(): FeedbackDraftStore {
  let draft: FeedbackDraft = FEEDBACK_DRAFT_EMPTY;
  const listeners = new Set<() => void>();

  // A SNAPSHOT of the set, so a listener that subscribes or detaches
  // while being called takes effect from the next write rather than
  // making this one skip or double-deliver. The same reading
  // `../../core/bus.ts` takes of its own delivery.
  const announce = (): void => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  return Object.freeze({
    read: (): FeedbackDraft => draft,

    write: (change: Partial<FeedbackDraft>): void => {
      draft = Object.freeze({ ...draft, ...change });
      announce();
    },

    reset: (): void => {
      draft = FEEDBACK_DRAFT_EMPTY;
      announce();
    },

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      let attached = true;

      return (): void => {
        if (!attached) {
          return;
        }

        attached = false;
        listeners.delete(listener);
      };
    },
  });
}

/**
 * The draft the drawer uses.
 *
 * One per app, created on first import of this module — which is what
 * makes it survive the drawer's unmount. A caller that must not touch
 * it builds its own with {@link createFeedbackDraftStore}.
 */
export const feedbackDraftStore: FeedbackDraftStore
  = createFeedbackDraftStore();
