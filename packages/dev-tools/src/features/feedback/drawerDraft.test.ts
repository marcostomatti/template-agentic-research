import type { FeedbackDraft } from './drawerDraft';

import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_DRAFT_EMPTY,
  createFeedbackDraftStore,
  feedbackDraftStore,
} from './drawerDraft';

/**
 * ## Nothing here is stubbed, because nothing here reaches out
 *
 * `./drawerDraft.ts` is one binding, one `Set` and four closures: no
 * storage, no request, no timer, no React. So a case builds its own
 * store, writes to it and reads what came back.
 *
 * Every case but the last builds its own through
 * {@link createFeedbackDraftStore}, which is why the module exports a
 * factory at all — a case writing into the shared
 * {@link feedbackDraftStore} would leave a title behind for the next
 * one.
 *
 * ## Refusals first
 *
 * This store refuses nothing: it takes any change and answers the
 * draft. What it PROTECTS is read first instead — the draft it hands
 * out cannot be written through, the empty constant survives a write,
 * and a detached listener is never called again — because those are
 * the properties a later edit could take away without failing
 * anything else.
 *
 * ## The two `useSyncExternalStore` contracts
 *
 * Two cases exist only for React's reader: `answers the same draft
 * between writes` (the snapshot must be stable, or React's tearing
 * check reds) and `answers a new draft on every write` (the identity
 * must move, or React never repaints). Neither is visible in
 * `./FeedbackDrawer.tsx`, and both would break it.
 */

/** A change with something of every kind in it. */
const CHANGE: Partial<FeedbackDraft> = {
  templateId: 'ui-feedback',
  title: 'The tree loses its selection',
};

describe('the draft a store hands out', () => {
  it('answers the empty draft before anything is written', () => {
    const store = createFeedbackDraftStore();

    expect(store.read()).toStrictEqual(FEEDBACK_DRAFT_EMPTY);
  });

  it('refuses a write through the draft it hands out', () => {
    const store = createFeedbackDraftStore();
    const draft = store.read() as { title: string };

    expect(Object.isFrozen(store.read())).toBe(true);
    expect(() => {
      draft.title = 'written through';
    }).toThrow(TypeError);
  });

  it('leaves the empty constant untouched when a write lands', () => {
    const store = createFeedbackDraftStore();

    store.write({ title: 'something' });

    expect(FEEDBACK_DRAFT_EMPTY.title).toBe('');
    expect(store.read().title).toBe('something');
  });

  it('answers the same draft between writes', () => {
    const store = createFeedbackDraftStore();

    store.write(CHANGE);

    expect(store.read()).toBe(store.read());
  });

  it('answers a new draft on every write', () => {
    const store = createFeedbackDraftStore();
    const before = store.read();

    store.write(CHANGE);

    expect(store.read()).not.toBe(before);
  });
});

describe('subscribing to a draft store', () => {
  it('does not notify a listener that has detached', () => {
    const store = createFeedbackDraftStore();
    const seen: number[] = [];
    const detach = store.subscribe(() => {
      seen.push(seen.length);
    });

    store.write(CHANGE);
    detach();
    store.write({ title: 'after the detach' });

    expect(seen).toStrictEqual([0]);
  });

  it('detaches once however many times the disposer is called', () => {
    const store = createFeedbackDraftStore();
    const seen: string[] = [];
    const listener = (): void => {
      seen.push('called');
    };
    const detach = store.subscribe(listener);

    detach();
    // StrictMode's second pass re-registers the SAME function value,
    // and the stale disposer is then called again. A disposer that
    // deleted "whatever is registered now" would take the LIVE
    // registration off here — which is why the order below is
    // subscribe, detach, subscribe, detach and not subscribe, detach,
    // detach, subscribe, where the second delete finds nothing and the
    // reading passes either way (measured).
    store.subscribe(listener);
    detach();
    store.write(CHANGE);

    expect(seen).toStrictEqual(['called']);
  });

  it('holds one entry for a listener subscribed twice', () => {
    const store = createFeedbackDraftStore();
    const seen: string[] = [];
    const listener = (): void => {
      seen.push('called');
    };

    store.subscribe(listener);
    store.subscribe(listener);
    store.write(CHANGE);

    expect(seen).toStrictEqual(['called']);
  });

  it('delivers to every listener on a write', () => {
    const store = createFeedbackDraftStore();
    const seen: string[] = [];

    store.subscribe(() => {
      seen.push('one');
    });
    store.subscribe(() => {
      seen.push('two');
    });
    store.write(CHANGE);

    expect(seen).toStrictEqual(['one', 'two']);
  });

  it('delivers to the listeners registered when the write began', () => {
    const store = createFeedbackDraftStore();
    const seen: string[] = [];

    store.subscribe(() => {
      seen.push('one');
      store.subscribe(() => {
        seen.push('late');
      });
    });
    store.write(CHANGE);

    expect(seen).toStrictEqual(['one']);
  });

  it('notifies on a write that names nothing', () => {
    const store = createFeedbackDraftStore();
    const seen: string[] = [];

    store.subscribe(() => {
      seen.push('called');
    });
    store.write({});

    expect(seen).toStrictEqual(['called']);
  });
});

describe('writing a draft', () => {
  it('keeps the members a write did not name', () => {
    const store = createFeedbackDraftStore();

    store.write({ title: 'kept', templateId: 'bug-report' });
    store.write({ sending: true });

    expect(store.read()).toStrictEqual({
      ...FEEDBACK_DRAFT_EMPTY,
      title: 'kept',
      templateId: 'bug-report',
      sending: true,
    });
  });

  it('freezes every draft a write builds', () => {
    const store = createFeedbackDraftStore();

    store.write(CHANGE);

    expect(Object.isFrozen(store.read())).toBe(true);
  });

  it('carries what was sent, for the controls that come after', () => {
    const store = createFeedbackDraftStore();
    const sent = { title: 'A title', body: '## Context\n\nA body.\n' };

    store.write({ sent });

    expect(store.read().sent).toStrictEqual(sent);
  });
});

describe('resetting a draft store', () => {
  it('answers the empty draft again', () => {
    const store = createFeedbackDraftStore();

    store.write({ title: 'typed', sending: true, file: new Blob(['x']) });
    store.reset();

    expect(store.read()).toStrictEqual(FEEDBACK_DRAFT_EMPTY);
  });

  it('notifies every listener', () => {
    const store = createFeedbackDraftStore();
    const seen: string[] = [];

    store.subscribe(() => {
      seen.push('called');
    });
    store.reset();

    expect(seen).toStrictEqual(['called']);
  });
});

describe('the shared draft store', () => {
  it('is a store of its own, which a fresh one cannot reach', () => {
    const mine = createFeedbackDraftStore();

    mine.write({ title: 'only mine' });

    expect(feedbackDraftStore.read().title).toBe('');
    expect(mine.read().title).toBe('only mine');
  });
});
