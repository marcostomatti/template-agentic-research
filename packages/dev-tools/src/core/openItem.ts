/**
 * @packageDocumentation
 * The one decision behind the `open-item` topic: which
 * {@link MenuItem}, if any, a published id pair names.
 *
 * `.rafa/specs/q20b-3-error-boundary-provider.md`'s decision 7 is the
 * authority. The app opens a widget item by publishing on the bus
 * rather than through the mount's return value — `mountDevTools`
 * keeps answering a plain disposer — so what arrives at the shell is
 * two ids and nothing else, and turning them into something openable
 * is this module's job. {@link resolveOpenItem} answers the item or
 * `null`, and `./Shell.tsx` is where the answer is acted on: on
 * `null` it opens nothing and announces "Nothing to open" in its
 * `role="status"` region.
 *
 * ## Pure, and that is what puts the decision here
 *
 * No state, no storage, no request, no React, no DOM, no node
 * builtin. It reads its three arguments and answers; the same
 * arguments answer the same thing. Nothing here is mutated either —
 * neither the features array nor the {@link MenuItem} that comes back,
 * which is the feature's own value handed through untouched.
 *
 * The one impure thing it does is CALL the two feature callbacks,
 * {@link DevToolsFeature.isEnabled} and {@link DevToolsFeature.items},
 * exactly as `./menuModel.ts` does — that is how a feature reaches the
 * widget, and there is no other way to ask it what it holds.
 *
 * Two-runner discipline is the rest of the reason: the decision lives
 * in a `.ts` the jsdom vitest project collects, so every refusal below
 * is pinned by a plain call. The shell's half — subscribing,
 * unsubscribing, announcing — stays in the `.tsx` and is proved by the
 * forced Playwright spec.
 *
 * ## The payload arrives as `unknown`, on purpose
 *
 * `./types.ts` types the `open-item` topic:
 * {@link DevToolsOpenItemPayload} is what a publish must carry, and a
 * publish of anything else does not compile. That is a claim about the
 * CALLER, not a guarantee about the value. The publisher is the host
 * app, reached across a package boundary, possibly built by a compiler
 * that never saw this contract and possibly not by a compiler at all —
 * a line typed into a console is a legal publisher. So this module
 * takes `unknown` and checks, and the declared type is what makes the
 * check's success meaningful rather than what replaces it.
 *
 * ## The four `null` answers, and why they are one answer
 *
 * An unknown feature id, an unknown item id, a feature whose
 * `isEnabled` answers `false`, and a payload of the wrong shape all
 * answer `null` — not four outcomes, not a thrown error, not a reason
 * string. The shell has one thing to do with any of them: open
 * nothing and say so. A reason code would be a member nothing reads,
 * and a throw would put a publisher's typo on the operator's screen as
 * a crash inside the tool meant to report crashes.
 *
 * The four are indistinguishable to a caller BY DESIGN, and the
 * colocated cases pin each of them separately so that the collapse is
 * a decision rather than a coincidence of control flow.
 *
 * ## A disabled feature is not asked for items
 *
 * Same reading as `./menuModel.ts`: a feature that omits `isEnabled`
 * is always enabled, and one that answers `false` has `items` left
 * uncalled. A feature may therefore assume it is only ever asked for
 * rows it is allowed to draw, whichever of the two callers asks — a
 * feature whose `items` throws while disabled must behave the same
 * way through the menu and through the bus, or the widget would have
 * two contracts.
 *
 * ## A throwing feature is NOT caught here
 *
 * Both callbacks are called bare, exactly as in `./menuModel.ts`, and
 * for the same reason: the operator of a dev tool is the author of the
 * feature, and a stack at the throw site is worth more to them than a
 * `null` that reads as "no such item". Catching here would make a
 * broken feature indistinguishable from a feature that answered
 * `false`, which is the one distinction the four collapsed refusals
 * above must not swallow.
 *
 * This is not in tension with decision 7's "throws nothing": that
 * sentence is about the `null` PATH — resolving to nothing is not an
 * error — and a feature callback that throws is not on it.
 *
 * ## Surplus members are read past, not refused
 *
 * A payload carrying the two ids and something else resolves
 * normally. The check asks whether the two ids are there, never
 * whether anything else is, so a publisher that grows its payload
 * later still opens today's item. Refusing surplus would make the
 * widget the thing that breaks when the app adds a field it does not
 * read.
 *
 * ## Mutation note — what the colocated cases actually catch
 *
 * A green suite is not evidence a case can fail. Each leg below was
 * measured by breaking this file, reds `bun x vitest run
 * src/core/openItem.test.ts` from `packages/dev-tools` against the 9
 * cases the file holds, and restores this file byte-identical (`diff`
 * confirmed, every leg):
 *
 * - Making {@link isOpenItemPayload} answer `true` for everything
 *   answers `Tests  1 failed | 8 passed (9)`, the one being `answers
 *   null for a payload of the wrong shape`. It reds as `TypeError:
 *   Cannot read properties of undefined (reading 'featureId')` rather
 *   than as a wrong answer, and that is the shape the guard protects
 *   against: without it the shell's subscriber would not get a `null`
 *   to announce, it would get the publisher's mistake thrown through
 *   its own callback.
 * - Weakening that guard to the object check ALONE — dropping both
 *   `typeof … === 'string'` legs — answers `Tests  1 failed | 8 passed
 *   (9)`, the same case, but reds a DIFFERENT line of it:
 *   `AssertionError: expected [ { version: …(4) }, …(1) ] to deeply
 *   equal []`, which is the `itemCalls` read. Every ANSWER stays
 *   `null` under this mutation — a numeric `featureId` matches no
 *   feature and an absent `itemId` matches no item — so the
 *   twelve-`null` assertion passes and only "nothing was searched"
 *   reds. Two readings follow. The legs are pinned by that one line,
 *   so a plan that deleted it would leave them unguarded while the
 *   answers stayed right; and they are kept for a reason no case can
 *   state, since the predicate claims `value is
 *   DevToolsOpenItemPayload` and with them gone the claim is false —
 *   `payload.featureId` would be typed `string` while holding a
 *   number.
 * - Ignoring `isEnabled`, so a disabled feature is searched, answers
 *   `Tests  3 failed | 6 passed (9)`: `answers null for a feature
 *   whose isEnabled answers false, and never asks it for items`
 *   (`expected { id: 'drawer', …(3) } to be null`), `hands the host it
 *   was given to isEnabled and to items` (`expected [] to deeply equal
 *   [ … ]` — the gate is what CALLS the callback at all), and `lets a
 *   throw from isEnabled and from items escape` (`expected [Function]
 *   to throw an error`). The third is the useful one: the loud-throw
 *   promise is only meaningful where the callback is reached.
 * - Dropping the final `?? null`, so an unknown item id answers
 *   `undefined`, answers `Tests  1 failed | 8 passed (9)`: `answers
 *   null for an item id the feature does not hold`, as `expected
 *   undefined to be null`. Worth naming because `undefined` is falsy
 *   and the shell's own branch would still open nothing — the declared
 *   type says `MenuItem | null`, and only a case reading `toBeNull`
 *   keeps the value honest.
 * - Matching the item on `payload.featureId` instead of
 *   `payload.itemId` answers `Tests  8 failed | 1 passed (9)`. The one
 *   survivor is `lets a throw from isEnabled and from items escape`,
 *   whose two throws happen before any item is compared. The width is
 *   the point rather than a smell: every other case, refusals
 *   included, carries a positive control resolving the real pair, so
 *   an id read the wrong way round cannot hide behind a `null` that
 *   was expected anyway.
 * - Answering `features[0]` rather than the id match answers `Tests  8
 *   failed | 1 passed (9)`. The survivor is `hands the host it was
 *   given to isEnabled and to items`, the one case whose roster holds
 *   a single feature — position and id agree there, which is why every
 *   other accepting case uses a roster of three with the target in the
 *   MIDDLE and a neighbour holding an item of the same id.
 *
 * As with `./menuModel.ts`, the false negative runs the opposite way
 * from `./types.ts`'s: every mutation above is a behaviour change over
 * types that still line up. `bun x tsc --noEmit` exits `0` with no
 * output under the dropped gate, both id swaps and the weakened guard
 * (all four measured), so `bun run check-types` alone would never say
 * this resolver had changed its mind.
 */

import type {
  DevToolsFeature,
  DevToolsHost,
  DevToolsOpenItemPayload,
  MenuItem,
} from './types';

/**
 * Whether a published value is the id pair the topic declares.
 *
 * Module-private: the shell resolves rather than validates, and a
 * second exported name would invite a caller to check and then act on
 * the unchecked value. {@link resolveOpenItem}'s wrong-shape case is
 * what pins it.
 *
 * Both `typeof` legs are what make the predicate honest rather than
 * convenient. Measured, they change no ANSWER — a malformed record
 * answers `null` down the ordinary path too — and change only whether
 * a feature is asked for its items at all; this module's mutation
 * note records the reading and why they stay regardless.
 *
 * @param value - Whatever was published on the topic.
 * @returns `true` when both ids are present as strings.
 */
function isOpenItemPayload(
  value: unknown,
): value is DevToolsOpenItemPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Read as a partial rather than asked member by member: the cast
  // widens nothing, since every leg below still tests the value it
  // got, and surplus members are read past by construction.
  const { featureId, itemId } = value as Partial<DevToolsOpenItemPayload>;

  return typeof featureId === 'string' && typeof itemId === 'string';
}

/**
 * Turn a published id pair into the item it names, or nothing.
 *
 * Pure. Calls {@link DevToolsFeature.isEnabled} at most once and
 * {@link DevToolsFeature.items} at most once, on the one feature the
 * pair names, and lets a throw from either escape — see this module's
 * documentation for why that is louder on purpose.
 *
 * @param features - The configured features, as the shell holds them.
 * @param host - The one surface a feature may reach; handed to both
 * callbacks, exactly as the menu hands it.
 * @param payload - What was published on `open-item`. Taken as
 * `unknown` because the publisher is the app and may not have been
 * compiled against the contract at all.
 * @returns The feature's own {@link MenuItem}, untouched, or `null`
 * for an unknown feature id, an unknown item id, a feature whose
 * `isEnabled` answers `false`, and a payload of the wrong shape.
 */
export function resolveOpenItem(
  features: readonly DevToolsFeature[],
  host: DevToolsHost,
  payload: unknown,
): MenuItem | null {
  if (!isOpenItemPayload(payload)) {
    return null;
  }

  const feature = features.find(
    (candidate) => candidate.id === payload.featureId,
  );

  if (feature === undefined) {
    return null;
  }

  // A feature that omits `isEnabled` is always enabled, and a disabled
  // one is never asked for items — `./menuModel.ts` reads the pair the
  // same way, so a feature meets one contract and not two.
  if (!(feature.isEnabled?.(host) ?? true)) {
    return null;
  }

  // `?? null`, so the answer is the declared `MenuItem | null` rather
  // than a third `undefined` a caller would have to guard separately.
  return feature.items(host).find((item) => item.id === payload.itemId)
    ?? null;
}
