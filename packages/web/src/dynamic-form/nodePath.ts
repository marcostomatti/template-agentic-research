/**
 * @packageDocumentation
 * Where a node SITS in the data structure — the one value the tree,
 * the breadcrumb and the mounted form all pass around to say which
 * node they mean.
 *
 * `./fieldDef.ts` says what a field IS; this says where one is. The
 * two are deliberately separate readings: a path is walkable with no
 * def in hand and a def is renderable with no path, which is what
 * lets `./tree.ts` pair them without either one knowing the other's
 * shape.
 *
 * Nothing here reads a VALUE. A path names a position whether or not
 * anything sits at it, which is what makes it usable as a request —
 * the two-column shell holds one selected path in state, and
 * `./values.ts` is where asking a path for a value can come back
 * empty.
 *
 * It is a `.ts` for the reason the whole core of `src/dynamic-form/`
 * is: the unit runner collects `.ts` files under `src` in a node
 * environment, so a decision living in a `.tsx` is reachable by no
 * test in this package at all.
 *
 * ## Two segment kinds, because there are two containers
 *
 * `./fieldDef.ts` draws the same line one level up: a `list` holds
 * one repeated shape and an `object` holds a named set, and those
 * are the only two things a path can descend THROUGH. So a segment
 * is a keyed member or a list index, and the union is closed at two
 * for the same reason that one is closed at six.
 *
 * ## Why a segment carries a `kind` rather than being `string |
 * number`
 *
 * The shorter spelling loses the distinction the moment anything
 * stringifies it, and everything does. A JavaScript object key IS a
 * string, so `terms['0']` — a member of an object whose key happens
 * to be a digit — and `terms[0]` — the first item of a list —
 * become the same three characters as soon as either is written
 * into a React key, a URL fragment or a log line. They are different
 * positions in different containers, and the second one moves when
 * the list is reordered while the first one never does.
 *
 * A discriminant is what survives that round trip. It is also what
 * gives {@link pathKey} an injective spelling and therefore lets
 * {@link samePath} be one reading rather than two, and it is what
 * `./tree.ts` narrows on to decide whether to index an array or read
 * a property. `./nodePath.test.ts` measures the collision rather
 * than leaving this paragraph to be believed.
 *
 * ## An array, not a class and not a string
 *
 * A path is a plain `readonly` array of segments. A string would
 * have to be PARSED back, and a parse is ambiguous the moment a
 * field key carries the separator — which is the same hazard
 * {@link pathKey} escapes its way out of, except that a key is
 * write-only and a path is not. A class would buy an identity that
 * every consumer would then be tempted to compare on, and identity
 * is exactly the comparison {@link samePath} exists to replace.
 *
 * ## Every function answers a NEW value
 *
 * {@link childPath} and {@link parentPath} build a new array and
 * leave the one they were handed untouched, so a path held in
 * `useState` cannot be lengthened by a walk that happens to be
 * holding it. {@link ROOT_PATH} is frozen on top of that, because a
 * module-level constant is the one value a stray mutation would
 * corrupt for every consumer at once rather than for one caller.
 *
 * That is also why {@link samePath} exists at all: `parentPath` of a
 * depth-one path is a path EQUAL to {@link ROOT_PATH} and never the
 * same object, so `===` would answer `false` for two readings of the
 * same position.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail, so each claim above
 * was measured by breaking it. Every leg reddens
 * `bun x vitest run src/dynamic-form/nodePath.test.ts` and restores
 * this file byte-identical:
 *
 * - Dropping BOTH kind tags from {@link segmentKey} reds the
 *   kind-collision case and the shared-payload case. Dropping ONE is
 *   green — the surviving tag still separates the two — which is
 *   why the leg is the pair rather than either half.
 * - Dropping {@link segmentKey}'s escape reds the smuggled-key case
 *   ALONE. That case earns its keep only because its input is
 *   derived from this module's own spelling; the obvious `'a/b'`
 *   input is green under the same mutation, the NEXT segment's tag
 *   being what keeps it apart.
 * - {@link parentPath} climbing two steps reds three climb cases;
 *   answering {@link ROOT_PATH} instead of `null` at the root reds
 *   the no-parent case alone.
 * - {@link samePath} comparing by identity reds six cases.
 * - {@link childPath} pushing in place reds the whole file — with
 *   {@link ROOT_PATH} still frozen it does not even collect, the
 *   freeze throwing where the first walk starts. That is the freeze
 *   working, so the leg that measures the immutability CASES has to
 *   unfreeze as well, and then the untouched-path cases name it.
 *
 * The union's two directions need `check-types` rather than the
 * suite, and neither artifact reports the other's direction:
 *
 * - A third kind ADDED to {@link PathSegment} answers EXIT 2 —
 *   tsc's code for a type error, never 1 — with TS2345 at
 *   {@link segmentKey}'s default branch, naming the added kind, and
 *   TS2741 in `./nodePath.test.ts`, whose segment table is keyed by
 *   {@link SegmentKind} and so is short a key.
 * - A kind REMOVED reds at TS2322 on that file's typed kind roster
 *   and TS2678 at the switch case that outlived it.
 */

/** A member of an object, addressed by the key it is stored under. */
export interface KeySegment {
  /** The discriminant, fixed so a narrowing reaches {@link key}. */
  readonly kind: 'key';
  /**
   * The property name, as `FieldDef.key` spells it.
   *
   * Free to be digits, or to carry the separator {@link pathKey}
   * joins with. Neither is something a def list here would do, and
   * both are things this module has to survive rather than assume
   * away.
   */
  readonly key: string;
}

/** One item of a list, addressed by where it currently sits. */
export interface IndexSegment {
  /** The discriminant, fixed so a narrowing reaches {@link index}. */
  readonly kind: 'index';
  /**
   * The item's position, zero-based.
   *
   * Positional and therefore NOT stable across a reorder: moving an
   * item changes which item this segment names. That is the honest
   * reading of a list whose items carry no id of their own, and it
   * is why `./NodeForm.tsx` re-selects by path after a move rather
   * than assuming the drilled-in node stayed put.
   *
   * Unbounded here on purpose. Whether an index is IN a list is a
   * question about a value, which `./values.ts` answers and this
   * module cannot: a path names a position whether or not anything
   * sits at it.
   */
  readonly index: number;
}

/** One step down: into an object's member, or into a list's item. */
export type PathSegment = KeySegment | IndexSegment;

/**
 * Which of the two a segment is.
 *
 * Derived from the union rather than declared beside it, so the two
 * cannot drift into disagreeing about how many kinds there are.
 */
export type SegmentKind = PathSegment['kind'];

/**
 * Where a node sits, as the steps taken to reach it from the root.
 *
 * `readonly` for the stance `./fieldDef.ts` states: this is a value
 * this app owns and walks, never a prop handed to an `@ar/ui`
 * component whose own signature declares an array mutable.
 */
export type NodePath = readonly PathSegment[];

/**
 * The whole structure, before any step has been taken.
 *
 * Frozen because it is shared: every consumer that starts a walk
 * starts at this same array, so one `push` would move the root for
 * all of them. The `readonly` type already refuses that at compile
 * time; the freeze is what covers a value arriving from a cast or a
 * parse, which is the only way it could happen at all.
 */
export const ROOT_PATH: NodePath = Object.freeze([]);

/** The separator {@link pathKey} joins segment spellings with. */
const KEY_SEPARATOR = '/';

/** What {@link pathKey} spells the root as, so it is never empty. */
const ROOT_KEY = '$';

/** The tag a keyed member's spelling opens with. */
const KEY_TAG = 'k';

/** The tag a list index's spelling opens with. */
const INDEX_TAG = 'i';

/** What separates a segment's tag from its payload. */
const TAG_SEPARATOR = ':';

/**
 * Build a segment naming an object's member.
 *
 * A constructor rather than an object literal at each call site, so
 * `'key'` is spelled once here instead of everywhere a walk descends
 * — the discriminant is what every narrowing in this directory
 * turns on, and a typo in it is a segment the compiler accepts and
 * no branch claims.
 *
 * @param key - The property name to descend into.
 * @returns A new segment.
 */
export function keySegment(key: string): KeySegment {
  return { kind: 'key', key };
}

/**
 * Build a segment naming a list item by position.
 *
 * @param index - The zero-based position to descend into.
 * @returns A new segment.
 */
export function indexSegment(index: number): IndexSegment {
  return { kind: 'index', index };
}

/**
 * The branch a total switch over {@link SegmentKind} has nothing
 * left for.
 *
 * The parameter is the KIND rather than the segment, matching
 * `./fieldDef.ts`: both name the member nobody wrote a case for,
 * and the kind is the shorter answer. Measured under a third kind
 * — handing the kind on reports
 * `Argument of type '"wildcard"' is not assignable to parameter of
 * type 'never'`, where handing the segment on names the interface
 * instead. Both are TS2345 and both are at this call.
 *
 * It still throws, because the compiler's guarantee stops at this
 * app's boundary: a path rebuilt from a cast or a parse can carry a
 * kind no case claims, and formatting it as a key would put two
 * different nodes under one React key.
 *
 * @param kind - The kind no case above claimed.
 * @returns Never; the call does not return.
 * @throws Always, naming the kind that reached it.
 */
function unreachableSegment(kind: never): never {
  throw new Error(`Unknown path segment kind: ${String(kind)}`);
}

/**
 * One segment's spelling, tagged with its kind.
 *
 * Injective, which is the whole property {@link pathKey} and
 * {@link samePath} rest on. Two things buy it. The tag keeps a
 * digit-keyed member apart from the index that renders as the same
 * digits, and percent-escaping the key keeps {@link KEY_SEPARATOR}
 * out of a segment's body — so no field key, however spelled, can
 * make one segment read as two.
 *
 * @param segment - The segment to spell.
 * @returns Its spelling, carrying no separator.
 * @throws If the segment carries a kind outside
 * {@link SegmentKind}.
 */
function segmentKey(segment: PathSegment): string {
  // Switched on the DESTRUCTURED discriminant, as `./fieldDef.ts`
  // is: that is what leaves the default branch a value to NAME.
  // The case bodies still read `segment.key` and `segment.index`
  // with no cast — narrowing an aliased discriminant narrows the
  // object it came off too, which is not true of every union shape
  // and is measured here rather than assumed.
  const { kind } = segment;

  switch (kind) {
    case 'key':
      return [KEY_TAG, encodeURIComponent(segment.key)]
        .join(TAG_SEPARATOR);
    case 'index':
      return [INDEX_TAG, String(segment.index)].join(TAG_SEPARATOR);
    default:
      return unreachableSegment(kind);
  }
}

/**
 * The path reached by taking one more step down.
 *
 * @param path - Where the walk is now.
 * @param segment - The step to take.
 * @returns A new path, one longer; `path` is untouched.
 */
export function childPath(
  path: NodePath,
  segment: PathSegment,
): NodePath {
  return [...path, segment];
}

/**
 * The path one step back up, or `null` at the root.
 *
 * `null` rather than an empty path, and rather than the root itself,
 * because "the root has no parent" is a different answer from "the
 * parent is the root" and the breadcrumb's leftmost step is exactly
 * where the two diverge. `null` rather than `undefined` follows
 * `../data/types.ts`'s rule that an absent value is spelled once.
 *
 * @param path - Where the walk is now.
 * @returns A new path, one shorter, or `null` at
 * {@link ROOT_PATH}; `path` is untouched.
 */
export function parentPath(path: NodePath): NodePath | null {
  if (path.length === 0) {
    return null;
  }

  return path.slice(0, -1);
}

/**
 * A stable, unique React key for the node at a path.
 *
 * Stable meaning the same position spells the same key on every
 * render, and unique meaning two different positions never spell the
 * same one. The second half is the one with teeth: React silently
 * reuses a component — and its state, including whatever is half
 * typed in a box — across two elements sharing a key, so a
 * collision here shows up as a form that keeps the previous node's
 * typing, not as an error.
 *
 * The root spells {@link ROOT_KEY} rather than the empty string, so
 * every path has a key that is present as well as distinct.
 *
 * @param path - The position to spell.
 * @returns Its key.
 * @throws If any segment carries a kind outside
 * {@link SegmentKind}.
 */
export function pathKey(path: NodePath): string {
  return [ROOT_KEY, ...path.map(segmentKey)].join(KEY_SEPARATOR);
}

/**
 * Whether two paths name the same position.
 *
 * By VALUE, never by identity: `childPath` answers a new array every
 * time, so the path a component was rendered with and the path a
 * walk just rebuilt are different objects naming one node.
 *
 * Defined as {@link pathKey} equality rather than as a second walk
 * over the segments, so this module holds ONE reading of what a
 * position is and the two cannot drift. That is only sound because
 * the spelling is injective — which is a claim, and
 * `./nodePath.test.ts` measures it on the two collisions a looser
 * spelling would produce.
 *
 * @param path - One position.
 * @param other - The other.
 * @returns Whether they are the same position.
 * @throws If either carries a segment kind outside
 * {@link SegmentKind}.
 */
export function samePath(path: NodePath, other: NodePath): boolean {
  return pathKey(path) === pathKey(other);
}
