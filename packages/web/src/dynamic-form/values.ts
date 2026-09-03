/**
 * @packageDocumentation
 * The one authority on what sits at a path, and the only way a value
 * ever changes: read a position, replace a position, move an item
 * within a list.
 *
 * `./nodePath.ts` names a position and deliberately reads no value;
 * `./tree.ts` reads a value for ARITY alone. This is where asking a
 * path for a value can come back empty, and the only module in the
 * directory that answers a NEW value rather than a description of an
 * old one. `./NodeForm.tsx` writes through it, `./DynamicForm.tsx`
 * hands what comes back to a schema before it reports anything, and
 * nothing anywhere assigns into a value directly.
 *
 * It is a `.ts` for the reason the whole core of `src/dynamic-form/`
 * is: the unit runner collects `.ts` files under `src` in a node
 * environment, so a decision living in a `.tsx` is reachable by no
 * test in this package at all.
 *
 * ## It takes no def, and that is the whole split
 *
 * A def says what a field IS; a value says what is there. This
 * module only ever reads the second, which is what keeps it from
 * becoming a second opinion about the contract. So it cannot refuse
 * a write because a def declares no such member — that is the
 * schema's job at the save path, whose refusals
 * `../components/jsonDraft.ts` turns into sentences, and giving one
 * question two answers is exactly what the provider's decision to
 * validate through the schema exists to avoid.
 *
 * What it CAN refuse is a path that names no position at all, and
 * that reading is structural rather than declared: it comes from the
 * value's own shape.
 *
 * ## Absent is `undefined`, and `null` is a value
 *
 * `../data/types.ts`'s rule is that an absent member is spelled
 * `null` and never `undefined`. This module is the one place that
 * rule inverts, and for the reason the rule itself gives: two
 * spellings of one state is the fault, and here `null` is already
 * taken.
 *
 * The plan's decision is that an empty leaf box writes `null`, so a
 * cleared `notes` is a member holding `null` — a real value, and
 * one that has to round-trip. If {@link readValueAt} answered `null`
 * for a path naming nothing, a cleared member and a member that was
 * never there would be one answer, and `./NodeForm.tsx` could not
 * tell a form it may draw from one it may not.
 *
 * `undefined` can carry that second meaning because no JSON value is
 * ever `undefined`: whatever arrives from a payload, a fixture or a
 * draft, the marker cannot collide with the data.
 *
 * ## The last segment names a member; every earlier one names a
 * container
 *
 * {@link withValueAt} treats the final step differently from the
 * walk down to it, which reads like an inconsistency and is the
 * module's central rule.
 *
 * Descending is a question about containers, so every segment before
 * the last has to resolve to one that is already there, of the kind
 * the segment names. There is no def in hand to say whether a
 * missing step should be born an object or a list, and inventing one
 * is how a typo grows a structure nobody declared.
 *
 * The last segment is a question about a member, and the two
 * containers answer it differently because they ARE different. An
 * object is a NAMED set: writing `notes` into a row that omits it is
 * what a form does when a nullable member arrives absent, and
 * refusing it would drop an operator's typing on the floor with
 * nothing on screen to say so. A list is POSITIONAL: index 7 of a
 * two-item list is not a position that exists, and filling the gap
 * would mean inventing five items. So a key may be created and an
 * index may not.
 *
 * ## A refused write answers the value it was handed, by identity
 *
 * Not a throw, because a refused write is an ordinary state rather
 * than a bug. `./nodePath.ts` records that an index segment is not
 * stable across a reorder, so a selection held in the shell can name
 * a position that has just stopped existing — and a delete or a
 * reorder landing while a box is focused is exactly when it happens.
 * Throwing there puts a stack trace in front of the one person who
 * cannot do anything about it.
 *
 * Identity rather than a fresh equal value, so a caller can SEE the
 * refusal without being handed a second reading of it: `next ===
 * value` is the whole check, and it is also what keeps a refused
 * write from re-rendering a form that did not change.
 *
 * That makes refused imply identical. The converse very nearly
 * holds, and the one exception is worth naming rather than
 * discovering: a write at {@link ROOT_PATH} of the value onto itself
 * is ACCEPTED and answers the same object, because the replacement
 * is what a root write returns. Every other accepted write rebuilds
 * at least one container and so answers something new.
 *
 * ## What "immutable" means here, exactly
 *
 * Every container the write passes THROUGH is rebuilt: the object or
 * list at each step is a new one carrying the step below it. So no
 * write assigns into anything the caller handed over, and the value
 * a caller kept is the value it still has.
 *
 * What is NOT copied is everything off the path. An untouched
 * sibling subtree is shared by reference, deliberately: a deep copy
 * per keystroke would cost the whole payload on every character, and
 * it would break the referential equality React leans on to leave an
 * unrelated subtree alone. That sharing is only safe because every
 * write in this app comes through here and every one of them
 * rebuilds rather than assigns — so it is a property this module
 * is responsible for, and `./values.test.ts` pins it in both
 * directions rather than leaving it to be assumed.
 *
 * ## `to` is where the item LANDS, not a gap to drop into
 *
 * {@link withListReordered} takes two positions in the list as it
 * stands, and the item that was at `from` is at `to` in what comes
 * back. That is the reading a move-up control needs (`from - 1`) and
 * the one a move-down control needs (`from + 1`), which is why it is
 * the one this module offers: the plan's decision is that the
 * pointer path and the keyboard path call the SAME function, and a
 * convention only one of them can express would defeat that on the
 * first call.
 *
 * `@ar/ui`'s `Sortable` does NOT use this convention, and the
 * difference is a silent off-by-one rather than an error. It works
 * in insertion GAPS — its own move reads `from < to ? to - 1 :
 * to` — and it reports a drop by handing back the whole next
 * order rather than a pair of indices. So `./NodeForm.tsx` has to
 * derive a destination from what the drop reports rather than
 * forwarding a `to` straight through, and that translation is the
 * one place the two paths could still drift.
 *
 * ## Prototype members, on both sides
 *
 * A read and a descent both ask `Object.hasOwn`, the reading
 * `./tree.ts` takes of the same question: a member reached through
 * the prototype answers absent rather than handing `constructor` to
 * a walk expecting data.
 *
 * A write needs nothing extra, which is the part worth writing down
 * because the opposite is the natural assumption. A COMPUTED key in
 * an object literal always defines an own property — only the
 * literal `__proto__:` syntax sets a prototype — so the spread
 * `{ ...target, [key]: replacement }` cannot move one however
 * key is spelled. Measured, along with `JSON.parse` answering an own
 * property for the same key, which is how such a key gets here.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail, so every claim
 * above was measured by breaking it. TWELVE legs, each reddening
 * `bun x vitest run src/dynamic-form/values.test.ts` and each
 * restoring this file byte-identical; the counts are of NAMED
 * failing cases out of 28. None of them failed at COLLECTION, which
 * would have credited a case that never ran, and the union of the
 * twelve covers all 28 — so no case here is decorative.
 *
 * Immutability, the claim with the most ways to be wrong:
 *
 * - `Object.assign(target, ...)` in place of the last object step's
 *   spread reds 14: the two untouched-value readings and the
 *   rebuilt-spine one, plus every reorder case, a reorder writing
 *   its list back through that same step.
 * - Splicing the list in place in {@link movedWithin} reds 4.
 * - The OPPOSITE fault, {@link withValueAt} deep-copying what it
 *   answers, reds 4 and names the sharing case and the root write.
 *   Without it nothing would measure the sharing off the path,
 *   which is as much a claim as the rebuilding is.
 *
 * The refusal channel, where the count says WHICH case defends what:
 *
 * - Answering a fresh clone rather than the value itself from a
 *   refused write reds 6, which is every write-refusal case.
 * - Dropping {@link isListIndex}'s bounds test reds 4; dropping its
 *   whole-number test reds 2. The second is why the fractional index
 *   has a case of its own — `1.5` passes both bounds of a two-item
 *   list, where `NaN` fails every comparison and needs no test to
 *   catch it.
 * - Letting the final INDEX segment create a position — the
 *   asymmetry the header argues for — reds 2.
 * - Dropping {@link writeMember}'s `Object.hasOwn` descent guard
 *   reds exactly ONE, the inherited-member case. The ABSENT-member
 *   case does NOT defend it while reading as though it does: the
 *   step below refuses `undefined` on its own. So the prototype
 *   case is the only thing standing between that guard and a silent
 *   deletion, which is worth knowing before anyone simplifies it.
 *
 * The two conventions, each of which fails silently:
 *
 * - Reading the gap convention, `to - 1` when `from < to`, reds 4.
 * - Answering `null` for an absent read reds 4, and collapsing a
 *   stored `null` to `undefined` — the same conflation from the
 *   other side — reds 3. Neither direction reports the other.
 * - {@link readItem} answering absent for every position reds 10,
 *   which is what makes the positive read case a measurement rather
 *   than a smoke test.
 *
 * The segment union's own two directions are guarded in
 * `./nodePath.test.ts` and are not restated here, which would give
 * one fact two authorities. What this module adds is its own
 * default branches: a third kind on `PathSegment` answers EXIT 2
 * with TS2345 naming it at BOTH {@link readSegment} and
 * {@link writeAt} (measured, alongside the two errors that leg
 * raises in `./nodePath.ts` and `./nodePath.test.ts`).
 */

import type { NodePath, PathSegment } from './nodePath';

/** How a write reports that it landed, and what it built. */
interface WriteAccepted {
  /** The discriminant, fixed so a narrowing reaches {@link value}. */
  readonly ok: true;
  /** The rebuilt container, or the replacement at the last step. */
  readonly value: unknown;
}

/** How a write reports that the path named no position to fill. */
interface WriteRefused {
  /** The discriminant; there is nothing else to carry. */
  readonly ok: false;
}

/**
 * What one step of a write answers.
 *
 * A reading union rather than a sentinel value, for the reason the
 * value type forces: a write carries `unknown`, which absorbs every
 * marker a sentinel could be, so no in-band spelling could be told
 * apart from data. `./readers.ts` reaches the same shape from the
 * same constraint.
 */
type WriteReading = WriteAccepted | WriteRefused;

/**
 * The refusal every step answers with.
 *
 * One shared value rather than a literal per site: it carries
 * nothing, never escapes this module, and is turned into the
 * caller's own value at the boundary.
 */
const REFUSED: WriteRefused = { ok: false };

/**
 * The branch a total switch over the segment kinds has nothing left
 * for.
 *
 * The parameter is the KIND rather than the segment, matching
 * `./nodePath.ts` and `./fieldDef.ts`: it is the shorter answer and
 * it names the added literal rather than the interface carrying it.
 *
 * It still throws, because the compiler's guarantee stops at this
 * app's boundary: a path rebuilt from a cast or a parse can carry a
 * kind no case claims, and guessing which container it meant would
 * write into a position nobody asked for.
 *
 * @param kind - The kind no case above claimed.
 * @returns Never; the call does not return.
 * @throws Always, naming the kind that reached it.
 */
function unreachableSegment(kind: never): never {
  throw new Error(`Unknown path segment kind: ${String(kind)}`);
}

/**
 * Whether a value behaves like a plain record for the walks below.
 *
 * Arrays are objects to `typeof` and so is `null`; neither is what
 * "an object with named members" means here. Same reading
 * `./tree.ts` and `../components/jsonDraft.ts` each take of the same
 * question, kept local for the same reason they do: a shared helper
 * would be one import three modules take on to save three lines.
 *
 * @param value - Anything at all.
 * @returns Whether it is a non-null, non-array object.
 */
function isPlainObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}

/**
 * A value read as a list, or `null` if it is not one.
 *
 * @param value - Anything at all.
 * @returns Its items, or `null` if it is not an array.
 */
function asList(value: unknown): readonly unknown[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value;
}

/**
 * Whether an index names a position a list actually holds.
 *
 * `Number.isInteger` as well as the bounds, because `1.5` and `NaN`
 * are both outside a list of two in a way `< length` alone does not
 * report: `NaN` fails every comparison and so is caught, but `1.5`
 * passes both and would read the item at `1` while claiming to be a
 * position of its own.
 *
 * @param items - The list to measure against.
 * @param index - The position to test.
 * @returns Whether the list holds that position.
 */
function isListIndex(
  items: readonly unknown[],
  index: number,
): boolean {
  return Number.isInteger(index)
    && index >= 0
    && index < items.length;
}

/**
 * What sits at one named member, or `undefined`.
 *
 * @param target - Whatever sits at the position above.
 * @param key - The member to read.
 * @returns Its value, or `undefined` if there is no such own member.
 */
function readMember(target: unknown, key: string): unknown {
  if (!isPlainObject(target) || !Object.hasOwn(target, key)) {
    return undefined;
  }

  return target[key];
}

/**
 * What sits at one list position, or `undefined`.
 *
 * @param target - Whatever sits at the position above.
 * @param index - The position to read.
 * @returns Its value, or `undefined` if the list has no such
 * position.
 */
function readItem(target: unknown, index: number): unknown {
  const items = asList(target);

  if (items === null || !isListIndex(items, index)) {
    return undefined;
  }

  return items[index];
}

/**
 * One step of a read, whichever kind of step it is.
 *
 * @param target - Whatever sits at the position above.
 * @param segment - The step to take.
 * @returns What sits below, or `undefined`.
 * @throws If the segment carries a kind `./nodePath.ts` does not
 * declare.
 */
function readSegment(target: unknown, segment: PathSegment): unknown {
  // Switched on the DESTRUCTURED discriminant, as every switch in
  // this directory is: narrowing `segment` itself to `never` takes
  // its members with it, and the default branch then reports the
  // wrong thing (TS2339) instead of naming the added kind.
  const { kind } = segment;

  switch (kind) {
    case 'key':
      return readMember(target, segment.key);
    case 'index':
      return readItem(target, segment.index);
    default:
      return unreachableSegment(kind);
  }
}

/**
 * A list with one position replaced, as a new list.
 *
 * `map` rather than a copy and an assignment, and rather than
 * `Array.prototype.with`, which is ES2023 and is TS2550 under this
 * package's ES2022 `lib` while running fine — a gap only
 * `check-types` reports.
 *
 * @param items - The list to rebuild.
 * @param index - The position to replace, already known to exist.
 * @param replacement - What to put there.
 * @returns A new list; `items` is untouched.
 */
function replacedAt(
  items: readonly unknown[],
  index: number,
  replacement: unknown,
): readonly unknown[] {
  return items.map((each, at) => (at === index
    ? replacement
    : each));
}

/**
 * A write into one named member, or a refusal.
 *
 * The last-segment rule the header states, in the one place it
 * matters: with nothing left below, the member is written whether or
 * not it was there. Below that, it has to be there already.
 *
 * @param target - Whatever sits at the position above.
 * @param key - The member to write or descend through.
 * @param rest - The path still to walk.
 * @param replacement - What to put at the end of it.
 * @returns The rebuilt object, or a refusal.
 * @throws If any remaining segment carries a kind `./nodePath.ts`
 * does not declare.
 */
function writeMember(
  target: unknown,
  key: string,
  rest: NodePath,
  replacement: unknown,
): WriteReading {
  if (!isPlainObject(target)) {
    return REFUSED;
  }

  // An object is a NAMED set, so the last step may create a member.
  // The computed key defines an own property whatever it spells;
  // only the literal `__proto__:` syntax would move a prototype.
  if (rest.length === 0) {
    return { ok: true, value: { ...target, [key]: replacement } };
  }

  if (!Object.hasOwn(target, key)) {
    return REFUSED;
  }

  const below = writeAt(target[key], rest, replacement);

  if (!below.ok) {
    return REFUSED;
  }

  return { ok: true, value: { ...target, [key]: below.value } };
}

/**
 * A write into one list position, or a refusal.
 *
 * The other half of the last-segment rule: a list is POSITIONAL, so
 * the bounds test guards the last step as well as every earlier one
 * and an index the list does not hold is refused at either.
 *
 * @param target - Whatever sits at the position above.
 * @param index - The position to write or descend through.
 * @param rest - The path still to walk.
 * @param replacement - What to put at the end of it.
 * @returns The rebuilt list, or a refusal.
 * @throws If any remaining segment carries a kind `./nodePath.ts`
 * does not declare.
 */
function writeItem(
  target: unknown,
  index: number,
  rest: NodePath,
  replacement: unknown,
): WriteReading {
  const items = asList(target);

  if (items === null || !isListIndex(items, index)) {
    return REFUSED;
  }

  if (rest.length === 0) {
    return { ok: true, value: replacedAt(items, index, replacement) };
  }

  const below = writeAt(items[index], rest, replacement);

  if (!below.ok) {
    return REFUSED;
  }

  return { ok: true, value: replacedAt(items, index, below.value) };
}

/**
 * One step of a write, whichever kind of step it is.
 *
 * The empty path is the base case and the only place a replacement
 * is answered unchanged: it is what a write AT a position means, and
 * it is why a root write answers the replacement itself.
 *
 * @param target - Whatever sits at the position above.
 * @param path - The path still to walk.
 * @param replacement - What to put at the end of it.
 * @returns The rebuilt container, or a refusal.
 * @throws If any segment carries a kind `./nodePath.ts` does not
 * declare.
 */
function writeAt(
  target: unknown,
  path: NodePath,
  replacement: unknown,
): WriteReading {
  const segment = path[0];

  if (segment === undefined) {
    return { ok: true, value: replacement };
  }

  const rest = path.slice(1);
  // Destructured for the reason `readSegment` gives above.
  const { kind } = segment;

  switch (kind) {
    case 'key':
      return writeMember(target, segment.key, rest, replacement);
    case 'index':
      return writeItem(target, segment.index, rest, replacement);
    default:
      return unreachableSegment(kind);
  }
}

/**
 * A list with one item moved to another position, as a new list.
 *
 * Spelled as a removal and a re-insertion rather than as a splice
 * over a copy, so the destination convention the header argues for
 * is visible in the code: what comes back has `items[from]` sitting
 * at `to`, with no gap arithmetic anywhere.
 *
 * @param items - The list to rebuild.
 * @param from - Where the item is now, already known to exist.
 * @param to - Where it should land, already known to exist.
 * @returns A new list of the same length; `items` is untouched.
 */
function movedWithin(
  items: readonly unknown[],
  from: number,
  to: number,
): readonly unknown[] {
  const rest = [...items.slice(0, from), ...items.slice(from + 1)];

  return [...rest.slice(0, to), items[from], ...rest.slice(to)];
}

/**
 * What sits at a path, or `undefined` if nothing does.
 *
 * `undefined` and not `null`, which is a value a member can hold
 * here — see the header for why this module inverts the rule
 * `../data/types.ts` states rather than ignoring it.
 *
 * @param value - The whole structure.
 * @param path - The position to read.
 * @returns What sits there, or `undefined` if the path names no
 * position the value holds.
 * @throws If any segment carries a kind `./nodePath.ts` does not
 * declare.
 */
export function readValueAt(value: unknown, path: NodePath): unknown {
  return path.reduce<unknown>(readSegment, value);
}

/**
 * The value with one position replaced.
 *
 * Every container along the path is rebuilt and nothing the caller
 * handed over is written to. A path naming no position answers
 * `value` itself, by identity — see the header for why that is
 * a state rather than a fault, and for the one accepted write that
 * answers identity too.
 *
 * @param value - The whole structure.
 * @param path - The position to replace.
 * @param replacement - What to put there.
 * @returns A new value, or `value` by identity if the write was
 * refused.
 * @throws If any segment carries a kind `./nodePath.ts` does not
 * declare.
 */
export function withValueAt(
  value: unknown,
  path: NodePath,
  replacement: unknown,
): unknown {
  const written = writeAt(value, path, replacement);

  if (!written.ok) {
    return value;
  }

  return written.value;
}

/**
 * The value with one item of one list moved to another position.
 *
 * `path` names the LIST; `from` and `to` are positions inside it, as
 * it stands before the move. `to` is where the item LANDS rather
 * than a gap to drop into, which is not the convention `@ar/ui`'s
 * `Sortable` reports a drop in — the header says what that costs
 * the caller.
 *
 * Refused, by identity, when the path holds no list or when either
 * index is not a position that list has. A move to where the item
 * already sits is ACCEPTED rather than refused: it rebuilds, so a
 * refusal stays the one reason this function answers identity.
 *
 * @param value - The whole structure.
 * @param path - The position of the list to reorder.
 * @param from - Where the item is now.
 * @param to - Where it should land.
 * @returns A new value, or `value` by identity if the move was
 * refused.
 * @throws If any segment carries a kind `./nodePath.ts` does not
 * declare.
 */
export function withListReordered(
  value: unknown,
  path: NodePath,
  from: number,
  to: number,
): unknown {
  const items = asList(readValueAt(value, path));

  if (items === null) {
    return value;
  }

  if (!isListIndex(items, from) || !isListIndex(items, to)) {
    return value;
  }

  return withValueAt(value, path, movedWithin(items, from, to));
}
