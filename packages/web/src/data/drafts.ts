/**
 * @packageDocumentation
 * The session draft store — where an edit goes in an app that has no
 * server to send it to.
 *
 * This module is the STAND-IN FOR SERVER STATE, and that is the whole
 * of what it claims. The surfaces above it carry real editors — a
 * category's terms, a source's endpoint, a persona's system text — and
 * an editor that saves nothing is worse than the placeholder it
 * replaced: it rehearses an operator in a gesture the app then throws
 * away without saying so. So a save records the edited row here, and
 * the reads in `./api.ts` compose the fixture's answer with whatever
 * this store holds for it. What that buys is a shell whose write
 * gestures behave like writes; what it costs is the paragraph below.
 *
 * It lives for the LIFE OF THE TAB and not one moment longer. Nothing
 * here touches `localStorage`, `sessionStorage`, IndexedDB or a
 * cookie, and nothing should: a reload is how a demo returns to the
 * seeded state, and a store that survived one would strand an operator
 * in front of their own edits with no way back to the fixtures short
 * of clearing site data. The Playwright specs lean on the same
 * property — a reload is their reset, and it costs them no fixture
 * bookkeeping at all.
 *
 * It is DELETED WITH THE FIXTURE MODULES. On the day the seam in
 * `./api.ts` is re-pointed at HTTP endpoints a save becomes a request
 * and a read becomes the server's answer, so this file and the fixture
 * modules beside it go in one commit rather than one of them outliving
 * the other as a cache nobody meant to write. Nothing above `./api.ts`
 * imports this module — pages reach writes through `./hooks.ts`
 * exactly as they reach reads — which is what keeps that removal a
 * deletion rather than a refactor.
 *
 * ## Where this sits in the import graph
 *
 * BELOW `./api.ts`, which is why {@link DEPLOYMENT_DRAFT_SCOPE} is
 * declared here rather than imported. `./hooks.ts` imports `./api.ts`,
 * `./api.ts` imports this module, and reaching up for `hooks.ts`'s
 * `DEPLOYMENT_SCOPE` would close that ring into a cycle. The two
 * constants deliberately spell the same segment for the same reason —
 * a domain slug is a lowercase-kebab natural key and can never carry
 * an `@` — but they are two key spaces, not one, and neither is
 * derived from the other.
 *
 * It also imports NO fixture module. It is handed rows and hands rows
 * back; it has no idea which ids exist, which is what makes
 * {@link applyDrafts}'s rule ("only ever replaces a row it was given")
 * something it can honour without a lookup table.
 *
 * ## The scope is what stops a draft leaking across domains
 *
 * {@link DraftScope} is a discriminated union over the same split
 * `./hooks.ts` draws for its cache keys, and for the same reason: a
 * domain-scoped resource filed under the deployment scope would be one
 * domain's edit shown to every other domain, and it should not
 * type-check. So {@link DomainDraftResource} and
 * {@link DeploymentDraftResource} are two unions rather than one with
 * a comment, and {@link domainDraftScope} and
 * {@link deploymentDraftScope} are the only two ways to build a scope.
 * Handing the wrong resource to either is a compile error.
 *
 * A draft is keyed by `<scope>/<resource>/<rowId>`. Every segment is
 * unambiguous because none of them can contain a `/`: a slug is one
 * lowercase path segment (`routes/paths.ts`'s `domainBase` throws on
 * anything else), {@link DEPLOYMENT_DRAFT_SCOPE} and both resource
 * unions are closed lowercase-kebab literals, and a row id is a
 * number. That is what lets {@link clearDrafts} match on a prefix
 * without `sources/` ever reaching a `source-proposals/` key.
 *
 * ## Immutability, and which array stance this module is in
 *
 * Nothing here is ever mutated in place. {@link recordDraft} stores a
 * shallow COPY of the row it is given, so a component that keeps
 * editing its own draft object after a save does not retroactively
 * change what was saved; the store itself is REPLACED on every write
 * rather than written through, so any read already in flight holds a
 * stable snapshot. Replacing a whole map per edit is O(n) in the
 * session's edits, which is a handful — and the alternative buys
 * nothing measurable while giving up the property.
 *
 * {@link applyDrafts} BUILDS the array it returns, always, even when
 * no draft applied. It therefore owns that array outright and a caller
 * may sort it, and it can never hand back the frozen fixture array it
 * was given. Rows the store has nothing for come back as the very
 * objects they went in as, so an unedited row stays identical to the
 * fixture by identity and not merely by value.
 *
 * ## What this deliberately does NOT answer
 *
 * A draft EDITS a row that already exists. There is no insert and no
 * delete: {@link applyDrafts} never grows, shrinks or reorders the
 * list it is given, and a draft naming a row the list does not carry
 * is simply not reached. Inserting would mean minting an id, and an id
 * this app invented is one the endpoint behind the seam would never
 * have issued — a fiction that reads as a saved row until the first
 * reload. A surface that needs to add a row wants a real endpoint, not
 * a bigger store.
 *
 * Single-row reads compose out of what is here: a read answering one
 * row overlays it by passing a one-element list, which keeps the rule
 * about only replacing rows it was given true of that shape too.
 *
 * ## The singleton slot, and why it is a second map
 *
 * The SETTINGS preference set is the one write in this wave whose
 * shape the key above cannot express: `Settings` mirrors no table and
 * carries no id, so there is no row to key on and no list to overlay.
 * Minting a synthetic id would put a member into the stored value that
 * every reader would then have to strip back off — a reshape at the
 * seam, which is the one thing `./api.ts` refuses to do there. So
 * `settings` stays absent from {@link DeploymentDraftResource}, and
 * {@link recordSingletonDraft}, {@link applySingletonDraft} and
 * {@link clearSingletonDraft} hold it instead: one value per
 * {@link SingletonDraftResource}, replaced whole, overlaid by handing
 * the stored value in and taking back whatever this tab has saved.
 *
 * It is the same store by every property that matters — module-scoped,
 * replaced rather than written through, emptied by
 * {@link resetDrafts}, gone on the next reload — and a second map only
 * because a value with no id has no key to share.
 */

/**
 * What {@link applyDrafts} can overlay a draft onto: anything carrying
 * the numeric id its row is keyed by.
 *
 * Structural rather than a union of the fixture types, because this
 * module is below them in the graph and imports none of them. The
 * constraint is the whole of what it needs — `types.ts` gives every
 * mirrored row a `readonly id: number` matching its table's
 * `bigserial`.
 */
export interface DraftableRow {
  /** The row's own id, as its fixture and its table both carry it. */
  readonly id: number;
}

/**
 * The resources a draft may name inside ONE domain.
 *
 * Closed so a key cannot be built from a typo — `'source'` for
 * `'sources'` would record an edit nothing ever reads back, which
 * presents as a save that silently did nothing. It is the same
 * closure, for the same reason, that `./hooks.ts` puts on the
 * resources a cache key may name.
 *
 * Every member is a list of rows a domain owns, so a draft under one
 * domain's scope is invisible under another's.
 */
export type DomainDraftResource =
  | 'documents'
  | 'export-subscriptions'
  | 'findings'
  | 'personas'
  | 'source-proposals'
  | 'sources'
  | 'terms';

/**
 * The resources a draft may name that belong to the deployment rather
 * than to any one domain.
 *
 * `connectors` is the whole set, and the asymmetry with
 * {@link DomainDraftResource} is the same one `./api.ts` documents:
 * the `connectors` table carries no `domain_id`, so a connector is a
 * fact about the installation and its edit is too. A domain switch
 * leaves a connector draft exactly where it was, which is what the
 * tools surface's cards already do with the stored rows.
 *
 * `settings` is deliberately NOT a member — see this module's header.
 */
export type DeploymentDraftResource = 'connectors';

/**
 * The resources whose draft is one VALUE rather than a row in a list.
 *
 * `settings` is the whole set, and this union exists so that stays a
 * decision rather than a string: the two unions above name lists a
 * read overlays row by row, and a preference set has no row and no
 * list. See this module's header for why it could not simply join
 * {@link DeploymentDraftResource}.
 *
 * Deployment-level by construction — there is no slug in the key at
 * all — which is the same reading `./api.ts` gives the settings
 * surface: a domain switch leaves it exactly where it was.
 */
export type SingletonDraftResource = 'settings';

/**
 * The first key segment of every draft that is not about one domain.
 *
 * The `@` is load-bearing: domain slugs are lowercase-kebab natural
 * keys, so no slug can ever equal this and the two halves of the key
 * space stay disjoint by construction rather than by both happening to
 * be short. `./hooks.ts` spells the same segment for its cache keys;
 * see this module's header for why that is a coincidence of reasoning
 * rather than a shared constant.
 */
export const DEPLOYMENT_DRAFT_SCOPE = '@deployment';

/**
 * Where a draft is filed: which resource it edits, and whose copy of
 * it.
 *
 * A discriminated union rather than a scope string plus a resource
 * string, so the two can only be paired by {@link domainDraftScope} or
 * {@link deploymentDraftScope} and a domain resource can never reach
 * the deployment key space. That pairing IS the cross-domain leak
 * guard: everything else here is a map lookup.
 */
export type DraftScope =
  | {
    /** This scope names one domain's copy of its resource. */
    readonly kind: 'domain';
    /**
     * A RESOLVED domain slug — the same value `./api.ts`'s accessors
     * take, so `/` and `/d/example-tech-radar` file under one scope
     * rather than two.
     */
    readonly slug: string;
    /** Which of the domain's resources the draft edits. */
    readonly resource: DomainDraftResource;
  }
  | {
    /** This scope names the deployment's own copy of its resource. */
    readonly kind: 'deployment';
    /** Which deployment-level resource the draft edits. */
    readonly resource: DeploymentDraftResource;
  };

/**
 * The scope one domain's drafts of a resource are filed under.
 *
 * @param slug - A resolved domain slug. Callers hand over the value
 * `resolveDomainSlug` produced, never the raw `:domainSlug` route
 * param, exactly as `./api.ts`'s accessors do.
 * @param resource - Which of that domain's resources is being edited.
 * @returns The scope, ready for {@link recordDraft},
 * {@link applyDrafts} or {@link clearDrafts}.
 */
export function domainDraftScope(
  slug: string,
  resource: DomainDraftResource,
): DraftScope {
  return { kind: 'domain', slug, resource };
}

/**
 * The scope a deployment-level resource's drafts are filed under.
 *
 * Takes no slug, which is the whole claim: there is no argument here a
 * domain switch could change, so an edit made while one domain was
 * active is still there under the next.
 *
 * @param resource - Which deployment-level resource is being edited.
 * @returns The scope, ready for {@link recordDraft},
 * {@link applyDrafts} or {@link clearDrafts}.
 */
export function deploymentDraftScope(
  resource: DeploymentDraftResource,
): DraftScope {
  return { kind: 'deployment', resource };
}

/**
 * Every edit this tab has recorded, keyed by
 * `<scope>/<resource>/<rowId>`.
 *
 * A `Map` rather than a plain object because the keys are assembled
 * from data: an object would make `__proto__` and `constructor` mean
 * something, and a map key is just a string. Values are `unknown`
 * because the store is heterogeneous by design — one map holding every
 * resource's edits — and the resource segment of the key is what pairs
 * the writer with the reader.
 *
 * `let` rather than `const`, because every write REPLACES it: see this
 * module's header for why nothing here is mutated in place.
 */
let drafts = new Map<string, unknown>();

/**
 * Every singleton this tab has saved, keyed by its resource alone.
 *
 * A second map rather than a second kind of key in {@link drafts},
 * because these values carry no id and so share no key shape with a
 * row draft — see this module's header. `unknown` and `let` for the
 * same two reasons the row store gives.
 */
let singletons = new Map<string, unknown>();

/**
 * The scope's own key segment — a slug, or the deployment marker.
 *
 * @param scope - Where the draft is filed.
 * @returns The first segment of its key.
 */
function scopeSegment(scope: DraftScope): string {
  return scope.kind === 'domain'
    ? scope.slug
    : DEPLOYMENT_DRAFT_SCOPE;
}

/**
 * The prefix every key under one scope and resource begins with.
 *
 * Ends in the separator on purpose, so a prefix match is a match on
 * whole segments. No member of either resource union is a string
 * prefix of another today, so nothing collides as the unions stand —
 * but adding a `source` beside `sources` would be an ordinary
 * widening, and without the separator {@link clearDrafts} would then
 * drop its neighbour's edits while reporting nothing at all.
 *
 * @param scope - Where the drafts are filed.
 * @returns The prefix, separator included.
 */
function scopePrefix(scope: DraftScope): string {
  return `${scopeSegment(scope)}/${scope.resource}/`;
}

/**
 * The key one row's draft is stored under.
 *
 * @param scope - Where the draft is filed.
 * @param rowId - The row's own id.
 * @returns The composed key.
 */
function draftKey(scope: DraftScope, rowId: number): string {
  return `${scopePrefix(scope)}${rowId}`;
}

/**
 * Record an edit to one row, replacing any edit already held for it.
 *
 * Stores a shallow COPY rather than the row itself, so a component
 * that goes on editing the object it just saved does not rewrite the
 * saved value behind its own back. Shallow is enough for the shapes
 * `types.ts` declares — every mirrored row is flat, and its nested
 * `settings` object is the one exception and is not a draftable row.
 *
 * The store does not know which ids exist and does not check: a draft
 * for a row nothing carries is recorded and then never reached, since
 * {@link applyDrafts} only replaces rows it was handed. That is the
 * honest division — this module holds edits, and which rows exist is
 * the fixture layer's answer to give.
 *
 * @typeParam T - The row's shape, whatever the caller reads and edits.
 * @param scope - Where the draft is filed. Building it through
 * {@link domainDraftScope} is what keeps the edit inside its domain.
 * @param row - The edited row, carrying the id it is keyed by.
 */
export function recordDraft<T extends DraftableRow>(
  scope: DraftScope,
  row: T,
): void {
  drafts = new Map(drafts).set(draftKey(scope, row.id), { ...row });
}

/**
 * Overlay this scope's recorded edits onto a list of rows.
 *
 * The composition every read in `./api.ts` performs: the fixture
 * answers the rows, this answers what the tab has done to them. A row
 * the store has an edit for comes back as that edit, in the position
 * the stored row occupied; every other row comes back as the very
 * object it went in as.
 *
 * Three properties hold whatever the store contains, and each one is
 * what makes an overlay safe to drop into a read:
 *
 * - The list never grows, shrinks or reorders. A draft naming a row
 *   this list does not carry — a stale edit, or another domain's if
 *   the scope were ever built wrong — is not reached at all.
 * - The argument is never mutated, so passing a frozen fixture array
 *   is safe. The answer is a fresh array this module owns, so a caller
 *   that needs a mutable list has one already.
 * - A resource nothing has been recorded under is a plain pass-through
 *   of the same rows, not an error: there is no case table here to
 *   fall off the end of.
 *
 * @typeParam T - The row shape the caller reads. The stored draft is
 * asserted to it: {@link recordDraft} is the only writer, and the
 * resource segment of the key is what pairs the two.
 * @param scope - Whose drafts of which resource to apply.
 * @param rows - The stored rows, in the order the read answered them.
 * @returns A fresh list, drafts applied in place of the rows they
 * edit.
 */
export function applyDrafts<T extends DraftableRow>(
  scope: DraftScope,
  rows: readonly T[],
): readonly T[] {
  return rows.map((row) => {
    const draft = drafts.get(draftKey(scope, row.id));

    return draft === undefined
      ? row
      : (draft as T);
  });
}

/**
 * Forget every edit recorded under one scope and resource.
 *
 * The counterpart to {@link recordDraft} at the granularity a surface
 * discards at: a modal edits rows of one resource inside one domain,
 * so that pair is the unit an operator means by "put it back". It
 * leaves every other scope and resource standing — including the same
 * resource under a different domain, which is the same guard
 * {@link applyDrafts} relies on read side.
 *
 * @param scope - Whose drafts of which resource to drop.
 */
export function clearDrafts(scope: DraftScope): void {
  const prefix = scopePrefix(scope);

  drafts = new Map(
    [...drafts].filter(([key]) => !key.startsWith(prefix)),
  );
}

/**
 * Record this tab's whole value for a singleton resource, replacing
 * any value already held for it.
 *
 * The counterpart to {@link recordDraft} for the shape that has no
 * row: a preference set is saved WHOLE, so the last save is the
 * answer and there is nothing to merge. Stores a shallow COPY for the
 * reason {@link recordDraft} gives, and inherits the same limit — a
 * caller that goes on mutating a NESTED member of the object it just
 * saved rewrites the saved value behind its own back. Nothing above
 * this module does that: every editor here builds a fresh value per
 * change, which is the repo's immutability rule rather than a promise
 * this function can keep on its own.
 *
 * @typeParam T - The value's shape, whatever the surface reads and
 * edits.
 * @param resource - Which singleton is being saved.
 * @param value - The whole edited value.
 */
export function recordSingletonDraft<T extends object>(
  resource: SingletonDraftResource,
  value: T,
): void {
  singletons = new Map(singletons).set(resource, { ...value });
}

/**
 * Overlay this tab's saved value for a singleton resource onto the
 * stored one.
 *
 * The counterpart to {@link applyDrafts}, and deliberately the same
 * bargain in the singular: nothing saved is a pass-through of the very
 * object it was handed, so an unedited read stays identical to the
 * fixture by identity and not merely by value. There is no list to
 * grow, shrink or reorder, so the only property left to keep is that
 * one.
 *
 * @typeParam T - The value's shape. The stored draft is asserted to
 * it: {@link recordSingletonDraft} is the only writer, and the
 * resource is what pairs the two.
 * @param resource - Which singleton to read.
 * @param stored - What the fixture layer answered.
 * @returns This tab's saved value, or `stored` itself.
 */
export function applySingletonDraft<T>(
  resource: SingletonDraftResource,
  stored: T,
): T {
  const draft = singletons.get(resource);

  return draft === undefined
    ? stored
    : (draft as T);
}

/**
 * Forget this tab's saved value for one singleton resource.
 *
 * The counterpart to {@link clearDrafts} at the granularity a surface
 * discards at — which for a singleton is the whole of it, there being
 * no row to discard one of. Leaves every other resource standing.
 *
 * @param resource - Which singleton to drop.
 */
export function clearSingletonDraft(
  resource: SingletonDraftResource,
): void {
  const remaining = new Map(singletons);

  remaining.delete(resource);
  singletons = remaining;
}

/**
 * Empty the whole store.
 *
 * BOTH halves of it — every row draft and every singleton — because a
 * reset that emptied one map would leave the other one leaking a case
 * into the next, which is the exact failure it exists to prevent.
 *
 * FOR TESTS ONLY. Module-scoped state outlives a single case, so a
 * suite without this reads whatever the case before it recorded and
 * passes or fails on an order nobody chose. No module the app ships
 * calls it, and nothing mechanical enforces that — it is a convention,
 * like the rest of this layer's rules about who may import what.
 *
 * The app's own reset is a reload: this store is memory and holds
 * nothing across one. See this module's header.
 */
export function resetDrafts(): void {
  drafts = new Map();
  singletons = new Map();
}
