import type { EditorDraft } from './editorDraft';
import type { Source } from '../data/types';

import { describe, expect, it } from 'vitest';

import { DEFAULT_DOMAIN_SLUG, getDomain } from '../data/domains';
import { listSources } from '../data/sources';

import {
  EMPTY_EDITOR_DRAFT,
  changedMembers,
  describeUnsaved,
  isDirty,
  resetDraft,
  withDraftValues,
  withLoadedRow,
} from './editorDraft';

/**
 * The shape an editor loads: an id, the members a control writes, a
 * nullable column and a nested one.
 *
 * A stand-in rather than one of the fixture types, because the module
 * is generic and sits below every one of them — pinning the cases to
 * `Source` would assert it knows a shape it never sees. The nested
 * `config` is the member that earns the by-value walk: it is the
 * jsonb column shape `../data/proposals.ts` redeclares, and a control
 * that rebuilds it is the commonest way a clean editor could report
 * itself dirty.
 */
interface EditableRow {
  readonly id: number;
  readonly endpoint: string;
  readonly enabled: boolean;
  readonly notes: string | null;
  readonly config: Readonly<Record<string, unknown>>;
}

/** The row a read answers, as an editor would receive it. */
const LOADED_ROW: EditableRow = {
  id: 7,
  endpoint: 'https://example.test/feed.xml',
  enabled: true,
  notes: null,
  config: { selector: 'article', limit: 20 },
};

/**
 * The same row, rebuilt — equal by value and identical to nothing.
 *
 * Nested member included, since a shallow copy would leave `config`
 * comparing by identity and let the by-value claim pass for the wrong
 * reason.
 */
const REBUILT_ROW: EditableRow = {
  ...LOADED_ROW,
  config: { ...LOADED_ROW.config },
};

/** A holder as it stands the moment the read answers. */
const OPENED: EditorDraft<EditableRow> = withLoadedRow(
  EMPTY_EDITOR_DRAFT,
  LOADED_ROW,
);

/** The same holder with one member moved, for the dirty cases. */
const EDITED = withDraftValues(OPENED, {
  endpoint: 'https://example.test/atom.xml',
});

/**
 * The seeded domain's sources — real rows of a real editor's shape,
 * so the one case driving them is about the app's own data rather
 * than about a row invented to satisfy it.
 */
const SEEDED_SOURCES = listSources(getDomain(DEFAULT_DOMAIN_SLUG).id);

/**
 * The row at `index`, or a failure naming how short the list came up.
 *
 * The non-emptiness guard the fixture case rests on: a `SOURCES` that
 * lost its rows would otherwise make it pass over nothing at all.
 *
 * @typeParam T - The row shape.
 * @param rows - The list to read.
 * @param index - Which row is wanted.
 * @returns That row.
 * @throws If the list is shorter than the index.
 */
function rowAt<T>(rows: readonly T[], index: number): T {
  const row = rows[index];

  if (row === undefined) {
    throw new Error(`No row at index ${index} of ${rows.length}.`);
  }

  return row;
}

describe('EMPTY_EDITOR_DRAFT', () => {
  it('holds neither half, and cannot be written through', () => {
    // It is a module-scope singleton handed to every modal, so a
    // caller that wrote into it would change where the next editor in
    // the tab starts.
    // Arrange / Act / Assert
    expect(EMPTY_EDITOR_DRAFT.source).toBeUndefined();
    expect(EMPTY_EDITOR_DRAFT.draft).toBeUndefined();
    expect(Object.isFrozen(EMPTY_EDITOR_DRAFT)).toBe(true);
  });

  it('has nothing to report and nothing to put back', () => {
    // The first render of every editor: mounted, read in flight. All
    // four readings have to agree that there is no work here, or a
    // footer offers a save over a row nobody has yet.
    // Arrange
    const opening: EditorDraft<EditableRow> = EMPTY_EDITOR_DRAFT;

    // Act / Assert
    expect(changedMembers(opening)).toEqual([]);
    expect(isDirty(opening)).toBe(false);
    expect(describeUnsaved(opening)).toBeUndefined();
    expect(resetDraft(opening)).toBe(opening);
    expect(withDraftValues(opening, { enabled: false })).toBe(opening);
  });
});

describe('withLoadedRow', () => {
  it('adopts the row that arrives after the draft was opened', () => {
    // A read resolves on a microtask, so the modal is mounted with an
    // empty holder before it has anything to edit. The row that lands
    // becomes both halves at once — which is what makes an editor
    // open clean rather than reporting its own arrival as an edit.
    // Arrange
    const opening: EditorDraft<EditableRow> = EMPTY_EDITOR_DRAFT;

    // Act
    const answered = withLoadedRow(opening, LOADED_ROW);

    // Assert
    expect(answered.source).toBe(LOADED_ROW);
    expect(answered.draft).toBe(LOADED_ROW);
    expect(isDirty(answered)).toBe(false);
    expect(describeUnsaved(answered)).toBeUndefined();
  });

  it('answers the same holder while the read has not resolved', () => {
    // What a pending or rejected read hands the modal. A fresh holder
    // for it would be a state update on every render, which is a
    // render loop rather than a wasted allocation.
    // Arrange / Act / Assert
    expect(withLoadedRow(OPENED, undefined)).toBe(OPENED);
    expect(withLoadedRow(EMPTY_EDITOR_DRAFT, undefined))
      .toBe(EMPTY_EDITOR_DRAFT);
  });

  it('answers the same holder for a row equal to the one held', () => {
    // The steady state: every render hands over the query's answer,
    // and only a row that actually MOVED may produce a new holder.
    // The rebuilt row is the discriminating half — an identity check
    // here would answer a fresh holder for a row nothing changed.
    // Arrange / Act
    const again = withLoadedRow(OPENED, REBUILT_ROW);
    // The positive control, in the same case: a row that did move
    // must not be answered with the old holder.
    const moved = withLoadedRow(OPENED, {
      ...LOADED_ROW,
      enabled: false,
    });

    // Assert
    expect(REBUILT_ROW).not.toBe(LOADED_ROW);
    expect(again).toBe(OPENED);
    expect(moved).not.toBe(OPENED);
  });

  it('leaves the operator typing when a later read answers', () => {
    // A refetch while an editor is open moves the SOURCE and must not
    // touch the draft: an operator's unsaved work outranks a
    // background read of the row they are working on.
    // Arrange
    const refetched: EditableRow = { ...LOADED_ROW, notes: 'triaged' };

    // Act
    const held = withLoadedRow(EDITED, refetched);

    // Assert
    expect(held.source).toBe(refetched);
    expect(held.draft).toBe(EDITED.draft);
    expect(changedMembers(held)).toEqual(['endpoint', 'notes']);
  });

  it('falls silent once the read answers what was just saved', () => {
    // The ending a save gets for free: the write invalidates, the
    // read re-answers the stored row, and the footer stops speaking
    // because the draft now equals its source. Nothing here had to
    // know a save was in flight.
    // Arrange
    const saved = EDITED.draft;

    if (saved === undefined) {
      throw new Error('The edited holder should carry a draft.');
    }

    // Act
    const held = withLoadedRow(EDITED, { ...saved });

    // Assert
    expect(describeUnsaved(EDITED)).toBe('1 unsaved change.');
    expect(changedMembers(held)).toEqual([]);
    expect(describeUnsaved(held)).toBeUndefined();
  });
});

describe('changedMembers', () => {
  it('reports nothing for a draft equal to its source', () => {
    // The by-value claim. A control writes a member by spreading the
    // draft into a new object, so a draft is a different object from
    // its source from the first keystroke — an identity comparison
    // would report a rebuilt row as unsaved work forever.
    // Arrange
    const rebuilt: EditorDraft<EditableRow> = {
      source: LOADED_ROW,
      draft: REBUILT_ROW,
    };
    // The positive control, in the same case: a comparison that
    // answered "equal" to everything would satisfy the assertions
    // above it and nothing else in this file would disagree.
    const moved: EditorDraft<EditableRow> = {
      source: LOADED_ROW,
      draft: { ...REBUILT_ROW, config: { selector: 'main', limit: 20 } },
    };

    // Act / Assert
    expect(Object.keys(LOADED_ROW).length).toBeGreaterThan(0);
    expect(REBUILT_ROW).not.toBe(LOADED_ROW);
    expect(REBUILT_ROW.config).not.toBe(LOADED_ROW.config);
    expect(changedMembers(rebuilt)).toEqual([]);
    expect(isDirty(rebuilt)).toBe(false);
    expect(changedMembers(moved)).toEqual(['config']);
  });

  it('names the one member a draft moved, and only that one', () => {
    // The commonest state an open editor is in. Naming the member
    // rather than counting it is what separates this from a boolean:
    // a walk that reported every key would satisfy a count and fail
    // here.
    // Arrange / Act
    const names = changedMembers(EDITED);

    // Assert
    expect(names).toEqual(['endpoint']);
    expect(isDirty(EDITED)).toBe(true);
    expect(EDITED.source).toBe(LOADED_ROW);
  });

  it('answers in the source order, then any member only the draft has', () => {
    // Two claims one case can carry because they are one walk: the
    // source's own declaration order first, then a member the source
    // does not carry at all. The second is why membership is checked
    // before value — two `undefined`s would otherwise compare equal
    // and a member the draft added would go unreported.
    // Arrange
    const widened = { ...LOADED_ROW, retries: 3 };
    const held: EditorDraft<EditableRow> = {
      source: LOADED_ROW,
      draft: { ...widened, enabled: false, id: 8 },
    };

    // Act
    const names = changedMembers(held);

    // Assert
    expect(names).toEqual(['id', 'enabled', 'retries']);
    expect(Object.keys(LOADED_ROW).indexOf('id'))
      .toBeLessThan(Object.keys(LOADED_ROW).indexOf('enabled'));
  });

  it('tells a member that is absent from one that reads undefined', () => {
    // Membership decides before value does, and this is the one shape
    // that separates the two: both sides answer `undefined` for the
    // member, and only one of them carries it. No mirrored row can
    // reach it — `../data/types.ts` declares nullable columns
    // `T | null` and never optional — but nothing stops a caller, and
    // a walk keyed on value alone would report the pair as agreeing.
    // Arrange
    const sparse: EditorDraft<{ label?: string }> = {
      source: { label: undefined },
      draft: {},
    };

    // Act / Assert
    expect(changedMembers(sparse)).toEqual(['label']);
    expect(isDirty(sparse)).toBe(true);
  });

  it('answers an array the caller owns outright', () => {
    // The array stance this module is in, asserted rather than only
    // documented: built fresh per call, owned by nobody, so a caller
    // sorting or pushing into one cannot reach the next reader.
    // Arrange
    const names = changedMembers(EDITED);

    // Act
    names.push('endpoint');

    // Assert
    expect(names).toEqual(['endpoint', 'endpoint']);
    expect(changedMembers(EDITED)).toEqual(['endpoint']);
  });

  it('reads a real fixture row the way it reads a stand-in', () => {
    // The one case driven by the app's own shapes: a frozen fixture
    // row is a legal source, a rebuilt copy of one is not an edit,
    // and moving a column names that column. `Source` carries the
    // members an editor writes and nothing this module treats
    // specially, which is what makes the agreement worth stating.
    // Arrange
    const stored = rowAt(SEEDED_SOURCES, 0);
    const untouched: EditorDraft<Source> = {
      source: stored,
      draft: { ...stored },
    };
    const retargeted: EditorDraft<Source> = {
      source: stored,
      draft: { ...stored, endpoint: 'https://example.test/moved.xml' },
    };

    // Act / Assert
    expect(stored.endpoint).not.toBe('https://example.test/moved.xml');
    expect(changedMembers(untouched)).toEqual([]);
    expect(changedMembers(retargeted)).toEqual(['endpoint']);
  });
});

describe('describeUnsaved', () => {
  it('states nothing at all when nothing has moved', () => {
    // A status line that always speaks is one an operator stops
    // reading, and the state it would be reporting is already the one
    // where the save is offered and refused.
    // Arrange / Act / Assert
    expect(describeUnsaved(OPENED)).toBeUndefined();
  });

  it('counts the members that moved, singular and plural', () => {
    // Both spellings in one case, so the plural cannot be added later
    // without the singular being re-read beside it.
    // Arrange
    const twice = withDraftValues(EDITED, { enabled: false });
    const thrice = withDraftValues(twice, { notes: 'triaged' });

    // Act / Assert
    expect(describeUnsaved(EDITED)).toBe('1 unsaved change.');
    expect(describeUnsaved(twice)).toBe('2 unsaved changes.');
    expect(describeUnsaved(thrice)).toBe('3 unsaved changes.');
  });
});

describe('withDraftValues', () => {
  it('writes the members it is given and leaves the rest', () => {
    // A partial rather than the whole row, so a control naming one
    // member cannot silently revert a neighbour it forgot to spread.
    // Arrange / Act
    const held = withDraftValues(OPENED, { enabled: false });

    // Assert
    expect(held.draft).toEqual({ ...LOADED_ROW, enabled: false });
    expect(held.source).toBe(LOADED_ROW);
  });

  it('answers the same holder when the value has not moved', () => {
    // A control re-emitting its current value is common — a select
    // reopened and closed on the same option — and a new holder for
    // it is a re-render for nothing.
    // Arrange / Act / Assert
    expect(withDraftValues(OPENED, { enabled: true })).toBe(OPENED);
    expect(withDraftValues(OPENED, {
      config: { ...LOADED_ROW.config },
    })).toBe(OPENED);
    expect(withDraftValues(OPENED, { enabled: false })).not.toBe(OPENED);
  });

  it('never writes through the holder it is given', () => {
    // The holder is React state: one edited in place is a new value
    // that compares equal to the old one and renders nothing.
    // Arrange / Act
    const held = withDraftValues(EDITED, { notes: 'triaged' });

    // Assert
    expect(held).not.toBe(EDITED);
    expect(changedMembers(EDITED)).toEqual(['endpoint']);
    expect(changedMembers(held)).toEqual(['endpoint', 'notes']);
  });
});

describe('resetDraft', () => {
  it('puts the draft back to the row that was loaded', () => {
    // What cancel and discard both reach for. The source stays where
    // it was, so a reset does not also throw away the read.
    // Arrange / Act
    const held = resetDraft(EDITED);

    // Assert
    expect(isDirty(EDITED)).toBe(true);
    expect(held.draft).toBe(LOADED_ROW);
    expect(held.source).toBe(LOADED_ROW);
    expect(isDirty(held)).toBe(false);
  });

  it('answers the same holder when there is nothing to put back', () => {
    // Including for a draft that is equal to its source without being
    // the same object, which is every editor that has been edited and
    // edited back.
    // Arrange
    const rebuilt: EditorDraft<EditableRow> = {
      source: LOADED_ROW,
      draft: REBUILT_ROW,
    };

    // Act / Assert
    expect(resetDraft(OPENED)).toBe(OPENED);
    expect(resetDraft(rebuilt)).toBe(rebuilt);
  });
});
