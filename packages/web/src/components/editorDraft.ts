/**
 * @packageDocumentation
 * The working copy an editor modal holds while it is open, and the
 * questions its footer asks of one.
 *
 * Every editor this wave adds — a source's endpoint, a persona's
 * system text, a connector's config, a category's terms — has the
 * same shape underneath: a row arrives from a read, an operator
 * changes part of it, and a footer has to say whether there is
 * anything to save. That is decided here rather than inside each
 * modal, for the reason the two-runner split makes structural. The
 * unit runner collects `.ts` files under `src` in a node environment,
 * so a decision living in a `.tsx` is reachable by no test in this
 * package at all; `./EditorModal.tsx` therefore holds no draft of its
 * own and takes one as props.
 *
 * ## This is not `../data/drafts.ts`
 *
 * Two modules, two lifetimes, and the names are close enough to be
 * worth separating out loud. `../data/drafts.ts` is the SAVED store:
 * what a completed save recorded, laid over every read for the life
 * of the tab. This is the UNSAVED working copy inside one open modal:
 * what an operator has typed and not yet committed, gone the moment
 * the modal unmounts. A save moves a value from here to there, and
 * nothing moves the other way.
 *
 * It is also why nothing here is module-scoped state. A holder is a
 * plain value the modal keeps in `useState`, so two editors open on
 * two rows cannot see each other's typing, and a colocated test needs
 * no reset hook to keep one case out of the next.
 *
 * ## Why the source is kept beside the draft
 *
 * A holder carries the row as LOADED as well as the row as EDITED,
 * because every question the footer asks is a comparison of the two.
 * Keeping the draft alone would make "is there anything to save" a
 * record of which controls have been touched, which answers yes to an
 * operator who typed a character and deleted it again.
 * `../pages/settings/fields.ts` reaches the same rule from the other
 * end by dropping an override that agrees with what is stored: a
 * change and its undo have to be one state.
 *
 * Keeping the source is also what gives a save its ending for free.
 * The write invalidates its keys, the read re-answers with the row
 * that was just stored, {@link withLoadedRow} records it as the new
 * source, and the footer falls silent because the draft now equals
 * it. Nothing has to remember that a save was in flight.
 *
 * The two members are set together and cleared together: a holder
 * with a source always has a draft. {@link EMPTY_EDITOR_DRAFT} is the
 * only state with neither, and it is where every modal starts, since
 * a read resolves on a microtask and the first render has no row.
 *
 * ## Every transition answers the SAME holder when nothing moved
 *
 * {@link withLoadedRow}, {@link withDraftValues} and
 * {@link resetDraft} each return the holder they were given, by
 * identity, when the result would be equal to it. That is not a
 * micro-optimisation. A modal calls `withLoadedRow` with the query's
 * answer on every render, and a fresh object every time is a state
 * update every time — a render loop, not a wasted allocation. The
 * colocated tests assert the identity with `toBe` for that reason.
 *
 * ## Comparison is BY VALUE, and what a value is here
 *
 * Two rows are the same when their members are, recursively, with
 * arrays compared elementwise and objects by their own keys. Identity
 * is not the test and cannot be: a control writes a member by
 * spreading the draft into a new object, so a draft is a different
 * object from its source from the first keystroke — and a keystroke
 * undone would then read as unsaved work forever.
 *
 * The walk is safe on every row an editor loads because
 * `../data/types.ts` redeclares columns and not objects: a mirrored
 * row is JSON-shaped by construction, timestamps are ISO strings
 * rather than `Date`, and a nullable column is `T | null` rather than
 * optional. So there is no cycle to fall into, no wrapper whose
 * identity carries meaning, and a member absent on one side is a
 * change rather than a shape this app can produce.
 *
 * ## Which array stance this module is in
 *
 * {@link changedMembers} returns a MUTABLE array, like the option
 * builders in `../pages/`, and unlike the accessors in `../data/`.
 * This module is on the props-BUILDING side of that split: the array
 * is constructed fresh on every call and owned by nobody, and the
 * `@ar/ui` props such a list feeds are declared mutable, so a
 * `readonly` return would protect nothing and cost every call site a
 * copy. The frozen tables in `../data/` take the other stance for the
 * opposite reason — they are shared, and a caller writing through one
 * would edit the fixture itself.
 *
 * ## What this deliberately does not answer
 *
 * Whether a draft is VALID. Each editor's own module holds its
 * refusals, because they are that surface's: a persona's role may not
 * duplicate another in the domain, a connector's secret is write-only,
 * a term's weight is a magnitude. This module reports movement and
 * nothing else, which is why it needs no import at all.
 */

/**
 * A row as it was loaded and as it is being edited.
 *
 * Both members are absent until the read resolves and both are
 * present afterwards — see the header on why that pairing holds.
 *
 * @typeParam T - The row's shape, whatever the surface reads and
 * edits. Structural: this module is below every fixture type and
 * knows none of them.
 */
export interface EditorDraft<T extends object> {
  /** The row as the read last answered it. */
  readonly source: T | undefined;
  /** The row as the operator has it, saved or not. */
  readonly draft: T | undefined;
}

/**
 * Where every editor starts: mounted, with the read still in flight.
 *
 * Frozen because it is a module-scope singleton handed to every
 * modal, and typed over `never` so it is assignable to a holder of
 * any row shape without each surface declaring an empty one.
 */
export const EMPTY_EDITOR_DRAFT: EditorDraft<never> = Object.freeze({
  source: undefined,
  draft: undefined,
});

/**
 * Whether a value behaves like a plain record for the walk below.
 *
 * @param value - Anything at all.
 * @returns Whether it is a non-null object that is not an array.
 */
function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}

/**
 * Whether two values are the same by VALUE rather than by identity.
 *
 * Primitives compare with `Object.is`, so `NaN` equals itself and a
 * signed zero does not silently equal its opposite. Arrays compare
 * elementwise, records by their own keys — a key present on one side
 * only is a difference, which is what makes a member the draft
 * dropped visible rather than absorbed.
 *
 * Recursion terminates because the rows this walks are JSON-shaped;
 * the header says why that is a property of `../data/types.ts` and
 * not an assumption made here.
 *
 * @param left - One value.
 * @param right - The other.
 * @returns Whether they read the same all the way down.
 */
function equalByValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => equalByValue(item, right[index]));
  }

  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }

  const names = Object.keys(left);

  return names.length === Object.keys(right).length
    && names.every((name) => equalByValue(left[name], right[name]));
}

/**
 * One row's own members, as name/value pairs.
 *
 * A widening rather than a cast. An interface carrying no index
 * signature is not comparable to `Record<string, unknown>` under this
 * repo's settings, so `Object.entries` is the one reader that reaches
 * a generic row's members with no assertion to talk the compiler out
 * of.
 *
 * @param row - The row to read.
 * @returns Its own enumerable members, in the order it declares them.
 */
function memberEntries(
  row: object,
): readonly (readonly [string, unknown])[] {
  return Object.entries(row);
}

/**
 * Whether one member reads the same on both sides.
 *
 * Membership is checked before value, so a name only one side carries
 * is a change rather than a pair of `undefined`s comparing equal.
 *
 * @param stored - The source's members.
 * @param edited - The draft's members.
 * @param name - The member in question.
 * @returns Whether the two agree about it.
 */
function sameMember(
  stored: ReadonlyMap<string, unknown>,
  edited: ReadonlyMap<string, unknown>,
  name: string,
): boolean {
  return stored.has(name) === edited.has(name)
    && equalByValue(stored.get(name), edited.get(name));
}

/**
 * Record the row the read has answered.
 *
 * Called on every render with whatever the query hook holds, so it
 * answers the SAME holder — by identity — whenever the row it is
 * given is the one already recorded. See the header: a fresh holder
 * per render is a render loop.
 *
 * The first row to arrive becomes both the source and the draft,
 * which is how an editor opened before its read resolved fills in. A
 * later one moves the SOURCE only: an operator's unsaved typing
 * outranks a refetch, and comparing the draft against the newly
 * stored row is what makes a save's own refetch end the unsaved
 * state.
 *
 * @typeParam T - The row's shape.
 * @param held - The holder as it stands.
 * @param loaded - What the read answers, or `undefined` while it is
 * pending or has rejected.
 * @returns The holder, unchanged when nothing moved.
 */
export function withLoadedRow<T extends object>(
  held: EditorDraft<T>,
  loaded: T | undefined,
): EditorDraft<T> {
  if (loaded === undefined || equalByValue(held.source, loaded)) {
    return held;
  }

  return {
    source: loaded,
    draft: held.draft ?? loaded,
  };
}

/**
 * The holder after a control writes some of the row.
 *
 * A partial rather than the whole row, so a control names the one
 * member it owns and cannot silently revert a neighbour it forgot to
 * spread. Answers the holder it was given when the write leaves the
 * draft reading the same — a control re-emitting its current value is
 * common, and a new holder for it is a re-render for nothing.
 *
 * Nothing is written before the read resolves. An editor draws no
 * controls over a row it has not got, so the case is unreachable from
 * the UI; naming it here is what keeps the source/draft pairing in
 * the header true of every state this module can produce.
 *
 * @typeParam T - The row's shape.
 * @param held - The holder as it stands.
 * @param changes - The members this control writes.
 * @returns The new holder, or the old one when nothing moved.
 */
export function withDraftValues<T extends object>(
  held: EditorDraft<T>,
  changes: Partial<T>,
): EditorDraft<T> {
  const { draft } = held;

  if (draft === undefined) {
    return held;
  }

  const next = { ...draft, ...changes };

  return equalByValue(draft, next)
    ? held
    : { source: held.source, draft: next };
}

/**
 * The holder with the operator's changes thrown away.
 *
 * What a discard gesture inside an open editor reaches for: the
 * draft goes back to the row the read last answered, and the source
 * stays exactly where it was. Answers the holder it was given when
 * there is nothing to put back, including before the read resolves.
 *
 * A modal's CANCEL is not one of its callers. `./EditorModal.tsx`
 * closes on cancel, and closing unmounts the modal the holder lives
 * in — putting a draft back before throwing the whole thing away
 * would be a state update nobody could observe.
 *
 * @typeParam T - The row's shape.
 * @param held - The holder as it stands.
 * @returns The holder with the draft back at its source.
 */
export function resetDraft<T extends object>(
  held: EditorDraft<T>,
): EditorDraft<T> {
  const { source, draft } = held;

  if (source === undefined || equalByValue(source, draft)) {
    return held;
  }

  return { source, draft: source };
}

/**
 * Which of the row's members the operator has moved.
 *
 * The source's own members first, in the order it declares them, then
 * any the draft carries and it does not. Empty while the read is
 * pending, which is the same answer as "nothing has changed" and is
 * the right one: there is nothing to save in either state.
 *
 * Names are `string` rather than `keyof T` because `Object.keys` is
 * where they come from and it answers `string`. Narrowing them back
 * would be an assertion the runtime cannot back, since a draft is
 * free to carry a member the declared type does not.
 *
 * Returns a MUTABLE array the caller owns outright — see the header
 * on which array stance this module is in.
 *
 * @typeParam T - The row's shape.
 * @param held - The holder as it stands.
 * @returns The names that moved, in source order; `[]` when none did.
 */
export function changedMembers<T extends object>(
  held: EditorDraft<T>,
): string[] {
  const { source, draft } = held;

  if (source === undefined || draft === undefined) {
    return [];
  }

  const stored = new Map(memberEntries(source));
  const edited = new Map(memberEntries(draft));
  const names = [
    ...stored.keys(),
    ...[...edited.keys()].filter((name) => !stored.has(name)),
  ];

  return names.filter((name) => !sameMember(stored, edited, name));
}

/**
 * Whether the operator has anything to save.
 *
 * Defined through {@link changedMembers} rather than beside it, so
 * the two can never disagree about what a change is — a footer
 * offering a save and a footer stating what would be saved are one
 * reading of one holder.
 *
 * @typeParam T - The row's shape.
 * @param held - The holder as it stands.
 * @returns Whether the draft differs from the row that was loaded.
 */
export function isDirty<T extends object>(
  held: EditorDraft<T>,
): boolean {
  return changedMembers(held).length > 0;
}

/**
 * The sentence the modal footer states about unsaved work.
 *
 * `undefined` when there is nothing to say, rather than a sentence
 * reporting that nothing has changed: a status line that always
 * speaks is one an operator stops reading, and the state it would be
 * reporting is already the one where the save is offered and refused.
 *
 * It counts members rather than naming them. The names are storage
 * columns and the labels are each surface's own, so a sentence built
 * from them here would read as the schema talking to an operator.
 *
 * @typeParam T - The row's shape.
 * @param held - The holder as it stands.
 * @returns The sentence, or `undefined` when nothing has moved.
 */
export function describeUnsaved<T extends object>(
  held: EditorDraft<T>,
): string | undefined {
  const moved = changedMembers(held).length;

  if (moved === 0) {
    return undefined;
  }

  return moved === 1
    ? '1 unsaved change.'
    : `${moved} unsaved changes.`;
}
