/**
 * @packageDocumentation
 * The `EntityStore` port — every database operation the entities
 * surface performs, declared as an interface so that the asking is
 * separable from Postgres.
 *
 * THE PORT DECIDES NOTHING, exactly as `src/domains/store.ts`,
 * `src/findings/store.ts` and `src/documents/store.ts` state for
 * their own surfaces. An unknown entity id, a name that reduces to
 * nothing, an alias naming the row it sits on or a subject in
 * another domain, a pool row belonging to somebody else: none of
 * those are facts about Postgres. They are decisions taken about
 * rows, and a decision about rows can be driven by anything that
 * supplies rows. So the isolated suite puts
 * `tests/helpers/memory-research-store.ts` behind this interface
 * and a deployment puts `./db-store.ts` behind it, both answering
 * one contract, and the live suite is left proving only that real
 * Postgres agrees.
 *
 * TWO WRITERS, AND THEY ARE {@link EntityStore.updateEntity} AND
 * {@link EntityStore.approvePoolRow}. The other six methods read:
 * {@link EntityStore.findEntityById},
 * {@link EntityStore.listEntityResearch},
 * {@link EntityStore.countEntityResearch},
 * {@link EntityStore.listEntityPool},
 * {@link EntityStore.countEntityPool} and
 * {@link EntityStore.findPoolRowById}. There is no insert, no
 * delete, and no escape hatch — no `query`, no exposed connection,
 * no transaction handle — so those two are the whole of what this
 * surface can change, and that is a PROPERTY OF THIS TYPE rather
 * than a promise `./routes.ts` keeps. `DocumentStore` makes the
 * same argument from the end of the range where the count is zero.
 *
 * NO METHOD BELOW WRITES `entity_research`, AND THAT TABLE IS
 * `ar-research`'S TO WRITE. It records what a research pass found
 * out, in the same statement that closes the `research_pool` row
 * the candidate was drained from, and only the pass that made the
 * searches and spent the model calls can say what came back. This
 * port READS those rows and has no member for one to arrive
 * through. So `POST /entities/:id/approve-research` writes the
 * APPROVAL and never the research: it records that a person agreed
 * to an intention, and leaves the search to the workflow that makes
 * it. An API writing a research row would be recording that a pass
 * happened when none had, which is worse than recording nothing —
 * every later reader treats a stored result as the reason not to
 * research the subject again.
 *
 * THIS PORT READS ONE TABLE IT SHARES AND DOES NOT OWN.
 * `src/findings/store.ts` reads the same `entity_research` rows
 * through a finding's own `entity_id`, un-windowed and embedded in
 * a single get, and declares `FindingResearchRecord` over them;
 * {@link EntityResearchRecord} below is the windowed collection
 * `GET /entities/:id/research` serves. Two ports over one table is
 * the arrangement rather than an oversight — the one
 * `SourceStore`'s failures queue and `DocumentStore` already take
 * over `documents` — and the split is by what each collection is
 * FOR: that one is what is known about the subject a finding
 * named, this one is one subject's history whatever named it.
 * Neither writes.
 *
 * EVERY REFUSAL CROSSES THIS PORT AS A `StoreRefusal` — the error
 * `src/db/store-errors.ts` declares — AND AS NOTHING ELSE. A method
 * below either answers or throws that one type: no implementation
 * raises a driver error, a SQLSTATE, a constraint name a caller
 * never chose, or an error class of its own. That is what lets the
 * service above catch one thing and switch over a closed reason
 * set, and it is why the in-memory implementation has to refuse
 * what Postgres refuses rather than accept it. A fake that admits
 * what the database rejects is a second contract, agreeing right up
 * until the deployment that does not.
 *
 * Two mechanisms can fire and both sit on
 * {@link EntityStore.updateEntity}:
 * `entities_domain_id_name_norm_unique` as a `unique-violation`
 * when a rename lands on a key another subject in the same domain
 * already holds, and the `alias_of` foreign key as a
 * `foreign-key-violation` when the patch names an id no entity
 * carries. {@link EntityStore.approvePoolRow} raises neither, and
 * neither constraint on `research_pool` can reach it:
 * `research_pool_status_check` reads a member of
 * `RESEARCH_POOL_STATUSES` and that write sets one, and
 * `research_pool_approval_check` refuses a CLOSED row carrying no
 * approval — a write that only ever adds an approval cannot
 * produce that state, from either side of it.
 *
 * A NAME IS WRITTEN AS A PAIR OR NOT AT ALL, which is the one
 * decision in this file the schema asked for and could not take.
 * `entities.name_norm` in `src/db/schema/entities.ts` carries the
 * argument: nothing in the database computes the value, so a writer
 * reducing a name differently never FAILS, it silently misses — the
 * lookup finds nothing, the write inserts a rival row beside the
 * one it meant to find, and the registry goes on looking correct
 * from the inside. No CHECK can report one. So
 * {@link EntityPatch.name} is {@link EntityNamePatch} rather than a
 * string, and a rename moving the display half without the key half
 * is not a request an implementation can be handed at all.
 * `normalizeEntityName` in `src/lib/entity-name-norm.ts` is the
 * single definition that column demanded, and `./service.ts` is
 * where it is called: the port is handed the pair and never a name
 * to reduce, so no implementation here is a second place the
 * reduction could differ.
 *
 * A ROW IS ADDRESSED BY ITS OWN ID, WHICH IS WHY
 * {@link EntityRecord.domainId} IS ON THE RECORD.
 * `PATCH /entities/:id` carries no slug, so nothing in the request
 * says whose registry the row belongs to and that member is the
 * only thing that can — `./service.ts` reads it to refuse an alias
 * naming a subject in another domain, one of the two rules this
 * surface holds that the database does not. `FindingRecord.domainId`
 * and `SourceRecord.domainId` carry theirs for that reason, and
 * `DocumentRecord` omits its own because there the domain is the
 * path.
 *
 * The two child records take that same rule from different ends.
 * {@link EntityResearchRecord} omits `entity_id`, the entity being
 * the path on the one route that answers it — where
 * `FindingResearchRecord` carries the identical column precisely
 * because a caller there named a FINDING and the entity was
 * resolved from it. {@link ResearchPoolRecord} KEEPS `entity_id`
 * for a third reason: {@link EntityStore.findPoolRowById} takes a
 * pool id ALONE, so the member is what a service compares against
 * the addressed entity in order to refuse a row belonging to
 * somebody else. Neither record carries `domain_id`, which no
 * method here reads.
 *
 * THE APPROVAL IS IDEMPOTENT, AND WHAT IT IS CALLED IS NOT THIS
 * FILE'S. {@link EntityStore.approvePoolRow} writes
 * `coalesce(approved_at, now())` and the approved status in one
 * statement, member for member with `approveById` in
 * `scripts/approve.ts`, so ruling twice keeps the FIRST ruling's
 * time rather than re-dating a search already paid for — and the
 * CLI and the route are one gate with two clients rather than two
 * gates that agree today. What a refusal is CALLED belongs to
 * `src/approvals/ruling.ts`: this port answers a row and takes no
 * view of it, and `not-on-this-parent` and `already-ruled` are
 * decided one layer up out of what it answered.
 *
 * TWO METHODS ARE REACHED BY NO ROUTE ON THIS WAVE'S TABLE, and
 * recording that is cheaper than a reader deriving it.
 * {@link EntityStore.listEntityPool} and
 * {@link EntityStore.countEntityPool} answer one subject's
 * intentions, and wave 3 mounts no path over them: the four entity
 * routes are the get, the patch, the research list and the
 * approval, and `POST /entities/:id/approve-research` names a
 * `poolId` the client learned somewhere else — today that is
 * `scripts/approve.ts`, whose queue is domain-wide rather than per
 * subject. They are declared because a client cannot rule on what
 * it cannot enumerate, and because an implementation that answers
 * one intention by id answers that subject's list for the same
 * cost. It is a departure from the rule `DocumentStore` states
 * about a lookup nothing on the wire could reach, and it is
 * recorded here rather than smoothed over.
 *
 * BOTH COLLECTIONS DECLARE THEIR ORDER, AND THE TWO RUN OPPOSITE
 * WAYS. Research is `researched_at DESC, id DESC`: the table
 * accumulates rather than replacing, so the current picture is the
 * head of that order and a reader asking what is known about a
 * subject wants the newest pass first. The pool is
 * `created_at ASC, id ASC`, which is `listPending` in
 * `scripts/approve.ts` member for member — a queue worked top-down
 * empties, where newest-first buries whatever has waited longest.
 * Both tiebreaks are load-bearing rather than decorative: `now()`
 * is the TRANSACTION's start time, so rows written together tie to
 * the microsecond, and a page boundary falling inside a tie would
 * show one row twice and another never.
 *
 * THE DESCENDING KEYS ARE SPELLED `DESC NULLS LAST`, and that is
 * part of the contract rather than a detail of one implementation.
 * A pathkey carries its nulls ordering and the planner matches it
 * literally, so a bare `DESC` cannot use an index declared the
 * other way, and that both columns are NOT NULL does not save the
 * shorter spelling — nothing in the planner reads the constraint to
 * decide the two are equivalent. `src/findings/store.ts` carries
 * the measurement this repository took against a real Postgres.
 *
 * NEITHER COLLECTION HAS AN INDEX OF ITS OWN. Wave 3 adds six read
 * indexes and none is over `entity_research` or `research_pool`,
 * and Postgres indexes no foreign key by itself, so both reads
 * below are a scan filtered on `entity_id`. That is a fact about
 * how little those tables hold today rather than a claim they will
 * stay small — nothing writes an `entities` row yet at all — and
 * the repair when they grow is DDL rather than an edit here.
 *
 * NO METHOD RESOLVES OR DELETES A DOMAIN OR AN ENTITY, which is the
 * division of labour every port here keeps. Nothing below deletes
 * anything, so the cascade that takes a domain's entities with it,
 * and their research after them, is reached through `DomainStore`
 * and is not expressible from this file. Deleting one ENTITY is
 * expressible from nowhere: `alias_of` and the pool's own
 * `entity_id` are both `ON DELETE no action`, so a subject with
 * aliases or intentions outstanding is refused, and the way to
 * retire one is the alias pointer rather than a DELETE.
 *
 * `docs/architecture/08-http-api.md` states the wave's read-first
 * law under `Read-first` and the shared approval rules under
 * `The approval vocabulary`, and
 * `tests/invariants/api-read-first.test.ts` derives the first from
 * `keyof` over these types rather than from any paragraph above —
 * so a third writer added below fails that invariant naming itself,
 * and it is the type rather than this sentence a reader should
 * believe.
 */
import type { StoreWindow } from '../http/schemas.js';

/**
 * One `entities` row, whole — the five columns the table declares
 * beyond its key, and no sixth.
 *
 * Whole rather than column-scoped, for the reason `DomainRecord` in
 * `src/domains/store.ts` gives: there is nothing on `entities` a
 * reader of the API may not have. No hash, no credential, no
 * operator-invisible bookkeeping, and nothing large enough to be a
 * decision about the wire — `attributes` is whatever the domain
 * chose to record, and a reader that asked for the subject asked
 * for that too.
 *
 * NO TIMESTAMP IS ON THIS ROW BECAUSE THE TABLE CARRIES NONE.
 * `entities` has no `created_at` and no `updated_at`, unlike almost
 * everything else the API answers, so a reader asking when a
 * subject was first seen is asking `entity_research` or
 * `research_pool` beside it rather than this record. Answering an
 * invented stamp would be worse than the absence: a registry row is
 * upserted rather than inserted, so the honest answer to when it
 * arrived is a question about the rows that cite it.
 */
export interface EntityRecord {
  /**
   * `entities.id`, and the key both writers below take.
   *
   * Also what an alias points at, which is why
   * {@link EntityRecord.aliasOf} is one of these and not a name.
   */
  readonly id: number;

  /**
   * The domain whose registry this subject belongs to.
   *
   * ON THE RECORD BECAUSE THE PATH DOES NOT CARRY IT, per the
   * module header. `PATCH /entities/:id` addresses a row by its own
   * id, so this member is the only thing that says whose registry
   * was edited — and it is what `./service.ts` reads to refuse an
   * alias naming a subject in another domain, which the database
   * would store without complaint.
   *
   * The registry is per domain: two domains tracking a subject of
   * the same name hold two rows and neither sees the other's, since
   * `entities_domain_id_name_norm_unique` is over the PAIR rather
   * than over the name alone.
   */
  readonly domainId: number;

  /**
   * The subject's name as it arrived, for a person to read.
   *
   * The display half of the pair. Nothing matches on it, so it
   * keeps whatever capitalization, punctuation and spacing the
   * source used rather than whatever survived the reduction, and
   * editing it moves no key and breaks no join — provided
   * {@link EntityNamePatch} is what carries the edit.
   *
   * NOT NULL is not the same as non-empty, and the empty string
   * means something here: that whatever wrote the row had no name
   * to show. It costs legibility rather than correctness, the whole
   * cost of a blank being paid at {@link EntityRecord.nameNorm}
   * beside it.
   */
  readonly name: string;

  /**
   * The same name reduced to the form the registry matches on: the
   * row's key half, and what makes one subject spelled three ways
   * land on one row.
   *
   * ANSWERED AND NEVER ACCEPTED, in the sense the module header
   * sets out. It is on this record because a reader shown a
   * registry is owed the key its rows were deduplicated on, and a
   * client watching a rename needs to see what the key became. It
   * reaches {@link EntityPatch} only as the computed half of
   * {@link EntityNamePatch}, never as a value a request supplied —
   * `./service.ts` refuses a submitted `nameNorm` as an
   * unrecognized key before this port is called.
   *
   * The empty string is the one value that must never be stored: a
   * blank key collapses every subject a writer could not name onto
   * one row per domain, accumulating the research, findings and
   * judgements of all of them. `normalizeEntityName` THROWS rather
   * than answering it, which is what keeps that state unreachable
   * from this surface.
   */
  readonly nameNorm: string;

  /**
   * The entity this row turned out to be, when it turned out to be
   * another one, and null when the row IS its own subject.
   *
   * Null is the ordinary state rather than a pointer every other
   * row is missing. A merge here is a pointer and not a rewrite: a
   * placeholder that stood in for a subject nobody had named keeps
   * its own row and its own history, and readers resolve through
   * this column instead.
   *
   * Two things the database does NOT refuse, and both are rules
   * `./service.ts` holds on the way in: a row may point at itself,
   * and a row may point into another domain. Neither loops a reader
   * — resolution is one hop — and neither is a merge anybody meant,
   * which is why the surface refuses what the column stores.
   */
  readonly aliasOf: number | null;

  /**
   * Whatever this domain records about the subject beyond its name.
   *
   * `unknown` rather than a shape, which is what the column infers:
   * it carries no `$type`, deliberately, because what belongs
   * inside varies by domain and one interface across all of them
   * would describe none of them. `ConnectorRecord.config` in
   * `src/connectors/store.ts` takes the same view of the same kind
   * of column, with a credential at stake where there is none here.
   *
   * Never null and never absent: the column defaults to `{}` and is
   * NOT NULL, nothing recorded yet and recorded as nothing reading
   * identically to everything that opens it.
   */
  readonly attributes: unknown;
}

/**
 * One `entity_research` row as this surface answers it: what a
 * single research pass found out about the subject in the path.
 *
 * A TABLE THIS PORT READS AND DOES NOT OWN, per the module header.
 * `ar-research` writes these rows; nothing on this port can, and
 * `FindingResearchRecord` in `src/findings/store.ts` is the other
 * reader's own record over the same table.
 *
 * `entityId` IS DELIBERATELY ABSENT, which is the one member that
 * separates this record from that one. The entity is the path on
 * `GET /entities/:id/research`, so answering it back would echo the
 * request rather than report a row — the rule `DocumentRecord`
 * states about its domain. `FindingResearchRecord` carries the
 * column for the complementary reason: a caller there named a
 * finding, and the entity is what the port resolved.
 *
 * ROWS ACCUMULATE, so this is a pass and not a subject. A second
 * pass over one subject is a second row rather than an overwrite,
 * which is what makes the collection worth paging at all, and the
 * current picture is the head of the order rather than a select.
 */
export interface EntityResearchRecord {
  /**
   * `entity_research.id`, and the tiebreak on the order below.
   *
   * Load-bearing rather than decorative: `researched_at` defaults
   * to `now()`, which is the transaction's start time, so a pass
   * writing several rows at once ties to the microsecond.
   */
  readonly id: number;

  /**
   * The run this pass belonged to, or null when it belonged to
   * none.
   *
   * Null is an ordinary state rather than a gap: research can be
   * written by hand, carried in from whatever a domain kept before
   * it had a pipeline, or backfilled, and naming a run anyway would
   * make the ledger claim work it never did.
   *
   * An id rather than the run itself. `src/runs/store.ts` is where
   * a run is met, and embedding one here would put a second
   * authority on what a run is.
   */
  readonly runId: number | null;

  /**
   * What the pass concluded in prose, or null when it recorded
   * none.
   *
   * Null and `''` are different answers and both are storable: the
   * first says no narrative was produced, the second that one was
   * written and was empty. A surface showing `not summarized` and
   * one showing a blank paragraph are different claims, and only
   * the first is honest about a pass that produced no prose.
   *
   * STORED UNTRUSTED TEXT, in the sense a document body is: it is
   * whatever a model wrote, and it is answered here AS STORED. The
   * masking this repository holds such values to lives at the
   * service, on the split the module header draws.
   */
  readonly summary: string | null;

  /**
   * Whatever else the pass recorded, keyed however the pass keyed
   * it.
   *
   * `unknown` for the reason {@link EntityRecord.attributes} is:
   * the column carries no `$type` and no contract declares its
   * keys. It is the sharper absence of the two — a finding's
   * `fields` at least has `DomainSettings.fieldContract` to be
   * validated against, and this payload has nothing but the writing
   * domain's own convention.
   */
  readonly payload: unknown;

  /**
   * When this research was recorded, and what the collection is
   * ordered by, newest first.
   *
   * The honest limit is which moment it names: the column defaults
   * to the write, so a pass that searched at one time and persisted
   * five minutes later is dated by the second, and only a writer
   * holding the search time can record that instead.
   */
  readonly researchedAt: Date;
}

/**
 * One `research_pool` row: an intention to research a subject, and
 * where it stands at the gate.
 *
 * THE ROW IS THE APPROVAL'S SUBJECT AND NOT THE RESEARCH'S. What is
 * ruled on is an intention carrying the exact terms a search will
 * be issued with, which is what makes the gate an approval OF
 * something rather than of a description composed later. What comes
 * back is {@link EntityResearchRecord} above, written by the pass
 * that drained this row and by nothing on this port.
 *
 * FOUR OF THESE MEMBERS ARE THE RULING, AND THE PROJECTION IS
 * DECLARED ELSEWHERE. `describeRuling` in `src/approvals/ruling.ts`
 * reads `id`, `status`, `approvedAt` and `researchedAt` and answers
 * the four-member `Ruling` both approval routes answer with. This
 * record satisfies that input structurally rather than by
 * extending it — the port imports nothing but its window type, and
 * the type-check at the service's own call site is what holds the
 * two together.
 *
 * `domainId` IS ABSENT, per the module header: the collection is
 * scoped by the entity and the containment check
 * {@link EntityStore.findPoolRowById} exists for is over
 * `entityId`, so nothing on this surface reads whose domain the row
 * was raised under.
 */
export interface ResearchPoolRecord {
  /** `research_pool.id`, and the id an approval names. */
  readonly id: number;

  /**
   * The subject this intention is about, or null when it names
   * none.
   *
   * KEPT WHERE {@link EntityResearchRecord} DROPS ITS PARENT,
   * because {@link EntityStore.findPoolRowById} is not scoped: it
   * takes a pool id alone, so this member is what a service holds
   * against the addressed entity before it approves anything. A row
   * carrying null is on NO entity and is refused by that comparison
   * like any other row that is not this one's.
   *
   * Null is an ordinary state rather than a gap. An intention can
   * be raised from a finding whose subject nothing has attributed
   * yet, and the terms on the row are what make it researchable
   * anyway.
   */
  readonly entityId: number | null;

  /**
   * The finding that raised this intention, or null when nothing
   * did — a subject queued by hand, or by a sweep over the registry
   * rather than over a document.
   *
   * Provenance where {@link ResearchPoolRecord.entityId} is subject
   * matter, which is why an operator reading a queue is shown both.
   * An id rather than the finding: `src/findings/store.ts` is where
   * one is met.
   */
  readonly findingId: number | null;

  /**
   * Where the row stands in the gate, as stored.
   *
   * `string` rather than the `ResearchPoolStatus` union, which is
   * what a SELECT actually answers: the tuple is a CHECK in the
   * database rather than a union in the type system, so a row
   * written before a member was removed still reads back. `Ruling`
   * in `src/approvals/ruling.ts` takes the same view of the same
   * column and records the same reason, and
   * `DocumentRecord.parseStatus` does it one group over.
   *
   * The column is the ACCOUNT of the row rather than the gate
   * itself. Nothing refuses a transition, and
   * `research_pool_approval_check` never consults this member — it
   * holds the two timestamps against each other and nothing else,
   * so a row may state a status its stamps do not support.
   */
  readonly status: string;

  /**
   * The exact terms this row's search will be issued with, stored
   * when the intention was raised rather than composed when it is
   * acted on.
   *
   * That ordering is the gate's substance: approval is given to
   * THESE strings, so an operator rules on what will be sent rather
   * than on an account of what will be assembled. Answering them is
   * the whole reason a ruling client reads a pool row at all.
   *
   * An empty list is storable and means something — an intention
   * nobody could turn into a query. It approves like any other and
   * the drain finds nothing to issue.
   */
  readonly searchTerms: readonly string[];

  /**
   * When the intention was raised: not when the document behind it
   * was captured, and not when it was ruled on.
   *
   * What the queue is ordered by, oldest first, with
   * {@link ResearchPoolRecord.id} breaking the tie `now()` makes
   * inevitable.
   */
  readonly createdAt: Date;

  /**
   * When a person ruled in favour, or null while nobody has — the
   * state every row starts in and the one a drain passes over.
   *
   * Written `coalesce(approved_at, now())`, so a second approval
   * answers the FIRST one's time. A client reading an instant older
   * than the request it just made has found the idempotence rather
   * than a fault.
   */
  readonly approvedAt: Date | null;

  /**
   * When the intention was closed, whether by a search or without
   * one, and null while it is still open.
   *
   * Closed rather than researched, despite the column's name: a row
   * the drain refuses to search — nothing issuable in its terms, or
   * a subject researched recently enough — is stamped here too,
   * with its status set to `skipped` and its reason kept. Leaving
   * such a row approved and open is what makes every later pass
   * fetch it first and spend the same money again.
   *
   * The `closedAt` member of the `Ruling` projection reads this
   * one, and `source_config_proposals.applied_at` is what it reads
   * for the other gate — the same fact under two column names,
   * translated once in `src/approvals/ruling.ts`.
   */
  readonly researchedAt: Date | null;
}

/**
 * A rename, as {@link EntityPatch.name} carries it: both halves of
 * the name, together.
 *
 * ONE MEMBER WOULD HAVE BEEN THE BUG THIS TYPE EXISTS TO REMOVE.
 * `entities.name` and `entities.name_norm` are the display half and
 * the key half of one value, and a write that moves the first
 * without the second leaves the registry matching on a key no
 * spelling of the name reduces to any more — the lookup finds
 * nothing, the next sighting inserts a rival row, and nothing in
 * the database reports it. Pairing them here makes that write
 * unexpressible rather than merely discouraged, which is what
 * `entities.name_norm` in `src/db/schema/entities.ts` asked for and
 * could not enforce.
 *
 * NEITHER HALF IS SUBMITTED. `./service.ts` takes the name off a
 * `.strict()` body, computes the key through `normalizeEntityName`
 * in `src/lib/entity-name-norm.ts`, and builds this pair. A request
 * naming `nameNorm` is refused as an unrecognized key, so a caller
 * cannot propose a reduction of its own — which would be the
 * silent miss arriving over HTTP.
 */
export interface EntityNamePatch {
  /**
   * `entities.name`: the name as a person will read it, verbatim
   * as submitted.
   */
  readonly display: string;

  /**
   * `entities.name_norm`: `normalizeEntityName(display)`, computed
   * by the service and never taken from a request.
   *
   * That function throws on a name reducing to nothing, so the
   * empty key `entities.name_norm` forbids cannot reach this member
   * — the refusal happens before the patch is built.
   */
  readonly norm: string;
}

/**
 * What {@link EntityStore.updateEntity} is handed: the members to
 * rewrite, and no others.
 *
 * THREE MEMBERS, AND EACH DISTINGUISHES A DIFFERENT NUMBER OF
 * REQUESTS. An absent member always leaves the stored value alone.
 * {@link EntityPatch.name} then has one other request — the pair
 * that replaces both name columns. {@link EntityPatch.attributes}
 * has one other too, but an empty object is a value rather than an
 * absence, so supplying `{}` CLEARS the payload whole. And
 * {@link EntityPatch.aliasOf} has two: an id points the row at a
 * subject, and `null` clears the pointer back to a row that is its
 * own subject — the three-request shape `TopicPatch` and
 * `CategoryPatch.parentId` already take, and the one
 * `ConnectorPatch` explicitly does not.
 *
 * `domainId` IS DELIBERATELY ABSENT, so a subject cannot be moved
 * between registries through this port. Moving one is not an edit:
 * its research, its findings and its intentions were accumulated
 * under one domain's criteria, none of those foreign keys would
 * follow, and `entities_domain_id_name_norm_unique` might refuse
 * the arrival after the rest had gone. That is a different
 * operation with a fan-out of its own to settle first, exactly as
 * `DomainPatch` says of a slug.
 *
 * NEITHER SCORE COLUMN, NO `parse_status`, AND NOTHING A PIPELINE
 * OWNS appears here or on any other input type in this file, which
 * is the wave's read-first law expressed as a shape.
 * `tests/invariants/api-read-first.test.ts` reads that off `keyof`
 * over this type rather than off this paragraph.
 */
export interface EntityPatch {
  /**
   * The name to store, both halves together, or absent to leave
   * the subject's name alone. See {@link EntityNamePatch} for why
   * it is a pair.
   */
  readonly name?: EntityNamePatch;

  /**
   * The payload to store WHOLE, or absent to leave it alone. Never
   * merged into what is already there: a caller sends the object it
   * wants to exist, which is the only shape under which removing a
   * member is expressible at all. An empty object is therefore a
   * request to clear every attribute, and the request doing that by
   * accident is byte-identical to the one doing it on purpose — the
   * consequence `ConnectorPatch.config` states for a payload
   * holding secrets, holding here for one that does not.
   */
  readonly attributes?: Readonly<Record<string, unknown>>;

  /**
   * The subject this row turns out to be, `null` to clear the
   * pointer, or absent to leave it alone.
   *
   * THE TWO RULES THIS PORT DOES NOT HOLD ARE HELD ABOVE IT. A row
   * pointing at itself and a row pointing into another domain are
   * both storable — `entities.alias_of` in
   * `src/db/schema/entities.ts` says so — and neither is a merge
   * anybody meant, so `./service.ts` refuses both with a `422`
   * before this port is called. What the database does refuse is an
   * id no entity carries, which arrives as a
   * `foreign-key-violation`.
   */
  readonly aliasOf?: number | null;
}

/**
 * Every database operation the entities surface performs.
 *
 * EIGHT METHODS, SIX READS AND TWO WRITERS, and no escape hatch:
 * there is no `query`, no exposed connection and no transaction
 * handle, so an implementation is substitutable by anything that
 * can hold rows. That closure is what makes the in-memory
 * implementation a genuine second implementation rather than a stub
 * covering the easy calls, and it is what lets the module header
 * name the writers exhaustively.
 *
 * Every method is asynchronous, including the ones an in-memory
 * implementation could answer synchronously. The port is shaped by
 * the caller that has to await a database, and a synchronous member
 * would be one drizzle could not satisfy.
 *
 * THE METHODS FALL INTO THREE GROUPS OVER THREE TABLES: the subject
 * itself, the research hanging off it, and the intentions queued
 * against it. Only the first and the third have a writer, and the
 * middle one is `ar-research`'s — which is the whole shape of the
 * ratify-and-never-write split the header sets out.
 */
export interface EntityStore {
  /**
   * Reads one subject by its own id.
   *
   * Where every entity route enters, since the path carries an id
   * rather than a slug and there is no natural key on this table a
   * route could address. `./service.ts` answers a `404` from the
   * null rather than this port refusing.
   *
   * @param id - The {@link EntityRecord.id} the path carried, or
   *   any id a caller holds.
   * @returns The row, or null when no entity carries that id. Null
   *   rather than a refusal, because a subject that is not there is
   *   a fact for the service to decide from.
   */
  findEntityById(id: number): Promise<EntityRecord | null>;

  /**
   * Rewrites the supplied members of one subject.
   *
   * ONE OF THE PORT'S TWO WRITERS. It writes `entities` and nothing
   * else: no research, no intention, and no column outside the
   * three {@link EntityPatch} declares.
   *
   * @param id - The {@link EntityRecord.id} a read already
   *   returned.
   * @param patch - The members to rewrite. `name` moves both name
   *   columns together or neither; `attributes` replaces the stored
   *   payload WHOLE and is never merged into it.
   * @returns The stored row afterwards, or null when no row carries
   *   that id. Null is reachable even after a successful read,
   *   since the row may go in between, and answering it rather than
   *   throwing leaves what that means to the caller.
   * @throws A `StoreRefusal` whose `reason` is `unique-violation`
   *   and whose `constraint` is
   *   `entities_domain_id_name_norm_unique`, when the reduced name
   *   is one another subject in this domain already holds — a `409`
   *   one layer up. Or one whose `reason` is
   *   `foreign-key-violation`, when `aliasOf` names an id no entity
   *   carries. Those are the only two mechanisms this port can
   *   raise; see the module header for why the pool writer raises
   *   none.
   */
  updateEntity(id: number, patch: EntityPatch): Promise<EntityRecord | null>;

  /**
   * Reads one window of what has been found out about a subject,
   * ordered by {@link EntityResearchRecord.researchedAt} descending
   * with {@link EntityResearchRecord.id} descending breaking a tie.
   *
   * THE ORDER IS PART OF THE CONTRACT, because a window over an
   * unordered read is not a page: Postgres promises nothing about
   * row order without an `ORDER BY`, so two requests for
   * consecutive pages may repeat one row and skip another while
   * every count on the wire still adds up. The module header
   * carries why both descending keys are spelled `DESC NULLS LAST`
   * and what a bare `DESC` costs silently.
   *
   * READS A TABLE THIS PORT DOES NOT WRITE. `entity_research` is
   * `ar-research`'s, and there is no member on this interface
   * through which a row could arrive.
   *
   * @param entityId - The subject to read about, as the path
   *   carried it. A scope rather than a filter: this collection has
   *   no filter at all.
   * @param window - `limit` and `offset`, as `toStoreWindow` in
   *   `src/http/schemas.ts` derived them from `?page`/`?perPage`.
   *   The window arrives already validated, so no implementation
   *   re-checks its bounds.
   * @returns The rows in that window, possibly empty. A window past
   *   the end, a subject nothing has researched and an id no entity
   *   carries are all an empty list rather than an error: none of
   *   the three is a failure to read. Summaries come back AS
   *   STORED.
   */
  listEntityResearch(
    entityId: number,
    window: StoreWindow,
  ): Promise<readonly EntityResearchRecord[]>;

  /**
   * Counts what has been found out about a subject, ignoring any
   * window.
   *
   * Separate from {@link EntityStore.listEntityResearch} rather
   * than answered beside it, because the two are different
   * questions: a page's total describes the collection and not the
   * page. Splitting them also keeps the list read free of a window
   * function an in-memory implementation could only imitate.
   *
   * @param entityId - The subject to count against.
   * @returns How many passes have been recorded. An id no entity
   *   carries answers `0`, which is correct rather than a special
   *   case: nothing points at a row that is not there.
   */
  countEntityResearch(entityId: number): Promise<number>;

  /**
   * Reads one window of the intentions queued against a subject,
   * ordered by {@link ResearchPoolRecord.createdAt} ascending with
   * {@link ResearchPoolRecord.id} ascending breaking a tie.
   *
   * OLDEST FIRST, WHICH IS `listPending` IN `scripts/approve.ts`
   * MEMBER FOR MEMBER. A queue worked top-down empties; a
   * newest-first one buries whatever has waited longest behind
   * every intention raised since. Two clients over one queue rather
   * than two queues that agree today, which is the same rule the
   * pending-config pair states one group over.
   *
   * THE ROWS ARE NOT NARROWED TO `pending`, which is where this
   * differs from that CLI listing. A subject's queue read from its
   * own page is a history of what was ever asked about it, and an
   * approved or closed row is the part of that history a reader is
   * most likely to be checking for. Narrowing is a filter member
   * this port does not yet declare, and adding one is a member here
   * and a predicate in each implementation.
   *
   * NO ROUTE ON THIS WAVE CALLS IT, per the module header.
   *
   * @param entityId - The subject whose intentions to read.
   * @param window - `limit` and `offset`, already validated.
   * @returns The rows in that window, possibly empty. A subject
   *   nothing has queued and an id no entity carries both answer
   *   an empty list. Rows whose `entity_id` is null belong to no
   *   subject and appear in no page here.
   */
  listEntityPool(
    entityId: number,
    window: StoreWindow,
  ): Promise<readonly ResearchPoolRecord[]>;

  /**
   * Counts the intentions queued against a subject, ignoring any
   * window.
   *
   * Separate from {@link EntityStore.listEntityPool} for the reason
   * {@link EntityStore.countEntityResearch} gives, and selecting
   * the same rows that list does — an implementation answering the
   * two through different predicates would put a page's
   * `meta.total` at odds with the page.
   *
   * NO ROUTE ON THIS WAVE CALLS IT, per the module header.
   *
   * @param entityId - The subject to count against.
   * @returns How many intentions stand against it, in any state. An
   *   id no entity carries answers `0`.
   */
  countEntityPool(entityId: number): Promise<number>;

  /**
   * Reads one intention by its own id, whatever subject it names.
   *
   * UNSCOPED ON PURPOSE, AND THAT IS WHAT MAKES THE CONTAINMENT
   * RULE DECIDABLE. `POST /entities/:id/approve-research` carries a
   * `poolId` in its body and an entity in its path, and the two may
   * disagree — a mistyped id, a stale queue, or a caller trying one
   * id after another. A read scoped to the entity would answer null
   * for both `no such row` and `not this subject's row`, which are
   * a `404` for different reasons and only one of which is honest.
   * So this answers the row, and `./service.ts` holds
   * {@link ResearchPoolRecord.entityId} against the addressed
   * entity and refuses `not-on-this-parent` before it looks at
   * anything else — the ordering `src/approvals/ruling.ts` argues,
   * which is what stops a `409` disclosing that a row the caller
   * does not own exists and has already been acted on.
   *
   * @param id - The {@link ResearchPoolRecord.id} the body named.
   * @returns The row, or null when no intention carries that id.
   *   The row may name any subject or none; whose it is, is the
   *   caller's question.
   */
  findPoolRowById(id: number): Promise<ResearchPoolRecord | null>;

  /**
   * Records that a person ruled in favour of one intention: stamps
   * `approved_at` and moves the status to approved, in one
   * statement.
   *
   * THE PORT'S SECOND AND LAST WRITER, AND IT RATIFIES RATHER THAN
   * RESEARCHES. It writes two columns of one `research_pool` row
   * and reaches nothing else — no `entity_research` row, no search,
   * no model call, and no other column on the row it stamps.
   * Whatever the approval makes possible is `ar-research`'s to do
   * and to record.
   *
   * IDEMPOTENT BY CONSTRUCTION. `approved_at` is written
   * `coalesce(approved_at, now())`, so a second ruling keeps the
   * first one's time rather than re-dating a search already paid
   * for — `approveById` in `scripts/approve.ts` writes the same
   * pair the same way, and the two are one gate with two clients.
   * `now()` is the server's clock and the transaction's start time,
   * not the calling process's.
   *
   * NOTHING IS ASKED OF THE ROW'S STATE. An id naming a row already
   * closed moves its status back to approved without moving
   * `approved_at`, and `research_pool_approval_check` permits that,
   * holding the two timestamps against each other and never
   * consulting the status. Whether a closed row may be ratified at
   * all is `RULING_ACTS` in `src/approvals/ruling.ts`, decided one
   * layer up — ratifying twice is a no-op there, where applying
   * twice is refused.
   *
   * @param id - The {@link ResearchPoolRecord.id} to rule on, as
   *   {@link EntityStore.findPoolRowById} already resolved and the
   *   service already held against the addressed entity. This
   *   method re-checks neither.
   * @returns The row as it stands after the ruling, or null when no
   *   row carries that id. An id that never existed and one deleted
   *   since it was read are indistinguishable here, and both say
   *   the same thing: there was nothing to rule on. The four
   *   members `describeRuling` reads are on the answer, so a
   *   service can project the ruling without a second read.
   */
  approvePoolRow(id: number): Promise<ResearchPoolRecord | null>;
}
